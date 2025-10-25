'use client';

import { useState, useEffect, useMemo } from 'react';
import { useFirestore } from '@/firebase';
import { collection, doc, getDoc, getDocs, query, where, orderBy } from 'firebase/firestore';
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

function ThreadRenderer({ comment, allCommentsMap, replyId, figureId, figureName, onReplySuccess }: { comment: Comment, allCommentsMap: Map<string, Comment>, replyId: string, figureId: string, figureName: string, onReplySuccess: () => void }) {
    if (!comment) return null;

    const children = comment.children || [];
    const isReplyingToThis = comment.id === replyId;

    return (
        <div className="space-y-4">
            <CommentDisplay comment={comment} isHighlighted={isReplyingToThis} />
            
            {children.length > 0 && (
                 <div className="pl-8 border-l-2 ml-4 space-y-4">
                    {children.map(child => (
                        <ThreadRenderer 
                            key={child.id} 
                            comment={child}
                            allCommentsMap={allCommentsMap} 
                            replyId={replyId} 
                            figureId={figureId}
                            figureName={figureName}
                            onReplySuccess={onReplySuccess}
                        />
                    ))}
                </div>
            )}
             {isReplyingToThis && (
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

     const getDescendantIds = async (startId: string): Promise<string[]> => {
        const commentsRef = collection(firestore, `figures/${figureId}/comments`);
        const q = query(commentsRef, where('parentId', '==', startId));
        const snapshot = await getDocs(q);
        
        let ids: string[] = snapshot.docs.map(doc => doc.id);
        
        for (const doc of snapshot.docs) {
            const childIds = await getDescendantIds(doc.id);
            ids = ids.concat(childIds);
        }
        
        return ids;
    };

    useEffect(() => {
        const fetchFullThread = async () => {
            if (!firestore) return;
            setIsLoading(true);

            try {
                // 1. Fetch the root comment of the thread
                const rootCommentRef = doc(firestore, `figures/${figureId}/comments`, parentId);
                const rootSnap = await getDoc(rootCommentRef);
                
                if (!rootSnap.exists()) {
                    throw new Error("El comentario principal no fue encontrado.");
                }

                const rootData = { id: rootSnap.id, ...rootSnap.data() } as Comment;

                // 2. Fetch all descendant IDs starting from the root
                const descendantIds = await getDescendantIds(parentId);
                
                const allIdsInThread = [parentId, ...descendantIds];
                
                // 3. Fetch all comments in the thread
                const commentsMap = new Map<string, Comment>();
                commentsMap.set(rootData.id, { ...rootData, children: [] });

                 if (allIdsInThread.length > 0) {
                    const commentsQuery = query(collection(firestore, `figures/${figureId}/comments`), where('__name__', 'in', allIdsInThread));
                    const commentsSnapshot = await getDocs(commentsQuery);
                    commentsSnapshot.forEach(doc => {
                         if (!commentsMap.has(doc.id)) {
                             commentsMap.set(doc.id, { id: doc.id, ...doc.data(), children: [] } as Comment);
                         }
                    });
                }
                
                // 4. Build the tree structure
                commentsMap.forEach(comment => {
                    if (comment.parentId && commentsMap.has(comment.parentId)) {
                        const parent = commentsMap.get(comment.parentId)!;
                        parent.children!.push(comment);
                    }
                });

                // Sort children by date
                commentsMap.forEach(comment => {
                    if (comment.children) {
                        comment.children.sort((a, b) => a.createdAt.toMillis() - b.createdAt.toMillis());
                    }
                });

                setRootComment(commentsMap.get(parentId) || null);

            } catch (error) {
                console.error("Error fetching full thread:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchFullThread();
    }, [firestore, figureId, parentId]);


    // Scroll to the highlighted comment after rendering
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
                            allCommentsMap={new Map()} // This map isn't needed by the renderer itself anymore
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
