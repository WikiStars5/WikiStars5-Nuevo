'use client';

import { useState, useContext } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { collection, serverTimestamp, doc, runTransaction, increment, query, where, orderBy, limit, getDocs, getDoc } from 'firebase/firestore';
import { useAuth, useFirestore, useUser } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, MessageSquare, Send } from 'lucide-react';
import StarInput from './star-input';
import { Comment, Streak } from '@/lib/types';
import { updateStreak } from '@/firebase/streaks';
import { StreakAnimationContext } from '@/context/StreakAnimationContext';
import { LoginPromptDialog } from '@/components/shared/login-prompt-dialog';

const commentSchema = z.object({
  text: z.string().min(5, 'El comentario debe tener al menos 5 caracteres.').max(500, 'El comentario no puede superar los 500 caracteres.'),
  rating: z.number({ required_error: 'Debes seleccionar una calificación.' }).min(0, 'La calificación es obligatoria.').max(5, 'La calificación debe estar entre 0 y 5.'),
});

type CommentFormValues = z.infer<typeof commentSchema>;

interface CommentFormProps {
  figureId: string;
  figureName: string;
}

const ratingSounds: { [key: number]: string } = {
    1: 'https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/star%20sound%2Fstar1.mp3?alt=media&token=c867fe4c-a39f-49a1-ab99-b6fdac84b2e8',
    2: 'https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/star%20sound%2Fstar2.mp3?alt=media&token=f0a09d9e-8a99-498b-b9ea-0a61b07e4173',
    3: 'https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/star%20sound%2Fstar3.mp3?alt=media&token=40943193-e45d-443d-9cc2-40ff8fa98076',
    4: 'https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/star%20sound%2Fstar4.mp3?alt=media&token=75b19307-5b2c-4c89-a252-b584727469da',
    5: 'https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/star%20sound%2Fstar5.mp3?alt=media&token=11cd84e2-7377-4972-a9b0-e0e716e2df46',
};


export default function CommentForm({ figureId, figureName }: CommentFormProps) {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const { showStreakAnimation } = useContext(StreakAnimationContext);


  const form = useForm<CommentFormValues>({
    resolver: zodResolver(commentSchema),
    defaultValues: { text: '', rating: null as any },
  });

  const textValue = form.watch('text', '');

  const onSubmit = async (data: CommentFormValues) => {
    if (!firestore || !user) {
        setShowLoginDialog(true);
        return;
    }
    setIsSubmitting(true);
    
    try {
      const figureRef = doc(firestore, 'figures', figureId);
      const commentsColRef = collection(firestore, 'figures', figureId, 'comments');
      
      let displayName = user.displayName;

      await runTransaction(firestore, async (transaction) => {
        const userProfileRef = doc(firestore, 'users', user!.uid);
        const [figureDoc, userProfileSnap, previousCommentSnapshot] = await Promise.all([
          transaction.get(figureRef),
          transaction.get(userProfileRef),
          getDocs(query(
            commentsColRef,
            where('userId', '==', user!.uid),
            where('rating', '>=', 0),
            orderBy('rating'),
            orderBy('createdAt', 'desc'),
            limit(1)
          ))
        ]);
        
        if (!figureDoc.exists()) throw new Error("Figure not found.");
        
        const userProfileData = userProfileSnap.exists() ? userProfileSnap.data() : {};
        displayName = displayName || userProfileData.username || 'Usuario';
        
        const previousCommentDoc = previousCommentSnapshot.docs[0];
        const previousComment = previousCommentDoc?.data() as Comment | undefined;

        const updates: { [key: string]: any } = {};
        const newRating = data.rating;

        if (previousComment && typeof previousComment.rating === 'number' && previousComment.rating >= 0) {
          const oldRating = previousComment.rating;
          if (oldRating !== newRating) {
            updates['totalRating'] = increment(newRating - oldRating);
            updates[`ratingsBreakdown.${oldRating}`] = increment(-1);
            updates[`ratingsBreakdown.${newRating}`] = increment(1);
            transaction.update(previousCommentDoc.ref, { rating: -1 });
          }
        } else {
          updates['ratingCount'] = increment(1);
          updates['totalRating'] = increment(newRating);
          updates[`ratingsBreakdown.${newRating}`] = increment(1);
        }

        transaction.update(figureRef, updates);
        
        const newCommentRef = doc(commentsColRef);
        const newCommentPayload: Omit<Comment, 'id' | 'children' | 'createdAt'> & { createdAt: any } = {
            threadId: newCommentRef.id,
            figureId: figureId,
            userId: user!.uid,
            text: data.text,
            rating: newRating,
            createdAt: serverTimestamp(),
            userDisplayName: displayName!,
            userPhotoURL: user!.photoURL,
            userCountry: userProfileData.country || null,
            userGender: userProfileData.gender || null,
            likes: 0,
            dislikes: 0,
            parentId: null,
            depth: 0,
        };
        transaction.set(newCommentRef, newCommentPayload);
      });

      const streakResult = await updateStreak({
        firestore,
        figureId,
        userId: user.uid,
        userDisplayName: displayName!,
        userPhotoURL: user.photoURL,
        userCountry: (await getDoc(doc(firestore, 'users', user.uid))).data()?.country || null,
        userGender: (await getDoc(doc(firestore, 'users', user.uid))).data()?.gender || null,
        isAnonymous: user.isAnonymous,
      });

      if (streakResult?.streakGained) {
        showStreakAnimation(streakResult.newStreakCount);
      }

      if (ratingSounds[data.rating]) {
        const audio = new Audio(ratingSounds[data.rating]);
        audio.play();
      }

      toast({
        title: '¡Opinión Publicada!',
        description: 'Gracias por compartir tu comentario y calificación.',
      });
      form.reset({text: '', rating: null as any});
    } catch (error: any) {
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
    <LoginPromptDialog open={showLoginDialog} onOpenChange={setShowLoginDialog}>
      <Card className="dark:bg-black">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
              <MessageSquare /> Calificaciones y cometarios
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
              control={form.control}
              name="rating"
              render={({ field }) => (
                  <FormItem>
                  <FormLabel>Paso 1: Califica este perfil*</FormLabel>
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
                  <FormLabel>Paso 2: Escribe tu opinión*</FormLabel>
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
    </LoginPromptDialog>
  );
}
