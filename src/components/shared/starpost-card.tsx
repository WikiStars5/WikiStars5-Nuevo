
'use client';

import type { Comment } from '@/lib/types';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { StarRating } from '@/components/shared/star-rating';
import { MessageSquare } from 'lucide-react';
import { formatDateDistance } from '@/lib/utils';
import { useLanguage } from '@/context/LanguageContext';

interface StarPostCardProps {
  post: Comment;
}

export default function StarPostCard({ post }: StarPostCardProps) {
  const { language } = useLanguage();

  if (!post.figureId || !post.figureName) {
      // Don't render if essential linking information is missing.
      return null;
  }
  
  const getAvatarFallback = () => post.userDisplayName?.charAt(0) || 'U';

  return (
    <Card className="hover:border-primary/50 transition-colors">
        <CardHeader className="p-4 pb-2">
             <div className="flex items-center gap-3">
                <Link href={`/u/${post.userDisplayName}`} className="flex-shrink-0">
                    <Avatar className="h-10 w-10">
                        <AvatarImage src={post.userPhotoURL || undefined} alt={post.userDisplayName} />
                        <AvatarFallback>{getAvatarFallback()}</AvatarFallback>
                    </Avatar>
                </Link>
                <div className="flex-1">
                    <div className="flex items-center justify-between">
                         <Link href={`/u/${post.userDisplayName}`} className="font-semibold text-sm hover:underline">
                            {post.userDisplayName}
                        </Link>
                         <p className="text-xs text-muted-foreground">
                            {post.createdAt ? formatDateDistance(post.createdAt.toDate(), language) : ''}
                        </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Publicado en <Link href={`/figures/${post.figureId}`} className="text-primary hover:underline">{post.figureName}</Link>
                    </p>
                </div>
            </div>
        </CardHeader>
        <CardContent className="p-4 pt-2">
           <Link href={`/figures/${post.figureId}?thread=${post.threadId || post.id}`} className="space-y-2 block">
                {post.rating >= 0 && <StarRating rating={post.rating} />}
                {post.title && <h4 className="font-bold text-base">{post.title}</h4>}
                {post.text && <p className="text-sm text-foreground/90 whitespace-pre-wrap">{post.text}</p>}
           </Link>
        </CardContent>
        <CardFooter className="p-4 pt-0">
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                    <MessageSquare className="h-4 w-4" />
                    <span>{post.replyCount || 0}</span>
                </div>
                 {/* Like/Dislike counts can be added here if desired */}
            </div>
        </CardFooter>
    </Card>
  );
}
