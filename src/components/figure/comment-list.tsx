'use client';

import { collection, query, orderBy } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import type { Comment } from '@/lib/types';
import { Skeleton } from '../ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { formatDateDistance } from '@/lib/utils';
import { MessageCircle } from 'lucide-react';

interface CommentListProps {
  figureId: string;
}

function CommentItem({ comment }: { comment: Comment }) {
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
            <CommentItem key={comment.id} comment={comment} />
        ))}
    </div>
  );
}
