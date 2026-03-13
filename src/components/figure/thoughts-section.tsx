'use client';

/**
 * @fileOverview Sección de Pensamientos para perfiles de figuras públicas.
 * Permite a los usuarios publicar textos cortos (estilo Twitter) e imágenes de Instagram.
 * Incluye sistema de hilos (respuestas), votos y gestión de contenido.
 */

import { useState, useContext, useEffect, useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  collection, 
  serverTimestamp, 
  doc, 
  runTransaction, 
  query, 
  orderBy, 
  limit, 
  onSnapshot,
  getDoc,
  increment,
  updateDoc,
  deleteDoc,
  where,
  getDocs,
  Timestamp
} from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { useAuth, useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2, 
  Send, 
  Instagram, 
  Image as ImageIcon, 
  Trash2, 
  Cloud, 
  MessageCircle, 
  ThumbsUp, 
  ThumbsDown, 
  FilePenLine, 
  X, 
  Flame, 
  Save, 
  MessageSquare,
  Pin
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { updateStreak } from '@/firebase/streaks';
import { StreakAnimationContext } from '@/context/StreakAnimationContext';
import { useLanguage } from '@/context/LanguageContext';
import { cn, formatCompactNumber } from '@/lib/utils';
import Image from 'next/image';
import { useTheme } from 'next-themes';
import { countries } from '@/lib/countries';
import Link from 'next/link';
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
import ReplyForm from './reply-form';
import { isDateActive } from '@/lib/streaks';

const createThoughtSchema = z.object({
  text: z.string().min(1, 'El pensamiento no puede estar vacío.').max(250, 'Máximo 250 caracteres.'),
});

type ThoughtFormValues = z.infer<typeof createThoughtSchema>;

interface Thought {
    id: string;
    userId: string;
    text: string;
    figureImageUrl?: string | null;
    instagramImageUrl?: string | null;
    createdAt: any;
    updatedAt?: any;
    userDisplayName: string;
    userPhotoURL: string | null;
    userCountry?: string | null;
    userGender?: string | null;
    userAttitude?: string | null;
    likes?: number;
    dislikes?: number;
    replyCount?: number;
    isFeatured?: boolean;
    parentId?: string | null;
}

type AttitudeOption = 'neutral' | 'fan' | 'simp' | 'hater';
type FilterType = 'featured' | 'popular' | 'newest' | 'mine';

const attitudeStyles: Record<AttitudeOption, { text: string; color: string }> = {
    fan: { text: 'Fan', color: 'text-yellow-400' },
    hater: { text: 'Hater', color: 'text-red-500' },
    simp: { text: 'Simp', color: 'text-pink-400' },
    neutral: { text: 'Espectador', color: 'text-gray-500' },
};

const K_REPLY_WEIGHT = 1.0;
const C_DECAY_CONSTANT = 24.0;

const calculateHotScore = (thought: Thought): number => {
    const likes = thought.likes ?? 0;
    const dislikes = thought.dislikes ?? 0;
    const replies = thought.replyCount ?? 0;
    
    const s = (likes) - (dislikes) + K_REPLY_WEIGHT * replies;

    if (s === 0) return 0;
    
    const y = Math.sign(s);
    const z = y * Math.log10(Math.max(1, Math.abs(s)));

    const thoughtDate = thought.createdAt?.toDate ? thought.createdAt.toDate() : new Date();
    const hoursAgo = (new Date().getTime() - thoughtDate.getTime()) / (1000 * 3600);
    const decay = hoursAgo / C_DECAY_CONSTANT;
    
    return z - decay;
}

/**
 * Componente para renderizar un pensamiento o una respuesta con toda su lógica.
 */
function ThoughtDisplay({ 
    thought, 
    figureId, 
    figureName,
    isReply = false,
    onDeleteSuccess,
    onReplyClick
}: { 
    thought: Thought, 
    figureId: string, 
    figureName: string,
    isReply?: boolean,
    onDeleteSuccess: (id: string) => void,
    onReplyClick?: (thought: Thought) => void
}) {
    const { user } = useUser();
    const firestore = useFirestore();
    const auth = useAuth();
    const { toast } = useToast();
    const { showStreakAnimation } = useContext(StreakAnimationContext);

    const [isVoting, setIsVoting] = useState<'like' | 'dislike' | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState(thought.text);
    const [isSavingEdit, setIsSavingEdit] = useState(false);

    const isOwner = user && user.uid === thought.userId;

    const votePath = isReply 
        ? `figures/${figureId}/thoughts/${thought.parentId}/replies/${thought.id}/votes`
        : `figures/${figureId}/thoughts/${thought.id}/votes`;
        
    const userVoteRef = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return doc(firestore, votePath, user.uid);
    }, [firestore, user, votePath]);

    const { data: userVote } = useDoc<any>(userVoteRef, { enabled: !!user, realtime: true });

    const userStreakRef = useMemoFirebase(() => {
        if (!firestore || !thought.userId) return null;
        return doc(firestore, `users/${thought.userId}/streaks`, figureId);
    }, [firestore, thought.userId, figureId]);

    const { data: userStreak } = useDoc<Streak>(userStreakRef, { realtime: true });

    const country = thought.userCountry ? countries.find(c => c.key === thought.userCountry?.toLowerCase()) : null;
    const attitudeStyle = thought.userAttitude ? attitudeStyles[thought.userAttitude as AttitudeOption] : null;
    const showStreak = userStreak && userStreak.currentStreak > 0 && isDateActive(userStreak.lastCommentDate);

    const handleVote = async (voteType: 'like' | 'dislike') => {
        if (!firestore || isVoting || !auth) return;
        setIsVoting(voteType);

        let currentUser = user;
        if (!currentUser) {
            try {
                const userCredential = await signInAnonymously(auth);
                currentUser = userCredential.user;
            } catch (error) {
                toast({ title: 'Error de conexión', variant: 'destructive' });
                setIsVoting(null);
                return;
            }
        }

        const thoughtPath = isReply
            ? `figures/${figureId}/thoughts/${thought.parentId}/replies/${thought.id}`
            : `figures/${figureId}/thoughts/${thought.id}`;
        
        const itemRef = doc(firestore, thoughtPath);
        const voteRef = doc(firestore, votePath, currentUser!.uid);

        try {
            await runTransaction(firestore, async (transaction) => {
                const voteDoc = await transaction.get(voteRef);
                const existingVote = voteDoc.exists() ? voteDoc.data().vote : null;
                const updates: { [key: string]: any } = {};

                if (existingVote === voteType) {
                    updates[`${voteType}s`] = increment(-1);
                    transaction.delete(voteRef);
                } else {
                    updates[`${voteType}s`] = increment(1);
                    if (existingVote) {
                        const otherVoteType = voteType === 'like' ? 'dislike' : 'like';
                        updates[`${otherVoteType}s`] = increment(-1);
                    }
                    transaction.set(voteRef, { vote: voteType, createdAt: serverTimestamp() });
                }
                transaction.update(itemRef, updates);
            });

            const streakResult = await updateStreak({
                firestore, figureId, figureName,
                userId: currentUser!.uid, isAnonymous: currentUser!.isAnonymous,
                userPhotoURL: currentUser!.photoURL
            });

            if (streakResult?.streakGained) {
                showStreakAnimation(streakResult.newStreakCount, { showPrompt: true, figureId, figureName });
            }
        } catch (error) {
            console.error(error);
            toast({ title: 'Error al votar', variant: 'destructive' });
        } finally {
            setIsVoting(null);
        }
    };

    const handleDelete = async () => {
        if (!firestore || !isOwner) return;
        setIsDeleting(true);
        try {
            await runTransaction(firestore, async (transaction) => {
                const thoughtPath = isReply
                    ? `figures/${figureId}/thoughts/${thought.parentId}/replies/${thought.id}`
                    : `figures/${figureId}/thoughts/${thought.id}`;
                
                const itemRef = doc(firestore, thoughtPath);
                
                if (isReply && thought.parentId) {
                    const parentRef = doc(firestore, 'figures', figureId, 'thoughts', thought.parentId);
                    transaction.update(parentRef, { replyCount: increment(-1) });
                }
                
                transaction.delete(itemRef);
            });
            toast({ title: 'Contenido eliminado' });
            onDeleteSuccess(thought.id);
        } catch (error) {
            toast({ title: 'Error al eliminar', variant: 'destructive' });
        } finally {
            setIsDeleting(false);
        }
    };

    const handleUpdate = async () => {
        if (!firestore || !isOwner) return;
        setIsSavingEdit(true);
        try {
            const thoughtPath = isReply
                ? `figures/${figureId}/thoughts/${thought.parentId}/replies/${thought.id}`
                : `figures/${figureId}/thoughts/${thought.id}`;
            const itemRef = doc(firestore, thoughtPath);
            await updateDoc(itemRef, { text: editText, updatedAt: serverTimestamp() });
            toast({ title: 'Contenido actualizado' });
            setIsEditing(false);
        } catch (error) {
            toast({ title: 'Error al actualizar', variant: 'destructive' });
        } finally {
            setIsSavingEdit(false);
        }
    };

    const renderText = () => {
        const mentionMatch = thought.text.match(/^@\[(.*?)\]/);
        if (mentionMatch) {
            const mention = mentionMatch[1];
            const restOfText = thought.text.substring(mentionMatch[0].length).trim();
            return (
                <p className={cn("text-foreground/90 whitespace-pre-wrap", isReply ? "text-xs" : "text-sm")}>
                    <span className="text-primary font-semibold mr-1">@{mention}</span>
                    {restOfText}
                </p>
            );
        }
        return <p className={cn("text-foreground/90 whitespace-pre-wrap", isReply ? "text-xs" : "text-sm")}>{thought.text}</p>;
    };

    return (
        <div className="flex gap-3">
            <Link href={`/u/${thought.userDisplayName}`}>
                <Avatar className={cn("border flex-shrink-0", isReply ? "h-8 w-8" : "h-10 w-10")}>
                    <AvatarImage src={thought.userPhotoURL || undefined} />
                    <AvatarFallback>{thought.userDisplayName[0]}</AvatarFallback>
                </Avatar>
            </Link>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Link href={`/u/${thought.userDisplayName}`} className="font-bold text-sm hover:underline">{thought.userDisplayName}</Link>
                    {attitudeStyle && <span className={cn("text-[10px] font-black uppercase", attitudeStyle.color)}>{attitudeStyle.text}</span>}
                    {showStreak && (
                        <div className="flex items-center gap-0.5 text-orange-500 font-bold text-[10px]" title={`${userStreak.currentStreak} días de racha`}>
                            <Flame className="h-3 w-3" />
                            <span>{userStreak.currentStreak}</span>
                        </div>
                    )}
                    {thought.userGender === 'Masculino' && <span className="text-blue-400 font-bold text-[10px]">♂</span>}
                    {thought.userGender === 'Femenino' && <span className="text-pink-400 font-bold text-[10px]">♀</span>}
                    {country && (
                        <Image
                            src={`https://flagcdn.com/w20/${country.code.toLowerCase()}.png`}
                            alt={country.name}
                            width={16}
                            height={12}
                            className="object-contain"
                        />
                    )}
                </div>

                {isEditing ? (
                    <div className="space-y-2 mt-2">
                        <Textarea value={editText} onChange={(e) => setEditText(e.target.value)} className="text-sm min-h-[80px]" maxLength={250} />
                        <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>Cancelar</Button>
                            <Button size="sm" onClick={handleUpdate} disabled={isSavingEdit}>
                                {isSavingEdit ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3 mr-1" />} Guardar
                            </Button>
                        </div>
                    </div>
                ) : (
                    renderText()
                )}

                {thought.instagramImageUrl && !isEditing && !isReply && (
                    <div className="relative w-full max-h-[400px] aspect-square rounded-xl overflow-hidden border mt-3 bg-muted/30">
                        <Image src={thought.instagramImageUrl} alt="Thought image" fill className="object-contain" />
                    </div>
                )}

                <div className="flex items-center gap-4 mt-3">
                    <Button variant="ghost" size="sm" className={cn("h-8 px-2 text-[10px]", userVote?.vote === 'like' && "text-primary")} onClick={() => handleVote('like')} disabled={!!isVoting}>
                        <ThumbsUp className="h-3 w-3 mr-1" /> {formatCompactNumber(thought.likes || 0)}
                    </Button>
                    <Button variant="ghost" size="sm" className={cn("h-8 px-2 text-[10px]", userVote?.vote === 'dislike' && "text-destructive")} onClick={() => handleVote('dislike')} disabled={!!isVoting}>
                        <ThumbsDown className="h-3 w-3 mr-1" /> {formatCompactNumber(thought.dislikes || 0)}
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 px-2 text-[10px]" onClick={() => onReplyClick?.(thought)}>
                        <MessageSquare className="h-3 w-3 mr-1" /> Responder
                    </Button>
                    
                    {isOwner && (
                        <div className="flex items-center gap-1 ml-auto">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsEditing(true)}>
                                <FilePenLine className="h-3 w-3" />
                            </Button>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive">
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>¿Eliminar contenido?</AlertDialogTitle>
                                        <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Eliminar</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function ThoughtItem({ 
    thought, 
    figureId, 
    figureName,
    onDeleteSuccess
}: { 
    thought: Thought, 
    figureId: string, 
    figureName: string,
    onDeleteSuccess: (id: string) => void
}) {
    const firestore = useFirestore();
    const { theme } = useTheme();

    const [isReplying, setIsReplying] = useState(false);
    const [replyTo, setReplyTo] = useState<Thought | null>(null);
    const [replies, setReplies] = useState<Thought[]>([]);
    const [showReplies, setShowReplies] = useState(false);
    const [isLoadingReplies, setIsLoadingReplies] = useState(false);

    useEffect(() => {
        if (!showReplies || !firestore) return;
        setIsLoadingReplies(true);
        const q = query(
            collection(firestore, 'figures', figureId, 'thoughts', thought.id, 'replies'),
            orderBy('createdAt', 'asc')
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setReplies(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Thought)));
            setIsLoadingReplies(false);
        });
        return () => unsubscribe();
    }, [showReplies, firestore, figureId, thought.id]);

    const handleReplyClick = (target: Thought) => {
        setReplyTo(target);
        setIsReplying(true);
    };

    return (
        <Card className={cn("overflow-hidden border-border/40", (theme === 'dark' || theme === 'army') && 'bg-black')}>
            <CardContent className="p-4 space-y-4">
                <ThoughtDisplay 
                    thought={thought} 
                    figureId={figureId} 
                    figureName={figureName} 
                    onDeleteSuccess={onDeleteSuccess}
                    onReplyClick={handleReplyClick}
                />

                {isReplying && (
                    <div className="mt-4 pt-4 border-t">
                        <ReplyForm 
                            figureId={figureId} 
                            figureName={figureName} 
                            parentComment={{ id: thought.id, ...thought } as any} 
                            replyToComment={{ id: replyTo?.id || thought.id, userDisplayName: replyTo?.userDisplayName || thought.userDisplayName } as any} 
                            onReplySuccess={() => {
                                setIsReplying(false);
                                setShowReplies(true);
                            }}
                            parentCollection="thoughts"
                        />
                    </div>
                )}

                {thought.replyCount && thought.replyCount > 0 && (
                    <Button variant="link" size="sm" className="text-xs p-0 h-auto" onClick={() => setShowReplies(!showReplies)}>
                        {showReplies ? 'Ocultar respuestas' : `Ver ${thought.replyCount} respuestas`}
                    </Button>
                )}

                {showReplies && (
                    <div className="mt-4 space-y-6 pl-4 border-l-2">
                        {isLoadingReplies ? <Skeleton className="h-10 w-full" /> : 
                            replies.map(reply => (
                                <ThoughtDisplay 
                                    key={reply.id}
                                    thought={{ ...reply, parentId: thought.id }}
                                    figureId={figureId}
                                    figureName={figureName}
                                    isReply={true}
                                    onDeleteSuccess={(id) => setReplies(prev => prev.filter(r => r.id !== id))}
                                    onReplyClick={handleReplyClick}
                                />
                            ))
                        }
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default function ThoughtsSection({ figureId, figureName }: { figureId: string, figureName: string }) {
  const { user, reloadUser } = useUser();
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  const { theme } = useTheme();
  const { showStreakAnimation } = useContext(StreakAnimationContext);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [instaUrl, setInstaUrl] = useState('');
  const [instaImageUrl, setInstaImageUrl] = useState<string | null>(null);
  const [isFetchingInsta, setIsFetchingInsta] = useState(false);
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [isLoadingThoughts, setIsLoadingLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterType>('featured');

  const form = useForm<ThoughtFormValues>({
    resolver: zodResolver(createThoughtSchema),
    defaultValues: { text: '' },
  });

  const textValue = form.watch('text', '');

  useEffect(() => {
    if (!firestore || !figureId) return;
    const q = query(
      collection(firestore, 'figures', figureId, 'thoughts'),
      orderBy('createdAt', 'desc'),
      limit(100)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setThoughts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Thought)));
      setIsLoadingLoading(false);
    }, (error) => {
      console.error("Error al escuchar pensamientos:", error);
      setIsLoadingLoading(false);
    });
    return () => unsubscribe();
  }, [firestore, figureId]);

  const handleFetchInstaImage = async () => {
    if (!instaUrl.trim()) return;
    const match = instaUrl.match(/\/p\/([a-zA-Z0-9_-]+)/) || instaUrl.match(/\/reel\/([a-zA-Z0-9_-]+)/);
    if (!match) {
        toast({ title: "Enlace inválido", description: "Enlace de Instagram no reconocido.", variant: "destructive" });
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
        toast({ title: "Error", description: "Error inesperado.", variant: "destructive" });
    }
  };

  const handleSubmit = async (data: ThoughtFormValues) => {
    if (!firestore) return;
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

    if (!currentUser) {
        setIsSubmitting(false);
        return;
    }

    try {
        const thoughtRef = doc(collection(firestore, 'figures', figureId, 'thoughts'));
        const userRef = doc(firestore, 'users', currentUser.uid);
        const figureInfoRef = doc(firestore, 'figures', figureId);
        const attitudeRef = doc(firestore, `users/${currentUser.uid}/attitudeVotes`, figureId);
        
        const [userSnap, attitudeSnap, figureSnap] = await Promise.all([
            getDoc(userRef),
            getDoc(attitudeRef),
            getDoc(figureInfoRef)
        ]);

        const userData = userSnap.exists() ? userSnap.data() : {};
        const attitudeData = attitudeSnap.exists() ? attitudeSnap.data() : {};
        const figureData = figureSnap.exists() ? figureSnap.data() : {};

        const payload = {
            userId: currentUser.uid,
            text: data.text,
            figureId: figureId,
            figureName: figureName,
            figureImageUrl: figureData.imageUrl || null,
            instagramImageUrl: instaImageUrl,
            createdAt: serverTimestamp(),
            userDisplayName: userData.username || currentUser.displayName || `Invitado_${currentUser.uid.substring(0,4)}`,
            userPhotoURL: userData.profilePhotoUrl || currentUser.photoURL || null,
            userCountry: userData.country || null,
            userGender: userData.gender || null,
            userAttitude: attitudeData.vote || null,
            likes: 0,
            dislikes: 0,
            replyCount: 0,
        };

        await runTransaction(firestore, async (transaction) => {
            transaction.set(thoughtRef, payload);
        });

        const streakResult = await updateStreak({
            firestore, figureId, figureName,
            userId: currentUser.uid, isAnonymous: currentUser.isAnonymous,
            userPhotoURL: currentUser.photoURL
        });

        if (streakResult?.streakGained) {
            showStreakAnimation(streakResult.newStreakCount, { 
                showPrompt: true, figureId, figureName
            });
        }

        toast({ title: '¡Pensamiento publicado!' });
        form.reset();
        setInstaImageUrl(null);
    } catch (error: any) {
        console.error(error);
        toast({ title: 'Error al publicar', description: error.message, variant: 'destructive' });
    } finally {
        setIsSubmitting(false);
    }
  };

  const sortedAndFilteredThoughts = useMemo(() => {
    let result = [...thoughts];

    if (activeFilter === 'mine') {
        if (!user) return [];
        return result.filter(t => t.userId === user.uid);
    }

    switch (activeFilter) {
        case 'featured':
            result.sort((a, b) => {
                if (a.isFeatured && !b.isFeatured) return -1;
                if (!a.isFeatured && b.isFeatured) return 1;
                return calculateHotScore(b) - calculateHotScore(a);
            });
            break;
        case 'popular':
            result.sort((a, b) => (b.likes || 0) - (a.likes || 0));
            break;
        case 'newest':
            // Ya vienen ordenados por createdAt desc de la query
            break;
    }

    return result;
  }, [thoughts, activeFilter, user]);

  const FilterButton = ({ filter, children, isActive }: { filter: FilterType; children: React.ReactNode; isActive: boolean; }) => (
    <Button
        variant={isActive ? 'default' : 'ghost'}
        className={`h-8 px-3 ${isActive ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""}`}
        onClick={() => setActiveFilter(filter)}
    >
        {children}
    </Button>
  );

  return (
    <div className="space-y-6">
      <Card className={cn((theme === 'dark' || theme === 'army') && 'bg-black')}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="text-primary h-5 w-5" />
            ¿Qué estás pensando?
          </CardTitle>
          <CardDescription>Comparte tus pensamientos rápidos sobre {figureName}.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="text"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea 
                        placeholder="Escribe aquí tu pensamiento..."
                        className="resize-none min-h-[100px]"
                        maxLength={250}
                        {...field}
                      />
                    </FormControl>
                    <div className="flex justify-between items-center pt-1">
                        <FormMessage />
                        <p className={cn("text-[10px] font-bold uppercase tracking-widest", textValue.length > 200 ? "text-orange-500" : "text-muted-foreground")}>
                            {textValue.length} / 250
                        </p>
                    </div>
                  </FormItem>
                )}
              />

              <div className="space-y-3">
                <FormLabel className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    <Instagram className="h-4 w-4 text-pink-500" />
                    Imagen de Instagram (opcional)
                </FormLabel>
                {instaImageUrl ? (
                    <div className="relative group w-full max-w-[200px] h-[200px] rounded-xl overflow-hidden border-2 border-primary/20 bg-muted flex items-center justify-center">
                        <Image src={instaImageUrl} alt="Preview" fill className="object-contain" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Button type="button" variant="destructive" size="sm" onClick={() => setInstaImageUrl(null)}>Quitar</Button>
                        </div>
                    </div>
                ) : (
                    <div className="flex gap-2">
                        <Input value={instaUrl} onChange={(e) => setInstaUrl(e.target.value)} placeholder="Link de Instagram..." className="h-9 text-sm" />
                        <Button type="button" variant="secondary" size="sm" disabled={isFetchingInsta || !instaUrl.trim()} onClick={handleFetchInstaImage}>
                            {isFetchingInsta ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ver"}
                        </Button>
                    </div>
                )}
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={isSubmitting} className="rounded-full px-6">
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                  Publicar
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2 flex-wrap mb-4">
          <FilterButton filter="featured" isActive={activeFilter === 'featured'}>Destacados</FilterButton>
          <FilterButton filter="popular" isActive={activeFilter === 'popular'}>Populares</FilterButton>
          {user && <FilterButton filter="mine" isActive={activeFilter === 'mine'}>Mi opinión</FilterButton>}
      </div>

      <div className="space-y-4">
        {isLoadingThoughts ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)
        ) : sortedAndFilteredThoughts.length > 0 ? (
            sortedAndFilteredThoughts.map((t) => (
                <ThoughtItem 
                    key={t.id} 
                    thought={t} 
                    figureId={figureId} 
                    figureName={figureName}
                    onDeleteSuccess={(id) => setThoughts(prev => prev.filter(item => item.id !== id))}
                />
            ))
        ) : (
            <div className="text-center py-12 border-2 border-dashed rounded-xl">
                <MessageCircle className="mx-auto h-12 w-12 text-muted-foreground/20 mb-2" />
                <p className="text-muted-foreground text-sm font-medium">No hay pensamientos todavía.</p>
                <p className="text-xs text-muted-foreground/60">¡Sé el primero en compartir qué piensas!</p>
            </div>
        )}
      </div>
    </div>
  );
}
