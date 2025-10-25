'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc, collection, query, where } from 'firebase/firestore';
import { useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';
import Image from 'next/image';
import type { Comment } from '@/lib/types';
import ReplyForm from '../figure/reply-form';
import { countries } from '@/lib/countries';
import { StarRating } from './star-rating';
import { CornerDownRight } from 'lucide-react';

interface NotificationThreadDialogProps {
  figureId: string;
  parentId: string; // This is the top-level comment ID
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

    return (
        <div id={`comment-${comment.id}`} className={`flex items-start gap-4 rounded-lg border p-4 ${isHighlighted ? 'bg-primary/10 border-primary' : 'bg-card'}`}>
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

// Recursive component to render the thread
function ThreadRenderer({ comment, replyId }: { comment: Comment, replyId: string }) {
    return (
        <div className="space-y-4">
            <CommentDisplay comment={comment} isHighlighted={comment.id === replyId} />
            {comment.children && comment.children.length > 0 && (
                 <div className="pl-8 border-l-2 ml-4 space-y-4">
                    {comment.children.map(child => (
                        <ThreadRenderer key={child.id} comment={child} replyId={replyId} />
                    ))}
                </div>
            )}
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
    const [thread, setThread] = useState<Comment | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const commentsCollectionRef = useMemoFirebase(() => {
        if (!firestore) return null;
        return collection(firestore, `figures/${figureId}/comments`);
    }, [firestore, figureId]);

    const { data: comments, isLoading: areCommentsLoading } = useCollection<Comment>(commentsCollectionRef);

    useEffect(() => {
        if (areCommentsLoading || !comments) return;

        const buildThread = () => {
            const commentMap: { [key: string]: Comment } = {};
            comments.forEach(c => {
                commentMap[c.id] = { ...c, children: [] };
            });

            const rootComment = commentMap[parentId];
            if (!rootComment) {
                 setIsLoading(false);
                 return;
            }

            // Function to find the path to the reply
            const findPath = (currentId: string): Comment | null => {
                const currentComment = commentMap[currentId];
                if (!currentComment) return null;

                if (currentId === parentId) return currentComment;

                const parent = findPath(currentComment.parentId!);
                if (parent) {
                    parent.children = [currentComment]; // only include the child in the path
                    return parent;
                }
                return null;
            };

            const replyComment = commentMap[replyId];
            if (replyComment) {
                findPath(replyComment.parentId!);
            }

            setThread(rootComment);
            setIsLoading(false);
        };

        buildThread();

    }, [comments, areCommentsLoading, parentId, replyId]);
    
    useEffect(() => {
        if (thread) {
            // Scroll to the highlighted comment after it's rendered
            setTimeout(() => {
                const element = document.getElementById(`comment-${replyId}`);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 100);
        }
    }, [thread, replyId]);


    return (
        <DialogContent className="sm:max-w-xl">
            <DialogHeader>
                <DialogTitle>Nueva Respuesta</DialogTitle>
                <DialogDescription>
                    Alguien ha respondido a tu comentario en el perfil de <span className="font-semibold text-primary">{figureName}</span>.
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
                        {thread ? (
                            <>
                                <ThreadRenderer comment={thread} replyId={replyId} />
                                <div className="pl-8 border-l-2 ml-4">
                                     <ReplyForm
                                        figureId={figureId}
                                        figureName={figureName}
                                        parentId={replyId} // You reply to the last message in the thread
                                        depth={thread.depth + 1} // This is an approximation, but ok for now
                                        onReplySuccess={() => onOpenChange(false)}
                                    />
                                </div>
                            </>
                        ) : (
                            <p className="text-center text-muted-foreground">No se pudo cargar el hilo del comentario.</p>
                        )}
                    </>
                )}
            </div>
        </DialogContent>
    );
}
