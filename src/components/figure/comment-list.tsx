'use client';

import React, { useMemo } from 'react';
import { collection, query, orderBy } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import type { Comment } from '@/lib/types';
import { Skeleton } from '../ui/skeleton';
import { MessageCircle } from 'lucide-react';
import CommentThread from './comment-thread';

// Helper function to build the comment tree
function buildCommentTree(comments: Comment[]): Comment[] {
  const commentMap: { [key: string]: Comment } = {};
  const rootComments: Comment[] = [];

  // First pass: create a map of all comments by their ID
  comments.forEach(comment => {
    commentMap[comment.id] = { ...comment, children: [] };
  });

  // Second pass: build the tree
  comments.forEach(comment => {
    if (comment.parentId && commentMap[comment.parentId]) {
      // It's a reply, so add it to its parent's children array
      commentMap[comment.parentId].children?.push(commentMap[comment.id]);
    } else {
      // It's a root comment
      rootComments.push(commentMap[comment.id]);
    }
  });

  return rootComments;
}

export default function CommentList({ figureId }: { figureId: string }) {
  const firestore = useFirestore();

  const commentsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    // We still order by creation date to get a generally chronological flat list
    return query(
      collection(firestore, 'figures', figureId, 'comments'),
      orderBy('createdAt', 'desc')
    );
  }, [firestore, figureId]);

  const { data: comments, isLoading } = useCollection<Comment>(commentsQuery);

  const commentTree = useMemo(() => {
    if (!comments) return [];
    return buildCommentTree(comments);
  }, [comments]);


  if (isLoading) {
    return (
        <div className="space-y-6">
            {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-start gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-1/4" />
                        <Skeleton className="h-10 w-full" />
                         <div className="flex gap-4 mt-2">
                            <Skeleton className="h-6 w-12" />
                            <Skeleton className="h-6 w-12" />
                        </div>
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
        {commentTree.map((comment) => (
            <CommentThread key={comment.id} comment={comment} figureId={figureId} />
        ))}
    </div>
  );
}
