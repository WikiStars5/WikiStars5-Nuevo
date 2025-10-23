'use client';

import { useState, useContext } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { collection, serverTimestamp, doc, runTransaction, increment, query, where, orderBy, limit, getDocs, getDoc } from 'firebase/firestore';
import { useAuth, useFirestore, useUser } from '@/firebase';
import { initiateAnonymousSignIn } from '@/firebase/non-blocking-login';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, MessageSquare, Send, User } from 'lucide-react';
import { onAuthStateChanged, User as FirebaseUser, Auth, updateProfile } from 'firebase/auth';
import StarInput from './star-input';
import { Comment, Streak } from '@/lib/types';
import { Input } from '../ui/input';
import { updateStreak } from '@/firebase/streaks';
import { StreakAnimationContext } from '@/context/StreakAnimationContext';
import { normalizeText } from '@/lib/keywords';

const baseCommentSchema = z.object({
  text: z.string().min(1, 'El comentario no puede estar vacío.').max(500, 'El comentario no puede superar los 500 caracteres.'),
  rating: z.number({ required_error: 'Debes seleccionar una calificación.' }).min(0, 'La calificación es obligatoria.').max(5, 'La calificación debe estar entre 0 y 5.'),
  username: z.string().optional(),
});

type CommentFormValues = z.infer<typeof baseCommentSchema>;

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
  const { user, reloadUser } = useUser();
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showStreakAnimation } = useContext(StreakAnimationContext);


  // A user is a "first-time anonymous" if they are not logged in OR if they are anonymous and haven't set a display name yet.
  const isFirstTimeAnonymous = (!user || (user.isAnonymous && !user.displayName));

  const commentSchema = isFirstTimeAnonymous
    ? baseCommentSchema.extend({
        username: z.string().min(3, 'El nombre de usuario debe tener al menos 3 caracteres.').max(20, 'El nombre no puede tener más de 20 caracteres.').regex(/^[a-zA-Z0-9_]+$/, 'Solo se permiten letras, números y guiones bajos.'),
      })
    : baseCommentSchema;


  const form = useForm<CommentFormValues>({
    resolver: zodResolver(commentSchema),
    defaultValues: { text: '', rating: null as any, username: user?.displayName || '' },
  });

  const textValue = form.watch('text', '');

  const onSubmit = async (data: CommentFormValues) => {
    if (!firestore || !auth) return;
    setIsSubmitting(true);
    form.clearErrors('username');

    try {
      let currentUser = user;
      if (!currentUser) {
        await initiateAnonymousSignIn(auth);
        currentUser = await getNextUser(auth);
      }
      
      const figureRef = doc(firestore, 'figures', figureId);
      const commentsColRef = collection(firestore, 'figures', figureId, 'comments');
      
      let displayName = currentUser.displayName;

      await runTransaction(firestore, async (transaction) => {
        // --- Username validation for first-time anonymous users ---
        if (isFirstTimeAnonymous && data.username) {
            const newUsername = data.username;
            const newUsernameLower = normalizeText(newUsername);
            const usernameRef = doc(firestore, 'usernames', newUsernameLower);
            const usernameDoc = await transaction.get(usernameRef);

            if (usernameDoc.exists()) {
                throw new Error('El nombre de usuario ya está en uso.');
            }
            // Reserve the username within the transaction
            transaction.set(usernameRef, { userId: currentUser!.uid });
            displayName = newUsername;
        }

        // --- Rating and Comment Logic ---
        const userProfileRef = doc(firestore, 'users', currentUser!.uid);
        const userProfileSnap = await transaction.get(userProfileRef);
        const userProfileData = userProfileSnap.exists() ? userProfileSnap.data() : {};
        
        displayName = displayName || userProfileData.username || 'Usuario';
        
        // Update user document if it doesn't exist or username is new
        if (isFirstTimeAnonymous && data.username) {
            transaction.set(userProfileRef, {
                username: data.username,
                usernameLower: normalizeText(data.username),
                createdAt: serverTimestamp()
            }, { merge: true });
        }


        const previousCommentsQuery = query(
            commentsColRef,
            where('userId', '==', currentUser!.uid),
            where('rating', '>=', 0),
            orderBy('rating'),
            orderBy('createdAt', 'desc'),
            limit(1)
        );
      
        const previousCommentSnapshot = await getDocs(previousCommentsQuery);
        const previousCommentDoc = previousCommentSnapshot.docs[0];
        const previousComment = previousCommentDoc?.data() as Comment | undefined;

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
            transaction.update(previousCommentDoc.ref, { rating: -1 });
          }
        } else {
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
            userDisplayName: displayName,
            userPhotoURL: currentUser!.isAnonymous ? null : currentUser!.photoURL,
            userCountry: userProfileData.country || null,
            userGender: userProfileData.gender || null,
            likes: 0,
            dislikes: 0,
            parentId: null,
            depth: 0,
        };
        transaction.set(newCommentRef, newCommentPayload);
      });

      // --- Post-Transaction Auth Update ---
       if (isFirstTimeAnonymous && data.username && currentUser.displayName !== data.username) {
            await updateProfile(currentUser, { displayName: data.username });
            await reloadUser();
      }

      // --- Streak Update ---
      const streakResult = await updateStreak({
        firestore,
        figureId,
        userId: currentUser.uid,
        userDisplayName: displayName!,
        userPhotoURL: currentUser.photoURL,
        userCountry: (await getDoc(doc(firestore, 'users', currentUser.uid))).data()?.country || null,
        userGender: (await getDoc(doc(firestore, 'users', currentUser.uid))).data()?.gender || null,
        isAnonymous: currentUser.isAnonymous,
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
      form.reset({text: '', rating: null as any, username: data.username || user?.displayName });
    } catch (error: any) {
      console.error('Error al publicar comentario:', error);
      if (error.message === 'El nombre de usuario ya está en uso.') {
        form.setError('username', { type: 'manual', message: error.message });
      } else {
         toast({
            variant: 'destructive',
            title: 'Error al Publicar',
            description: 'No se pudo enviar tu comentario. Inténtalo de nuevo.',
        });
      }
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
            {isFirstTimeAnonymous && (
              <Card className="bg-muted/50">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">¡Únete a la conversación!</CardTitle>
                  <CardDescription>Para comentar, elige un nombre de usuario único. Esto también activará tus rachas de comentarios.</CardDescription>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre de Usuario*</FormLabel>
                        <FormControl>
                          <Input placeholder="Tu nombre público" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            )}

            <FormField
              control={form.control}
              name="rating"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Paso 2: Califica este perfil*</FormLabel>
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
                  <FormLabel>Paso 3: Escribe tu opinión*</FormLabel>
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

    