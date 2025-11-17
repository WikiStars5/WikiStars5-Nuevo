
'use client';

import { useState, useContext, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { collection, serverTimestamp, doc, runTransaction, increment, query, where, orderBy, limit, getDocs, getDoc } from 'firebase/firestore';
import { useAuth, useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, MessageSquare, Send, Flame, Lock } from 'lucide-react';
import StarInput from './star-input';
import { Comment, Streak, GlobalSettings, Figure } from '@/lib/types';
import { updateStreak } from '@/firebase/streaks';
import { StreakAnimationContext } from '@/context/StreakAnimationContext';
import { LoginPromptDialog } from '@/components/shared/login-prompt-dialog';
import Image from 'next/image';

const createCommentSchema = (isRatingEnabled: boolean) => z.object({
  text: z.string().min(5, 'El comentario debe tener al menos 5 caracteres.').max(500, 'El comentario no puede superar los 500 caracteres.'),
  rating: isRatingEnabled
    ? z.number({ required_error: 'Debes seleccionar una calificación.' }).min(0, 'La calificación es obligatoria.').max(5, 'La calificación debe estar entre 0 y 5.')
    : z.number().optional().nullable(),
});

type CommentFormValues = z.infer<ReturnType<typeof createCommentSchema>>;

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

  const settingsDocRef = useMemoFirebase(() => firestore ? doc(firestore, 'settings', 'global') : null, [firestore]);
  const { data: globalSettings } = useDoc<GlobalSettings>(settingsDocRef);
  const isRatingEnabled = (globalSettings?.isRatingEnabled ?? true);
  
  const form = useForm<CommentFormValues>({
    resolver: zodResolver(createCommentSchema(isRatingEnabled)),
    defaultValues: { text: '', rating: null },
  });

  useEffect(() => {
    form.reset(form.getValues());
  }, [isRatingEnabled, form]);


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
      const newRating = isRatingEnabled ? data.rating : -1;

      // Find the user's previous comment with a rating outside the transaction.
      const previousCommentsQuery = query(
          commentsColRef,
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc')
      );
      const previousCommentSnapshot = await getDocs(previousCommentsQuery);
      const previousRatingComment = previousCommentSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as Comment))
          .find(comment => typeof comment.rating === 'number' && comment.rating >= 0);

      await runTransaction(firestore, async (transaction) => {
        const userProfileRef = doc(firestore, 'users', user!.uid);
        
        const [figureDoc, userProfileSnap] = await Promise.all([
          transaction.get(figureRef),
          transaction.get(userProfileRef)
        ]);
        
        if (!figureDoc.exists()) throw new Error("Figure not found.");
        
        const userProfileData = userProfileSnap.exists() ? userProfileSnap.data() : {};
        displayName = displayName || userProfileData.username || 'Usuario';
        
        const updates: { [key: string]: any } = { updatedAt: serverTimestamp() };

        if (isRatingEnabled && typeof newRating === 'number' && newRating >= 0) {
            if (previousRatingComment) {
                const oldRating = previousRatingComment.rating;
                if (typeof oldRating === 'number' && oldRating >= 0 && oldRating !== newRating) {
                    // Case B: Changing a rating
                    updates.totalRating = increment(newRating - oldRating);
                    updates[`ratingsBreakdown.${oldRating}`] = increment(-1);
                    updates[`ratingsBreakdown.${newRating}`] = increment(1);
                    updates.__ratingCount_delta = 0; // Count doesn't change
                    updates.__totalRating_delta = newRating - oldRating;
                }
                // Void the old comment's rating regardless of whether the new rating is different.
                const oldCommentRef = doc(commentsColRef, previousRatingComment.id);
                transaction.update(oldCommentRef, { rating: -1, updatedAt: serverTimestamp() });
            } else {
                // Case A: Adding first rating
                updates.ratingCount = increment(1);
                updates.totalRating = increment(newRating);
                updates[`ratingsBreakdown.${newRating}`] = increment(1);
                updates.__ratingCount_delta = 1;
                updates.__totalRating_delta = newRating;
            }
            transaction.update(figureRef, updates);
        }
        
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
        };
        transaction.set(newCommentRef, newCommentPayload);
      });

      const streakResult = await updateStreak({
        firestore,
        figureId,
        figureName,
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

      if (isRatingEnabled && typeof data.rating === 'number' && ratingSounds[data.rating]) {
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
            description: error.message || 'No se pudo enviar tu comentario. Inténtalo de nuevo.',
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
              <Image
                src="https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/racha%2Ffire.gif?alt=media&token=c6eefbb1-b51c-48a4-ae20-7ca8bef2cf63"
                alt="Racha"
                width={28}
                height={28}
                unoptimized
              />
              {isRatingEnabled ? '¡Califica y Gana Rachas!' : '¡Comenta y Gana Rachas!'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {isRatingEnabled && (
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
              )}
              <FormField
              control={form.control}
              name="text"
              render={({ field }) => (
                  <FormItem>
                  <FormLabel>{isRatingEnabled ? 'Paso 2:' : ''} Escribe tu opinión*</FormLabel>
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
