'use client';

import { useState, useContext, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  collection, 
  serverTimestamp, 
  doc, 
  runTransaction, 
  increment, 
  query, 
  where, 
  limit, 
  getDocs, 
  getDoc
} from 'firebase/firestore';
import { signInAnonymously, User as FirebaseUser } from 'firebase/auth';
import { useAuth, useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send, Tag, XCircle, AlertCircle, Trash2, Pencil, Save, X } from 'lucide-react';
import StarInput from '@/components/figure/star-input';
import { Figure, User as AppUser, Comment, AttitudeVote } from '@/lib/types';
import { updateStreak } from '@/firebase/streaks';
import { StreakAnimationContext } from '@/context/StreakAnimationContext';
import { normalizeText } from '@/lib/keywords';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/context/LanguageContext';
import { commentTags, type CommentTagId } from '@/lib/tags';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import FigureSearchInput from '@/components/figure/figure-search-input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useTheme } from 'next-themes';
import { StarRating } from './star-rating';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ShareButton } from './ShareButton';
import Image from 'next/image';

const attitudeOptions: {
  id: 'neutral' | 'fan' | 'simp' | 'hater';
  label: string;
  gifUrl: string;
  selectedClass: string;
}[] = [
  { id: 'neutral', label: 'Espectador', gifUrl: 'https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/actitud%2Fneutral.png?alt=media&token=aac1fe00-4e42-49d1-98a2-3dab605987d3', selectedClass: 'border-gray-400 bg-gray-400/10' },
  { id: 'fan', label: 'Fan', gifUrl: 'https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/actitud%2Ffan.png?alt=media&token=a937aee9-04b6-48e8-bf37-25eef5f28e90', selectedClass: 'border-yellow-300 bg-yellow-300/10' },
  { id: 'simp', label: 'Simp', gifUrl: 'https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/actitud%2Fsimp.png?alt=media&token=2575cc73-9b85-4571-9983-3681c7741be3', selectedClass: 'border-pink-300 bg-pink-300/10' },
  { id: 'hater', label: 'Hater', gifUrl: 'https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/actitud%2Fhater2.png?alt=media&token=141e1c39-fbf2-4a35-b1ae-570dbed48d81', selectedClass: 'border-red-400 bg-red-400/10' },
];

const createCommentSchema = (needsIdentity: boolean) => z.object({
  rating: z.number({ required_error: 'Debes seleccionar una calificación.' }).min(0).max(5),
  attitude: z.enum(['neutral', 'fan', 'simp', 'hater']).optional(),
  username: needsIdentity 
    ? z.string().min(3, 'Mínimo 3 caracteres.').max(15, 'Máximo 15 caracteres.').regex(/^[a-zA-Z0-9_]+$/, 'Solo letras, números y guiones bajos.')
    : z.string().optional(),
  text: z.string().max(500, 'Máximo 500 caracteres.').optional(),
  tag: z.custom<CommentTagId>().optional(),
});

type CommentFormValues = z.infer<ReturnType<typeof createCommentSchema>>;

export default function GlobalStarPostForm() {
  const { user, reloadUser } = useUser();
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const { theme } = useTheme();
  const { showStreakAnimation } = useContext(StreakAnimationContext);

  const [selectedFigure, setSelectedFigure] = useState<Figure | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const [isTagPopoverOpen, setIsTagPopoverOpen] = useState(false);
  const [existingComment, setExistingComment] = useState<Comment | null>(null);
  const [existingAttitude, setExistingAttitude] = useState<string | null>(null);
  const [isCheckingExisting, setIsCheckingExisting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const userProfileRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile } = useDoc<AppUser>(userProfileRef);

  const username = userProfile?.username || '';
  const isDefaultName = 
    username.startsWith('user') || 
    username.startsWith('Invitado') || 
    username.startsWith('Guest') || 
    username.startsWith('Convidado');
    
  const needsIdentity = !username || isDefaultName;

  const form = useForm<CommentFormValues>({
    resolver: zodResolver(createCommentSchema(needsIdentity)),
    defaultValues: { text: '', rating: 5, attitude: 'neutral', username: '', tag: undefined },
  });

  useEffect(() => {
    const fetchExistingData = async () => {
      if (!firestore || !user || !selectedFigure) {
        setExistingComment(null);
        setExistingAttitude(null);
        setIsEditing(false);
        return;
      }

      setIsCheckingExisting(true);
      try {
        const commentsRef = collection(firestore, 'figures', selectedFigure.id, 'comments');
        const q = query(commentsRef, where('userId', '==', user.uid), limit(1));
        
        const attitudeRef = doc(firestore, `users/${user.uid}/attitudeVotes`, selectedFigure.id);

        const [commentSnap, attitudeSnap] = await Promise.all([
          getDocs(q),
          getDoc(attitudeRef)
        ]);
        
        if (!commentSnap.empty) {
          setExistingComment({ id: commentSnap.docs[0].id, ...commentSnap.docs[0].data() } as Comment);
        } else {
          setExistingComment(null);
          setIsEditing(false);
        }

        if (attitudeSnap.exists()) {
          const attitude = attitudeSnap.data().vote;
          setExistingAttitude(attitude);
          form.setValue('attitude', attitude);
        } else {
          setExistingAttitude(null);
          form.setValue('attitude', 'neutral');
        }
      } catch (error) {
        console.error("Error checking existing data:", error);
      } finally {
        setIsCheckingExisting(false);
      }
    };

    fetchExistingData();
  }, [selectedFigure, user, firestore, form]);

  const selectedTagId = form.watch('tag');
  const selectedTag = selectedTagId ? commentTags.find(t => t.id === selectedTagId) : null;
  const selectedAttitude = form.watch('attitude');

  const handleAttitudeChange = async (newAttitude: 'neutral' | 'fan' | 'simp' | 'hater') => {
    if (!selectedFigure || !firestore || isVoting) return;
    
    let currentUser = user;
    if (!currentUser && auth) {
        try {
            const userCredential = await signInAnonymously(auth);
            currentUser = userCredential.user;
            await reloadUser();
        } catch (error) {
            toast({ title: 'Error de autenticación', variant: "destructive" });
            return;
        }
    }

    if (!currentUser) return;

    setIsVoting(true);
    const oldAttitude = existingAttitude;
    const isRetracting = oldAttitude === newAttitude;

    try {
        await runTransaction(firestore, async (transaction) => {
            const figureRef = doc(firestore, 'figures', selectedFigure.id);
            const userRef = doc(firestore, 'users', currentUser!.uid);
            const attitudeRef = doc(firestore, `users/${currentUser!.uid}/attitudeVotes`, selectedFigure.id);

            const [figureSnap, userSnap] = await Promise.all([
                transaction.get(figureRef),
                transaction.get(userRef)
            ]);

            if (!figureSnap.exists()) throw new Error("Personaje no encontrado.");
            if (!userSnap.exists()) {
                transaction.set(userRef, { id: currentUser!.uid, createdAt: serverTimestamp() });
            }

            if (isRetracting) {
                transaction.update(figureRef, { [`attitude.${newAttitude}`]: increment(-1) });
                transaction.delete(attitudeRef);
            } else {
                if (oldAttitude) {
                    transaction.update(figureRef, { [`attitude.${oldAttitude}`]: increment(-1) });
                }
                transaction.update(figureRef, { [`attitude.${newAttitude}`]: increment(1) });
                transaction.set(attitudeRef, {
                    userId: currentUser!.uid,
                    figureId: selectedFigure.id,
                    vote: newAttitude,
                    createdAt: serverTimestamp(),
                    figureName: selectedFigure.name,
                    figureImageUrl: selectedFigure.imageUrl,
                    userCountry: userProfile?.country || null,
                    userGender: userProfile?.gender || null,
                });
            }
        });

        const streakResult = await updateStreak({
            firestore, figureId: selectedFigure.id, figureName: selectedFigure.name,
            userId: currentUser.uid, isAnonymous: currentUser.isAnonymous,
            userPhotoURL: currentUser.photoURL
        });

        if (streakResult?.streakGained) {
            showStreakAnimation(streakResult.newStreakCount, { 
                showPrompt: true, figureId: selectedFigure.id, figureName: selectedFigure.name
            });
        }

        setExistingAttitude(isRetracting ? null : newAttitude);
        form.setValue('attitude', isRetracting ? 'neutral' : newAttitude);
        toast({ title: isRetracting ? 'Voto eliminado' : '¡Voto registrado!' });

    } catch (error: any) {
        console.error(error);
        toast({ title: 'Error al votar', description: error.message, variant: 'destructive' });
    } finally {
        setIsVoting(false);
    }
  };

  const handleDeleteExisting = async () => {
    if (!firestore || !user || !selectedFigure || !existingComment) return;
    
    setIsDeleting(true);
    try {
      await runTransaction(firestore, async (transaction) => {
        const figureRef = doc(firestore, 'figures', selectedFigure.id);
        const commentRef = doc(firestore, 'figures', selectedFigure.id, 'comments', existingComment.id);
        const starpostRef = doc(firestore, 'users', user.uid, 'starposts', existingComment.id);

        const figureSnap = await transaction.get(figureRef);
        if (!figureSnap.exists()) throw new Error("Personaje no encontrado.");

        if (typeof existingComment.rating === 'number' && existingComment.rating >= 0) {
          transaction.update(figureRef, {
            ratingCount: increment(-1),
            totalRating: increment(-existingComment.rating),
            [`ratingsBreakdown.${existingComment.rating}`]: increment(-1),
            updatedAt: serverTimestamp()
          });
        }

        transaction.delete(commentRef);
        transaction.delete(starpostRef);
      });

      toast({ title: 'StarPost eliminado', description: 'Ahora puedes calificar de nuevo.' });
      setExistingComment(null);
      setIsEditing(false);
    } catch (error: any) {
      console.error("Error deleting existing comment:", error);
      toast({ title: 'Error', description: 'No se pudo eliminar el StarPost.', variant: 'destructive' });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditClick = () => {
    if (!existingComment) return;
    form.reset({
      rating: existingComment.rating,
      attitude: (existingAttitude as any) || 'neutral',
      text: existingComment.text || '',
      tag: existingComment.tag || undefined,
      username: userProfile?.username || '',
    });
    setIsEditing(true);
  };

  const handleSubmit = async (data: CommentFormValues) => {
    if (!selectedFigure) {
      toast({ title: 'Selecciona un personaje', description: 'Debes elegir a quién va dirigido tu StarPost.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    let currentUser = user;

    if (!currentUser && auth) {
      try {
        const userCredential = await signInAnonymously(auth);
        currentUser = userCredential.user;
        await reloadUser();
      } catch (error) {
        toast({ title: 'Error de autenticación', variant: "destructive" });
        setIsSubmitting(false);
        return;
      }
    }

    if (!currentUser || !firestore) {
      setIsSubmitting(false);
      return;
    }

    try {
      await runTransaction(firestore, async (transaction) => {
        const figureRef = doc(firestore, 'figures', selectedFigure.id);
        const userRef = doc(firestore, 'users', currentUser!.uid);
        
        const [figureSnap, userSnap] = await Promise.all([
          transaction.get(figureRef),
          transaction.get(userRef)
        ]);

        if (!figureSnap.exists()) throw new Error("Personaje no encontrado.");

        const userProfileData = userSnap.exists() ? userSnap.data() as AppUser : {};
        
        if (data.username && needsIdentity) {
          const usernameLower = normalizeText(data.username);
          const usernameRef = doc(firestore, 'usernames', usernameLower);
          const usernameDoc = await transaction.get(usernameRef);
          
          if (usernameDoc.exists() && usernameDoc.data()?.userId !== currentUser!.uid) {
            throw new Error(t('ProfilePage.toast.usernameInUse'));
          }

          transaction.set(userRef, { 
            username: data.username,
            usernameLower: usernameLower,
            id: currentUser!.uid,
            createdAt: userProfileData.createdAt || serverTimestamp()
          }, { merge: true });
          transaction.set(usernameRef, { userId: currentUser!.uid });
        }

        const finalDisplayName = data.username || userProfileData.username || currentUser!.displayName || `${t('ProfilePage.guestUser')}_${currentUser!.uid.substring(0,4)}`;
        const country = userProfileData.country || null;
        const gender = userProfileData.gender || null;

        if (existingComment && isEditing) {
          const oldRating = existingComment.rating;
          const newRating = data.rating;
          const ratingDelta = newRating - oldRating;

          const figureUpdates: any = { updatedAt: serverTimestamp() };
          if (ratingDelta !== 0) {
            figureUpdates.totalRating = increment(ratingDelta);
            figureUpdates[`ratingsBreakdown.${oldRating}`] = increment(-1);
            figureUpdates[`ratingsBreakdown.${newRating}`] = increment(1);
          }
          transaction.update(figureRef, figureUpdates);

          const commentRef = doc(firestore, 'figures', selectedFigure.id, 'comments', existingComment.id);
          transaction.update(commentRef, {
            text: data.text || '',
            tag: data.tag || null,
            rating: newRating,
            updatedAt: serverTimestamp(),
            userDisplayName: finalDisplayName,
            userAttitude: existingAttitude,
          });
        } else {
          transaction.update(figureRef, {
            ratingCount: increment(1),
            totalRating: increment(data.rating),
            [`ratingsBreakdown.${data.rating}`]: increment(1),
            updatedAt: serverTimestamp()
          });

          const commentRef = doc(collection(firestore, 'figures', selectedFigure.id, 'comments'));
          const commentData = {
            userId: currentUser!.uid,
            figureId: selectedFigure.id,
            figureName: selectedFigure.name,
            figureImageUrl: selectedFigure.imageUrl,
            text: data.text || '',
            tag: data.tag || null,
            rating: data.rating,
            createdAt: serverTimestamp(),
            userDisplayName: finalDisplayName,
            userPhotoURL: userProfileData.profilePhotoUrl || currentUser!.photoURL,
            userCountry: country,
            userGender: gender,
            userAttitude: existingAttitude,
            likes: 0,
            dislikes: 0,
            parentId: null,
            replyCount: 0,
            threadId: commentRef.id,
          };
          transaction.set(commentRef, commentData);

          const userStarpostColRef = collection(firestore, 'users', currentUser!.uid, 'starposts');
          const starpostRef = doc(userStarpostColRef, commentRef.id);
          transaction.set(starpostRef, {
            figureId: selectedFigure.id,
            commentId: commentRef.id,
            createdAt: serverTimestamp(),
          });
        }
      });

      const streakResult = await updateStreak({
        firestore, figureId: selectedFigure.id, figureName: selectedFigure.name,
        userId: currentUser.uid, isAnonymous: currentUser.isAnonymous,
        userPhotoURL: currentUser.photoURL
      });

      if (streakResult?.streakGained) {
        showStreakAnimation(streakResult.newStreakCount, { 
          showPrompt: true, figureId: selectedFigure.id, figureName: selectedFigure.name
        });
      }

      toast({ 
        title: isEditing ? '¡StarPost actualizado!' : '¡StarPost publicado!', 
        description: isEditing ? 'Tu opinión ha sido modificada.' : `Has calificado a ${selectedFigure.name}.` 
      });
      form.reset({ text: '', rating: 5, attitude: 'neutral', tag: undefined });
      setSelectedFigure(null);
      setExistingComment(null);
      setExistingAttitude(null);
      setIsEditing(false);

    } catch (error: any) {
      console.error(error);
      toast({ title: 'Error', description: error.message || 'No se pudo procesar el StarPost.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className={cn("mb-8 border-primary/20", (theme === 'dark' || theme === 'army') && "bg-black border-primary/40")}>
      <CardHeader className="pb-4">
        <CardTitle className="text-xl flex items-center gap-2">
          <Send className="text-primary h-5 w-5" />
          ¿A quién quieres calificar hoy?
        </CardTitle>
        <CardDescription>Publica un StarPost al instante sin salir del feed.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!selectedFigure ? (
          <FigureSearchInput onFigureSelect={setSelectedFigure} className="max-w-full" />
        ) : (
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-dashed">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border-2 border-primary/50">
                <AvatarImage src={selectedFigure.imageUrl} />
                <AvatarFallback>{selectedFigure.name[0]}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-bold text-sm">{selectedFigure.name}</p>
                <p className="text-xs text-muted-foreground">{selectedFigure.occupation || 'Figura pública'}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => {
              setSelectedFigure(null);
              setExistingComment(null);
              setExistingAttitude(null);
              setIsEditing(false);
            }}>
              <XCircle className="h-5 w-5" />
            </Button>
          </div>
        )}

        {selectedFigure && isCheckingExisting && (
          <div className="flex flex-col items-center justify-center py-8 gap-2 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
            <p className="text-sm">Verificando tu historial...</p>
          </div>
        )}

        {selectedFigure && !isCheckingExisting && existingComment && !isEditing && (
          <div className="p-6 border-2 border-dashed rounded-xl bg-muted/30 text-center animate-in fade-in zoom-in duration-300">
            <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="text-primary h-6 w-6" />
            </div>
            <h3 className="font-bold text-lg mb-2">Ya has calificado a {selectedFigure.name}</h3>
            <div className="flex flex-col items-center gap-3 mb-6">
              <div className="flex items-center gap-4">
                <StarRating rating={existingComment.rating} />
                {existingAttitude && (
                  <div className={cn("text-xs font-black uppercase px-2 py-0.5 rounded border", attitudeOptions.find(o => o.id === existingAttitude)?.selectedClass)}>
                    {attitudeOptions.find(o => o.id === (existingAttitude as any))?.label}
                  </div>
                )}
              </div>
              {existingComment.tag && (
                <div className="inline-flex items-center gap-2 text-xs font-bold px-3 py-1 rounded-full bg-primary/20 text-primary border border-primary/20">
                  {commentTags.find(t => t.id === existingComment.tag)?.emoji} {commentTags.find(t => t.id === existingComment.tag)?.label}
                </div>
              )}
              {existingComment.text && (
                <p className="text-sm text-muted-foreground italic max-w-xs line-clamp-2">
                  "{existingComment.text}"
                </p>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-4">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full" disabled={isDeleting}>
                    {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                    Eliminar
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Eliminar tu StarPost?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta acción no se puede deshacer. Se borrarán tus estrellas y tu opinión sobre {selectedFigure.name}.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteExisting}>Eliminar permanentemente</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <Button variant="outline" className="w-full" onClick={handleEditClick}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </Button>

              <ShareButton 
                figureId={selectedFigure.id} 
                figureName={selectedFigure.name} 
                isRatingShare={true} 
                rating={existingComment.rating}
                className="w-full"
              />
            </div>
          </div>
        )}

        {selectedFigure && !isCheckingExisting && ( (!existingComment) || (existingComment && isEditing) ) && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="space-y-3">
                <FormLabel className="text-xs font-bold text-muted-foreground uppercase tracking-widest">¿Cuál es tu actitud hacia él/ella?</FormLabel>
                <div className="grid grid-cols-4 gap-2">
                  {attitudeOptions.map((option) => {
                    const isSelected = selectedAttitude === option.id;
                    return (
                      <Button
                        key={option.id}
                        type="button"
                        variant="outline"
                        disabled={isVoting}
                        className={cn(
                          "h-20 flex-col gap-1 p-2 border-2 transition-all",
                          isSelected ? option.selectedClass : "hover:bg-muted/50 border-dashed"
                        )}
                        onClick={() => handleAttitudeChange(option.id)}
                      >
                        {isVoting && isSelected ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                            <>
                                <Image src={option.gifUrl} alt={option.label} width={32} height={32} unoptimized className="h-8 w-8" />
                                <span className="text-[10px] font-bold">{option.label}</span>
                            </>
                        )}
                      </Button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                <FormField
                  control={form.control}
                  name="rating"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-2">Calificación</FormLabel>
                      <FormControl>
                        <StarInput value={field.value} onChange={field.onChange} />
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
                      <FormLabel className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-2">Etiqueta</FormLabel>
                      <Popover open={isTagPopoverOpen} onOpenChange={setIsTagPopoverOpen}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className={cn("h-9 min-w-[100px]", !field.value && "text-muted-foreground")}>
                            {selectedTag ? `${selectedTag.emoji} ${selectedTag.label}` : <><Tag className="mr-2 h-4 w-4" /> Etiqueta</>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[300px] p-2" align="end">
                          <div className="grid grid-cols-2 gap-2">
                            {commentTags.map(tag => (
                              <Button
                                key={tag.id}
                                type="button"
                                variant="ghost"
                                size="sm"
                                className={cn("justify-start h-9 text-xs", selectedTagId === tag.id && "bg-muted")}
                                onClick={() => {
                                  form.setValue('tag', selectedTagId === tag.id ? undefined : tag.id);
                                  setIsTagPopoverOpen(false);
                                }}
                              >
                                <span className="mr-2">{tag.emoji}</span> {tag.label}
                              </Button>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </FormItem>
                  )}
                />
              </div>

              {needsIdentity && (
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Nombre de usuario para tu reseña</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Ej: FanReal_99" className="h-9" />
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
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder={`¿Qué tienes que decir sobre ${selectedFigure?.name}?`}
                        className="resize-none min-h-[80px]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2">
                {isEditing && (
                  <Button type="button" variant="ghost" onClick={() => setIsEditing(false)}>
                    Cancelar
                  </Button>
                )}
                <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  {isEditing ? 'Actualizar StarPost' : 'Publicar StarPost'}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  );
}