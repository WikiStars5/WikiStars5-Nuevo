
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { collection, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { addDocumentNonBlocking, useFirestore, useUser } from '@/firebase';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { updateStreak } from '@/firebase/streaks';
import { Comment as CommentType } from '@/lib/types';
import { LoginPromptDialog } from '../shared/login-prompt-dialog';


const replySchema = z.object({
  text: z.string().min(1, 'La respuesta no puede estar vacía.').max(1000, 'La respuesta no puede superar los 1000 caracteres.'),
});

type ReplyFormValues = z.infer<typeof replySchema>;

interface ReplyFormProps {
  figureId: string;
  figureName: string;
  parentComment: CommentType; // The root comment of the thread
  replyingTo: CommentType; // The specific comment being replied to (for the @mention)
  onReplySuccess: (newReplyId: string) => void;
}

export default function ReplyForm({ figureId, figureName, parentComment, replyingTo, onReplySuccess }: ReplyFormProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showLoginDialog, setShowLoginDialog] = useState(false);

  const form = useForm<ReplyFormValues>({
    resolver: zodResolver(replySchema),
    defaultValues: { text: `@${replyingTo.userDisplayName} ` },
  });
  
  const getAvatarFallback = () => {
    if (!user) return '?';
    return user.displayName?.charAt(0) || user.email?.charAt(0) || 'U';
  };

  const onSubmit = async (data: ReplyFormValues) => {
    if (!firestore || !user) {
        setShowLoginDialog(true);
        return;
    }
    setIsSubmitting(true);

    try {
      const userProfileRef = doc(firestore, 'users', user.uid);
      const userProfileSnap = await getDoc(userProfileRef);
      const userProfileData = userProfileSnap.exists() ? userProfileSnap.data() : {};
      const displayName = userProfileData.username || user.displayName || 'Usuario';
      
      const commentsColRef = collection(firestore, 'figures', figureId, 'comments');
      
      const newReply: Omit<CommentType, 'id' | 'createdAt'> & { createdAt: any } = {
        figureId: figureId,
        userId: user.uid,
        text: data.text,
        createdAt: serverTimestamp(),
        userDisplayName: displayName,
        userPhotoURL: user.photoURL,
        userCountry: userProfileData.country || null,
        userGender: userProfileData.gender || null,
        likes: 0,
        dislikes: 0,
        parentId: parentComment.id, // Always associate with the root comment
        rating: -1, // Replies don't have ratings
      };

      const newReplyRef = await addDocumentNonBlocking(commentsColRef, newReply);
      const newReplyId = newReplyRef.id;
      
      // --- Create Notification ---
      const replyToAuthorId = replyingTo.userId;
      if (replyToAuthorId !== user.uid) {
        const notificationsColRef = collection(firestore, 'users', replyToAuthorId, 'notifications');
        const notification = {
            userId: replyToAuthorId,
            type: 'comment_reply',
            message: `${displayName} ha respondido a tu comentario en el perfil de ${figureName}.`,
            isRead: false,
            createdAt: serverTimestamp(),
            link: `/figures/${figureId}?thread=${parentComment.id}&reply=${newReplyId}`
        };
        await addDocumentNonBlocking(notificationsColRef, notification);
      }

      // --- Streak Update ---
      await updateStreak({
        firestore,
        figureId,
        userId: user.uid,
        userDisplayName: displayName,
        userPhotoURL: user.photoURL,
        userCountry: userProfileData.country || null,
        userGender: userProfileData.gender || null,
        isAnonymous: user.isAnonymous
      });

      toast({
        title: '¡Respuesta Publicada!',
      });
      form.reset({ text: '' });
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
    <LoginPromptDialog open={showLoginDialog} onOpenChange={setShowLoginDialog}>
        <div className="flex items-start gap-4 mt-4">
            <Avatar className="h-9 w-9">
                <AvatarImage src={user?.photoURL || undefined} />
                <AvatarFallback>{getAvatarFallback()}</AvatarFallback>
            </Avatar>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 space-y-2">
                <Textarea
                {...form.register('text')}
                placeholder={`Respondiendo a ${replyingTo.userDisplayName}...`}
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
    </LoginPromptDialog>
  );
}
