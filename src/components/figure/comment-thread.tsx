'use client';

import { collection, query, orderBy, doc, runTransaction, increment, serverTimestamp, deleteDoc, updateDoc, writeBatch, getDocs, where, limit } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc, addDocumentNonBlocking } from '@/firebase';
import type { Comment as CommentType, CommentVote } from '@/lib/types';
import { Skeleton } from '../ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { cn } from '@/lib/utils';
import { MessageSquare, ThumbsUp, ThumbsDown, Loader2, FilePenLine, Trash2, Send, X, CornerDownRight, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '../ui/button';
import { useState, useEffect, useMemo } from 'react';
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
import { StarRating } from '../shared/star-rating';
import { countries } from '@/lib/countries';
import Image from 'next/image';
import Link from 'next/link';

interface CommentItemProps {
  comment: CommentType, 
  figureId: string,
  figureName: string,
  isReply?: boolean;
  onReply: (parent: CommentType) => void;
}

function CommentItem({ comment, figureId, figureName, isReply = false, onReply }: CommentItemProps) {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isVoting, setIsVoting] = useState<'like' | 'dislike' | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState(comment.text);
    const [isSavingEdit, setIsSavingEdit] = useState(false);

    const isOwner = user && user.uid === comment.userId;
    
    const userVoteRef = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return doc(firestore, `figures/${figureId}/comments/${comment.id}/votes`, user.uid);
    }, [firestore, user, figureId, comment.id]);

    const { data: userVote, isLoading: isVoteLoading } = useDoc<CommentVote>(userVoteRef);

    const country = countries.find(c => c.name === comment.userCountry);

    const handleVote = async (voteType: 'like' | 'dislike') => {
        if (!firestore || !user || isVoting) return;
        setIsVoting(voteType);

        const commentRef = doc(firestore, `figures/${figureId}/comments`, comment.id);
        const voteRef = doc(firestore, `figures/${figureId}/comments/${comment.id}/votes`, user.uid);

        try {
            await runTransaction(firestore, async (transaction) => {
                const voteDoc = await transaction.get(voteRef);
                const existingVote = voteDoc.exists() ? voteDoc.data().vote : null;
                const updates: { [key: string]: any } = {};

                if (existingVote === voteType) {
                    // User is retracting their vote
                    updates[`${voteType}s`] = increment(-1);
                    transaction.delete(voteRef);
                    toast({ title: "Voto eliminado" });
                } else {
                    // New vote or changing vote
                    updates[`${voteType}s`] = increment(1);
                    if (existingVote) {
                        // Changing vote from like to dislike or vice-versa
                        const otherVoteType = voteType === 'like' ? 'dislike' : 'like';
                        updates[`${otherVoteType}s`] = increment(-1);
                    }
                    transaction.set(voteRef, { vote: voteType, createdAt: serverTimestamp() });
                    toast({ title: "¡Voto registrado!" });
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
        
        // Prevent deletion if the comment has replies.
        const repliesQuery = query(collection(firestore, `figures/${figureId}/comments`), where('parentId', '==', comment.id), limit(1));
        const repliesSnapshot = await getDocs(repliesQuery);
        if (!repliesSnapshot.empty) {
            toast({
                title: "No se puede eliminar",
                description: "No puedes eliminar un comentario que ya tiene respuestas.",
                variant: "destructive",
            });
            return;
        }

        setIsDeleting(true);
        const commentRef = doc(firestore, `figures/${figureId}/comments`, comment.id);
        
        try {
            await deleteDoc(commentRef);

            // If the comment being deleted has a rating, adjust the figure's totals.
            if (typeof comment.rating === 'number' && comment.rating >= 0) {
                 const figureRef = doc(firestore, 'figures', figureId);
                 await runTransaction(firestore, async (transaction) => {
                    const figureDoc = await transaction.get(figureRef);
                    if (!figureDoc.exists()) return;
                    const updates: { [key: string]: any } = {};
                    updates['ratingCount'] = increment(-1);
                    updates['totalRating'] = increment(-comment.rating);
                    updates[`ratingsBreakdown.${comment.rating}`] = increment(-1);
                    transaction.update(figureRef, updates);
                 });
            }

            toast({
                title: "Comentario Eliminado",
            });

        } catch (error: any) {
            console.error("Error al eliminar comentario:", error);
            toast({
                title: "Error al Eliminar",
                description: error.message || "No se pudo eliminar el comentario.",
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
            console.error("updating comment:", error);
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

    const renderCommentText = () => {
        const mentionMatch = comment.text.match(/^(@\S+)/);
        if (mentionMatch) {
            const mention = mentionMatch[1];
            const restOfText = comment.text.substring(mention.length).trim();
            return (
                <p className="text-sm text-black dark:text-white whitespace-pre-wrap mt-1">
                    <span className="text-primary font-semibold mr-1">{mention}</span>
                    {restOfText}
                </p>
            );
        }
        return <p className="text-sm text-black dark:text-white whitespace-pre-wrap mt-1">{comment.text}</p>;
    };

    return (
        <div id={`comment-${comment.id}`} className="flex items-start gap-4">
            <Avatar className={cn("h-10 w-10", isReply && "h-8 w-8")}>
                 <Link href={`/u/${comment.userDisplayName}`}><AvatarImage src={comment.userPhotoURL || undefined} alt={comment.userDisplayName} /></Link>
                <AvatarFallback><Link href={`/u/${comment.userDisplayName}`}>{getAvatarFallback()}</Link></AvatarFallback>
            </Avatar>
            <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                    <Link href={`/u/${comment.userDisplayName}`} className="font-semibold text-sm hover:underline">{comment.userDisplayName}</Link>
                    
                    {comment.userGender === 'Masculino' && <span className="text-blue-400 font-bold" title="Masculino">♂</span>}
                    {comment.userGender === 'Femenino' && <span className="text-pink-400 font-bold" title="Femenino">♀</span>}

                    {country && (
                        <Image
                            src={`https://flagcdn.com/w20/${country.code.toLowerCase()}.png`}
                            alt={country.name}
                            width={20}
                            height={15}
                            className="object-contain"
                            title={country.name}
                        />
                    )}
                    {comment.updatedAt && (
                         <p className="text-xs text-italic text-muted-foreground">(editado)</p>
                    )}
                </div>

                {!isReply && comment.rating !== -1 && typeof comment.rating === 'number' && (
                  <StarRating rating={comment.rating} starClassName="h-4 w-4 mt-1" />
                )}

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
                    renderCommentText()
                )}

                {!isEditing && (
                   <>
                    <div className="mt-2 flex items-center gap-1 text-muted-foreground">
                        {/*
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className={cn("flex items-center gap-1.5 h-8 px-2", userVote?.vote === 'like' && 'text-primary' )}
                            onClick={() => handleVote('like')}
                            disabled={!user || !!isVoting}
                        >
                            {isVoting === 'like' ? <Loader2 className="h-4 w-4 animate-spin"/> : <ThumbsUp className="h-4 w-4" />}
                            <span>{comment.likes ?? 0}</span>
                        </Button>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className={cn("flex items-center gap-1.5 h-8 px-2", userVote?.vote === 'dislike' && 'text-destructive' )}
                            onClick={() => handleVote('dislike')}
                            disabled={!user || !!isVoting}
                        >
                            {isVoting === 'dislike' ? <Loader2 className="h-4 w-4 animate-spin"/> : <ThumbsDown className="h-4 w-4" />}
                            <span>{comment.dislikes ?? 0}</span>
                        </Button>
                        */}
                        
                        {user && (
                            <Button variant="ghost" size="sm" className="flex items-center gap-1.5 h-8 px-2" onClick={() => onReply(comment)}>
                                <MessageSquare className="h-4 w-4" />
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
                                        tu comentario.
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
                   </>
                )}
            </div>
        </div>
    )
}

interface CommentThreadProps {
  comment: CommentType;
  allReplies: CommentType[];
  figureId: string;
  figureName: string;
}

export default function CommentThread({ comment, allReplies, figureId, figureName }: CommentThreadProps) {
  const [repliesVisible, setRepliesVisible] = useState(false);
  const [activeReply, setActiveReply] = useState<CommentType | null>(null);

  const replies = useMemo(() => {
    return allReplies
      .filter(reply => reply.parentId === comment.id)
      .sort((a, b) => {
        // Handle cases where createdAt might not be populated yet for newly added comments
        if (!a.createdAt) return 1;
        if (!b.createdAt) return -1;
        return a.createdAt.toMillis() - b.createdAt.toMillis();
      });
  }, [allReplies, comment.id]);

  const hasReplies = replies.length > 0;

  const handleReplyClick = (targetComment: CommentType) => {
    if (!repliesVisible) {
        setRepliesVisible(true);
    }
    setActiveReply(targetComment);
  }

  const handleReplySuccess = () => {
    setActiveReply(null);
  };
  
  const toggleReplies = () => {
    setRepliesVisible(prev => !prev);
    if (repliesVisible) {
        setActiveReply(null);
    }
  }

  return (
    <div className="space-y-4 rounded-lg border bg-card text-card-foreground p-4">
      <CommentItem 
        comment={comment} 
        figureId={figureId}
        figureName={figureName}
        onReply={handleReplyClick}
      />
      {hasReplies && (
        <Button
            variant="link"
            className="p-0 h-auto text-sm font-semibold text-primary ml-14"
            onClick={toggleReplies}
        >
            {repliesVisible ? (
                <>
                 <ChevronUp className="mr-1 h-4 w-4" />
                 Ocultar respuestas
                </>
            ) : (
                <>
                <ChevronDown className="mr-1 h-4 w-4" />
                Ver {replies.length} {replies.length > 1 ? 'respuestas' : 'respuesta'}
                </>
            )}
        </Button>
      )}

      {repliesVisible && (
        <div className="ml-8 space-y-4 border-l-2 pl-4">
          {replies.map(reply => (
            <CommentItem
              key={reply.id}
              comment={reply}
              figureId={figureId}
              figureName={figureName}
              isReply={true}
              onReply={handleReplyClick}
            />
          ))}
        </div>
      )}
      
      {activeReply && (
         <div className="ml-8 pt-4 border-l-2 pl-4">
            <ReplyForm
                figureId={figureId}
                figureName={figureName}
                parentComment={comment} // Always reply to the root comment
                replyingTo={activeReply} // The specific comment we're replying to (for @mention)
                onReplySuccess={handleReplySuccess}
            />
         </div>
      )}
    </div>
  );
}
