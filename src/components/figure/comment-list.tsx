'use client';

import { collection, query, orderBy, doc, runTransaction, increment, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from '@/firebase';
import type { Comment, CommentVote } from '@/lib/types';
import { Skeleton } from '../ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { formatDateDistance, cn } from '@/lib/utils';
import { MessageCircle, ThumbsUp, ThumbsDown, Loader2, FilePenLine, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"


interface CommentItemProps {
  comment: Comment, 
  figureId: string 
}

function CommentItem({ comment, figureId }: { comment: Comment, figureId: string }) {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isVoting, setIsVoting] = useState<'like' | 'dislike' | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const isOwner = user && user.uid === comment.userId;

    const userVoteRef = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return doc(firestore, `figures/${figureId}/comments/${comment.id}/votes`, user.uid);
    }, [firestore, user, figureId, comment.id]);

    const { data: userVote, isLoading: isVoteLoading } = useDoc<CommentVote>(userVoteRef);

    const handleVote = async (voteType: 'like' | 'dislike') => {
        if (!firestore || !user || isVoting) return;

        setIsVoting(voteType);

        const commentRef = doc(firestore, `figures/${figureId}/comments`, comment.id);
        const voteRef = doc(firestore, `figures/${figureId}/comments/${comment.id}/votes`, user.uid);
        
        try {
            await runTransaction(firestore, async (transaction) => {
                const commentDoc = await transaction.get(commentRef);
                const voteDoc = await transaction.get(voteRef);

                if (!commentDoc.exists()) {
                    throw new Error("El comentario ya no existe.");
                }

                const currentVote = voteDoc.exists() ? voteDoc.data().vote : null;
                const updates: { [key: string]: any } = {};

                if (currentVote === voteType) {
                    updates[`${voteType}s`] = increment(-1);
                    transaction.delete(voteRef);
                } else {
                    updates[`${voteType}s`] = increment(1);
                    if (currentVote) {
                        const otherType = voteType === 'like' ? 'dislike' : 'like';
                        updates[`${otherType}s`] = increment(-1);
                    }
                    transaction.set(voteRef, { 
                        userId: user.uid,
                        commentId: comment.id,
                        vote: voteType,
                        createdAt: serverTimestamp(),
                     });
                }
                
                transaction.update(commentRef, updates);
            });
        } catch (error: any) {
            console.error("Error al votar:", error);
            toast({
                title: "Error al Votar",
                description: error.message || "No se pudo registrar tu voto.",
                variant: "destructive",
            });
        } finally {
            setIsVoting(null);
        }
    };
    
    const handleDelete = async () => {
        if (!firestore || !isOwner) return;
        setIsDeleting(true);

        const commentRef = doc(firestore, `figures/${figureId}/comments`, comment.id);
        try {
            await deleteDoc(commentRef);
            toast({
                title: "Comentario Eliminado",
                description: "Tu comentario ha sido eliminado correctamente.",
            })
        } catch (error: any) {
            console.error("Error al eliminar comentario:", error);
            toast({
                title: "Error al Eliminar",
                description: "No se pudo eliminar el comentario.",
                variant: "destructive",
            });
        } finally {
            setIsDeleting(false);
        }
    };

    const getAvatarFallback = () => {
        return comment.userDisplayName?.charAt(0) || 'U';
    }

    return (
        <div className="flex items-start gap-4">
            <Avatar className="h-10 w-10">
                <AvatarImage src={comment.userPhotoURL || undefined} alt={comment.userDisplayName} />
                <AvatarFallback>{getAvatarFallback()}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
                <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm">{comment.userDisplayName}</p>
                    <p className="text-xs text-muted-foreground">
                        • {comment.createdAt ? formatDateDistance(comment.createdAt.toDate()) : 'justo ahora'}
                    </p>
                </div>
                <p className="text-sm text-foreground/90 whitespace-pre-wrap">{comment.text}</p>
                <div className="mt-2 flex items-center gap-2 text-muted-foreground">
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className={cn("flex items-center gap-1.5 h-8 px-2", userVote?.vote === 'like' && "text-blue-500")}
                        onClick={() => handleVote('like')}
                        disabled={!!isVoting || isVoteLoading}
                    >
                        {isVoting === 'like' ? <Loader2 className="h-4 w-4 animate-spin"/> : <ThumbsUp className="h-4 w-4" />}
                        <span>{comment.likes ?? 0}</span>
                    </Button>
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className={cn("flex items-center gap-1.5 h-8 px-2", userVote?.vote === 'dislike' && "text-red-500")}
                        onClick={() => handleVote('dislike')}
                        disabled={!!isVoting || isVoteLoading}
                    >
                         {isVoting === 'dislike' ? <Loader2 className="h-4 w-4 animate-spin"/> : <ThumbsDown className="h-4 w-4" />}
                        <span>{comment.dislikes ?? 0}</span>
                    </Button>

                    {isOwner && (
                        <>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {/* TODO: Implement edit */}}>
                            <FilePenLine className="h-4 w-4" />
                            <span className="sr-only">Editar comentario</span>
                        </Button>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                 <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive" disabled={isDeleting}>
                                    {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                    <span className="sr-only">Eliminar comentario</span>
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Esta acción no se puede deshacer. Esto eliminará permanentemente
                                    tu comentario de nuestros servidores.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDelete}>Continuar</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                       
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}


export default function CommentList({ figureId }: CommentListProps) {
  const firestore = useFirestore();

  const commentsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'figures', figureId, 'comments'),
      orderBy('createdAt', 'desc')
    );
  }, [firestore, figureId]);

  const { data: comments, isLoading } = useCollection<Comment>(commentsQuery);

  if (isLoading) {
    return (
        <div className="space-y-6">
            {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-start gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-1/4" />
                        <Skeleton className="h-10 w-full" />
                         <div className="flex gap-4 mt-2">
                            <Skeleton className="h-6 w-12" />
                            <Skeleton className="h-6 w-12" />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
  }

  if (!comments || comments.length === 0) {
    return (
        <div className="text-center py-10">
            <MessageCircle className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-2 text-lg font-semibold">Aún no hay opiniones</h3>
            <p className="mt-1 text-sm text-muted-foreground">
                Sé el primero en compartir tu opinión sobre este perfil.
            </p>
        </div>
    )
  }

  return (
    <div className="space-y-6">
        <h3 className="text-lg font-semibold">Comentarios Recientes</h3>
        {comments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} figureId={figureId} />
        ))}
    </div>
  );
}
