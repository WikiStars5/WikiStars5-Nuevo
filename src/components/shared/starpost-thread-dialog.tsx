'use client';

import { useState, useEffect, useMemo } from 'react';
import { useFirestore, useUser } from '@/firebase';
import { collection, doc, getDoc, query, orderBy, onSnapshot } from 'firebase/firestore';
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
import { formatDateDistance } from '@/lib/utils';
import { ScrollArea } from '../ui/scroll-area';

interface StarPostThreadDialogProps {
  figureId: string;
  parentId: string;
  figureName: string;
  onOpenChange: (open: boolean) => void;
  initialRepliesCount: number;
}

// Reusable component to display a single comment or reply
function CommentInDialog({ comment }: { comment: Comment }) {
    const { t, language } = useLanguage();
    const countryData = comment.userCountry ? countries.find(c => c.key === comment.userCountry.toLowerCase().replace(/ /g, '_')) : null;
    const getAvatarFallback = () => comment.userDisplayName?.charAt(0).toUpperCase() || 'U';

    const renderCommentText = () => {
        const mentionMatch = comment.text.match(/^@\[(.*?)\]/);
        if (mentionMatch) {
            const mention = mentionMatch[1];
            const restOfText = comment.text.substring(mentionMatch[0].length).trim();
            return <p className="text-sm text-foreground/90 whitespace-pre-wrap mt-1"><span className="text-primary font-semibold mr-1">@{mention}</span>{restOfText}</p>;
        }
        return <p className="text-sm text-foreground/90 whitespace-pre-wrap mt-1">{comment.text}</p>;
    };

    return (
        <div id={`dialog-comment-${comment.id}`} className="flex items-start gap-4 rounded-lg p-4">
            <Avatar className="h-10 w-10">
                <Link href={`/u/${comment.userDisplayName}`}><AvatarImage src={comment.userPhotoURL || undefined} alt={comment.userDisplayName} /></Link>
                <AvatarFallback><Link href={`/u/${comment.userDisplayName}`}>{getAvatarFallback()}</Link></AvatarFallback>
            </Avatar>
            <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                    <Link href={`/u/${comment.userDisplayName}`} className="font-semibold text-sm hover:underline">{comment.userDisplayName}</Link>
                    <span className="text-xs text-muted-foreground">{formatDateDistance(comment.createdAt.toDate(), language)}</span>
                </div>
                {comment.rating !== -1 && typeof comment.rating === 'number' && (<StarRating rating={comment.rating} starClassName="h-4 w-4 mt-1" />)}
                {renderCommentText()}
            </div>
        </div>
    );
}


export default function StarPostThreadDialog({
  figureId,
  parentId,
  figureName,
  onOpenChange,
  initialRepliesCount,
}: StarPostThreadDialogProps) {
    const firestore = useFirestore();
    const { user } = useUser();
    const [comments, setComments] = useState<Comment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
    const { t } = useLanguage();

    useEffect(() => {
        if (!firestore || !parentId) {
            setError("Error al cargar la conversación.");
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);

        const rootDocRef = doc(firestore, 'figures', figureId, 'comments', parentId);
        
        const repliesQuery = query(
            collection(firestore, 'figures', figureId, 'comments', parentId, 'replies'),
            orderBy('createdAt', 'asc')
        );

        // Fetch parent comment
        const unsubParent = onSnapshot(rootDocRef, (rootDocSnap) => {
            if (!rootDocSnap.exists()) {
                setError("El comentario original ha sido eliminado.");
                setIsLoading(false);
                return;
            }
            const rootComment = { id: rootDocSnap.id, ...rootDocSnap.data() } as Comment;
            
            // Listen for replies
            const unsubReplies = onSnapshot(repliesQuery, (snapshot) => {
                const fetchedReplies = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comment));
                const allComments = [rootComment, ...fetchedReplies];
                setComments(allComments);
                
                // Set initial reply target, or update it if it disappears
                if (!replyingTo || !allComments.some(c => c.id === replyingTo.id)) {
                    setReplyingTo(rootComment);
                }

                setIsLoading(false);
            }, (err) => {
                console.error("Error fetching replies:", err);
                setError("Error al cargar las respuestas.");
                setIsLoading(false);
            });
            return unsubReplies;

        }, (err) => {
            console.error("Error fetching root comment:", err);
            setError("Error al cargar el comentario principal.");
            setIsLoading(false);
        });

        return () => {
            unsubParent();
        };
    }, [firestore, figureId, parentId]);
    
    const handleReplySuccess = (newReply: Comment) => {
       // The onSnapshot listener will automatically update the replies.
       // We just reset the reply target to the root comment.
       setReplyingTo(comments[0]);
    };

    const orderedComments = useMemo(() => {
        return comments.sort((a, b) => a.createdAt.toDate().getTime() - b.createdAt.toDate().getTime());
    }, [comments]);
    
    const parentCommentForReply = comments.find(c => c.id === parentId);

    return (
        <DialogContent className="sm:max-w-xl p-0">
            <DialogHeader className="p-6 pb-0">
                <DialogTitle>Conversación del StarPost</DialogTitle>
                <DialogDescription>En el perfil de <span className="font-semibold text-primary">{figureName}</span>.</DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh] border-y">
                <div className="space-y-2 p-2">
                    {isLoading ? (
                        <div className="p-4 space-y-4">
                            <CommentDisplaySkeleton />
                            <div className="pl-8"><CommentDisplaySkeleton /></div>
                        </div>
                    ) : error ? (
                        <p className="text-center text-destructive py-10">{error}</p>
                    ) : (
                        orderedComments.map((comment) => (
                             <div key={comment.id} className={comment.id !== parentId ? "pl-8 border-l-2 ml-4" : ""}>
                               <CommentInDialog comment={comment} />
                             </div>
                        ))
                    )}
                </div>
            </ScrollArea>
            {parentCommentForReply && (
                 <div className="p-6 pt-2">
                    <ReplyForm
                        figureId={figureId}
                        figureName={figureName}
                        parentComment={parentCommentForReply}
                        replyToComment={replyingTo || parentCommentForReply}
                        onReplySuccess={handleReplySuccess}
                    />
                </div>
            )}
        </DialogContent>
    );
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