'use client';

import { collection, query, orderBy, doc, runTransaction, increment, serverTimestamp, deleteDoc, updateDoc } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc, addDocumentNonBlocking } from '@/firebase';
import type { Comment as CommentType, CommentVote } from '@/lib/types';
import { Skeleton } from '../ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { formatDateDistance, cn } from '@/lib/utils';
import { MessageCircle, ThumbsUp, ThumbsDown, Loader2, FilePenLine, Trash2, Send, X } from 'lucide-react';
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
import { Textarea } from '../ui/textarea';
import ReplyForm from './reply-form';


interface CommentItemProps {
  comment: CommentType, 
  figureId: string 
}

function CommentItem({ comment, figureId }: CommentItemProps) {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isVoting, setIsVoting] = useState<'like' | 'dislike' | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState(comment.text);
    const [isSavingEdit, setIsSavingEdit] = useState(false);
    const [isReplying, setIsReplying] = useState(false);


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

    const handleUpdate = async () => {
        if (!firestore || !isOwner || editText.trim() === '') return;
        setIsSavingEdit(true);

        const commentRef = doc(firestore, `figures/${figureId}/comments`, comment.id);
        try {
            await updateDoc(commentRef, {
                text: editText,
                updatedAt: serverTimestamp() 
            });
            toast({
                title: "Comentario Actualizado",
            });
            setIsEditing(false);
        } catch (error) {
            console.error("Error updating comment:", error);
            toast({
                title: "Error al Actualizar",
                description: "No se pudo guardar tu comentario.",
                variant: "destructive",
            });
        } finally {
            setIsSavingEdit(false);
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
                    {comment.updatedAt && (
                         <p className="text-xs text-muted-foreground italic">(editado)</p>
                    )}
                </div>

                {isEditing ? (
                    <div className="mt-2 space-y-2">
                        <Textarea 
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            className="text-sm"
                            rows={3}
                        />
                        <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} disabled={isSavingEdit}>
                                <X className="mr-1.5" /> Cancelar
                            </Button>
                            <Button size="sm" onClick={handleUpdate} disabled={isSavingEdit}>
                                {isSavingEdit ? <Loader2 className="animate-spin" /> : <Send className="mr-1.5" />} Guardar
                            </Button>
                        </div>
                    </div>
                ) : (
                    <p className="text-sm text-foreground/90 whitespace-pre-wrap">{comment.text}</p>
                )}

                {!isEditing && (
                    <div className="mt-2 flex items-center gap-1 text-muted-foreground">
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className={cn("flex items-center gap-1.5 h-8 px-2", userVote?.vote === 'like' && "text-blue-500")}
                            onClick={() => handleVote('like')}
                            disabled={!user || !!isVoting || isVoteLoading}
                        >
                            {isVoting === 'like' ? <Loader2 className="h-4 w-4 animate-spin"/> : <ThumbsUp className="h-4 w-4" />}
                            <span>{comment.likes ?? 0}</span>
                        </Button>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className={cn("flex items-center gap-1.5 h-8 px-2", userVote?.vote === 'dislike' && "text-red-500")}
                            onClick={() => handleVote('dislike')}
                            disabled={!user || !!isVoting || isVoteLoading}
                        >
                            {isVoting === 'dislike' ? <Loader2 className="h-4 w-4 animate-spin"/> : <ThumbsDown className="h-4 w-4" />}
                            <span>{comment.dislikes ?? 0}</span>
                        </Button>
                        
                        {user && comment.depth < 4 && (
                            <Button variant="ghost" size="sm" className="flex items-center gap-1.5 h-8 px-2" onClick={() => setIsReplying(!isReplying)}>
                                <MessageCircle className="h-4 w-4" />
                                <span>Responder</span>
                            </Button>
                        )}


                        {isOwner && (
                            <>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsEditing(true)}>
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
                )}
                 {isReplying && (
                    <ReplyForm 
                        figureId={figureId} 
                        parentId={comment.id} 
                        depth={comment.depth}
                        onReplySuccess={() => setIsReplying(false)}
                    />
                 )}
            </div>
        </div>
    )
}

interface CommentThreadProps {
  comment: CommentType;
  figureId: string;
}

export default function CommentThread({ comment, figureId }: CommentThreadProps) {
  const hasChildren = comment.children && comment.children.length > 0;

  return (
    <div className="flex flex-col">
      <CommentItem comment={comment} figureId={figureId} />
      {hasChildren && (
        <div className="ml-8 mt-4 space-y-4 border-l-2 pl-4">
          {comment.children!.map(child => (
            <CommentThread key={child.id} comment={child} figureId={figureId} />
          ))}
        </div>
      )}
    </div>
  );
}
