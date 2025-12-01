'use client';

import { useState, useEffect, useMemo } from 'react';
import { useFirestore } from '@/firebase';
import { collection, doc, getDoc, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';
import Image from 'next/image';
import type { Comment } from '@/lib/types';
import ReplyForm from '../figure/reply-form';
import { countries } from '@/lib/countries';
import { StarRating } from './star-rating';
import { useLanguage } from '@/context/LanguageContext';

interface NotificationThreadDialogProps {
  figureId: string;
  parentId: string;
  replyId: string;
  figureName: string;
  onOpenChange: (open: boolean) => void;
}

function CommentDisplaySkeleton() {
    return (
        <div className="flex items-start gap-4 p-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-8 w-full" />
            </div>
        </div>
    );
}

function CommentDisplay({ comment, isHighlighted = false }: { comment: Comment, isHighlighted?: boolean }) {
    const country = comment.userCountry ? countries.find(c => c.name === comment.userCountry) : null;
    const getAvatarFallback = () => comment.userDisplayName?.charAt(0).toUpperCase() || 'U';

    const renderCommentText = () => {
        const mentionMatch = comment.text.match(/^@\[(.*?)\]/);
        if (mentionMatch) {
            const mention = mentionMatch[1];
            const restOfText = comment.text.substring(mentionMatch[0].length).trim();
            return (
                <p className="text-sm text-foreground/90 whitespace-pre-wrap mt-1">
                    <span className="text-primary font-semibold mr-1">@{mention}</span>
                    {restOfText}
                </p>
            );
        }
        return <p className="text-sm text-foreground/90 whitespace-pre-wrap mt-1">{comment.text}</p>;
    };

    return (
        <div id={`comment-${comment.id}`} className={`flex items-start gap-4 rounded-lg border p-4 transition-all duration-500 ${isHighlighted ? 'bg-primary/10 border-primary animate-highlight' : 'bg-card'}`}>
            <Avatar className="h-10 w-10">
                <Link href={`/u/${comment.userDisplayName}`}>
                    <AvatarImage src={comment.userPhotoURL || undefined} alt={comment.userDisplayName} />
                </Link>
                <AvatarFallback>
                    <Link href={`/u/${comment.userDisplayName}`}>{getAvatarFallback()}</Link>
                </AvatarFallback>
            </Avatar>
            <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                    <Link href={`/u/${comment.userDisplayName}`} className="font-semibold text-sm hover:underline">
                        {comment.userDisplayName}
                    </Link>
                    {comment.userGender === 'Masculino' && <span className="text-blue-400 font-bold" title="Masculino">♂</span>}
                    {comment.userGender === 'Femenino' && <span className="text-pink-400 font-bold" title="Femenino">♀</span>}
                    {country && (
                        <Image
                            src={`https://flagcdn.com/w20/${country.code.toLowerCase()}.png`}
                            alt={country.name}
                            width={20} height={15}
                            className="object-contain"
                            title={country.name}
                        />
                    )}
                </div>
                {comment.rating !== -1 && typeof comment.rating === 'number' && (
                  <StarRating rating={comment.rating} starClassName="h-4 w-4 mt-1" />
                )}
                {renderCommentText()}
            </div>
        </div>
    )
}

export default function NotificationThreadDialog({
  figureId,
  parentId,
  replyId,
  figureName,
  onOpenChange,
}: NotificationThreadDialogProps) {
    const firestore = useFirestore();
    const [comments, setComments] = useState<Comment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { t } = useLanguage();

    const rootComment = useMemo(() => {
        return comments.find(c => c.id === parentId);
    }, [comments, parentId]);
    
    useEffect(() => {
        const fetchThread = async () => {
            if (!firestore) return;
            setIsLoading(true);
            setError(null);
            
            try {
                const fetchedComments = new Map<string, Comment>();
                
                // 1. Get the root comment
                const rootDocRef = doc(firestore, 'figures', figureId, 'comments', parentId);

                // 2. Get all replies for that root comment
                const repliesQuery = query(collection(rootDocRef, 'replies'), orderBy('createdAt', 'asc'));

                const [rootDocSnap, repliesSnapshot] = await Promise.all([
                    getDoc(rootDocRef),
                    getDocs(repliesQuery)
                ]);

                if (!rootDocSnap.exists()) {
                    setError(t('Notifications.originalCommentDeleted'));
                    setIsLoading(false);
                    return;
                }
                const rootCommentData = { id: rootDocSnap.id, ...rootDocSnap.data() } as Comment;
                fetchedComments.set(rootCommentData.id, rootCommentData);

                repliesSnapshot.forEach(replyDoc => {
                     const replyData = { id: replyDoc.id, ...replyDoc.data() } as Comment;
                     fetchedComments.set(replyData.id, replyData);
                });
                
                setComments(Array.from(fetchedComments.values()));

            } catch (err) {
                console.error("Error fetching comments for notification dialog:", err);
                setError(t('Notifications.errorLoadingConversation'));
            } finally {
                setIsLoading(false);
            }
        };

        fetchThread();
    }, [firestore, figureId, parentId, t]);


    useEffect(() => {
        if (!isLoading && replyId) {
            setTimeout(() => {
                const element = document.getElementById(`comment-${replyId}`);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 100); 
        }
    }, [isLoading, replyId]);

    const handleReplySuccess = () => {
        onOpenChange(false);
    };

    const orderedComments = useMemo(() => {
        if (comments.length === 0) return [];
        const root = comments.find(c => c.id === parentId);
        const replies = comments.filter(c => c.id !== parentId);
        
        if (!root) return [];
        
        // Sort replies by creation date, root comment is always first
        replies.sort((a,b) => (a.createdAt?.toMillis() ?? 0) - (b.createdAt?.toMillis() ?? 0));
        
        return [root, ...replies];
    }, [comments, parentId]);

    return (
        <DialogContent className="sm:max-w-xl">
            <DialogHeader>
                <DialogTitle>{t('Notifications.threadDialogTitle')}</DialogTitle>
                <DialogDescription>
                    {t('Notifications.threadDialogDescription')} <span className="font-semibold text-primary">{figureName}</span>.
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto">
                {isLoading ? (
                    <div className="space-y-4">
                        <CommentDisplaySkeleton />
                        <div className="pl-8"><CommentDisplaySkeleton /></div>
                    </div>
                ) : error ? (
                    <p className="text-center text-destructive py-10">{error}</p>
                ) : (
                    <div className="space-y-4">
                        {orderedComments.map((comment) => (
                             <div key={comment.id} className={comment.id !== parentId ? "pl-8 border-l-2 ml-4" : ""}>
                                <CommentDisplay comment={comment} isHighlighted={comment.id === replyId} />
                             </div>
                        ))}
                        
                        {rootComment && (
                             <div className="pl-8 border-l-2 ml-4 pt-4">
                                <ReplyForm
                                    figureId={figureId}
                                    figureName={figureName}
                                    parentComment={rootComment}
                                    onReplySuccess={handleReplySuccess}
                                />
                             </div>
                        )}
                    </div>
                )}
            </div>
        </DialogContent>
    );
}
