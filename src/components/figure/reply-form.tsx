
'use client';

import { useState, useContext } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { collection, serverTimestamp, doc, getDoc, Timestamp, addDoc, runTransaction, increment } from 'firebase/firestore';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useFirestore, useUser } from '@/firebase';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { updateStreak } from '@/firebase/streaks';
import { Comment as CommentType } from '@/lib/types';
import { LoginPromptDialog } from '../shared/login-prompt-dialog';
import { StreakAnimationContext } from '@/context/StreakAnimationContext';
import { useLanguage } from '@/context/LanguageContext';

const createReplySchema = (t: (key: string) => string) => z.object({
  text: z.string().min(1, t('ReplyForm.validation.notEmpty')).max(1000, t('ReplyForm.validation.maxLength')),
});

type ReplyFormValues = z.infer<ReturnType<typeof createReplySchema>>;

interface ReplyFormProps {
  figureId: string;
  figureName: string;
  parentComment: CommentType; // The root comment of the thread
  replyToComment: CommentType; // The comment being replied to (can be parent or another reply)
  onReplySuccess: () => void;
}

export default function ReplyForm({ figureId, figureName, parentComment, replyToComment, onReplySuccess }: ReplyFormProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const { showStreakAnimation } = useContext(StreakAnimationContext);
  const { t } = useLanguage();

  const replySchema = createReplySchema(t);

  const form = useForm<ReplyFormValues>({
    resolver: zodResolver(replySchema),
    defaultValues: { text: '' }, // The initial text is now empty
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

    // Combine the static mention with the user's input
    const fullText = `@[${replyToComment.userDisplayName}] ${data.text}`;

    try {
        const parentCommentRef = doc(firestore, 'figures', figureId, 'comments', parentComment.id);
        const repliesColRef = collection(parentCommentRef, 'replies');

        await runTransaction(firestore, async (transaction) => {
            const userProfileRef = doc(firestore, 'users', user.uid);
            const userProfileSnap = await transaction.get(userProfileRef);
            const userProfileData = userProfileSnap.exists() ? userProfileSnap.data() : {};
            const displayName = userProfileData.username || user.displayName || 'Usuario';
            
            const newReplyRef = doc(repliesColRef); // Create a new doc ref to get its ID

            const newReplyData = {
                figureId: figureId,
                userId: user.uid,
                text: fullText, // Use the combined text
                createdAt: serverTimestamp(),
                userDisplayName: displayName,
                userPhotoURL: user.photoURL,
                userCountry: userProfileData.country || null,
                userGender: userProfileData.gender || null,
                likes: 0,
                dislikes: 0,
                parentId: parentComment.id, // Always link to the root comment
                rating: -1,
            };
            
            transaction.set(newReplyRef, newReplyData);
            transaction.set(parentCommentRef, { replyCount: increment(1) }, { merge: true });
            
            const replyToAuthorId = replyToComment.userId;
            if (replyToAuthorId && replyToAuthorId !== user.uid) {
                const notificationsColRef = collection(firestore, 'users', replyToAuthorId, 'notifications');
                const notification = {
                    userId: replyToAuthorId,
                    type: 'comment_reply',
                    data: {
                        commenterName: displayName,
                        figureName: figureName,
                    },
                    isRead: false,
                    createdAt: serverTimestamp(),
                    link: `/figures/${figureId}?thread=${parentComment.id}&reply=${newReplyRef.id}`
                };
                transaction.set(doc(notificationsColRef), notification);
            }
        });


      // --- Streak Update ---
      const streakResult = await updateStreak({
        firestore,
        figureId,
        figureName,
        userId: user.uid,
        isAnonymous: user.isAnonymous,
      });

      if (streakResult?.streakGained) {
        showStreakAnimation(streakResult.newStreakCount);
      }

      toast({
        title: t('ReplyForm.toast.replyPosted'),
      });
      form.reset({ text: '' });
      onReplySuccess();
    } catch (error) {
      console.error('Error al publicar respuesta:', error);
      toast({
        variant: 'destructive',
        title: t('ReplyForm.toast.errorPostingTitle'),
        description: t('ReplyForm.toast.errorPostingDescription'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <LoginPromptDialog open={showLoginDialog} onOpenChange={setShowLoginDialog}>
        <div className="flex items-start gap-4">
            <Avatar className="h-9 w-9">
                <AvatarImage src={user?.photoURL || undefined} />
                <AvatarFallback>{getAvatarFallback()}</AvatarFallback>
            </Avatar>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 space-y-2">
                 <div className="relative rounded-md border border-input focus-within:ring-2 focus-within:ring-ring">
                    <div className="flex items-center flex-wrap p-2 pb-0">
                         <span className="text-sm text-primary font-semibold mr-1">
                            {`@[${replyToComment.userDisplayName}]`}
                         </span>
                         <Textarea
                            {...form.register('text')}
                            placeholder={`${t('ReplyForm.placeholder')}...`}
                            className="flex-1 text-sm border-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-0 m-0 h-auto min-h-[20px] resize-none shadow-none"
                            rows={1}
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => onReplySuccess()} disabled={isSubmitting}>
                        {t('ReplyForm.cancelButton')}
                    </Button>
                    <Button type="submit" size="sm" disabled={isSubmitting}>
                        {isSubmitting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                        <Send className="mr-2 h-4 w-4" />
                        )}
                        {t('ReplyForm.replyButton')}
                    </Button>
                </div>
                {form.formState.errors.text && <p className="text-xs text-destructive">{form.formState.errors.text.message}</p>}
            </form>
        </div>
    </LoginPromptDialog>
  );
}
