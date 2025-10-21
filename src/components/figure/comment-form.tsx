'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { collection, serverTimestamp, doc, runTransaction, increment } from 'firebase/firestore';
import { addDocumentNonBlocking, useAuth, useFirestore, useUser } from '@/firebase';
import { initiateAnonymousSignIn } from '@/firebase/non-blocking-login';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, MessageSquare, Send } from 'lucide-react';
import { onAuthStateChanged, User as FirebaseUser, Auth } from 'firebase/auth';
import StarInput from './star-input';

const commentSchema = z.object({
  text: z.string().min(1, 'El comentario no puede estar vacío.').max(1000, 'El comentario no puede superar los 1000 caracteres.'),
  rating: z.number().min(0).max(5, 'La calificación debe estar entre 0 y 5.'),
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

export default function CommentForm({ figureId, figureName }: CommentFormProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CommentFormValues>({
    resolver: zodResolver(commentSchema),
    defaultValues: { text: '', rating: 0 },
  });

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

      await runTransaction(firestore, async (transaction) => {
        const newCommentRef = doc(commentsColRef);

        const newComment = {
            figureId: figureId,
            userId: currentUser.uid,
            text: data.text,
            rating: data.rating,
            createdAt: serverTimestamp(),
            userDisplayName: currentUser.isAnonymous ? 'Anónimo' : currentUser.displayName || 'Usuario',
            userPhotoURL: currentUser.isAnonymous ? null : currentUser.photoURL,
            likes: 0,
            dislikes: 0,
            parentId: null, // This is a top-level comment
            depth: 0, // Top-level comments have depth 0
        };
        
        transaction.set(newCommentRef, newComment);

        const ratingKey = `ratingsBreakdown.${data.rating}`;
        transaction.update(figureRef, {
            ratingCount: increment(1),
            totalRating: increment(data.rating),
            [ratingKey]: increment(1),
        });
      });


      toast({
        title: '¡Opinión Publicada!',
        description: 'Gracias por compartir tu comentario y calificación.',
      });
      form.reset({text: '', rating: 0});
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
                      {...field}
                    />
                  </FormControl>
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
