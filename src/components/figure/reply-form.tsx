
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
  parentId: string;
  threadId: string; // The ID of the root comment of the thread
  depth: number;
  onReplySuccess: (newReplyId: string) => void;
}

export default function ReplyForm({ figureId, figureName, parentId, threadId, depth, onReplySuccess }: ReplyFormProps) {
  const { user } = useUser(); // We assume user exists because Reply button is only shown to logged in users
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
    if (user.isAnonymous) return 'A';
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
      const newReply: Omit<CommentType, 'id' | 'children' | 'createdAt'> & { createdAt: any } = {
        figureId: figureId,
        userId: user.uid,
        text: data.text,
        createdAt: serverTimestamp(),
        userDisplayName: displayName,
        userPhotoURL: user.isAnonymous ? null : user.photoURL,
        userCountry: userProfileData.country || null,
        userGender: userProfileData.gender || null,
        likes: 0,
        dislikes: 0,
        parentId: parentId,
        threadId: threadId, // Add threadId to the reply document
        depth: depth + 1,
        rating: -1, // Replies don't have ratings
      };

      const newReplyRef = await addDocumentNonBlocking(commentsColRef, newReply);
      const newReplyId = newReplyRef.id;
      
      // --- Create Notification ---
      const parentCommentRef = doc(firestore, 'figures', figureId, 'comments', parentId);
      const parentCommentSnap = await getDoc(parentCommentRef);
      if (parentCommentSnap.exists()) {
        const parentCommentData = parentCommentSnap.data() as CommentType;
        const parentAuthorId = parentCommentData.userId;

        // Don't notify if you reply to yourself
        if (parentAuthorId !== user.uid) {
            const notificationsColRef = collection(firestore, 'users', parentAuthorId, 'notifications');
            const notification = {
                userId: parentAuthorId,
                type: 'comment_reply',
                message: `${displayName} ha respondido a tu comentario en el perfil de ${figureName}.`,
                isRead: false,
                createdAt: serverTimestamp(),
                link: `/figures/${figureId}?thread=${threadId}&reply=${newReplyId}`
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
        isAnonymous: user.isAnonymous,
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
