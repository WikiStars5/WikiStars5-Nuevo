
'use client';

import { useState, useEffect } from 'react';
import { useFirestore } from '@/firebase';
import { collection, doc, getDocs, getDoc, query, where, writeBatch } from 'firebase/firestore';
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

function ThreadRenderer({ comment, figureId, figureName, parentId, replyId, onReplySuccess }: { comment: Comment, figureId: string, figureName: string, parentId: string, replyId: string, onReplySuccess: () => void }) {
    if (!comment) return null;

    const children = comment.children || [];
    
    // Check if the current comment is the one we should reply to.
    const isTargetReply = comment.id === replyId;

    return (
        <div className="space-y-4">
            <CommentDisplay comment={comment} isHighlighted={isTargetReply} />
            
            {(children.length > 0 || isTargetReply) && (
                 <div className="pl-8 border-l-2 ml-4 space-y-4">
                    {children.map(child => (
                        <ThreadRenderer 
                            key={child.id} 
                            comment={child}
                            parentId={parentId}
                            replyId={replyId} 
                            figureId={figureId}
                            figureName={figureName}
                            onReplySuccess={onReplySuccess}
                        />
                    ))}
                    {isTargetReply && comment.depth < 4 && (
                        <ReplyForm
                            figureId={figureId}
                            figureName={figureName}
                            parentId={replyId}
                            threadId={comment.threadId} // Pass the threadId down
                            depth={comment.depth} 
                            onReplySuccess={onReplySuccess}
                        />
                     )}
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
    const [threadTree, setThreadTree] = useState<Comment | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchFullThread = async () => {
            if (!firestore) return;
            setIsLoading(true);

            try {
                const commentsRef = collection(firestore, `figures/${figureId}/comments`);
                
                // 1. Get the reply to find out its threadId
                const replySnap = await getDoc(doc(commentsRef, replyId));
                if (!replySnap.exists()) {
                    throw new Error("La respuesta de la notificación no fue encontrada.");
                }
                const replyData = replySnap.data() as Comment;
                const threadId = replyData.threadId || parentId; // Fallback to parentId for older data

                // 2. Fetch the root comment (threadId) and all other comments in the same thread
                const threadQuery = query(commentsRef, where('threadId', '==', threadId));
                const [rootCommentSnap, threadCommentsSnap] = await Promise.all([
                    getDoc(doc(commentsRef, threadId)),
                    getDocs(threadQuery)
                ]);

                if (!rootCommentSnap.exists()) {
                    throw new Error("El comentario principal del hilo no fue encontrado.");
                }

                // 3. Combine them, making sure there are no duplicates
                const commentMap = new Map<string, Comment>();
                
                // Add the root comment first
                commentMap.set(rootCommentSnap.id, { id: rootCommentSnap.id, ...rootCommentSnap.data(), children: [] } as Comment);
                
                // Add all other comments from the thread query
                threadCommentsSnap.docs.forEach(doc => {
                    if (!commentMap.has(doc.id)) {
                         commentMap.set(doc.id, { id: doc.id, ...doc.data(), children: [] } as Comment);
                    }
                });
                
                // 4. Build the tree
                commentMap.forEach(comment => {
                    if (comment.parentId && commentMap.has(comment.parentId)) {
                        const parent = commentMap.get(comment.parentId)!;
                        if (!parent.children) {
                            parent.children = [];
                        }
                        // Avoid adding duplicates if already present
                        if (!parent.children.some(child => child.id === comment.id)) {
                            parent.children.push(comment);
                        }
                    }
                });

                // Sort children by creation date
                commentMap.forEach(comment => {
                    if (comment.children) {
                        comment.children.sort((a, b) => a.createdAt.toMillis() - b.createdAt.toMillis());
                    }
                });
                
                setThreadTree(commentMap.get(threadId) || null);

            } catch (error) {
                console.error("Error fetching full thread:", error);
                setThreadTree(null);
            } finally {
                setIsLoading(false);
            }
        };

        fetchFullThread();
    }, [firestore, figureId, parentId, replyId]);

     useEffect(() => {
        // Scroll to the highlighted comment after the tree is built and rendered
        if (!isLoading && threadTree) {
            setTimeout(() => {
                const element = document.getElementById(`comment-${replyId}`);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 100); // Small delay to ensure DOM is updated
        }
    }, [isLoading, threadTree, replyId]);

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
                    threadTree ? (
                        <ThreadRenderer 
                            comment={threadTree}
                            parentId={parentId} // This should be the root parent now
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
