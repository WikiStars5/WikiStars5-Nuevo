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
    const [threadComments, setThreadComments] = useState<Comment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const rootComment = useMemo(() => {
        return threadComments.find(c => c.id === parentId);
    }, [threadComments, parentId]);
    
    // The comment to reply to is the one that was highlighted (the notification source).
    const activeReplyTarget = useMemo(() => {
        return threadComments.find(c => c.id === replyId);
    }, [threadComments, replyId]);


    useEffect(() => {
        const fetchThreadComments = async () => {
            if (!firestore) return;
            setIsLoading(true);
            setError(null);
            
            try {
                const commentsRef = collection(firestore, `figures/${figureId}/comments`);
                const threadQuery = query(commentsRef, where("threadId", "==", parentId));
                
                const [rootDocSnap, threadSnapshot] = await Promise.all([
                    getDoc(doc(commentsRef, parentId)),
                    getDocs(threadQuery),
                ]);

                if (!rootDocSnap.exists()) {
                    setError("El comentario original de esta conversación ha sido eliminado.");
                    setIsLoading(false);
                    return;
                }

                const allCommentsInThread: Comment[] = [];
                // Add the root comment first
                allCommentsInThread.push({ id: rootDocSnap.id, ...rootDocSnap.data() } as Comment);

                // Add all replies
                threadSnapshot.forEach(doc => {
                    // Avoid duplicating the root comment if it has a threadId pointing to itself
                    if (doc.id !== parentId) {
                        allCommentsInThread.push({ id: doc.id, ...doc.data() } as Comment);
                    }
                });

                // Sort by creation date to ensure correct order
                allCommentsInThread.sort((a, b) => a.createdAt.toMillis() - b.createdAt.toMillis());
                
                setThreadComments(allCommentsInThread);

            } catch (err) {
                console.error("Error fetching comments for notification dialog:", err);
                setError("Ocurrió un error al cargar la conversación.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchThreadComments();
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

    // Group comments into root and replies for rendering
    const { root, replies } = useMemo(() => {
        const rootC = threadComments.find(c => c.id === parentId);
        const rep = threadComments.filter(c => c.parentId === parentId);
        return { root: rootC, replies: rep };
    }, [threadComments, parentId]);

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
                ) : error ? (
                    <p className="text-center text-destructive py-10">{error}</p>
                ) : (
                    <div className="space-y-4">
                        {root && <CommentDisplay comment={root} isHighlighted={root.id === replyId} />}

                        {replies.length > 0 && (
                            <div className="pl-8 border-l-2 ml-4 space-y-4">
                                {replies.map(reply => (
                                    <CommentDisplay key={reply.id} comment={reply} isHighlighted={reply.id === replyId} />
                                ))}
                            </div>
                        )}
                        
                        {rootComment && activeReplyTarget && (
                             <div className="pl-8 border-l-2 ml-4 pt-4">
                                <ReplyForm
                                    figureId={figureId}
                                    figureName={figureName}
                                    parentComment={rootComment}
                                    replyingTo={activeReplyTarget}
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
