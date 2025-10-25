
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useFirestore } from '@/firebase';
import { collection, doc, getDocs, getDoc, query, where, orderBy } from 'firebase/firestore';
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
                <p className="text-sm text-foreground/90 whitespace-pre-wrap mt-1">{comment.text}</p>
            </div>
        </div>
    )
}

function ThreadRenderer({ comment, figureId, figureName, replyId, onReplySuccess }: { comment: Comment, figureId: string, figureName: string, replyId: string, onReplySuccess: () => void }) {
    if (!comment) return null;

    const children = comment.children || [];

    return (
        <div className="space-y-4">
            <CommentDisplay comment={comment} isHighlighted={comment.id === parentId} />
            
            {children.length > 0 && (
                 <div className="pl-8 border-l-2 ml-4 space-y-4">
                    {children.map(child => (
                        <ThreadRenderer 
                            key={child.id} 
                            comment={child}
                            replyId={replyId} 
                            figureId={figureId}
                            figureName={figureName}
                            onReplySuccess={onReplySuccess}
                        />
                    ))}
                </div>
            )}
             {comment.id === replyId && comment.depth < 4 && (
                <div className="pl-8 border-l-2 ml-4">
                    <ReplyForm
                        figureId={figureId}
                        figureName={figureName}
                        parentId={replyId} 
                        depth={comment.depth} 
                        onReplySuccess={onReplySuccess}
                    />
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
    const [isLoading, setIsLoading] = useState(true);
    const [rootComment, setRootComment] = useState<Comment | null>(null);

    useEffect(() => {
        const fetchFullThread = async () => {
            if (!firestore) return;
            setIsLoading(true);

            try {
                const commentsRef = collection(firestore, `figures/${figureId}/comments`);
                
                // Get the direct parent comment first
                const parentSnap = await getDoc(doc(commentsRef, parentId));
                if (!parentSnap.exists()) {
                    throw new Error("El comentario principal no fue encontrado.");
                }

                // Query for all replies to the parent comment
                const q = query(commentsRef, where('parentId', '==', parentId));
                const childrenSnap = await getDocs(q);

                const allCommentsRaw: Comment[] = [
                    { id: parentSnap.id, ...parentSnap.data() } as Comment,
                    ...childrenSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comment))
                ];

                const commentMap = new Map<string, Comment>();
                allCommentsRaw.forEach(comment => {
                    commentMap.set(comment.id, { ...comment, children: [] });
                });

                commentMap.forEach(comment => {
                    if (comment.parentId && commentMap.has(comment.parentId)) {
                        const parent = commentMap.get(comment.parentId)!;
                        if (!parent.children) {
                            parent.children = [];
                        }
                        parent.children.push(comment);
                    }
                });

                commentMap.forEach(comment => {
                    if (comment.children) {
                        comment.children.sort((a, b) => a.createdAt.toMillis() - b.createdAt.toMillis());
                    }
                });
                
                setRootComment(commentMap.get(parentId) || null);

            } catch (error) {
                console.error("Error fetching full thread:", error);
                setRootComment(null);
            } finally {
                setIsLoading(false);
            }
        };

        fetchFullThread();
    }, [firestore, figureId, parentId]);

    useEffect(() => {
        if (!isLoading && rootComment) {
            setTimeout(() => {
                const element = document.getElementById(`comment-${replyId}`);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 100);
        }
    }, [isLoading, rootComment, replyId]);

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
                    rootComment ? (
                        <ThreadRenderer 
                            comment={rootComment}
                            replyId={replyId}
                            figureId={figureId}
                            figureName={figureName}
                            onReplySuccess={() => onOpenChange(false)}
                        />
                    ) : (
                        <p className="text-center text-muted-foreground">No se pudo cargar el hilo del comentario.</p>
                    )
                )}
            </div>
        </DialogContent>
    );
}
