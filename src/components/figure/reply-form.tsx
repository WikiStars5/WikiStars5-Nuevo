
'use client';

import { useState, useContext } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { collection, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { addDocumentNonBlocking, useAuth, useFirestore, useUser } from '@/firebase';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { updateStreak } from '@/firebase/streaks';
import { StreakAnimationContext } from '@/context/StreakAnimationContext';
import { Comment as CommentType } from '@/lib/types';


const replySchema = z.object({
  text: z.string().min(1, 'La respuesta no puede estar vacía.').max(1000, 'La respuesta no puede superar los 1000 caracteres.'),
});

type ReplyFormValues = z.infer<typeof replySchema>;

interface ReplyFormProps {
  figureId: string;
  figureName: string;
  parentComment: CommentType; // Pass the whole parent comment object
  onReplySuccess: (newReplyId: string) => void;
}

export default function ReplyForm({ figureId, figureName, parentComment, onReplySuccess }: ReplyFormProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showStreakAnimation } = useContext(StreakAnimationContext);

  const form = useForm<ReplyFormValues>({
    resolver: zodResolver(replySchema),
    defaultValues: { text: '' },
  });
  
  const getAvatarFallback = () => {
    if (!user) return '?';
    return user.displayName?.charAt(0) || user.email?.charAt(0) || 'U';
  };

  const onSubmit = async (data: ReplyFormValues) => {
    if (!firestore || !user) {
        toast({
            title: 'Debes iniciar sesión para responder',
            variant: 'destructive',
        });
        return;
    }
    setIsSubmitting(true);

    try {
      const userProfileRef = doc(firestore, 'users', user.uid);
      const userProfileSnap = await getDoc(userProfileRef);
      const userProfileData = userProfileSnap.exists() ? userProfileSnap.data() : {};
      const displayName = userProfileData.username || user.displayName || 'Usuario';
      
      const commentsColRef = collection(firestore, 'figures', figureId, 'comments');
      let newCommentText = data.text;
      let newParentId = parentComment.id;
      let newThreadId = parentComment.threadId || parentComment.id;
      let newDepth = parentComment.depth + 1;

      // The core logic change is here!
      if (parentComment.depth >= 3) {
          // If we are replying to a deep comment, create a new root comment with a quote.
          newCommentText = `> @${parentComment.userDisplayName}: ${parentComment.text}\n\n${data.text}`;
          newParentId = null;
          newDepth = 0;
          // The new threadId will be the ID of this new comment itself. We handle this in the payload.
      }

      const newReplyRef = doc(commentsColRef); // Generate ID beforehand
      
      if (newDepth === 0) {
        newThreadId = newReplyRef.id;
      }
      
      const newReply: Omit<CommentType, 'id' | 'children' | 'createdAt'> & { createdAt: any } = {
        figureId: figureId,
        userId: user.uid,
        text: newCommentText,
        createdAt: serverTimestamp(),
        userDisplayName: displayName,
        userPhotoURL: user.photoURL,
        userCountry: userProfileData.country || null,
        userGender: userProfileData.gender || null,
        likes: 0,
        dislikes: 0,
        parentId: newParentId,
        threadId: newThreadId,
        depth: newDepth,
        rating: -1, // Replies don't have ratings
      };

      await addDocumentNonBlocking(newReplyRef, newReply);
      const newReplyId = newReplyRef.id;
      
      // --- Create Notification ---
      // Only notify if it's a direct reply, not a new root comment
      if (newParentId) {
        const parentAuthorId = parentComment.userId;
        if (parentAuthorId !== user.uid) {
            const notificationsColRef = collection(firestore, 'users', parentAuthorId, 'notifications');
            const notification = {
                userId: parentAuthorId,
                type: 'comment_reply',
                message: `${displayName} ha respondido a tu comentario en el perfil de ${figureName}.`,
                isRead: false,
                createdAt: serverTimestamp(),
                link: `/figures/${figureId}?thread=${newThreadId}&reply=${newReplyId}`
            };
            await addDocumentNonBlocking(notificationsColRef, notification);
        }
      }

      // --- Streak Update ---
      const streakResult = await updateStreak({
        firestore,
        figureId,
        userId: user.uid,
        userDisplayName: displayName,
        userPhotoURL: user.photoURL,
        userCountry: userProfileData.country || null,
        userGender: userProfileData.gender || null,
        isAnonymous: false,
      });

      if (streakResult?.streakGained) {
        showStreakAnimation(streakResult.newStreakCount);
      }

      toast({
        title: '¡Respuesta Publicada!',
      });
      form.reset();
      onReplySuccess(newReplyId);
    } catch (error) {
      console.error('Error al publicar respuesta:', error);
      toast({
        variant: 'destructive',
        title: 'Error al Publicar',
        description: 'No se pudo enviar tu respuesta. Inténtalo de nuevo.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex items-start gap-4 mt-4">
        <Avatar className="h-9 w-9">
            <AvatarImage src={user?.photoURL || undefined} />
            <AvatarFallback>{getAvatarFallback()}</AvatarFallback>
        </Avatar>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 space-y-2">
            <Textarea
            {...form.register('text')}
            placeholder="Escribe tu respuesta..."
            className="text-sm"
            rows={2}
            />
            <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => onReplySuccess('')} disabled={isSubmitting}>
                    Cancelar
                </Button>
                <Button type="submit" size="sm" disabled={isSubmitting}>
                    {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                    <Send className="mr-2 h-4 w-4" />
                    )}
                    Responder
                </Button>
            </div>
             {form.formState.errors.text && <p className="text-xs text-destructive">{form.formState.errors.text.message}</p>}
        </form>
    </div>
  );
}
