'use client';

import * as React from 'react';
import type { Comment } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { MessageSquare, Bot, ChevronDown, Loader2, Bell } from 'lucide-react';
import { StarRating } from '../shared/star-rating';
import { formatDateDistance } from '@/lib/utils';
import { useLanguage } from '@/context/LanguageContext';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import AdminBotReplyForm from './admin-bot-reply-form';
import { cn } from '@/lib/utils';

interface CommentItemProps {
    comment: Comment;
    figureId: string;
    figureName: string;
    allComments: Comment[]; // All comments in the main thread
    onReplySuccess: () => void;
    isReply?: boolean;
    threadReplies?: Comment[]; // Replies for this specific thread, passed down
}

export default function CommentItem({ comment, figureId, figureName, allComments, onReplySuccess, isReply = false, threadReplies = [] }: CommentItemProps) {
    const { language } = useLanguage();
    const firestore = useFirestore();
    const [replyingTo, setReplyingTo] = React.useState<Comment | null>(null);
    const [repliesVisible, setRepliesVisible] = React.useState(false);

    // This hook is now only for fetching replies to TOP-LEVEL comments
    const repliesQuery = useMemoFirebase(() => {
        if (isReply || !firestore || !comment.id) return null;
        return query(
            collection(firestore, 'figures', figureId, 'comments', comment.id, 'replies'),
            orderBy('createdAt', 'asc')
        );
    }, [firestore, figureId, comment.id, isReply]);

    const { data: fetchedReplies, isLoading: isLoadingReplies, refetch } = useCollection<Comment>(repliesQuery);

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
        refetch?.(); // Refetch replies for the main comment if it's a top-level item
        onReplySuccess(); // Propagate to parent to refetch all comments
    }

    // --- Notification Bell Logic ---
    const checkNotificationStatus = (currentThreadReplies: Comment[]): boolean => {
      // Only show notifications for bot replies
      if (!comment.userId.startsWith('virtual_')) {
          return false;
      }
      
      // Find the index of the current bot's comment in the thread
      const botCommentIndex = currentThreadReplies.findIndex(r => r.id === comment.id);

      if (botCommentIndex === -1) {
          return false; // Should not happen if data is consistent
      }

      // Check if this is the last comment in the thread
      if (botCommentIndex === currentThreadReplies.length - 1) {
          return false; // No one has replied to the last comment
      }

      // Check the very next comment
      const nextComment = currentThreadReplies[botCommentIndex + 1];
      
      // If the next comment is from a real user, the bot has a pending reply
      return !nextComment.userId.startsWith('virtual_');
    };
    
    // Determine the correct list of replies to check
    const repliesForNotificationCheck = isReply ? threadReplies : (fetchedReplies || []);
    const hasPendingReply = checkNotificationStatus(repliesForNotificationCheck);
    // --- End Notification Bell Logic ---


    return (
        <div className="flex flex-col gap-4 rounded-lg border p-4">
            <div className="flex items-start gap-4">
                <Avatar className="h-10 w-10">
                    <AvatarImage src={comment.userPhotoURL || undefined} alt={comment.userDisplayName} />
                    <AvatarFallback>{getAvatarFallback()}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                    <div className="flex items-center justify-between">
                         <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">{comment.userDisplayName}</span>
                            {hasPendingReply && (
                                <div className="relative">
                                    <Bell className="h-4 w-4 text-blue-500 animate-pulse" />
                                    <span className="absolute -top-1 -right-1 flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                                    </span>
                                </div>
                            )}
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
            
            {!isReply && fetchedReplies && fetchedReplies.length > 0 && (
                <Button variant="link" size="sm" className="self-start ml-14 -mt-2 h-auto p-0" onClick={() => setRepliesVisible(!repliesVisible)}>
                    <ChevronDown className={`h-4 w-4 mr-1 transition-transform ${repliesVisible ? 'rotate-180' : ''}`} />
                    {repliesVisible ? 'Ocultar' : 'Ver'} {fetchedReplies.length} {fetchedReplies.length === 1 ? 'respuesta' : 'respuestas'}
                </Button>
            )}

            {repliesVisible && !isReply && (
                <div className="ml-10 pl-4 border-l-2 space-y-4">
                    {isLoadingReplies && <Loader2 className="h-4 w-4 animate-spin" />}
                    {fetchedReplies?.map(reply => (
                        <div key={reply.id}>
                            <CommentItem 
                                comment={reply}
                                figureId={figureId}
                                figureName={figureName}
                                allComments={allComments}
                                onReplySuccess={handleReplySuccess}
                                isReply={true}
                                threadReplies={fetchedReplies} // Pass down the already fetched replies
                            />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
