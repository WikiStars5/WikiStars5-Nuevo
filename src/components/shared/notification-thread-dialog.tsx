'use client';

import { useState, useEffect, useMemo } from 'react';
import { useFirestore } from '@/firebase';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
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

function ThreadRenderer({ commentId, allCommentsMap, replyId, figureId, figureName, onReplySuccess }: { commentId: string, allCommentsMap: Map<string, Comment>, replyId: string, figureId: string, figureName: string, onReplySuccess: () => void }) {
    const comment = allCommentsMap.get(commentId);
    if (!comment) return null;

    const children = Array.from(allCommentsMap.values()).filter(c => c.parentId === commentId);

    return (
        <div className="space-y-4">
            <CommentDisplay comment={comment} isHighlighted={comment.id === replyId} />
            
            {children.length > 0 && (
                 <div className="pl-8 border-l-2 ml-4 space-y-4">
                    {children.map(child => (
                        <ThreadRenderer 
                            key={child.id} 
                            commentId={child.id}
                            allCommentsMap={allCommentsMap} 
                            replyId={replyId} 
                            figureId={figureId}
                            figureName={figureName}
                            onReplySuccess={onReplySuccess}
                        />
                    ))}
                </div>
            )}
             {comment.id === replyId && (
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
    const [threadComments, setThreadComments] = useState<Map<string, Comment>>(new Map());

    useEffect(() => {
        const fetchThread = async () => {
            if (!firestore) return;
            setIsLoading(true);

            const commentsMap = new Map<string, Comment>();
            const commentsRef = collection(firestore, `figures/${figureId}/comments`);

            const fetchAncestors = async (currentId: string) => {
                if (!currentId || commentsMap.has(currentId)) return;

                const docRef = doc(commentsRef, currentId);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const commentData = { id: docSnap.id, ...docSnap.data() } as Comment;
                    commentsMap.set(currentId, commentData);
                    if (commentData.parentId) {
                        await fetchAncestors(commentData.parentId);
                    }
                }
            };
            
            const fetchDescendants = async (pId: string) => {
                 const q = query(commentsRef, where('parentId', '==', pId));
                 const snapshot = await getDocs(q);
                 for (const document of snapshot.docs) {
                     const commentData = { id: document.id, ...document.data() } as Comment;
                     if (!commentsMap.has(document.id)) {
                        commentsMap.set(document.id, commentData);
                        await fetchDescendants(document.id);
                     }
                 }
            }
            
            try {
                // Fetch all ancestors starting from the reply
                await fetchAncestors(replyId);
                
                // Fetch all descendants starting from the root parent
                await fetchDescendants(parentId);

                setThreadComments(commentsMap);

            } catch (error) {
                console.error("Error fetching notification thread:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchThread();
    }, [firestore, figureId, parentId, replyId]);

    // Scroll to the highlighted comment after rendering
    useEffect(() => {
        if (!isLoading && threadComments.size > 0) {
            setTimeout(() => {
                const element = document.getElementById(`comment-${replyId}`);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 100);
        }
    }, [isLoading, threadComments, replyId]);


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
                    threadComments.size > 0 ? (
                        <ThreadRenderer 
                            commentId={parentId}
                            allCommentsMap={threadComments}
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
