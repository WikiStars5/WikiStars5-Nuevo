'use client';

import { useState, useEffect, useMemo } from 'react';
import { useFirestore, useUser } from '@/firebase';
import { collection, doc, getDoc, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';
import Image from 'next/image';
import type { Comment } from '@/lib/types';
import { countries } from '@/lib/countries';
import { StarRating } from './star-rating';
import { useLanguage } from '@/context/LanguageContext';
import { Button } from '../ui/button';
import { MessageSquare } from 'lucide-react';
import ReplyForm from '../figure/reply-form';


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

function CommentDisplay({ 
    comment, 
    isHighlighted = false,
    onReplyClick,
    canReply 
}: { 
    comment: Comment, 
    isHighlighted?: boolean,
    onReplyClick: () => void,
    canReply: boolean
}) {
    const { t } = useLanguage();
    const countryData = comment.userCountry ? countries.find(c => t(`countries.${c.key}`) === comment.userCountry) : null;
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
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-wrap">
                        <Link href={`/u/${comment.userDisplayName}`} className="font-semibold text-sm hover:underline">
                            {comment.userDisplayName}
                        </Link>
                        {comment.userGender === 'Masculino' && <span className="text-blue-400 font-bold" title="Masculino">♂</span>}
                        {comment.userGender === 'Femenino' && <span className="text-pink-400 font-bold" title="Femenino">♀</span>}
                        {countryData && (
                            <Image
                                src={`https://flagcdn.com/w20/${countryData.code.toLowerCase()}.png`}
                                alt={countryData.name || `Bandera de ${countryData.code}`}
                                width={20} height={15}
                                className="object-contain"
                                title={countryData.name}
                            />
                        )}
                    </div>
                     {canReply && (
                        <Button variant="ghost" size="sm" onClick={onReplyClick}>
                            <MessageSquare className="h-4 w-4 mr-2" />
                            {t('CommentThread.replyButton')}
                        </Button>
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
    const { user } = useUser();
    const [comments, setComments] = useState<Comment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
    const { t } = useLanguage();

    useEffect(() => {
        const fetchThread = async () => {
            if (!firestore || !parentId) {
                setError(t('Notifications.errorLoadingConversation'));
                setIsLoading(false);
                return;
            };
            setIsLoading(true);
            setError(null);
            
            try {
                const fetchedCommentsMap = new Map<string, Comment>();

                // 1. Get the root comment
                const rootDocRef = doc(firestore, 'figures', figureId, 'comments', parentId);
                const rootDocSnap = await getDoc(rootDocRef);

                if (!rootDocSnap.exists()) {
                    setError(t('Notifications.originalCommentDeleted'));
                    setIsLoading(false);
                    return;
                }
                fetchedCommentsMap.set(rootDocSnap.id, { id: rootDocSnap.id, ...rootDocSnap.data() } as Comment);

                // 2. Get the specific reply that triggered the notification
                let finalReply: Comment | null = null;
                if (replyId) {
                    const replyDocRef = doc(firestore, 'figures', figureId, 'comments', parentId, 'replies', replyId);
                    const replyDocSnap = await getDoc(replyDocRef);
                    
                    if (replyDocSnap.exists()) {
                        finalReply = { id: replyDocSnap.id, ...replyDocSnap.data() } as Comment;
                        fetchedCommentsMap.set(replyDocSnap.id, finalReply);
                    }
                }
                
                // 3. Find the parent of the final reply (the user's own comment) if it's not the root comment
                if (finalReply) {
                    const mentionMatch = finalReply.text.match(/^@\[(.*?)\]/);
                    if (mentionMatch) {
                        const repliedToUsername = mentionMatch[1];
                        
                        // We need to find the ID of the comment made by `repliedToUsername`
                        // We search for it within the replies subcollection
                        const repliesRef = collection(firestore, 'figures', figureId, 'comments', parentId, 'replies');
                        const q = query(
                            repliesRef, 
                            where('userDisplayName', '==', repliedToUsername),
                            orderBy('createdAt', 'desc'), // get the latest one just in case
                            limit(1)
                        );
                        const middleCommentSnap = await getDocs(q);

                        if (!middleCommentSnap.empty) {
                            const middleCommentDoc = middleCommentSnap.docs[0];
                            if (!fetchedCommentsMap.has(middleCommentDoc.id)) {
                                fetchedCommentsMap.set(middleCommentDoc.id, { id: middleCommentDoc.id, ...middleCommentDoc.data() } as Comment);
                            }
                        }
                    }
                }

                setComments(Array.from(fetchedCommentsMap.values()));

            } catch (err) {
                console.error("Error fetching comments for notification dialog:", err);
                setError(t('Notifications.errorLoadingConversation'));
            } finally {
                setIsLoading(false);
            }
        };

        fetchThread();
    }, [firestore, figureId, parentId, replyId, t]);


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
        setReplyingTo(null);
        onOpenChange(false); // Close dialog on successful reply
    }

    const orderedComments = useMemo(() => {
        return comments.sort((a, b) => a.createdAt.toDate().getTime() - b.createdAt.toDate().getTime());
    }, [comments]);
    
    const parentCommentForReply = comments.find(c => c.id === parentId);

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
                                <CommentDisplay 
                                    comment={comment} 
                                    isHighlighted={comment.id === replyId}
                                    onReplyClick={() => setReplyingTo(comment)}
                                    canReply={!!user && user.uid !== comment.userId}
                                />
                                {replyingTo?.id === comment.id && parentCommentForReply && (
                                    <div className="mt-4">
                                        <ReplyForm
                                            figureId={figureId}
                                            figureName={figureName}
                                            parentComment={parentCommentForReply}
                                            replyToComment={replyingTo}
                                            onReplySuccess={handleReplySuccess}
                                        />
                                    </div>
                                )}
                             </div>
                        ))}
                    </div>
                )}
            </div>
        </DialogContent>
    );
}
