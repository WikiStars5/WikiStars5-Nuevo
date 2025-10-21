'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { collection, serverTimestamp } from 'firebase/firestore';
import { addDocumentNonBlocking, useAuth, useFirestore, useUser } from '@/firebase';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';


const replySchema = z.object({
  text: z.string().min(1, 'La respuesta no puede estar vacía.').max(1000, 'La respuesta no puede superar los 1000 caracteres.'),
});

type ReplyFormValues = z.infer<typeof replySchema>;

interface ReplyFormProps {
  figureId: string;
  parentId: string;
  depth: number;
  onReplySuccess: () => void;
}

export default function ReplyForm({ figureId, parentId, depth, onReplySuccess }: ReplyFormProps) {
  const { user } = useUser(); // We assume user exists because Reply button is only shown to logged in users
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      const commentsColRef = collection(firestore, 'figures', figureId, 'comments');
      const newReply = {
        figureId: figureId,
        userId: user.uid,
        text: data.text,
        createdAt: serverTimestamp(),
        userDisplayName: user.isAnonymous ? 'Anónimo' : user.displayName || 'Usuario',
        userPhotoURL: user.isAnonymous ? null : user.photoURL,
        likes: 0,
        dislikes: 0,
        parentId: parentId,
        depth: depth + 1,
      };

      await addDocumentNonBlocking(commentsColRef, newReply);

      toast({
        title: '¡Respuesta Publicada!',
      });
      form.reset();
      onReplySuccess();
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
                <Button variant="ghost" size="sm" onClick={onReplySuccess} disabled={isSubmitting}>
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
