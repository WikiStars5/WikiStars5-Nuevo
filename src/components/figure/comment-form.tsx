'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { collection, serverTimestamp, doc, runTransaction, increment, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { useAuth, useFirestore, useUser } from '@/firebase';
import { initiateAnonymousSignIn } from '@/firebase/non-blocking-login';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, MessageSquare, Send } from 'lucide-react';
import { onAuthStateChanged, User as FirebaseUser, Auth } from 'firebase/auth';
import StarInput from './star-input';
import { Comment } from '@/lib/types';

const commentSchema = z.object({
  text: z.string().min(1, 'El comentario no puede estar vacío.').max(500, 'El comentario no puede superar los 500 caracteres.'),
  rating: z.number({ required_error: 'Debes seleccionar una calificación.' }).min(0, 'La calificación es obligatoria.').max(5, 'La calificación debe estar entre 0 y 5.'),
});

type CommentFormValues = z.infer<typeof commentSchema>;

interface CommentFormProps {
  figureId: string;
  figureName: string;
}

function getNextUser(auth: Auth): Promise<FirebaseUser> {
  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        unsubscribe();
        resolve(user);
      }
    }, (error) => {
        unsubscribe();
        reject(error);
    });
  });
}

const ratingSounds: { [key: number]: string } = {
    1: 'https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/star%20sound%2Fstar1.mp3?alt=media&token=c867fe4c-a39f-49a1-ab99-b6fdac84b2e8',
    2: 'https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/star%20sound%2Fstar2.mp3?alt=media&token=f0a09d9e-8a99-498b-b9ea-0a61b07e4173',
    3: 'https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/star%20sound%2Fstar3.mp3?alt=media&token=40943193-e45d-443d-9cc2-40ff8fa98076',
    4: 'https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/star%20sound%2Fstar4.mp3?alt=media&token=75b19307-5b2c-4c89-a252-b584727469da',
    5: 'https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/star%20sound%2Fstar5.mp3?alt=media&token=11cd84e2-7377-4972-a9b0-e0e716e2df46',
};

export default function CommentForm({ figureId, figureName }: CommentFormProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CommentFormValues>({
    resolver: zodResolver(commentSchema),
    defaultValues: { text: '', rating: null as any },
  });

  const textValue = form.watch('text', '');

  const onSubmit = async (data: CommentFormValues) => {
    if (!firestore || !auth) return;
    setIsSubmitting(true);

    try {
      let currentUser = user;
      if (!currentUser) {
        await initiateAnonymousSignIn(auth);
        currentUser = await getNextUser(auth);
      }
      
      const figureRef = doc(firestore, 'figures', figureId);
      const commentsColRef = collection(firestore, 'figures', figureId, 'comments');
      
      const previousCommentsQuery = query(
        commentsColRef,
        where('userId', '==', currentUser.uid),
        where('rating', '>=', 0), // Only get comments that had a rating
        orderBy('rating'), // This is arbitrary, needed for the composite index
        orderBy('createdAt', 'desc'),
        limit(1)
      );
      
      const previousCommentSnapshot = await getDocs(previousCommentsQuery);
      const previousCommentDoc = previousCommentSnapshot.docs[0];
      const previousComment = previousCommentDoc?.data() as Comment | undefined;


      await runTransaction(firestore, async (transaction) => {
        const figureDoc = await transaction.get(figureRef);
        if (!figureDoc.exists()) {
            throw new Error("Figure not found.");
        }

        const updates: { [key: string]: any } = {};
        const newRating = data.rating;

        if (previousComment && typeof previousComment.rating === 'number' && previousComment.rating >= 0) {
          const oldRating = previousComment.rating;
          if (oldRating !== newRating) {
            updates['totalRating'] = increment(newRating - oldRating);
            updates[`ratingsBreakdown.${oldRating}`] = increment(-1);
            updates[`ratingsBreakdown.${newRating}`] = increment(1);
             // "Fossilize" the old comment's rating so it no longer displays stars
            transaction.update(previousCommentDoc.ref, { rating: -1 });
          }
          // ratingCount does not change because it's a vote update, not a new user voting.
        } else {
          // This is a first-time vote for this user
          updates['ratingCount'] = increment(1);
          updates['totalRating'] = increment(newRating);
          updates[`ratingsBreakdown.${newRating}`] = increment(1);
        }

        transaction.update(figureRef, updates);
        
        const newCommentRef = doc(commentsColRef);
        const newCommentPayload = {
            figureId: figureId,
            userId: currentUser!.uid,
            text: data.text,
            rating: newRating,
            createdAt: serverTimestamp(),
            userDisplayName: currentUser!.isAnonymous ? 'Anónimo' : currentUser!.displayName || 'Usuario',
            userPhotoURL: currentUser!.isAnonymous ? null : currentUser!.photoURL,
            likes: 0,
            dislikes: 0,
            parentId: null,
            depth: 0,
        };
        transaction.set(newCommentRef, newCommentPayload);
      });

      // Play sound on success
      if (ratingSounds[data.rating]) {
        const audio = new Audio(ratingSounds[data.rating]);
        audio.play();
      }

      toast({
        title: '¡Opinión Publicada!',
        description: 'Gracias por compartir tu comentario y calificación.',
      });
      form.reset({text: '', rating: null as any});
    } catch (error) {
      console.error('Error al publicar comentario:', error);
      toast({
        variant: 'destructive',
        title: 'Error al Publicar',
        description: 'No se pudo enviar tu comentario. Inténtalo de nuevo.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <MessageSquare /> Opiniones y Discusión
        </CardTitle>
        <CardDescription>
          Comparte tu opinión sobre {figureName}. Sé respetuoso y mantén la conversación constructiva.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="rating"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Califica este perfil (0-5 estrellas)*</FormLabel>
                  <FormControl>
                    <StarInput 
                        value={field.value}
                        onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="text"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Escribe tu opinión*</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={`¿Qué opinas de ${figureName}?`}
                      className="resize-none"
                      rows={4}
                      maxLength={500}
                      {...field}
                    />
                  </FormControl>
                   <div className="flex justify-between items-center pt-1">
                    <FormMessage />
                    <div className="text-xs text-muted-foreground ml-auto">
                      {textValue.length} / 500
                    </div>
                  </div>
                </FormItem>
              )}
            />
            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Send />
                )}
                Publicar Opinión
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
