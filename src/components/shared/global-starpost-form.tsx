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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send, Tag, XCircle, AlertCircle, Trash2, Pencil, Save, X, Instagram, Image as ImageIcon, MessageSquare, Cloud } from 'lucide-react';
import StarInput from '@/components/figure/star-input';
import { Figure, User as AppUser, Comment, AttitudeVote, Thought } from '@/lib/types';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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

const ratingSounds: { [key: number]: string } = {
    1: 'https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/star%20sound%2Fstar1.mp3?alt=media&token=c867fe4c-a39f-49a1-ab99-b6fdac84b2e8',
    2: 'https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/star%20sound%2Fstar2.mp3?alt=media&token=f0a09d9e-8a99-498b-b9ea-0a61b07e4173',
    3: 'https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/star%20sound%2Fstar3.mp3?alt=media&token=40943193-e45d-443d-9cc2-40ff8fa98076',
    4: 'https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/star%20sound%2Fstar4.mp3?alt=media&token=75b19307-5b2c-4c89-a252-b584727469da',
    5: 'https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/star%20sound%2Fstar5.mp3?alt=media&token=11cd84e2-7377-4972-a9b0-e0e716e2df46',
};

const createFormSchema = (needsIdentity: boolean) => z.object({
  rating: z.number().min(0).max(5).optional().nullable(),
  attitude: z.enum(['neutral', 'fan', 'simp', 'hater']).optional(),
  username: needsIdentity 
    ? z.string().min(3, 'Mínimo 3 caracteres.').max(15, 'Máximo 15 caracteres.').regex(/^[a-zA-Z0-9_]+$/, 'Solo letras, números y guiones bajos.')
    : z.string().optional(),
  text: z.string().max(500, 'Máximo 500 caracteres.').optional(),
  tag: z.custom<CommentTagId>().optional(),
});

type FormValues = z.infer<ReturnType<typeof createFormSchema>>;

export default function GlobalStarPostForm() {
  const { user, reloadUser } = useUser();
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const { theme } = useTheme();
  const streakContext = useContext(StreakAnimationContext);
  const showStreakAnimation = streakContext?.showStreakAnimation;

  const [selectedFigure, setSelectedFigure] = useState<Figure | null>(null);
  const [contentType, setContentType] = useState<'starpost' | 'thought'>('starpost');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const [isTagPopoverOpen, setIsTagPopoverOpen] = useState(false);
  
  const [existingComment, setExistingComment] = useState<Comment | null>(null);
  const [existingThought, setExistingThought] = useState<Thought | null>(null);
  const [existingAttitude, setExistingAttitude] = useState<string | null>(null);
  
  const [isCheckingExisting, setIsCheckingExisting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Instagram Image Integration
  const [instaUrl, setInstaUrl] = useState('');
  const [instaImageUrl, setInstaImageUrl] = useState<string | null>(null);
  const [isFetchingInsta, setIsFetchingInsta] = useState(false);

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

  const form = useForm<FormValues>({
    resolver: zodResolver(createFormSchema(needsIdentity)),
    defaultValues: { text: '', rating: 5, attitude: undefined, username: '', tag: undefined },
  });

  useEffect(() => {
    const fetchExistingData = async () => {
      if (!firestore || !user || !selectedFigure) {
        setExistingComment(null);
        setExistingThought(null);
        setExistingAttitude(null);
        setIsEditing(false);
        setInstaImageUrl(null);
        setInstaUrl('');
        return;
      }

      setIsCheckingExisting(true);
      try {
        const commentsRef = collection(firestore, 'figures', selectedFigure.id, 'comments');
        const qComment = query(commentsRef, where('userId', '==', user.uid), limit(1));
        
        const thoughtsRef = collection(firestore, 'figures', selectedFigure.id, 'thoughts');
        const qThought = query(thoughtsRef, where('userId', '==', user.uid), limit(1));

        const attitudeRef = doc(firestore, `users/${user.uid}/attitudeVotes`, selectedFigure.id);

        const [commentSnap, thoughtSnap, attitudeSnap] = await Promise.all([
          getDocs(qComment),
          getDocs(qThought),
          getDoc(attitudeRef)
        ]);
        
        if (!commentSnap.empty) {
          const comment = { id: commentSnap.docs[0].id, ...commentSnap.docs[0].data() } as Comment;
          setExistingComment(comment);
          if (contentType === 'starpost') setInstaImageUrl(comment.instagramImageUrl || null);
        } else {
          setExistingComment(null);
        }

        if (!thoughtSnap.empty) {
          const thought = { id: thoughtSnap.docs[0].id, ...thoughtSnap.docs[0].data() } as Thought;
          setExistingThought(thought);
          if (contentType === 'thought') setInstaImageUrl(thought.instagramImageUrl || null);
        } else {
          setExistingThought(null);
        }

        if (attitudeSnap.exists()) {
          const attitude = attitudeSnap.data().vote;
          setExistingAttitude(attitude);
          form.setValue('attitude', attitude);
        } else {
          setExistingAttitude(null);
          form.setValue('attitude', undefined as any);
        }
      } catch (error) {
        console.error("Error checking existing data:", error);
      } finally {
        setIsCheckingExisting(false);
      }
    };

    fetchExistingData();
  }, [selectedFigure, user, firestore, form, contentType]);

  const selectedTagId = form.watch('tag');
  const selectedTag = selectedTagId ? commentTags.find(t => t.id === selectedTagId) : null;
  const selectedAttitude = form.watch('attitude');

  const handleFetchInstaImage = async () => {
    if (!instaUrl.trim()) return;
    
    const match = instaUrl.match(/\/p\/([a-zA-Z0-9_-]+)/) || instaUrl.match(/\/reel\/([a-zA-Z0-9_-]+)/);
    if (!match) {
        toast({ title: "Enlace inválido", description: "Asegúrate de que sea un link de post o reel de Instagram.", variant: "destructive" });
        return;
    }

    setIsFetchingInsta(true);
    try {
        const postId = match[1];
        const cleanUrl = `https://www.instagram.com/p/${postId}/media/?size=l`;
        const proxiedUrl = `https://images.weserv.nl/?url=${encodeURIComponent(cleanUrl)}`;

        const imgTester = new window.Image();
        imgTester.onload = () => {
            setInstaImageUrl(proxiedUrl);
            setIsFetchingInsta(false);
            setInstaUrl('');
        };
        imgTester.onerror = () => {
            setIsFetchingInsta(false);
            toast({ title: "Error", description: "No se pudo obtener la imagen. ¿La cuenta es pública?", variant: "destructive" });
        };
        imgTester.src = proxiedUrl;
    } catch (e) {
        setIsFetchingInsta(false);
        toast({ title: "Error", description: "Ocurrió un error inesperado al procesar el link.", variant: "destructive" });
    }
  };

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

        if (streakResult?.streakGained && showStreakAnimation) {
            showStreakAnimation(streakResult.newStreakCount, { 
                showPrompt: true, figureId: selectedFigure.id, figureName: selectedFigure.name
            });
        }

        setExistingAttitude(isRetracting ? null : newAttitude);
        form.setValue('attitude', isRetracting ? undefined : newAttitude);
        toast({ title: isRetracting ? 'Voto eliminado' : '¡Voto registrado!' });

    } catch (error: any) {
        console.error(error);
        toast({ title: 'Error al votar', description: error.message, variant: 'destructive' });
    } finally {
        setIsVoting(false);
    }
  };

  const handleDeleteExisting = async () => {
    if (!firestore || !user || !selectedFigure) return;
    
    setIsDeleting(true);
    try {
      await runTransaction(firestore, async (transaction) => {
        const figureRef = doc(firestore, 'figures', selectedFigure.id);
        
        if (contentType === 'starpost' && existingComment) {
            const commentRef = doc(firestore, 'figures', selectedFigure.id, 'comments', existingComment.id);
            const starpostRef = doc(firestore, 'users', user.uid, 'starposts', existingComment.id);

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
            setExistingComment(null);
        } else if (contentType === 'thought' && existingThought) {
            const thoughtRef = doc(firestore, 'figures', selectedFigure.id, 'thoughts', existingThought.id);
            const userThoughtRef = doc(firestore, 'users', user.uid, 'thoughts', existingThought.id);
            transaction.delete(thoughtRef);
            transaction.delete(userThoughtRef);
            setExistingThought(null);
        }
      });

      toast({ title: 'Eliminado con éxito', description: 'Ahora puedes publicar de nuevo.' });
      setInstaImageUrl(null);
      setIsEditing(false);
    } catch (error: any) {
      console.error("Error deleting existing content:", error);
      toast({ title: 'Error', description: 'No se pudo eliminar el contenido.', variant: 'destructive' });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditClick = () => {
    if (contentType === 'starpost' && existingComment) {
        form.reset({
            rating: existingComment.rating,
            attitude: (existingAttitude as any) || undefined,
            text: existingComment.text || '',
            tag: existingComment.tag || undefined,
            username: userProfile?.username || '',
        });
    } else if (contentType === 'thought' && existingThought) {
        form.reset({
            text: existingThought.text || '',
            username: userProfile?.username || '',
        });
    }
    setIsEditing(true);
  };

  const handleSubmit = async (data: FormValues) => {
    if (!selectedFigure) {
      toast({ title: 'Selecciona un personaje', description: 'Debes elegir a quién va dirigido tu post.', variant: 'destructive' });
      return;
    }

    if (contentType === 'starpost' && (data.rating === null || data.rating === undefined)) {
        toast({ title: 'Calificación requerida', description: 'Por favor selecciona cuántas estrellas le das.', variant: 'destructive' });
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

        if (contentType === 'starpost') {
            if (existingComment && isEditing) {
                const oldRating = existingComment.rating;
                const newRating = data.rating!;
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
                    instagramImageUrl: instaImageUrl || null,
                    updatedAt: serverTimestamp(),
                    userDisplayName: finalDisplayName,
                    userAttitude: existingAttitude,
                });
            } else {
                transaction.update(figureRef, {
                    ratingCount: increment(1),
                    totalRating: increment(data.rating!),
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
                    instagramImageUrl: instaImageUrl || null,
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
        } else if (contentType === 'thought') {
            if (existingThought && isEditing) {
                const thoughtRef = doc(firestore, 'figures', selectedFigure.id, 'thoughts', existingThought.id);
                transaction.update(thoughtRef, {
                    text: data.text || '',
                    instagramImageUrl: instaImageUrl || null,
                    updatedAt: serverTimestamp(),
                    userDisplayName: finalDisplayName,
                    userAttitude: existingAttitude,
                });
            } else {
                const thoughtRef = doc(collection(firestore, 'figures', selectedFigure.id, 'thoughts'));
                const thoughtData = {
                    userId: currentUser!.uid,
                    text: data.text || '',
                    figureId: selectedFigure.id,
                    figureName: selectedFigure.name,
                    figureImageUrl: selectedFigure.imageUrl,
                    instagramImageUrl: instaImageUrl || null,
                    createdAt: serverTimestamp(),
                    userDisplayName: finalDisplayName,
                    userPhotoURL: userProfileData.profilePhotoUrl || currentUser!.photoURL,
                    userCountry: country,
                    userGender: gender,
                    userAttitude: existingAttitude,
                    likes: 0,
                    dislikes: 0,
                    replyCount: 0,
                };
                transaction.set(thoughtRef, thoughtData);

                const userThoughtRef = doc(firestore, 'users', currentUser!.uid, 'thoughts', thoughtRef.id);
                transaction.set(userThoughtRef, {
                    figureId: selectedFigure.id,
                    thoughtId: thoughtRef.id,
                    createdAt: serverTimestamp(),
                });
            }
        }
      });

      const streakResult = await updateStreak({
        firestore, figureId: selectedFigure.id, figureName: selectedFigure.name,
        userId: currentUser.uid, isAnonymous: currentUser.isAnonymous,
        userPhotoURL: currentUser.photoURL
      });

      if (streakResult?.streakGained && showStreakAnimation) {
        showStreakAnimation(streakResult.newStreakCount, { 
          showPrompt: true, figureId: selectedFigure.id, figureName: selectedFigure.name
        });
      }

      if (contentType === 'starpost' && typeof data.rating === 'number' && ratingSounds[data.rating]) {
          const audio = new Audio(ratingSounds[data.rating]);
          audio.play().catch(e => console.error("Error playing sound", e));
      }

      toast({ 
        title: isEditing ? '¡Actualizado!' : '¡Publicado!', 
        description: isEditing ? 'Tu contenido ha sido modificado.' : `Has publicado en el perfil de ${selectedFigure.name}.` 
      });
      
      form.reset({ text: '', rating: 5, attitude: undefined, tag: undefined });
      setSelectedFigure(null);
      setExistingComment(null);
      setExistingThought(null);
      setExistingAttitude(null);
      setInstaImageUrl(null);
      setInstaUrl('');
      setIsEditing(false);

    } catch (error: any) {
      console.error(error);
      toast({ title: 'Error', description: error.message || 'No se pudo procesar tu publicación.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderSharedFields = () => {
    return (
        <div className="space-y-6">
            {needsIdentity && (
                <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                        <FormItem>
                            <Label className="text-xs">Nombre de usuario para tu post</Label>
                            <FormControl>
                                <Input {...field} placeholder="Ej: FanReal_99" className="h-9" />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            )}

            <div className="space-y-3">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    <Instagram className="h-4 w-4 text-pink-500" /> Imagen de Instagram (opcional)
                </Label>
                
                {instaImageUrl ? (
                    <div className="relative group w-full rounded-xl overflow-hidden border-2 border-primary/20 bg-muted flex items-center justify-center min-h-[250px] max-h-[600px]">
                        <Image src={instaImageUrl} alt="Instagram preview" fill className="object-contain" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Button type="button" variant="destructive" size="sm" className="h-8" onClick={() => setInstaImageUrl(null)}>
                                <Trash2 className="h-4 w-4 mr-1" /> Quitar
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="flex gap-2">
                        <Input value={instaUrl} onChange={(e) => setInstaUrl(e.target.value)} placeholder="Link: https://www.instagram.com/p/..." className="h-9 text-sm" />
                        <Button type="button" variant="secondary" size="sm" className="h-9 whitespace-nowrap" disabled={isFetchingInsta || !instaUrl.trim()} onClick={handleFetchInstaImage}>
                            {isFetchingInsta ? <Loader2 className="h-4 w-4 animate-spin" /> : <><ImageIcon className="h-4 w-4 mr-1" /> Ver Imagen</>}
                        </Button>
                    </div>
                )}
            </div>

            <div className="flex justify-end gap-2">
                {isEditing && (
                    <Button type="button" variant="ghost" onClick={() => setIsEditing(false)}>Cancelar</Button>
                )}
                <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    {isEditing ? 'Actualizar' : '¡Publicar!'}
                </Button>
            </div>
        </div>
    );
  }

  return (
    <Card className={cn("mb-8 border-primary/20", (theme === 'dark' || theme === 'army') && "bg-black border-primary/40")}>
      <CardHeader className="pb-4">
        <CardTitle className="text-xl flex items-center gap-2">
          <Send className="text-primary h-5 w-5" />
          ¿Qué quieres compartir hoy?
        </CardTitle>
        <CardDescription>Publica un StarPost o un pensamiento rápido al instante.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Form {...form}>
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
                setExistingThought(null);
                setExistingAttitude(null);
                setIsEditing(false);
                setInstaImageUrl(null);
                setInstaUrl('');
              }}>
                <XCircle className="h-5 w-5" />
              </Button>
            </div>
          )}

          {selectedFigure && isCheckingExisting && (
            <div className="flex flex-col items-center justify-center py-8 gap-2 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
              <p className="text-sm">Sincronizando con el servidor...</p>
            </div>
          )}

          {selectedFigure && !isCheckingExisting && (
            <>
              <div className="space-y-3">
                  <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">¿Cuál es tu actitud hacia él/ella?</Label>
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

              <Tabs value={contentType} onValueChange={(v) => { setContentType(v as any); setIsEditing(false); }} className="w-full">
                  <TabsList className={cn("grid w-full grid-cols-2", (theme === 'dark' || theme === 'army') && "bg-black")}>
                      <TabsTrigger value="starpost" className="gap-2">
                          <MessageSquare className="h-4 w-4" /> StarPost
                      </TabsTrigger>
                      <TabsTrigger value="thought" className="gap-2">
                          <Cloud className="h-4 w-4" /> Post
                      </TabsTrigger>
                  </TabsList>

                  <TabsContent value="starpost" className="pt-4">
                      {existingComment && !isEditing ? (
                          <div className="p-6 border-2 border-dashed rounded-xl bg-muted/30 text-center animate-in fade-in zoom-in duration-300">
                              <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                                  <AlertCircle className="text-primary h-6 w-6" />
                              </div>
                              <h3 className="font-bold text-lg mb-2">Ya has calificado a {selectedFigure.name}</h3>
                              <div className="flex flex-col items-center gap-3 mb-6">
                                  <div className="flex items-center gap-4">
                                      <StarRating rating={existingComment.rating} />
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
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
                                  <Button variant="outline" className="w-full" onClick={handleEditClick}>
                                      <Pencil className="mr-2 h-4 w-4" /> Editar Reseña
                                  </Button>
                                  <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                          <Button variant="destructive" className="w-full" disabled={isDeleting}>
                                              <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                                          </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                          <AlertDialogHeader>
                                              <AlertDialogTitle>¿Eliminar tu StarPost?</AlertDialogTitle>
                                              <AlertDialogDescription>Se borrarán tus estrellas y tu opinión sobre {selectedFigure.name}.</AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                              <AlertDialogAction onClick={handleDeleteExisting}>Eliminar permanentemente</AlertDialogAction>
                                          </AlertDialogFooter>
                                      </AlertDialogContent>
                                  </AlertDialog>
                              </div>
                          </div>
                      ) : (
                          <div className="space-y-6">
                              <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                                  <FormField
                                      control={form.control}
                                      name="rating"
                                      render={({ field }) => (
                                          <FormItem>
                                              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-2">Calificación</Label>
                                              <FormControl>
                                                  <StarInput value={field.value!} onChange={field.onChange} />
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
                                              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-2">Etiqueta</Label>
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
                              <FormField
                                  control={form.control}
                                  name="text"
                                  render={({ field }) => (
                                      <FormItem>
                                          <FormControl>
                                              <Textarea {...field} placeholder={`¿Qué tienes que decir sobre ${selectedFigure?.name}?`} className="resize-none min-h-[80px]" />
                                          </FormControl>
                                          <FormMessage />
                                      </FormItem>
                                  )}
                              />
                              {renderSharedFields()}
                          </div>
                      )}
                  </TabsContent>

                  <TabsContent value="thought" className="pt-4">
                      {existingThought && !isEditing ? (
                          <div className="p-6 border-2 border-dashed rounded-xl bg-muted/30 text-center animate-in fade-in zoom-in duration-300">
                              <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                                  <Cloud className="text-primary h-6 w-6" />
                              </div>
                              <h3 className="font-bold text-lg mb-2">Ya has publicado un pensamiento</h3>
                              <p className="text-sm text-muted-foreground italic max-w-xs mx-auto mb-6">"{existingThought.text}"</p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
                                  <Button variant="outline" className="w-full" onClick={handleEditClick}>
                                      <Pencil className="mr-2 h-4 w-4" /> Editar Post
                                  </Button>
                                  <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                          <Button variant="destructive" className="w-full" disabled={isDeleting}>
                                              <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                                          </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                          <AlertDialogHeader>
                                              <AlertDialogTitle>¿Eliminar tu pensamiento?</AlertDialogTitle>
                                              <AlertDialogDescription>Esta acción es permanente.</AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                              <AlertDialogAction onClick={handleDeleteExisting}>Eliminar permanentemente</AlertDialogAction>
                                          </AlertDialogFooter>
                                      </AlertDialogContent>
                                  </AlertDialog>
                              </div>
                          </div>
                      ) : (
                          <div className="space-y-6">
                              <FormField
                                  control={form.control}
                                  name="text"
                                  render={({ field }) => (
                                      <FormItem>
                                          <FormControl>
                                              <Textarea {...field} placeholder={`Comparte un pensamiento rápido sobre ${selectedFigure?.name}...`} className="resize-none min-h-[100px]" />
                                          </FormControl>
                                          <FormMessage />
                                      </FormItem>
                                  )}
                              />
                              {renderSharedFields()}
                          </div>
                      )}
                  </TabsContent>
              </Tabs>
            </>
          )}
        </Form>
      </CardContent>
    </Card>
  );
}