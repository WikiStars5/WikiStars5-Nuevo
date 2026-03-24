'use client';

import { useState, useContext, useEffect, useRef } from 'react';
import { 
  doc, 
  runTransaction, 
  increment, 
  serverTimestamp, 
  deleteDoc, 
  updateDoc,
  collection
} from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { useAuth, useFirestore, useUser, useDoc, useMemoFirebase, useAdmin } from '@/firebase';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2, 
  Heart, 
  FilePenLine, 
  Trash2, 
  MessageSquare, 
  Bookmark, 
  BookmarkCheck,
  Save,
  Flame
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { updateStreak } from '@/firebase/streaks';
import { StreakAnimationContext } from '@/context/StreakAnimationContext';
import { useLanguage } from '@/context/LanguageContext';
import { cn, formatCompactNumber, formatDateDistance } from '@/lib/utils';
import Image from 'next/image';
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
import { Textarea } from '@/components/ui/textarea';
import type { Thought, Streak } from '@/lib/types';
import { isDateActive } from '@/lib/streaks';
import { trackView } from '@/lib/view-tracker';

type AttitudeOption = 'neutral' | 'fan' | 'simp' | 'hater';

const attitudeStyles: Record<AttitudeOption, { text: string; color: string }> = {
    fan: { text: 'Fan', color: 'text-yellow-400' },
    hater: { text: 'Hater', color: 'text-red-500' },
    simp: { text: 'Simp', color: 'text-pink-400' },
    neutral: { text: 'Espectador', color: 'text-gray-500' },
};

export function ThoughtDisplay({ 
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
    const { isAdmin } = useAdmin();
    const { toast } = useToast();
    const { language } = useLanguage();
    const streakContext = useContext(StreakAnimationContext);
    const showStreakAnimation = streakContext?.showStreakAnimation;
    const containerRef = useRef<HTMLDivElement>(null);

    const [isVoting, setIsVoting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
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

    // Save functionality
    const savedRef = useMemoFirebase(() => {
        if (!firestore || !user || !thought.id) return null;
        return doc(firestore, `users/${user.uid}/saved_thoughts`, thought.id);
    }, [firestore, user, thought.id]);

    const { data: savedDoc } = useDoc(savedRef, { enabled: !!user, realtime: true });
    const isSaved = !!savedDoc;

    // View Tracking Implementation
    useEffect(() => {
      if (!firestore || !thought.id || !figureId || typeof window === 'undefined') return;

      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            const path = isReply 
              ? `figures/${figureId}/thoughts/${thought.parentId}/replies`
              : `figures/${figureId}/thoughts`;
            trackView(firestore, path, thought.id);
            observer.disconnect();
          }
        },
        { threshold: 0.5 }
      );

      if (containerRef.current) {
        observer.observe(containerRef.current);
      }

      return () => observer.disconnect();
    }, [firestore, thought.id, figureId, isReply, thought.parentId]);

    const userStreakRef = useMemoFirebase(() => {
        if (!firestore || !thought.userId || !figureId) return null;
        return doc(firestore, `users/${thought.userId}/streaks`, figureId);
    }, [firestore, thought.userId, figureId]);

    const { data: userStreak } = useDoc<Streak>(userStreakRef, { realtime: true });

    const country = thought.userCountry ? countries.find(c => c.key === thought.userCountry?.toLowerCase()) : null;
    const attitudeStyle = thought.userAttitude ? attitudeStyles[thought.userAttitude as AttitudeOption] : null;
    const showStreak = userStreak && userStreak.currentStreak > 0 && isDateActive(userStreak.lastCommentDate);

    const handleHeartToggle = async () => {
        if (!firestore || isVoting || !auth) return;
        setIsVoting(true);

        let currentUser = user;
        if (!currentUser) {
            try {
                const userCredential = await signInAnonymously(auth);
                currentUser = userCredential.user;
            } catch (error) {
                toast({ title: 'Error de conexión', variant: 'destructive' });
                setIsVoting(false);
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
                const isAlreadyLiked = voteDoc.exists();
                const updates: { [key: string]: any } = {};

                if (isAlreadyLiked) {
                    updates[`likes`] = increment(-1);
                    transaction.delete(voteRef);
                } else {
                    updates[`likes`] = increment(1);
                    transaction.set(voteRef, { vote: 'like', createdAt: serverTimestamp() });
                }
                transaction.update(itemRef, updates);
            });

            if (currentUser && showStreakAnimation) {
                const streakResult = await updateStreak({
                    firestore, figureId, figureName,
                    userId: currentUser!.uid, isAnonymous: currentUser!.isAnonymous,
                    userPhotoURL: currentUser!.photoURL
                });

                if (streakResult?.streakGained) {
                    showStreakAnimation(streakResult.newStreakCount, { showPrompt: true, figureId, figureName });
                }
            }
        } catch (error) {
            console.error(error);
            toast({ title: 'Error al procesar el corazón', variant: 'destructive' });
        } finally {
            setIsVoting(false);
        }
    };

    const handleSaveToggle = async () => {
        if (!firestore || !user || isSaving || !savedRef) return;
        setIsSaving(true);
        try {
            const thoughtPath = isReply
                ? `figures/${figureId}/thoughts/${thought.parentId}/replies/${thought.id}`
                : `figures/${figureId}/thoughts/${thought.id}`;
            const itemRef = doc(firestore, thoughtPath);

            await runTransaction(firestore, async (transaction) => {
                const savedDocSnap = await transaction.get(savedRef!);
                const isAlreadySaved = savedDocSnap.exists();

                if (isAlreadySaved) {
                    transaction.delete(savedRef!);
                    transaction.update(itemRef, { saveCount: increment(-1) });
                } else {
                    transaction.set(savedRef!, {
                        figureId: figureId,
                        thoughtId: thought.id,
                        createdAt: serverTimestamp(),
                    });
                    transaction.update(itemRef, { saveCount: increment(1) });
                }
            });
            toast({ title: isSaved ? 'Eliminado de guardados' : 'Pensamiento guardado' });
        } catch (error) {
            console.error(error);
            toast({ title: 'Error al procesar guardado', variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!firestore || !(isOwner || isAdmin)) return;
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

                if (!isReply) {
                    const userThoughtRef = doc(firestore, 'users', thought.userId, 'thoughts', thought.id);
                    transaction.delete(userThoughtRef);
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

    const isLiked = userVote?.vote === 'like';

    return (
        <div ref={containerRef} className="flex gap-3">
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
                    <span className="text-[10px] text-muted-foreground ml-auto">
                        {thought.createdAt?.toDate ? formatDateDistance(thought.createdAt.toDate(), language) : ''}
                    </span>
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
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className={cn(
                            "h-8 px-2 text-[10px] gap-1.5",
                            isLiked ? "text-pink-500 hover:text-pink-600" : "text-muted-foreground"
                        )}
                        onClick={handleHeartToggle}
                        disabled={isVoting}
                    >
                        <Heart className={cn("h-3.5 w-3.5", isLiked && "fill-current")} />
                        {Number(thought.likes) > 0 && (
                            <span className="font-bold">{formatCompactNumber(thought.likes || 0)}</span>
                        )}
                    </Button>

                    <Button variant="ghost" size="sm" className="h-8 px-2 text-[10px] gap-1.5 text-muted-foreground" onClick={() => onReplyClick?.(thought)}>
                        <MessageSquare className="h-3.5 w-3.5" /> 
                        <span>Responder</span>
                    </Button>

                    {!isReply && (
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className={cn(
                                "h-8 w-8",
                                isSaved ? "text-primary" : "text-muted-foreground"
                            )}
                            onClick={handleSaveToggle}
                            disabled={isSaving || !user}
                            title={isSaved ? "Quitar de guardados" : "Guardar pensamiento"}
                        >
                            {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : isSaved ? <BookmarkCheck className="h-3.5 w-3.5 fill-current" /> : <Bookmark className="h-3.5 w-3.5" />}
                        </Button>
                    )}
                    
                    <div className="flex items-center gap-1 ml-auto">
                        {isOwner && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsEditing(true)}>
                                <FilePenLine className="h-3 w-3" />
                            </Button>
                        )}
                        {(isOwner || isAdmin) && (
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
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
