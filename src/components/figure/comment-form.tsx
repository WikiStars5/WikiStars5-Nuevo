'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { collection, serverTimestamp } from 'firebase/firestore';
import { addDocumentNonBlocking, useAuth, useFirestore, useUser } from '@/firebase';
import { initiateAnonymousSignIn } from '@/firebase/non-blocking-login';
import type { Figure } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, MessageSquare, Send } from 'lucide-react';
import { onAuthStateChanged, User as FirebaseUser, Auth } from 'firebase/auth';

const commentSchema = z.object({
  text: z.string().min(1, 'El comentario no puede estar vacío.').max(1000, 'El comentario no puede superar los 1000 caracteres.'),
});

type CommentFormValues = z.infer<typeof commentSchema>;

interface CommentFormProps {
  figure: Figure;
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


export default function CommentForm({ figure }: CommentFormProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CommentFormValues>({
    resolver: zodResolver(commentSchema),
    defaultValues: { text: '' },
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

      const commentsColRef = collection(firestore, 'figures', figure.id, 'comments');
      const newComment = {
        figureId: figure.id,
        userId: currentUser.uid,
        text: data.text,
        createdAt: serverTimestamp(),
        userDisplayName: currentUser.isAnonymous ? 'Anónimo' : currentUser.displayName || 'Usuario',
        userPhotoURL: currentUser.isAnonymous ? null : currentUser.photoURL,
      };

      await addDocumentNonBlocking(commentsColRef, newComment);

      toast({
        title: '¡Opinión Publicada!',
        description: 'Gracias por compartir tu comentario.',
      });
      form.reset();
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
          Comparte tu opinión sobre {figure.name}. Sé respetuoso y mantén la conversación constructiva.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="text"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="sr-only">Escribe tu opinión</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={`¿Qué opinas de ${figure.name}?`}
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
