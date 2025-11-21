
'use client';

import { useState, useContext, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { collection, serverTimestamp, doc, runTransaction, increment, query, where, orderBy, limit, getDocs, getDoc } from 'firebase/firestore';
import { useAuth, useFirestore, useUser, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, MessageSquare, Send, Flame, Lock, Edit, MessageCircle, User as UserIcon } from 'lucide-react';
import StarInput from './star-input';
import { Comment, Streak, GlobalSettings, Figure } from '@/lib/types';
import { updateStreak } from '@/firebase/streaks';
import { StreakAnimationContext } from '@/context/StreakAnimationContext';
import Image from 'next/image';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { normalizeText } from '@/lib/keywords';
import { cn } from '@/lib/utils';

const createCommentSchema = (isRatingEnabled: boolean, needsIdentity: boolean) => z.object({
  rating: isRatingEnabled
    ? z.number({ required_error: 'Debes seleccionar una calificación.' }).min(0, 'La calificación es obligatoria.').max(5, 'La calificación debe estar entre 0 y 5.')
    : z.number().optional().nullable(),
  username: needsIdentity 
    ? z.string().min(3, 'El nombre de usuario debe tener al menos 3 caracteres.').max(30, 'El nombre de usuario no puede superar los 30 caracteres.').regex(/^[a-zA-Z0-9_]+$/, 'Solo se permiten letras, números y guiones bajos.')
    : z.string().optional(),
  text: z.string().min(5, 'El comentario debe tener al menos 5 caracteres.').max(500, 'El comentario no puede superar los 500 caracteres.'),
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
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showStreakAnimation } = useContext(StreakAnimationContext);

  const settingsDocRef = useMemoFirebase(() => firestore ? doc(firestore, 'settings', 'global') : null, [firestore]);
  const { data: globalSettings } = useDoc<GlobalSettings>(settingsDocRef);
  const isRatingEnabled = (globalSettings?.isRatingEnabled ?? true);
  
  const userProfileRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const needsIdentity = !!user?.isAnonymous && !userProfile;

  const form = useForm<CommentFormValues>({
    resolver: zodResolver(createCommentSchema(isRatingEnabled, needsIdentity)),
    defaultValues: { text: '', rating: null, username: '' },
  });

  const existingCommentQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'figures', figureId, 'comments'),
      where('userId', '==', user.uid),
      limit(1)
    );
  }, [firestore, user, figureId]);

  const { data: existingComments, isLoading: isCheckingComment } = useCollection<Comment>(existingCommentQuery);
  
  const existingComment = existingComments && existingComments.length > 0 ? existingComments[0] : null;

  useEffect(() => {
    form.reset(form.getValues());
  }, [isRatingEnabled, needsIdentity, form]);


  const textValue = form.watch('text', '');

  const onSubmit = async (data: CommentFormValues) => {
    if (!firestore || !user) {
        toast({ title: "Debes iniciar sesión para comentar.", variant: "destructive" });
        return;
    }
    setIsSubmitting(true);
    form.clearErrors('username');
    
    let transactionError: string | null = null;

    try {
      await runTransaction(firestore, async (transaction) => {
        const figureRef = doc(firestore, 'figures', figureId);
        const commentsColRef = collection(firestore, 'figures', figureId, 'comments');
        const newRating = isRatingEnabled ? data.rating : -1;
        
        const existingCommentSnap = await getDocs(query(commentsColRef, where('userId', '==', user.uid), limit(1)));
        if (!existingCommentSnap.empty) {
          transactionError = 'Ya has comentado en este perfil.';
          return; // Abort transaction
        }

        let userProfileData: any = {};
        let displayName = user.displayName || 'Invitado';

        if (needsIdentity && data.username) {
            const newUsername = data.username;
            const newUsernameLower = normalizeText(newUsername);
            const newUsernameRef = doc(firestore, 'usernames', newUsernameLower);
            const usernameDoc = await transaction.get(newUsernameRef);
            
            if (usernameDoc.exists()) {
                transactionError = 'El nombre de usuario ya está en uso.';
                return; // Abort transaction
            }
            transaction.set(newUsernameRef, { userId: user.uid });
            
            displayName = newUsername;
            userProfileData = {
                username: newUsername,
                usernameLower: newUsernameLower,
                createdAt: serverTimestamp(),
            };
            const userRef = doc(firestore, 'users', user.uid);
            transaction.set(userRef, userProfileData);
        } else if (userProfile) {
            displayName = userProfile.username;
            userProfileData = userProfile;
        } else if (!user.isAnonymous) {
            const userRef = doc(firestore, 'users', user.uid);
            const userSnap = await transaction.get(userRef);
            if (userSnap.exists()) {
                displayName = userSnap.data().username;
                userProfileData = userSnap.data();
            }
        }
        
        const updates: { [key: string]: any } = { updatedAt: serverTimestamp() };

        if (isRatingEnabled && typeof newRating === 'number' && newRating >= 0) {
            updates.ratingCount = increment(1);
            updates.totalRating = increment(newRating);
            updates[`ratingsBreakdown.${newRating}`] = increment(1);
            updates.__ratingCount_delta = 1;
            updates.__totalRating_delta = newRating;
            
            transaction.update(figureRef, updates);
        }
        
        const newCommentRef = doc(commentsColRef);
        const newCommentPayload: Omit<Comment, 'id' | 'createdAt'> & { createdAt: any } = {
            threadId: newCommentRef.id,
            figureId: figureId,
            userId: user!.uid,
            text: data.text,
            rating: newRating,
            createdAt: serverTimestamp(),
            userDisplayName: displayName,
            userPhotoURL: user.isAnonymous ? null : user.photoURL,
            userCountry: userProfileData.country || null,
            userGender: userProfileData.gender || null,
            likes: 0,
            dislikes: 0,
            parentId: null,
            replyCount: 0,
        };
        transaction.set(newCommentRef, newCommentPayload);
      });

      if (transactionError) {
        if (transactionError === 'El nombre de usuario ya está en uso.') {
          form.setError('username', { type: 'manual', message: transactionError });
        } else {
          toast({ title: 'Error', description: transactionError, variant: 'destructive' });
        }
        setIsSubmitting(false);
        return;
      }

      const streakResult = await updateStreak({
        firestore,
        figureId,
        figureName,
        userId: user.uid,
        userDisplayName: data.username || userProfile?.username || user.displayName || 'Invitado',
        userPhotoURL: user.isAnonymous ? null : user.photoURL,
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
      form.reset({text: '', rating: null as any, username: '' });
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
  
  if (isUserLoading || (user && (isCheckingComment || isProfileLoading))) {
    return (
      <Card>
        <CardContent className="p-6">
            <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    )
  }
  
  if (existingComment) {
    return (
      <Card className="bg-muted/50 dark:bg-black">
        <CardContent className="p-6 text-center space-y-3">
          <MessageCircle className="mx-auto h-8 w-8 text-muted-foreground" />
          <h3 className="font-semibold">Ya has dejado tu opinión</h3>
          <p className="text-sm text-muted-foreground">Solo se permite una reseña por perfil. Para dejar una nueva calificación, elimina tu comentario anterior.</p>
           <Button asChild variant="outline">
              <Link href={`#comment-${existingComment.id}`}>
                <Edit className="mr-2 h-4 w-4" />
                Ir a mi opinión
              </Link>
           </Button>
        </CardContent>
      </Card>
    )
  }


  return (
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
              ¡Califica, Comenta y Gana Rachas!
          </CardTitle>
          <CardDescription>Conviértete en un opinador completando los siguientes pasos.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className='space-y-4'>
                <h3 className="font-semibold flex items-center gap-2 text-primary"><span className='flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground text-sm font-bold'>1</span> Califica este perfil*</h3>
                 {isRatingEnabled ? (
                    <FormField
                      control={form.control}
                      name="rating"
                      render={({ field }) => (
                          <FormItem>
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
                  ) : <p className='text-sm text-muted-foreground'>(Las calificaciones están deshabilitadas actualmente)</p>}
              </div>

               {needsIdentity && (
                 <div className='space-y-4'>
                    <h3 className="font-semibold flex items-center gap-2"><span className='flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground text-sm font-bold'>2</span>Crea tu identidad de opinador</h3>
                     <FormField
                        control={form.control}
                        name="username"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Nombre de usuario*</FormLabel>
                                <FormControl>
                                    <Input {...field} placeholder="Elige un nombre único" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                        />
                 </div>
               )}

              <div className='space-y-4'>
                <h3 className={cn(
                  "font-semibold flex items-center gap-2",
                  needsIdentity && "text-muted-foreground"
                )}>
                  <span className={cn(
                    'flex items-center justify-center h-6 w-6 rounded-full text-sm font-bold',
                    needsIdentity ? 'bg-muted text-muted-foreground' : 'bg-primary text-primary-foreground'
                  )}>
                    {needsIdentity ? 3 : 2}
                  </span>
                  Escribe tu opinión*
                </h3>
                  <FormField
                    control={form.control}
                    name="text"
                    render={({ field }) => (
                        <FormItem>
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
              </div>

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
