
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
    const [comments, setComments] = useState<Comment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const rootComment = useMemo(() => {
        return comments.find(c => c.id === parentId);
    }, [comments, parentId]);
    
    const activeReply = useMemo(() => {
        return comments.find(c => c.id === replyId);
    }, [comments, replyId]);

    // This is the "in-between" comment, the one being replied to.
    const parentOfReply = useMemo(() => {
        // If the activeReply's text mentions someone, find that comment.
        const mentionMatch = activeReply?.text.match(/^@(\S+)/);
        if (!mentionMatch) return null;

        const mentionedUsername = mentionMatch[1];
        // Find the comment in the thread made by the mentioned user, which is not the root comment.
        return comments.find(c => c.userDisplayName === mentionedUsername && c.id !== parentId);
    }, [comments, activeReply, parentId]);


    useEffect(() => {
        const fetchEssentialComments = async () => {
            if (!firestore) return;
            setIsLoading(true);
            setError(null);
            
            try {
                const commentsRef = collection(firestore, `figures/${figureId}/comments`);
                const rootDocRef = doc(commentsRef, parentId);
                const replyDocRef = doc(commentsRef, replyId);

                const [rootDocSnap, replyDocSnap] = await Promise.all([
                    getDoc(rootDocRef),
                    getDoc(replyDocRef),
                ]);

                const fetchedComments: Comment[] = [];
                let rootCommentExists = false;

                if (rootDocSnap.exists()) {
                    fetchedComments.push({ id: rootDocSnap.id, ...rootDocSnap.data() } as Comment);
                    rootCommentExists = true;
                } else {
                    setError("El comentario original de esta conversación ha sido eliminado.");
                    setIsLoading(false);
                    return;
                }
                
                let activeReplyData: Comment | null = null;
                if (replyDocSnap.exists()) {
                    activeReplyData = { id: replyDocSnap.id, ...replyDocSnap.data() } as Comment;
                    if (replyDocSnap.id !== rootDocSnap.id) {
                        fetchedComments.push(activeReplyData);
                    }
                }

                // --- LOGIC FOR CASE 2 ---
                // If the reply mentions someone, try to fetch the comment it's replying to.
                if (activeReplyData) {
                    const mentionMatch = activeReplyData.text.match(/^@(\S+)/);
                    if (mentionMatch) {
                        // This is a reply to a reply. We need to find the intermediate comment.
                        const q = query(
                            commentsRef,
                            where('threadId', '==', parentId),
                            orderBy('createdAt', 'desc')
                        );
                        const threadSnapshot = await getDocs(q);
                        const allThreadComments = threadSnapshot.docs.map(d => ({id: d.id, ...d.data()} as Comment));
                        
                        // Add all comments from the thread to our state to be rendered
                        const uniqueComments = new Map<string, Comment>();
                        fetchedComments.forEach(c => uniqueComments.set(c.id, c));
                        allThreadComments.forEach(c => uniqueComments.set(c.id, c));
                        
                        setComments(Array.from(uniqueComments.values()));

                    } else {
                         setComments(fetchedComments);
                    }
                } else {
                     setComments(fetchedComments);
                }


            } catch (err) {
                console.error("Error fetching comments for notification dialog:", err);
                setError("Ocurrió un error al cargar la conversación.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchEssentialComments();
    }, [firestore, figureId, parentId, replyId]);

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

    // Determine the correct comment to reply to for the form
    const replyingToForForm = activeReply || rootComment;

    const orderedComments = useMemo(() => {
        if (!rootComment) return [];
        
        const thread = comments
            .filter(c => c.threadId === rootComment.id && c.id !== rootComment.id)
            .sort((a,b) => a.createdAt.toMillis() - b.createdAt.toMillis());

        return [rootComment, ...thread];
    }, [comments, rootComment]);

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
                        {orderedComments.map((comment, index) => (
                             <div key={comment.id} className={comment.id !== parentId ? "pl-8 border-l-2 ml-4" : ""}>
                                <CommentDisplay comment={comment} isHighlighted={comment.id === replyId} />
                             </div>
                        ))}
                        
                        {rootComment && replyingToForForm && (
                             <div className="pl-8 border-l-2 ml-4 pt-4">
                                <ReplyForm
                                    figureId={figureId}
                                    figureName={figureName}
                                    parentComment={rootComment}
                                    replyingTo={replyingToForForm}
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
