'use client';

import { collection, query, orderBy, doc, runTransaction, increment, serverTimestamp, deleteDoc, updateDoc, writeBatch, getDocs, where, limit } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc, addDocumentNonBlocking } from '@/firebase';
import type { Comment as CommentType, CommentVote } from '@/lib/types';
import { Skeleton } from '../ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { cn } from '@/lib/utils';
import { MessageSquare, ThumbsUp, ThumbsDown, Loader2, FilePenLine, Trash2, Send, X, CornerDownRight, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '../ui/button';
import { useState, useEffect, useMemo, useRef } from 'react';
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
  isReplying: boolean;
  onReplySuccess: (newReply: CommentType) => void;
}

function CommentItem({ comment, figureId, figureName, isReply = false, onReply, isReplying, onReplySuccess }: CommentItemProps) {
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
        setIsDeleting(true);

        const batch = writeBatch(firestore);
        const commentRef = doc(firestore, `figures/${figureId}/comments`, comment.id);

        try {
            // Find all replies to this comment
            const repliesQuery = query(collection(firestore, `figures/${figureId}/comments`), where('parentId', '==', comment.id));
            const repliesSnapshot = await getDocs(repliesQuery);

            // Add the main comment to the batch for deletion
            batch.delete(commentRef);
            
            // Add all replies to the batch for deletion
            repliesSnapshot.forEach(replyDoc => {
                batch.delete(replyDoc.ref);
            });
            
            // If the comment being deleted has a rating, adjust the figure's totals.
            // This is a separate transaction as it operates on a different document.
            if (typeof comment.rating === 'number' && comment.rating >= 0) {
                 const figureRef = doc(firestore, 'figures', figureId);
                 await runTransaction(firestore, async (transaction) => {
                    const figureDoc = await transaction.get(figureRef);
                    if (!figureDoc.exists()) return;
                    
                    const ratingUpdates: { [key: string]: any } = {};
                    ratingUpdates['ratingCount'] = increment(-1);
                    ratingUpdates['totalRating'] = increment(-comment.rating);
                    ratingUpdates[`ratingsBreakdown.${comment.rating}`] = increment(-1);

                    // Adjust for any ratings on the replies being deleted
                    for (const replyDoc of repliesSnapshot.docs) {
                        const reply = replyDoc.data() as CommentType;
                        if (typeof reply.rating === 'number' && reply.rating >= 0) {
                            ratingUpdates['ratingCount'] = increment(-1);
                            ratingUpdates['totalRating'] = increment(-reply.rating);
                            ratingUpdates[`ratingsBreakdown.${reply.rating}`] = increment(-1);
                        }
                    }

                    transaction.update(figureRef, ratingUpdates);
                 });
            }

            // Commit the batch deletion of comments and replies
            await batch.commit();

            toast({
                title: "Comentario Eliminado",
                description: "El comentario y sus respuestas han sido eliminados."
            });

        } catch (error: any) {
            console.error("Error al eliminar comentario y respuestas:", error);
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
      <div id={`comment-${comment.id}`} className="space-y-2">
        <div className="flex items-start gap-4">
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
                                        tu comentario y todas sus respuestas.
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
        {isReplying && (
          <div className="pl-14">
            <ReplyForm 
              figureId={figureId}
              figureName={figureName}
              parentComment={comment}
              replyingTo={comment}
              onReplySuccess={onReplySuccess}
            />
          </div>
        )}
      </div>
    )
}

interface CommentThreadProps {
  comment: CommentType;
  allReplies: CommentType[];
  figureId: string;
  figureName: string;
}

const INITIAL_REPLIES_LIMIT = 3;
const REPLIES_INCREMENT = 3;

export default function CommentThread({ comment, allReplies, figureId, figureName }: CommentThreadProps) {
  const [repliesVisible, setRepliesVisible] = useState(false);
  const [visibleRepliesCount, setVisibleRepliesCount] = useState(INITIAL_REPLIES_LIMIT);
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const repliesContainerRef = useRef<HTMLDivElement>(null);
  const [localReplies, setLocalReplies] = useState<CommentType[]>([]);

  useEffect(() => {
    // Initialize local replies with replies from props
    const initialReplies = allReplies
      .filter(reply => reply.parentId === comment.id)
      .sort((a, b) => a.createdAt.toMillis() - b.createdAt.toMillis());
    setLocalReplies(initialReplies);
  }, [allReplies, comment.id]);

  const visibleReplies = useMemo(() => {
      return localReplies.slice(0, visibleRepliesCount);
  }, [localReplies, visibleRepliesCount]);


  const hasReplies = localReplies.length > 0;
  const hasMoreReplies = localReplies.length > visibleRepliesCount;

  const handleReplyClick = (targetComment: CommentType) => {
    if (!repliesVisible) {
        setRepliesVisible(true);
    }
    setActiveReplyId(prevId => prevId === targetComment.id ? null : targetComment.id);
  }

  const handleReplySuccess = (newReply: CommentType) => {
    setActiveReplyId(null);
    setLocalReplies(prevReplies => [...prevReplies, newReply]);
    
    // Expand the visible replies to show the new one
    setVisibleRepliesCount(localReplies.length + 1);
    
    // After a short delay, scroll to the last comment
    setTimeout(() => {
        repliesContainerRef.current?.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 100);
  };
  
  const toggleReplies = () => {
    const nextRepliesVisible = !repliesVisible;
    setRepliesVisible(nextRepliesVisible);
    if (!nextRepliesVisible) {
        setActiveReplyId(null);
        setVisibleRepliesCount(INITIAL_REPLIES_LIMIT); // Reset count when hiding
    }
  }

  return (
    <div className="space-y-4 rounded-lg border bg-card text-card-foreground p-4 dark:bg-black">
      <CommentItem 
        comment={comment} 
        figureId={figureId}
        figureName={figureName}
        onReply={handleReplyClick}
        isReplying={activeReplyId === comment.id}
        onReplySuccess={handleReplySuccess}
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
                Ver {localReplies.length} {localReplies.length > 1 ? 'respuestas' : 'respuesta'}
                </>
            )}
        </Button>
      )}

      {repliesVisible && (
        <div ref={repliesContainerRef} className="ml-8 space-y-4 border-l-2 pl-4">
          {visibleReplies.map(reply => (
            <CommentItem
              key={reply.id}
              comment={reply}
              figureId={figureId}
              figureName={figureName}
              isReply={true}
              onReply={handleReplyClick}
              isReplying={activeReplyId === reply.id}
              onReplySuccess={handleReplySuccess}
            />
          ))}
           {hasMoreReplies && (
                <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setVisibleRepliesCount(prev => prev + REPLIES_INCREMENT)}
                >
                    Ver más respuestas
                </Button>
            )}
        </div>
      )}
    </div>
  );
}
