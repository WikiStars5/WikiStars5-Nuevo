
'use client';

import { useState, useEffect } from 'react';
import type { Comment, CommentVote, Streak } from '@/lib/types';
import Link from 'next/link';
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { StarRating } from '@/components/shared/star-rating';
import { MessageSquare, ThumbsUp, ThumbsDown, Loader2, Flame, ChevronDown, Trash2 } from 'lucide-react';
import { cn, formatDateDistance, formatCompactNumber } from '@/lib/utils';
import { useLanguage } from '@/context/LanguageContext';
import { countries } from '@/lib/countries';
import { commentTags } from '@/lib/tags';
import { Button } from '@/components/ui/button';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, runTransaction, increment, serverTimestamp, onSnapshot, getDocs, collection as firestoreCollection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import ReplyForm from '../figure/reply-form';
import { isDateActive } from '@/lib/streaks';
import { useTheme } from 'next-themes';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import StarPostThreadDialog from './starpost-thread-dialog';
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


type AttitudeOption = 'neutral' | 'fan' | 'simp' | 'hater';

const attitudeStyles: Record<AttitudeOption, { text: string; color: string }> = {
    fan: { text: 'Fan', color: 'text-yellow-400' },
    hater: { text: 'Hater', color: 'text-red-500' },
    simp: { text: 'Simp', color: 'text-pink-400' },
    neutral: { text: 'Espectador', color: 'text-gray-500' },
};


interface StarPostCardProps {
  post: Comment;
  onDeleteSuccess?: () => void;
}

export default function StarPostCard({ post: initialPost, onDeleteSuccess }: StarPostCardProps) {
  const { language, t } = useLanguage();
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { theme } = useTheme();
  
  const [post, setPost] = useState(initialPost);
  const [isReplying, setIsReplying] = useState(false);
  const [isVoting, setIsVoting] = useState<'like' | 'dislike' | null>(null);
  const [isThreadOpen, setIsThreadOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const isOwner = user && user.uid === initialPost.userId;


  const commentRef = useMemoFirebase(() => {
    if (!firestore || !initialPost.figureId || !initialPost.id) return null;
    return doc(firestore, 'figures', initialPost.figureId, 'comments', initialPost.id);
  }, [firestore, initialPost.figureId, initialPost.id]);

  useEffect(() => {
    if (!commentRef) return;
    const unsubscribe = onSnapshot(commentRef, (doc) => {
        if (doc.exists()) {
            setPost({ id: doc.id, ...doc.data() } as Comment);
        }
    });
    return () => unsubscribe();
  }, [commentRef]);


  const votePath = `figures/${post.figureId}/comments/${post.id}/votes`;
        
  const userVoteRef = useMemoFirebase(() => {
      if (!firestore || !user) return null;
      return doc(firestore, votePath, user.uid);
  }, [firestore, user, votePath]);

  const { data: userVote, isLoading: isVoteLoading, refetch: refetchVote } = useDoc<CommentVote>(userVoteRef, { enabled: !!user });

  const userStreakRef = useMemoFirebase(() => {
    if (!firestore || !post.userId || !post.figureId) return null;
    return doc(firestore, `users/${post.userId}/streaks`, post.figureId);
  }, [firestore, post.userId, post.figureId]);

  const { data: userStreak, isLoading: isStreakLoading } = useDoc<Streak>(userStreakRef);

  const handleDelete = async () => {
    if (!firestore || !isOwner) return;
    setIsDeleting(true);

    const commentRef = doc(firestore, 'figures', post.figureId, 'comments', post.id);
    const starpostRef = doc(firestore, 'users', post.userId, 'starposts', post.id);
    const figureRef = doc(firestore, 'figures', post.figureId);
    
    try {
        await runTransaction(firestore, async (transaction) => {
            const figureDoc = await transaction.get(figureRef);
            if (!figureDoc.exists()) throw new Error("Figure not found.");

            const repliesRef = firestoreCollection(firestore, commentRef.path, 'replies');
            const repliesSnapshot = await getDocs(repliesRef);
            repliesSnapshot.forEach(replyDoc => transaction.delete(replyDoc.ref));

            if (typeof post.rating === 'number' && post.rating >= 0) {
                const ratingUpdates = {
                    ratingCount: increment(-1),
                    totalRating: increment(-post.rating),
                    [`ratingsBreakdown.${post.rating}`]: increment(-1),
                };
                transaction.update(figureRef, ratingUpdates);
            }

            transaction.delete(commentRef);
            transaction.delete(starpostRef);
        });

        toast({
            title: t('CommentThread.toast.deleteSuccess'),
            description: t('CommentThread.toast.deleteSuccessDescription')
        });
        if (onDeleteSuccess) {
            onDeleteSuccess();
        }
    } catch (error: any) {
        console.error("Error deleting StarPost:", error);
        toast({
            title: t('CommentThread.toast.deleteError'),
            description: error.message || "Could not delete this post.",
            variant: "destructive",
        });
    } finally {
        setIsDeleting(false);
    }
};


  const handleVote = async (voteType: 'like' | 'dislike') => {
    if (!firestore || !user || isVoting) return;
    setIsVoting(voteType);

    const commentRef = doc(firestore, 'figures', post.figureId, 'comments', post.id);
    const voteRef = doc(firestore, votePath, user.uid);

    // Optimistic Update
    setPost(currentPost => {
        const newPost = { ...currentPost };
        const existingVote = userVote?.vote;

        if (existingVote === voteType) { // Retracting vote
            newPost[`${voteType}s`] = (newPost[`${voteType}s`] ?? 1) - 1;
        } else if (existingVote) { // Changing vote
            const otherVoteType = voteType === 'like' ? 'dislike' : 'like';
            newPost[`${voteType}s`] = (newPost[`${voteType}s`] ?? 0) + 1;
            newPost[`${otherVoteType}s`] = (newPost[`${otherVoteType}s`] ?? 1) - 1;
        } else { // First vote
            newPost[`${voteType}s`] = (newPost[`${voteType}s`] ?? 0) + 1;
        }
        return newPost;
    });

    try {
        await runTransaction(firestore, async (transaction) => {
            const voteDoc = await transaction.get(voteRef);
            const existingVote = voteDoc.exists() ? voteDoc.data().vote : null;
            const updates: { [key: string]: any } = {};

            if (existingVote === voteType) { // Retracting vote
                updates[`${voteType}s`] = increment(-1);
                transaction.delete(voteRef);
                toast({ title: t("CommentThread.toast.voteRemoved") });
            } else {
                updates[`${voteType}s`] = increment(1);
                if (existingVote) {
                    const otherVoteType = voteType === 'like' ? 'dislike' : 'like';
                    updates[`${otherVoteType}s`] = increment(-1);
                }
                transaction.set(voteRef, { vote: voteType, createdAt: serverTimestamp() });
                toast({ title: t("CommentThread.toast.voteRegistered") });
            }
            
            transaction.update(commentRef, updates);
        });
        refetchVote();
    } catch (error: any) {
        console.error("Error al votar:", error);
        setPost(initialPost); // Revert optimistic update on error
        toast({
            title: t("CommentThread.toast.voteErrorTitle"),
            description: error.message || t("CommentThread.toast.voteErrorDescription"),
            variant: "destructive",
        });
    } finally {
        setIsVoting(null);
    }
  };

  const handleReplySuccess = (newReply: Comment) => {
    setIsReplying(false);
    // Realtime listener will handle updating replyCount
  };

  if (!post.figureId || !post.figureName) {
      return null;
  }
  
  const getAvatarFallback = () => post.userDisplayName?.charAt(0) || 'U';

  const country = post.userCountry ? countries.find(c => c.key === post.userCountry?.toLowerCase()) : null;
  const attitudeStyle = post.userAttitude ? attitudeStyles[post.userAttitude as AttitudeOption] : null;
  const tag = post.tag ? commentTags.find(t => t.id === post.tag) : null;
  const showStreak = userStreak && userStreak.currentStreak > 0 && isDateActive(userStreak.lastCommentDate);

  return (
    <Dialog open={isThreadOpen} onOpenChange={setIsThreadOpen}>
        <Card className={cn("hover:border-primary/50 transition-colors p-4", (theme === 'dark' || theme === 'army') && 'bg-black')}>
            <div className="flex items-start gap-4">
                <Link href={`/u/${post.userDisplayName}`} className="flex-shrink-0">
                    <Avatar className="h-10 w-10">
                        <AvatarImage src={post.userPhotoURL || undefined} alt={post.userDisplayName} />
                        <AvatarFallback>{getAvatarFallback()}</AvatarFallback>
                    </Avatar>
                </Link>
                <div className="flex-1">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2 flex-wrap">
                            <Link href={`/u/${post.userDisplayName}`} className="font-semibold text-sm hover:underline">{post.userDisplayName}</Link>
                            {attitudeStyle && (<p className={cn("text-xs font-bold", attitudeStyle.color)}>{attitudeStyle.text}</p>)}
                            {showStreak && (<div className="flex items-center gap-1 text-orange-500 font-bold text-xs" title={`${userStreak.currentStreak} días de racha`}><Flame className="h-3 w-3" /><span>{userStreak.currentStreak}</span></div>)}
                            {post.userGender === 'Masculino' && <span className="text-blue-400 font-bold" title="Masculino">♂</span>}
                            {post.userGender === 'Femenino' && <span className="text-pink-400 font-bold" title="Feminino">♀</span>}
                            {country && (<Image src={`https://flagcdn.com/w20/${country.code.toLowerCase()}.png`} alt={country.name} width={20} height={15} className="object-contain" title={country.name}/>)}
                        </div>
                    </div>

                    <p className="text-xs text-muted-foreground">Publicado en <Link href={`/figures/${post.figureId}`} className="text-primary hover:underline">{post.figureName}</Link></p>

                    <div className="mt-2 space-y-2">
                        {tag && (<div className={cn("inline-flex items-center gap-2 text-xs font-bold px-2 py-0.5 rounded-full border", tag.color)}>{tag.emoji} {tag.label}</div>)}
                        {typeof post.rating === 'number' && post.rating >= 0 && <StarRating rating={post.rating} starClassName="h-4 w-4" />}
                        {post.text && <p className="text-sm text-foreground/90 whitespace-pre-wrap pt-1">{post.text}</p>}
                    </div>

                    <div className="flex items-center gap-1 text-muted-foreground mt-2">
                        <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleVote('like')} disabled={!user || !!isVoting}>
                            <ThumbsUp className={cn("h-4 w-4 mr-1", userVote?.vote === 'like' && 'text-primary' )} /> {formatCompactNumber(post.likes ?? 0)}
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleVote('dislike')} disabled={!user || !!isVoting}>
                            <ThumbsDown className={cn("h-4 w-4 mr-1", userVote?.vote === 'dislike' && 'text-destructive' )} /> {formatCompactNumber(post.dislikes ?? 0)}
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => setIsReplying(prev => !prev)}>
                            <MessageSquare className="h-4 w-4 mr-2" /> Responder
                        </Button>
                        {isOwner && (
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-8 px-2 text-destructive" disabled={isDeleting}>
                                        {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                    <AlertDialogTitle>{t('CommentThread.confirmDelete.title')}</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        {t('CommentThread.confirmDelete.description')}
                                    </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                    <AlertDialogCancel>{t("ReplyForm.cancelButton")}</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleDelete}>{t('CommentThread.confirmDelete.continue')}</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        )}
                    </div>

                    {(post.replyCount ?? 0) > 0 && (
                        <DialogTrigger asChild>
                            <Button variant="link" className="p-0 h-auto text-sm font-semibold text-primary">
                                <ChevronDown className="mr-1 h-4 w-4" />
                                Ver {post.replyCount} {post.replyCount === 1 ? 'respuesta' : 'respuestas'}
                            </Button>
                        </DialogTrigger>
                    )}

                    {isReplying && (
                        <div className="mt-4">
                            <ReplyForm figureId={post.figureId} figureName={post.figureName} parentComment={post} replyToComment={post} onReplySuccess={handleReplySuccess}/>
                        </div>
                    )}
                </div>
            </div>
        </Card>
        <StarPostThreadDialog
            figureId={post.figureId}
            parentId={post.id}
            figureName={post.figureName}
            onOpenChange={setIsThreadOpen}
            initialRepliesCount={post.replyCount || 0}
        />
    </Dialog>
  );
}
