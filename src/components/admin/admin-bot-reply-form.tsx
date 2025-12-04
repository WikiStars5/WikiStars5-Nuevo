
'use client';

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  collection,
  serverTimestamp,
  doc,
  runTransaction,
  increment,
} from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { updateStreak } from '@/firebase/streaks';
import { Comment as CommentType } from '@/lib/types';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bot } from 'lucide-react';

const replySchema = z.object({
  botUserId: z.string().min(1, 'Debes seleccionar un bot.'),
  text: z.string().min(1, 'La respuesta no puede estar vacía.'),
});

type ReplyFormValues = z.infer<typeof replySchema>;

interface AdminBotReplyFormProps {
  figureId: string;
  figureName: string;
  parentComment: CommentType;
  replyToComment: CommentType; // The specific comment/reply being replied to
  onReplySuccess: () => void;
  allComments: CommentType[]; // Pass all comments to find virtual users
}

export default function AdminBotReplyForm({
  figureId,
  figureName,
  parentComment,
  replyToComment,
  onReplySuccess,
  allComments
}: AdminBotReplyFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Extract unique virtual users from all comments
  const virtualUsers = useMemo(() => {
    const users: { [key: string]: { id: string; name: string, photo?: string | null } } = {};
    allComments.forEach(comment => {
      if (comment.userId.startsWith('virtual_')) {
        if (!users[comment.userId]) {
          users[comment.userId] = { id: comment.userId, name: comment.userDisplayName, photo: comment.userPhotoURL };
        }
      }
    });
    return Object.values(users);
  }, [allComments]);

  const form = useForm<ReplyFormValues>({
    resolver: zodResolver(replySchema),
    defaultValues: {
      botUserId: '',
      text: `@[${replyToComment.userDisplayName}] `,
    },
  });

  const selectedBotId = form.watch('botUserId');
  const selectedBot = virtualUsers.find(u => u.id === selectedBotId);
  
  const getAvatarFallback = () => selectedBot?.name?.charAt(0) || <Bot />;


  const onSubmit = async (data: ReplyFormValues) => {
    if (!firestore || !selectedBot) {
      toast({ title: 'Error', description: 'Por favor, selecciona un bot para responder.' });
      return;
    }
    setIsSubmitting(true);

    try {
      const newReplyId = doc(collection(firestore, 'temp')).id;

      await runTransaction(firestore, async (transaction) => {
        // All replies go to the parent comment's subcollection
        const parentCommentRef = doc(firestore, 'figures', figureId, 'comments', parentComment.id);
        const repliesColRef = collection(parentCommentRef, 'replies');
        
        const newReplyRef = doc(repliesColRef, newReplyId);

        const newReplyData = {
          figureId: figureId,
          userId: selectedBot.id,
          text: data.text,
          createdAt: serverTimestamp(),
          userDisplayName: selectedBot.name,
          userPhotoURL: selectedBot.photo || null,
          likes: Math.floor(Math.random() * 3),
          dislikes: 0,
          parentId: parentComment.id,
          rating: -1,
        };

        transaction.set(newReplyRef, newReplyData);
        transaction.update(parentCommentRef, { replyCount: increment(1) });
        
        const replyToAuthorId = replyToComment.userId;
        if (replyToAuthorId && !replyToAuthorId.startsWith('virtual_')) {
            const notificationsColRef = collection(firestore, 'users', replyToAuthorId, 'notifications');
            const notification = {
                userId: replyToAuthorId,
                type: 'comment_reply',
                data: {
                    commenterName: selectedBot.name,
                    figureName: figureName,
                },
                isRead: false,
                createdAt: serverTimestamp(),
                link: `/figures/${figureId}?thread=${parentComment.id}&reply=${newReplyId}`
            };
            transaction.set(doc(notificationsColRef), notification);
        }
      });

      // Update streak for the bot
      await updateStreak({
        firestore,
        figureId,
        figureName,
        userId: selectedBot.id,
        userDisplayName: selectedBot.name,
        userPhotoURL: selectedBot.photo || null,
        isAnonymous: true,
      });

      toast({ title: 'Respuesta de Bot Publicada' });
      form.reset({ text: `@[${replyToComment.userDisplayName}] `, botUserId: data.botUserId });
      onReplySuccess();
    } catch (error) {
      console.error('Error al publicar respuesta de bot:', error);
      toast({
        variant: 'destructive',
        title: 'Error al Publicar',
        description: 'No se pudo enviar la respuesta del bot.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-lg border p-4 bg-muted/50">
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <h4 className="font-semibold text-sm flex items-center gap-2"><Bot className="h-4 w-4" /> Responder como Bot</h4>
                
                <div className="flex items-start gap-4">
                     <Avatar className="h-9 w-9">
                        <AvatarImage src={selectedBot?.photo || undefined} />
                        <AvatarFallback>{getAvatarFallback()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-4">
                        <FormField
                            control={form.control}
                            name="botUserId"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Identidad del Bot</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecciona un bot existente..." />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                    {virtualUsers.map(vu => (
                                        <SelectItem key={vu.id} value={vu.id}>{vu.name}</SelectItem>
                                    ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="text"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Respuesta</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder={`Respondiendo a ${replyToComment.userDisplayName}...`}
                                            className="text-sm"
                                            rows={2}
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" type="button" onClick={() => onReplySuccess()} disabled={isSubmitting}>
                                Cancelar
                            </Button>
                            <Button size="sm" type="submit" disabled={isSubmitting}>
                                {isSubmitting ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                <Send className="mr-2 h-4 w-4" />
                                )}
                                Publicar Respuesta
                            </Button>
                        </div>
                    </div>
                </div>
            </form>
        </Form>
    </div>
  );
}
