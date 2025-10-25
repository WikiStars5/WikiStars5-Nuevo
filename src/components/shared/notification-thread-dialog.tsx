
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDocs, doc } from 'firebase/firestore';
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

    const threadQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        
        const figureCommentsRef = collection(firestore, `figures/${figureId}/comments`);
        return query(figureCommentsRef, where('parentId', '==', parentId));
    }, [firestore, figureId, parentId]);
    
    const { data: allComments, isLoading } = useCollection<Comment>(threadQuery);

    const [parentComment, setParentComment] = useState<Comment | null>(null);
    const [isParentLoading, setIsParentLoading] = useState(true);

    useEffect(() => {
        const fetchParent = async () => {
            if (!firestore) return;
            setIsParentLoading(true);
            const parentRef = doc(firestore, `figures/${figureId}/comments`, parentId);
            const docSnap = await getDoc(parentRef);
            if (docSnap.exists()) {
                setParentComment({ id: docSnap.id, ...docSnap.data() } as Comment);
            }
            setIsParentLoading(false);
        };
        fetchParent();
    }, [firestore, figureId, parentId]);


    const threadTree = useMemo(() => {
        if (!parentComment || !allComments) return null;

        const commentMap = new Map<string, Comment>();
        // Add parent and all its children to the map
        commentMap.set(parentComment.id, { ...parentComment, children: [] });
        allComments.forEach(c => commentMap.set(c.id, { ...c, children: [] }));

        const buildRecursiveTree = (id: string): Comment | null => {
            const comment = commentMap.get(id);
            if (!comment) return null;
            
            const children = allComments.filter(c => c.parentId === id);
            comment.children = children.map(child => buildRecursiveTree(child.id)).filter(Boolean) as Comment[];
            return comment;
        }

        return buildRecursiveTree(parentId);
    }, [allComments, parentId, parentComment]);


    useEffect(() => {
        if (threadTree) {
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
                {isLoading || isParentLoading ? (
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
                                        parentId={replyId} 
                                        depth={threadTree.depth + 1} 
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

