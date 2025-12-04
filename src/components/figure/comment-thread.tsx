'use client';

import { collection, query, orderBy, doc, runTransaction, increment, serverTimestamp, deleteDoc, updateDoc, writeBatch, getDocs, where, limit } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc, addDocumentNonBlocking } from '@/firebase';
import type { Comment as CommentType, CommentVote, GlobalSettings } from '@/lib/types';
import { Skeleton } from '../ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { cn } from '@/lib/utils';
import { MessageSquare, ThumbsUp, ThumbsDown, Loader2, FilePenLine, Trash2, Send, X, CornerDownRight, ChevronDown, ChevronUp, Share2, Lock } from 'lucide-react';
import { Button } from '../ui/button';
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
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
} from "@/components/ui/alert-dialog"
import { Textarea } from '../ui/textarea';
import ReplyForm from './reply-form';
import { StarRating } from '../shared/star-rating';
import { countries } from '@/lib/countries';
import Image from 'next/image';
import Link from 'next/link';
import { ShareButton } from '../shared/ShareButton';
import { useLanguage } from '@/context/LanguageContext';

interface CommentItemProps {
  comment: CommentType, 
  figureId: string,
  figureName: string,
  isReply?: boolean;
  onReply: (parent: CommentType) => void;
  isReplying: boolean;
  onReplySuccess: () => void;
  areRepliesEnabled: boolean;
  refetchReplies?: () => void; // Add refetch function for replies
}

function CommentItem({ comment, figureId, figureName, isReply = false, onReply, isReplying, onReplySuccess, areRepliesEnabled, refetchReplies }: CommentItemProps) {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const { t } = useLanguage();
    const [isVoting, setIsVoting] = useState<'like' | 'dislike' | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState(comment.text);
    const [isSavingEdit, setIsSavingEdit] = useState(false);

    const isOwner = user && user.uid === comment.userId;
    
    // Determine the correct path for the vote based on whether it's a root comment or a reply
    const votePath = isReply 
        ? `figures/${figureId}/comments/${comment.parentId}/replies/${comment.id}/votes`
        : `figures/${figureId}/comments/${comment.id}/votes`;
        
    const userVoteRef = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return doc(firestore, votePath, user.uid);
    }, [firestore, user, votePath]);


    const { data: userVote, isLoading: isVoteLoading, refetch: refetchVote } = useDoc<CommentVote>(userVoteRef);

    const country = countries.find(c => t(`countries.${c.key}`) === comment.userCountry);

    const handleVote = async (voteType: 'like' | 'dislike') => {
        if (!firestore || !user || isVoting) return;
        setIsVoting(voteType);
    
        const commentPath = isReply
            ? `figures/${figureId}/comments/${comment.parentId}/replies/${comment.id}`
            : `figures/${figureId}/comments/${comment.id}`;
                
        const commentRef = doc(firestore, commentPath);
        const voteRef = doc(firestore, votePath, user.uid);
    
        try {
            await runTransaction(firestore, async (transaction) => {
                const voteDoc = await transaction.get(voteRef);
                const existingVote = voteDoc.exists() ? voteDoc.data().vote : null;
                const updates: { [key: string]: any } = {};
    
                if (existingVote === voteType) { // Retracting vote
                    updates[`${voteType}s`] = increment(-1);
                    transaction.delete(voteRef);
                    toast({ title: t("CommentThread.toast.voteRemoved") });
                } else if (existingVote) { // Changing vote
                    const otherVoteType = voteType === 'like' ? 'dislike' : 'like';
                    updates[`${voteType}s`] = increment(1);
                    updates[`${otherVoteType}s`] = increment(-1);
                    transaction.set(voteRef, { vote: voteType, createdAt: serverTimestamp() });
                    toast({ title: t("CommentThread.toast.voteUpdated") });
                } else { // First vote
                    updates[`${voteType}s`] = increment(1);
                    transaction.set(voteRef, { vote: voteType, createdAt: serverTimestamp() });
                    toast({ title: t("CommentThread.toast.voteRegistered") });
                }
                
                transaction.update(commentRef, updates);
            });
            refetchVote();
            refetchReplies?.();
        } catch (error: any) {
            console.error("Error al votar:", error);
            toast({
                title: t("CommentThread.toast.voteErrorTitle"),
                description: error.message || t("CommentThread.toast.voteErrorDescription"),
                variant: "destructive",
            });
        } finally {
            setIsVoting(null);
        }
    };

    const handleDelete = async () => {
        if (!firestore || !isOwner) return;
        setIsDeleting(true);

        const commentPath = isReply
            ? `figures/${figureId}/comments/${comment.parentId}/replies/${comment.id}`
            : `figures/${figureId}/comments/${comment.id}`;
        const commentRef = doc(firestore, commentPath);
        const figureRef = doc(firestore, 'figures', figureId);
        
        try {
             await runTransaction(firestore, async (transaction) => {
                // --- 1. READS FIRST ---
                const figureDoc = await transaction.get(figureRef);
                if (!figureDoc.exists()) throw new Error("Figure not found.");

                let repliesSnapshot;
                if (!isReply) {
                    const repliesRef = collection(firestore, commentRef.path, 'replies');
                    repliesSnapshot = await getDocs(repliesRef);
                }

                // --- 2. WRITES SECOND ---
                if (!isReply && typeof comment.rating === 'number' && comment.rating >= 0) {
                     const ratingUpdates: { [key: string]: any } = {
                        ratingCount: increment(-1),
                        totalRating: increment(-comment.rating),
                        [`ratingsBreakdown.${comment.rating}`]: increment(-1),
                        __ratingCount_delta: -comment.rating,
                        __totalRating_delta: -1,
                        updatedAt: serverTimestamp(),
                     };
                     transaction.update(figureRef, ratingUpdates);
                }

                if (repliesSnapshot) {
                    repliesSnapshot.forEach(replyDoc => transaction.delete(replyDoc.ref));
                }
                
                transaction.delete(commentRef);
            });


            toast({
                title: t('CommentThread.toast.deleteSuccess'),
                description: t('CommentThread.toast.deleteSuccessDescription')
            });
            refetchReplies?.(); // Refetch the list after deletion
        } catch (error: any) {
            console.error("Error al eliminar comentario:", error);
            toast({
                title: t('CommentThread.toast.deleteError'),
                description: error.message || t("CommentThread.toast.deleteErrorDescription"),
                variant: "destructive",
            });
        } finally {
            setIsDeleting(false);
        }
    };

    const handleUpdate = async () => {
        if (!firestore || !isOwner || editText.trim() === '') return;
        setIsSavingEdit(true);

         const commentPath = isReply
            ? `figures/${figureId}/comments/${comment.parentId}/replies/${comment.id}`
            : `figures/${figureId}/comments/${comment.id}`;
        const commentRef = doc(firestore, commentPath);

        try {
            await updateDoc(commentRef, {
                text: editText,
                updatedAt: serverTimestamp() 
            });
            toast({
                title: t('CommentThread.toast.updateSuccess'),
            });
            setIsEditing(false);
            refetchReplies?.(); // Refetch after edit
        } catch (error) {
            console.error("updating comment:", error);
            toast({
                title: t('CommentThread.toast.updateError'),
                description: t('CommentThread.toast.updateErrorDescription'),
                variant: "destructive",
            });
        } finally {
            setIsSavingEdit(false);
        }
    };

    const getAvatarFallback = () => {
        return comment.userDisplayName?.charAt(0) || 'U';
    }

    const renderCommentText = () => {
        const mentionMatch = comment.text.match(/^@\[(.*?)\]/);
        if (mentionMatch) {
            const mention = mentionMatch[1];
            const restOfText = comment.text.substring(mentionMatch[0].length).trim();
            return (
                <p className="text-sm text-black dark:text-white whitespace-pre-wrap mt-1">
                    <span className="text-primary font-semibold mr-1">@{mention}</span>
                    {restOfText}
                </p>
            );
        }
        return <p className="text-sm text-black dark:text-white whitespace-pre-wrap mt-1">{comment.text}</p>;
    };

    return (
      <div id={`comment-${comment.id}`} className="space-y-2">
        <div className="flex items-start gap-4">
            <Avatar className={cn("h-10 w-10", isReply && "h-8 w-8")}>
                <AvatarImage src={comment.userPhotoURL || undefined} alt={comment.userDisplayName} />
                <AvatarFallback>{getAvatarFallback()}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{comment.userDisplayName}</span>
                    
                    {comment.userGender === 'Masculino' && <span className="text-blue-400 font-bold" title={t('ProfilePage.genderMale')}>♂</span>}
                    {comment.userGender === 'Femenino' && <span className="text-pink-400 font-bold" title={t('ProfilePage.genderFemale')}>♀</span>}

                    {country && (
                        <Image
                            src={`https://flagcdn.com/w20/${country.code.toLowerCase()}.png`}
                            alt={country.name || country.code}
                            width={20}
                            height={15}
                            className="object-contain"
                            title={country.name}
                        />
                    )}
                    {comment.updatedAt && (
                         <p className="text-xs text-italic text-muted-foreground">{t('CommentThread.edited')}</p>
                    )}
                </div>

                {!isReply && comment.rating !== -1 && typeof comment.rating === 'number' && (
                  <StarRating rating={comment.rating} starClassName="h-4 w-4 mt-1" />
                )}

                {isEditing ? (
                    <div className="mt-2 space-y-2">
                        <Textarea 
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            className="text-sm"
                            rows={3}
                        />
                        <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} disabled={isSavingEdit}>
                                <X className="mr-1.5" /> {t("ReplyForm.cancelButton")}
                            </Button>
                            <Button size="sm" onClick={handleUpdate} disabled={isSavingEdit}>
                                {isSavingEdit ? <Loader2 className="animate-spin" /> : <Send className="mr-1.5" />} {t("EditFigure.buttons.save")}
                            </Button>
                        </div>
                    </div>
                ) : (
                    renderCommentText()
                )}

                {!isEditing && (
                   <div className="mt-2 flex items-center gap-1 text-muted-foreground">
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className={cn("flex items-center gap-1.5 h-8 px-2", userVote?.vote === 'like' && 'text-primary' )}
                            onClick={() => handleVote('like')}
                            disabled={!user || !!isVoting}
                        >
                            {isVoting === 'like' ? <Loader2 className="h-4 w-4 animate-spin"/> : <ThumbsUp className="h-4 w-4" />}
                            <span>{(comment.likes ?? 0).toLocaleString()}</span>
                        </Button>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className={cn("flex items-center gap-1.5 h-8 px-2", userVote?.vote === 'dislike' && 'text-destructive' )}
                            onClick={() => handleVote('dislike')}
                            disabled={!user || !!isVoting}
                        >
                            {isVoting === 'dislike' ? <Loader2 className="h-4 w-4 animate-spin"/> : <ThumbsDown className="h-4 w-4" />}
                            <span>{(comment.dislikes ?? 0).toLocaleString()}</span>
                        </Button>
                        
                        {isOwner && (
                            <>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsEditing(true)}>
                                <FilePenLine className="h-4 w-4" />
                                <span className="sr-only">{t('CommentThread.editButton')}</span>
                            </Button>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" disabled={isDeleting}>
                                        {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                        <span className="sr-only">{t('CommentThread.deleteButton')}</span>
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
                            {comment.rating > 0 && !isReply && (
                                <ShareButton
                                    figureId={figureId}
                                    figureName={figureName}
                                    isRatingShare={true}
                                    rating={comment.rating}
                                    showText={false}
                                    className="h-8 w-8"
                                />
                            )}
                            </>
                        )}
                        {user && areRepliesEnabled && (
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onReply(comment)}>
                                <MessageSquare className="h-4 w-4" />
                                <span className="sr-only">{t('CommentThread.replyButton')}</span>
                            </Button>
                        )}
                   </div>
                )}
            </div>
        </div>
        {isReplying && (
          <div className="pl-14">
            <ReplyForm 
              figureId={figureId}
              figureName={figureName}
              parentComment={isReply ? { ...comment, id: comment.parentId! } : comment}
              replyToComment={comment}
              onReplySuccess={onReplySuccess}
            />
          </div>
        )}
      </div>
    )
}

interface CommentThreadProps {
  comment: CommentType;
  figureId: string;
  figureName: string;
}

const INITIAL_REPLIES_LIMIT = 3;
const REPLIES_INCREMENT = 3;

export default function CommentThread({ comment, figureId, figureName }: CommentThreadProps) {
  const firestore = useFirestore();
  const { t } = useLanguage();
  const [repliesVisible, setRepliesVisible] = useState(false);
  const [visibleRepliesCount, setVisibleRepliesCount] = useState(INITIAL_REPLIES_LIMIT);
  const [replyingTo, setReplyingTo] = useState<CommentType | null>(null);

  const settingsDocRef = useMemoFirebase(() => firestore ? doc(firestore, 'settings', 'global') : null, [firestore]);
  const { data: globalSettings } = useDoc<GlobalSettings>(settingsDocRef);
  const areRepliesEnabled = (globalSettings?.isReplyEnabled ?? true);


  const repliesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
        collection(firestore, 'figures', figureId, 'comments', comment.id, 'replies'),
        orderBy('createdAt', 'asc')
    );
  }, [firestore, figureId, comment.id]);

  const { data: threadReplies, isLoading: areRepliesLoading, refetch: refetchReplies } = useCollection<CommentType>(repliesQuery);

  const visibleReplies = useMemo(() => {
      if (!threadReplies) return [];
      return threadReplies.slice(0, visibleRepliesCount);
  }, [threadReplies, visibleRepliesCount]);


  const hasReplies = threadReplies && threadReplies.length > 0;
  const hasMoreReplies = threadReplies && threadReplies.length > visibleRepliesCount;

  const handleReplyClick = (targetComment: CommentType) => {
    if (!areRepliesEnabled) {
      return;
    }
    setReplyingTo(prev => (prev?.id === targetComment.id ? null : targetComment));
  }
  
  const handleReplySuccess = useCallback(() => {
    setReplyingTo(null);
    refetchReplies(); // Refetch replies to show the new one
    if (!repliesVisible) {
        setRepliesVisible(true);
    }
  }, [refetchReplies, repliesVisible]);
  
  const toggleReplies = () => {
    const nextRepliesVisible = !repliesVisible;
    setRepliesVisible(nextRepliesVisible);
    if (!nextRepliesVisible) {
        setReplyingTo(null);
        setVisibleRepliesCount(INITIAL_REPLIES_LIMIT);
    }
  }
  
  const getSeeRepliesText = () => {
    if (!threadReplies) return '';
    const count = threadReplies.length;
    if (count === 1) {
      return t('CommentThread.seeRepliesSingular');
    }
    return t('CommentThread.seeRepliesPlural', { count });
  };

  return (
    <div className="space-y-4 rounded-lg border bg-card text-card-foreground p-4 dark:bg-black">
      <CommentItem 
        comment={comment} 
        figureId={figureId}
        figureName={figureName}
        onReply={() => handleReplyClick(comment)}
        isReplying={replyingTo?.id === comment.id}
        onReplySuccess={handleReplySuccess}
        areRepliesEnabled={areRepliesEnabled}
        refetchReplies={refetchReplies}
      />
      {hasReplies && (
        <Button
            variant="link"
            className="p-0 h-auto text-sm font-semibold text-primary ml-14"
            onClick={toggleReplies}
        >
            {repliesVisible ? (
                <>
                 <ChevronUp className="mr-1 h-4 w-4" />
                 {t('CommentThread.hideReplies')}
                </>
            ) : (
                <>
                <ChevronDown className="mr-1 h-4 w-4" />
                {getSeeRepliesText()}
                </>
            )}
        </Button>
      )}

      {!areRepliesEnabled && hasReplies && (
          <div className="ml-14 flex items-center gap-2 text-sm text-muted-foreground">
              <Lock className="h-4 w-4" />
              <span>{t('CommentThread.repliesLocked')}</span>
          </div>
      )}

      {repliesVisible && areRepliesEnabled && (
        <div className="ml-8 space-y-4 border-l-2 pl-4">
          {areRepliesLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin"/> {t('CommentList.loading')}
            </div>
          ) : (
            visibleReplies.map(reply => (
                <CommentItem
                    key={reply.id}
                    comment={reply}
                    figureId={figureId}
                    figureName={figureName}
                    isReply={true}
                    onReply={() => handleReplyClick(reply)}
                    isReplying={replyingTo?.id === reply.id}
                    onReplySuccess={handleReplySuccess}
                    areRepliesEnabled={areRepliesEnabled}
                    refetchReplies={refetchReplies}
                />
            ))
          )}
           {hasMoreReplies && (
                <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setVisibleRepliesCount(prev => prev + REPLIES_INCREMENT)}
                >
                    {t('CommentList.buttons.seeMore')}
                </Button>
            )}
        </div>
      )}
    </div>
  );
}
