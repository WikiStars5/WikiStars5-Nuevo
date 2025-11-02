
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useFirestore } from '@/firebase';
import { collection, doc, getDoc, query, where, getDocs, orderBy } from 'firebase/firestore';
import { DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';
import Image from 'next/image';
import type { Comment } from '@/lib/types';
import ReplyForm from '../figure/reply-form';
import { countries } from '@/lib/countries';
import { StarRating } from './star-rating';

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
        const mentionMatch = comment.text.match(/^(@\S+)/);
        if (mentionMatch) {
            const mention = mentionMatch[1];
            const restOfText = comment.text.substring(mention.length).trim();
            return (
                <p className="text-sm text-foreground/90 whitespace-pre-wrap mt-1">
                    <span className="text-primary font-semibold mr-1">{mention}</span>
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
    const [rootComment, setRootComment] = useState<Comment | null>(null);
    const [replies, setReplies] = useState<Comment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // The comment to reply to, which is the one that was highlighted.
    const activeReplyTarget = useMemo(() => {
        if (replyId) {
            const target = replies.find(r => r.id === replyId);
            if (target) return target;
        }
        return rootComment;
    }, [replyId, rootComment, replies]);


    useEffect(() => {
        const fetchComments = async () => {
            if (!firestore) return;
            setIsLoading(true);
            
            try {
                const commentsRef = collection(firestore, `figures/${figureId}/comments`);
                const rootRef = doc(commentsRef, parentId);

                const repliesQuery = query(
                    commentsRef,
                    where('parentId', '==', parentId),
                    orderBy('createdAt', 'asc')
                );

                const [rootSnap, repliesSnap] = await Promise.all([
                    getDoc(rootRef),
                    getDocs(repliesQuery)
                ]);

                if (rootSnap.exists()) {
                    const rootData = { id: rootSnap.id, ...rootSnap.data() } as Comment;
                    setRootComment(rootData);
                    const replyData = repliesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Comment));
                    setReplies(replyData);
                } else {
                    console.error("Root comment not found.");
                }

            } catch (error) {
                console.error("Error fetching comments for notification dialog:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchComments();
    }, [firestore, figureId, parentId]);

     useEffect(() => {
        // Scroll to the highlighted comment after it's rendered
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
        onOpenChange(false); // Close dialog on successful reply
    };

    return (
        <DialogContent className="sm:max-w-xl">
            <DialogHeader>
                <DialogTitle>Conversación de Comentarios</DialogTitle>
                <DialogDescription>
                    Respondiendo en el perfil de <span className="font-semibold text-primary">{figureName}</span>.
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto">
                {isLoading ? (
                    <div className="space-y-4">
                        <CommentDisplaySkeleton />
                        <div className="pl-8"><CommentDisplaySkeleton /></div>
                    </div>
                ) : (
                    rootComment ? (
                        <div className="space-y-4">
                            <CommentDisplay comment={rootComment} isHighlighted={rootComment.id === replyId} />
                            <div className="pl-8 border-l-2 ml-4 space-y-4">
                                {replies.map(reply => (
                                    <CommentDisplay key={reply.id} comment={reply} isHighlighted={reply.id === replyId} />
                                ))}
                                 {activeReplyTarget && (
                                     <ReplyForm
                                        figureId={figureId}
                                        figureName={figureName}
                                        parentComment={activeReplyTarget}
                                        onReplySuccess={handleReplySuccess}
                                    />
                                 )}
                            </div>
                        </div>
                    ) : (
                        <p className="text-center text-muted-foreground">No se pudo cargar la conversación.</p>
                    )
                )}
            </div>
        </DialogContent>
    );
}
