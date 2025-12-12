'use client';

import { useState, useContext, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { collection, serverTimestamp, doc, runTransaction, increment, query, where, orderBy, limit, getDocs, getDoc, setDoc } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { useAuth, useFirestore, useUser, useDoc, useMemoFirebase, useCollection, setDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, MessageSquare, Send, Flame, Lock, Edit, MessageCircle, User as UserIcon, Tag } from 'lucide-react';
import StarInput from './star-input';
import { Comment, Streak, GlobalSettings, Figure, User as AppUser } from '@/lib/types';
import { updateStreak } from '@/firebase/streaks';
import { StreakAnimationContext } from '@/context/StreakAnimationContext';
import Image from 'next/image';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { normalizeText } from '@/lib/keywords';
import { cn } from '@/lib/utils';
import { LoginPromptDialog } from '../shared/login-prompt-dialog';
import { useLanguage } from '@/context/LanguageContext';
import { commentTags, type CommentTagId } from '@/lib/tags';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';


const createCommentSchema = (isRatingEnabled: boolean, isCommentingEnabled: boolean, needsIdentity: boolean) => z.object({
  rating: isRatingEnabled
    ? z.number({ required_error: 'Debes seleccionar una calificación.' }).min(0, 'La calificación es obligatoria.').max(5, 'La calificación debe estar entre 0 y 5.')
    : z.number().optional().nullable(),
  username: needsIdentity 
    ? z.string().min(3, 'El nombre de usuario debe tener al menos 3 caracteres.').max(10, 'El nombre de usuario no puede superar los 10 caracteres.').regex(/^[a-zA-Z0-9_]+$/, 'Solo se permiten letras, números y guiones bajos.')
    : z.string().optional(),
  title: z.string().max(80, 'El título no puede superar los 80 caracteres.').optional(),
  text: isCommentingEnabled
    ? z.string().min(5, 'El comentario debe tener al menos 5 caracteres.').max(500, 'El comentario no puede superar los 500 caracteres.')
    : z.string().optional(),
  tag: z.custom<CommentTagId>().optional(),
});

type CommentFormValues = z.infer<ReturnType<typeof createCommentSchema>>;

interface CommentFormProps {
  figureId: string;
  figureName: string;
  onCommentPosted: () => void; // Callback to refetch comments
}

const ratingSounds: { [key: number]: string } = {
    1: 'https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/star%20sound%2Fstar1.mp3?alt=media&token=c867fe4c-a39f-49a1-ab99-b6fdac84b2e8',
    2: 'https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/star%20sound%2Fstar2.mp3?alt=media&token=f0a09d9e-8a99-498b-b9ea-0a61b07e4173',
    3: 'https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/star%20sound%2Fstar3.mp3?alt=media&token=40943193-e45d-443d-9cc2-40ff8fa98076',
    4: 'https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/star%20sound%2Fstar4.mp3?alt=media&token=75b19307-5b2c-4c89-a252-b584727469da',
    5: 'https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/star%20sound%2Fstar5.mp3?alt=media&token=11cd84e2-7377-4972-a9b0-e0e716e2df46',
};


export default function CommentForm({ figureId, figureName, onCommentPosted }: CommentFormProps) {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showStreakAnimation } = useContext(StreakAnimationContext);
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [isTagPopoverOpen, setIsTagPopoverOpen] = useState(false);
  const { t } = useLanguage();

  const settingsDocRef = useMemoFirebase(() => firestore ? doc(firestore, 'settings', 'global') : null, [firestore]);
  const { data: globalSettings } = useDoc<GlobalSettings>(settingsDocRef);
  const isRatingEnabled = (globalSettings?.isRatingEnabled ?? true);
  const isCommentingEnabled = (globalSettings?.isCommentingEnabled ?? true);
  
  const userProfileRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc<AppUser>(userProfileRef);

  const needsIdentity = !user || (user.isAnonymous && !userProfile);

  const form = useForm<CommentFormValues>({
    resolver: zodResolver(createCommentSchema(isRatingEnabled, isCommentingEnabled, needsIdentity)),
    defaultValues: { text: '', rating: null, username: '', title: '', tag: undefined },
  });

  const existingCommentQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'figures', figureId, 'comments'),
      where('userId', '==', user.uid),
      limit(1)
    );
  }, [firestore, user, figureId]);

  const { data: existingComments, isLoading: isCheckingComment, refetch: refetchExistingComment } = useCollection<Comment>(existingCommentQuery);
  
  const existingComment = existingComments && existingComments.length > 0 ? existingComments[0] : null;

  useEffect(() => {
    form.reset(form.getValues());
  }, [isRatingEnabled, isCommentingEnabled, needsIdentity, form]);


  const textValue = form.watch('text', '');
  const selectedTagId = form.watch('tag');
  const selectedTag = selectedTagId ? commentTags.find(t => t.id === selectedTagId) : null;


  const onSubmit = async (data: CommentFormValues) => {
    let currentUser = user;
    if (!currentUser && auth) {
      try {
        setIsSubmitting(true);
        const userCredential = await signInAnonymously(auth);
        currentUser = userCredential.user;
      } catch (error) {
        toast({ title: t('AttitudeVoting.authErrorToast.title'), description: t('AttitudeVoting.authErrorToast.description'), variant: "destructive"});
        setIsSubmitting(false);
        return;
      }
    }
    
    if (!firestore || !currentUser) {
        toast({ title: t('CommentForm.toast.errorPostingTitle'), variant: "destructive" });
        setIsSubmitting(false);
        return;
    }
    
    setIsSubmitting(true);

    try {
        const commentsColRef = collection(firestore, 'figures', figureId, 'comments');
        const existingCommentSnap = await getDocs(query(commentsColRef, where('userId', '==', currentUser.uid), limit(1)));
        if (!existingCommentSnap.empty) {
            toast({ title: 'Error', description: t('CommentForm.toast.alreadyCommented'), variant: 'destructive' });
            setIsSubmitting(false);
            return;
        }

        const userRef = doc(firestore, 'users', currentUser.uid);
        let userProfileSnap = await getDoc(userRef);
        let finalDisplayName = userProfileSnap.exists() ? userProfileSnap.data().username : currentUser.displayName || `${t('ProfilePage.guestUser')}_${currentUser.uid.substring(0,4)}`;
        let userProfileData: Partial<AppUser> = userProfileSnap.exists() ? userProfileSnap.data() : {};
        
        if (needsIdentity && data.username) {
            const newUsername = data.username;
            const newUsernameLower = normalizeText(newUsername);
            const newUsernameRef = doc(firestore, 'usernames', newUsernameLower);
            const usernameDoc = await getDoc(newUsernameRef);
            
            if (usernameDoc.exists()) {
                form.setError('username', { type: 'manual', message: t('CommentForm.toast.usernameInUse') });
                setIsSubmitting(false);
                return;
            }
            await setDoc(newUsernameRef, { userId: currentUser.uid });
            finalDisplayName = newUsername;
            userProfileData = {
                ...userProfileData,
                username: newUsername,
                usernameLower: newUsernameLower,
                createdAt: serverTimestamp(),
            };
            await setDoc(userRef, userProfileData, { merge: true });
        }
        
        const country = userProfileData.country || null;
        const gender = userProfileData.gender || null;
        const newRating = isRatingEnabled && typeof data.rating === 'number' ? data.rating : -1;

        // --- Figure Document Updates ---
        if (newRating >= 0) {
            const figureRef = doc(firestore, 'figures', figureId);
            const figureUpdates = {
                ratingCount: increment(1),
                totalRating: increment(newRating),
                [`ratingsBreakdown.${newRating}`]: increment(1),
            };
            updateDocumentNonBlocking(figureRef, figureUpdates);
            
            if(country){
              const ratingStatRef = doc(firestore, `figures/${figureId}/ratingStats`, String(newRating));
              const ratingStatUpdates = {
                  [country]: {
                      total: increment(1),
                      [gender || 'unknown']: increment(1)
                  }
              };
              setDocumentNonBlocking(ratingStatRef, ratingStatUpdates, { merge: true });
            }
        }
      
        // --- Create Comment Document ---
        const newCommentRef = doc(commentsColRef);
        const newCommentPayload = {
            threadId: newCommentRef.id, figureId: figureId, userId: currentUser.uid,
            title: data.title || '',
            text: data.text || '', 
            tag: data.tag || null,
            rating: newRating,
            createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
            userDisplayName: finalDisplayName, userPhotoURL: currentUser.isAnonymous ? null : currentUser.photoURL,
            userCountry: country, userGender: gender,
            likes: 0, dislikes: 0, parentId: null, replyCount: 0,
        };
        setDocumentNonBlocking(newCommentRef, newCommentPayload);

        // --- Post-Operation Actions ---
        const streakResult = await updateStreak({
            firestore, figureId, figureName, userId: currentUser.uid,
            userDisplayName: finalDisplayName, userPhotoURL: currentUser.isAnonymous ? null : currentUser.photoURL,
            isAnonymous: currentUser.isAnonymous,
        });

        if (streakResult?.streakGained) {
            showStreakAnimation(streakResult.newStreakCount);
        }

        if (newRating >= 0 && ratingSounds[newRating]) {
            const audio = new Audio(ratingSounds[newRating]);
            audio.play();
        }

        toast({ title: t('CommentForm.toast.opinionPosted'), description: t('CommentForm.toast.thanks') });
        form.reset({ text: '', rating: null as any, username: '', title: '', tag: undefined });
        onCommentPosted();
        refetchExistingComment();
    } catch (error: any) {
        console.error('Error al publicar comentario:', error);
        toast({
            variant: 'destructive',
            title: t('CommentForm.toast.errorPostingTitle'),
            description: t('CommentForm.toast.errorPostingDescription'),
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
          <h3 className="font-semibold">{t('CommentForm.existingComment.title')}</h3>
          <p className="text-sm text-muted-foreground">{t('CommentForm.existingComment.description')}</p>
           <Button asChild variant="outline">
              <Link href={`#comment-${existingComment.id}`}>
                <Edit className="mr-2 h-4 w-4" />
                {t('CommentForm.existingComment.goToComment')}
              </Link>
           </Button>
        </CardContent>
      </Card>
    )
  }

  // If both ratings and comments are disabled, show a locked message.
  if (!isRatingEnabled && !isCommentingEnabled) {
      return (
        <Card className="dark:bg-black">
            <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                <Lock className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-semibold text-lg">{t('CommentForm.locked.title')}</h3>
                <p className="text-sm text-muted-foreground">{t('CommentForm.locked.description')}</p>
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
                width={24}
                height={24}
                unoptimized
                className="h-6 w-6"
            />
            {t('CommentForm.title')}
          </CardTitle>
          <CardDescription>{t('CommentForm.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {isRatingEnabled && (
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
                )}
                
                <div className="flex items-center gap-4">
                    <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                            <FormItem className="flex-1">
                            <FormControl>
                                <Input placeholder="Título de tu opinión (opcional)" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />

                    <FormField
                        control={form.control}
                        name="tag"
                        render={({ field }) => (
                            <FormItem>
                                <Popover open={isTagPopoverOpen} onOpenChange={setIsTagPopoverOpen}>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button
                                                variant="outline"
                                                role="combobox"
                                                className={cn("w-[150px] justify-between", !field.value && "text-muted-foreground")}
                                            >
                                                {selectedTag ? (
                                                    <span className="flex items-center gap-2">{selectedTag.emoji} {selectedTag.label}</span>
                                                ) : (
                                                    <span className="flex items-center gap-2"><Tag className="h-4 w-4"/>Añadir Etiqueta</span>
                                                )}
                                            </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[300px] p-0">
                                        <div className="grid grid-cols-2 gap-2 p-2">
                                            {commentTags.map(tag => (
                                                <Button
                                                    key={tag.id}
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    className={cn("transition-all h-10 text-xs justify-start", selectedTagId === tag.id ? `${tag.color} border-2 font-bold` : 'border-dashed')}
                                                    onClick={() => {
                                                        field.onChange(selectedTagId === tag.id ? undefined : tag.id);
                                                        setIsTagPopoverOpen(false);
                                                    }}
                                                >
                                                    <span className="mr-1.5">{tag.emoji}</span> {tag.label}
                                                </Button>
                                            ))}
                                        </div>
                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
              

                {isCommentingEnabled && (
                  <div className="space-y-2">
                    <FormField
                      control={form.control}
                      name="text"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Textarea
                              placeholder={`${t('CommentForm.opinionPlaceholder', {name: figureName})}...`}
                              className="resize-none"
                              rows={3}
                              maxLength={500}
                              {...field}
                            />
                          </FormControl>
                          <div className="flex justify-end items-center pt-1">
                            <FormMessage />
                            <div className="text-xs text-muted-foreground ml-auto">
                              {textValue.length} / 500
                            </div>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                )}

              {needsIdentity && (
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('CommentForm.usernameLabel')}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={t('CommentForm.usernamePlaceholder')} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <div className="flex justify-end">
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                    <Loader2 className="animate-spin" />
                    ) : (
                    <Send />
                    )}
                    {t('CommentForm.submitButton')}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
  );
}
