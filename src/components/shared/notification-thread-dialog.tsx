'use client';

import { useState, useEffect } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
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

// Recursive component to render the thread
function ThreadRenderer({ comment, allCommentsInTree, replyId }: { comment: Comment; allCommentsInTree: Map<string, Comment>; replyId: string }) {
    const children = Array.from(allCommentsInTree.values()).filter(c => c.parentId === comment.id);

    return (
        <div className="space-y-4">
            <CommentDisplay comment={comment} isHighlighted={comment.id === replyId} />
            {children.length > 0 && (
                 <div className="pl-8 border-l-2 ml-4 space-y-4">
                    {children.map(child => (
                        <ThreadRenderer key={child.id} comment={child} allCommentsInTree={allCommentsInTree} replyId={replyId} />
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

    // Query for the parent comment and all comments that have it as an ancestor
    const threadQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        // This is a simplification. A real implementation for deep nesting might require a different data model
        // or multiple queries. For now, we get the parent and its direct children.
        // A more robust way is often to store an array of ancestors in each comment doc.
        // Let's try fetching all comments for the figure and filtering client side for simplicity here.
        return query(collection(firestore, `figures/${figureId}/comments`));
    }, [firestore, figureId, parentId]);
    
    const { data: allComments, isLoading } = useCollection<Comment>(threadQuery);

    const threadTree = useMemo(() => {
        if (!allComments) return null;

        const commentMap = new Map<string, Comment>();
        allComments.forEach(c => commentMap.set(c.id, { ...c, children: [] }));

        const buildRecursiveTree = (id: string): Comment | null => {
            const comment = commentMap.get(id);
            if (!comment) return null;
            
            const children = allComments.filter(c => c.parentId === id);
            comment.children = children.map(child => buildRecursiveTree(child.id)).filter(Boolean) as Comment[];
            return comment;
        }

        return buildRecursiveTree(parentId);
    }, [allComments, parentId]);


    useEffect(() => {
        if (threadTree) {
            // Scroll to the highlighted comment after it's rendered
            setTimeout(() => {
                const element = document.getElementById(`comment-${replyId}`);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 100);
        }
    }, [threadTree, replyId]);


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
                        {threadTree && allComments ? (
                            <>
                                <ThreadRenderer 
                                    comment={threadTree} 
                                    allCommentsInTree={new Map(allComments.map(c => [c.id, c]))} 
                                    replyId={replyId} 
                                />
                                <div className="pl-8 border-l-2 ml-4">
                                     <ReplyForm
                                        figureId={figureId}
                                        figureName={figureName}
                                        parentId={replyId} // You reply to the last message in the thread
                                        depth={threadTree.depth + 1} // This is an approximation, but ok for now
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
