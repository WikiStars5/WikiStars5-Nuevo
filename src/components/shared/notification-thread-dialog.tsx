'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc, collection, query, where } from 'firebase/firestore';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
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


function CommentDisplay({ comment }: { comment: Comment }) {
    const country = comment.userCountry ? countries.find(c => c.name === comment.userCountry) : null;
    const getAvatarFallback = () => comment.userDisplayName?.charAt(0) || 'U';

    return (
        <div className="flex items-start gap-4 rounded-lg border bg-card text-card-foreground p-4">
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
                <p className="text-sm text-foreground/90 whitespace-pre-wrap mt-1">{comment.text}</p>
            </div>
        </div>
    )
}

export default function NotificationThreadDialog({
  figureId,
  parentId,
  replyId,
  onOpenChange,
}: NotificationThreadDialogProps) {
    const firestore = useFirestore();

    const parentCommentRef = useMemoFirebase(() => {
        if (!firestore) return null;
        return doc(firestore, `figures/${figureId}/comments`, parentId);
    }, [firestore, figureId, parentId]);

    const replyCommentRef = useMemoFirebase(() => {
        if (!firestore) return null;
        return doc(firestore, `figures/${figureId}/comments`, replyId);
    }, [firestore, figureId, replyId]);

    const { data: parentComment, isLoading: isParentLoading } = useDoc<Comment>(parentCommentRef);
    const { data: replyComment, isLoading: isReplyLoading } = useDoc<Comment>(replyCommentRef);

    const isLoading = isParentLoading || isReplyLoading;

    return (
        <DialogContent className="sm:max-w-xl">
            <DialogHeader>
                <DialogTitle>Nueva Respuesta</DialogTitle>
                <DialogDescription>
                    Alguien ha respondido a tu comentario.
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto">
                {isLoading ? (
                    <div className="space-y-4">
                        <CommentDisplaySkeleton />
                        <div className="pl-8"><CommentDisplaySkeleton /></div>
                    </div>
                ) : (
                    <>
                        {parentComment && <CommentDisplay comment={parentComment} />}
                        {replyComment && (
                            <div className="pl-8 border-l-2 ml-4">
                                <CommentDisplay comment={replyComment} />
                            </div>
                        )}
                        {parentComment && (
                            <div className="pl-8 border-l-2 ml-4">
                                <ReplyForm
                                    figureId={figureId}
                                    figureName={''} // Not needed for this specific reply context
                                    parentId={parentId}
                                    depth={parentComment.depth}
                                    onReplySuccess={() => onOpenChange(false)}
                                />
                            </div>
                        )}
                    </>
                )}
            </div>
        </DialogContent>
    );
}
