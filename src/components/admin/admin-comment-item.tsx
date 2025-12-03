
'use client';

import type { Comment } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { MessageSquare, Bot } from 'lucide-react';
import { StarRating } from '../shared/star-rating';
import { formatDateDistance } from '@/lib/utils';
import { useLanguage } from '@/context/LanguageContext';

interface CommentItemProps {
    comment: Comment;
    onReply: () => void;
}

export default function CommentItem({ comment, onReply }: CommentItemProps) {
    const { language } = useLanguage();
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

    return (
        <div className="flex items-start gap-4 rounded-lg border p-4">
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
                    <Button variant="outline" size="sm" onClick={onReply}>
                        <Bot className="mr-2 h-4 w-4"/> Responder como Bot
                    </Button>
                </div>
                
                 {typeof comment.rating === 'number' && comment.rating >= 0 && (
                  <StarRating rating={comment.rating} starClassName="h-4 w-4 mt-1" />
                )}

                {renderCommentText()}
            </div>
        </div>
    );
}

