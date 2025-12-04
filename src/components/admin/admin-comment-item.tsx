
'use client';

import * as React from 'react';
import type { Comment } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { MessageSquare, Bot, ChevronDown, Loader2 } from 'lucide-react';
import { StarRating } from '../shared/star-rating';
import { formatDateDistance } from '@/lib/utils';
import { useLanguage } from '@/context/LanguageContext';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import AdminBotReplyForm from './admin-bot-reply-form';

interface CommentItemProps {
    comment: Comment;
    figureId: string;
    figureName: string;
    allComments: Comment[];
    onReplySuccess: () => void;
    isReply?: boolean;
}

export default function CommentItem({ comment, figureId, figureName, allComments, onReplySuccess, isReply = false }: CommentItemProps) {
    const { language } = useLanguage();
    const firestore = useFirestore();
    const [replyingTo, setReplyingTo] = React.useState<Comment | null>(null);
    const [repliesVisible, setRepliesVisible] = React.useState(false);

    const repliesQuery = useMemoFirebase(() => {
        if (isReply || !firestore || !comment.id) return null; // Replies don't have sub-replies in this view
        return query(
            collection(firestore, 'figures', figureId, 'comments', comment.id, 'replies'),
            orderBy('createdAt', 'asc')
        );
    }, [firestore, figureId, comment.id, isReply]);

    const { data: replies, isLoading: isLoadingReplies, refetch } = useCollection<Comment>(repliesQuery);

    const getAvatarFallback = () => comment.userDisplayName?.charAt(0) || 'U';

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

    const handleReplySuccess = () => {
        setReplyingTo(null);
        refetch(); // Refetch replies for the main comment
        onReplySuccess(); // Propagate to parent to refetch all comments
    }

    return (
        <div className="flex flex-col gap-4 rounded-lg border p-4">
            <div className="flex items-start gap-4">
                <Avatar className="h-10 w-10">
                    <AvatarImage src={comment.userPhotoURL || undefined} alt={comment.userDisplayName} />
                    <AvatarFallback>{getAvatarFallback()}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                    <div className="flex items-center justify-between">
                         <div>
                            <span className="font-semibold text-sm">{comment.userDisplayName}</span>
                            <p className="text-xs text-muted-foreground">{formatDateDistance(comment.createdAt.toDate(), language)}</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setReplyingTo(comment)}>
                            <Bot className="mr-2 h-4 w-4"/> Responder como Bot
                        </Button>
                    </div>
                    
                     {typeof comment.rating === 'number' && comment.rating >= 0 && (
                      <StarRating rating={comment.rating} starClassName="h-4 w-4 mt-1" />
                    )}

                    {renderCommentText()}
                </div>
            </div>
            
            {replyingTo?.id === comment.id && (
                <div className="pl-14">
                    <AdminBotReplyForm
                        figureId={figureId}
                        figureName={figureName}
                        parentComment={isReply ? { id: comment.parentId! } as Comment : comment}
                        replyToComment={comment}
                        onReplySuccess={handleReplySuccess}
                        allComments={allComments}
                    />
                </div>
            )}
            
            {!isReply && replies && replies.length > 0 && (
                <Button variant="link" size="sm" className="self-start ml-14 -mt-2 h-auto p-0" onClick={() => setRepliesVisible(!repliesVisible)}>
                    <ChevronDown className={`h-4 w-4 mr-1 transition-transform ${repliesVisible ? 'rotate-180' : ''}`} />
                    {repliesVisible ? 'Ocultar' : 'Ver'} {replies.length} {replies.length === 1 ? 'respuesta' : 'respuestas'}
                </Button>
            )}

            {repliesVisible && !isReply && (
                <div className="ml-10 pl-4 border-l-2 space-y-4">
                    {isLoadingReplies && <Loader2 className="h-4 w-4 animate-spin" />}
                    {replies?.map(reply => (
                        <div key={reply.id}>
                            <CommentItem 
                                comment={reply}
                                figureId={figureId}
                                figureName={figureName}
                                allComments={allComments}
                                onReplySuccess={handleReplySuccess}
                                isReply={true}
                            />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
