'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { collection, query, orderBy, where, doc, getDoc } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import type { Comment } from '@/lib/types';
import { Skeleton } from '../ui/skeleton';
import { MessageCircle, Star } from 'lucide-react';
import CommentThread from './comment-thread';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';

const INITIAL_COMMENT_LIMIT = 5;
const COMMENT_INCREMENT = 5;


// Helper function to build the comment tree
function buildCommentTree(comments: Comment[]): Comment[] {
  const commentMap: { [key: string]: Comment } = {};
  const rootComments: Comment[] = [];

  // First pass: create a map of all comments by their ID and initialize children
  comments.forEach(comment => {
    commentMap[comment.id] = { ...comment, children: [] };
  });

  // Second pass: build the tree
  comments.forEach(comment => {
    const mappedComment = commentMap[comment.id];
    if (comment.parentId && commentMap[comment.parentId]) {
      // It's a reply, so add it to its parent's children array
      commentMap[comment.parentId].children?.push(mappedComment);
    } else {
      // It's a root comment
      rootComments.push(mappedComment);
    }
  });

  return rootComments;
}

type FilterType = 'all' | 'mine' | number;
type MineFilterType = 'unanswered' | 'answered';

interface CommentListProps {
  figureId: string;
  figureName: string;
}

export default function CommentList({ figureId, figureName }: CommentListProps) {
  const firestore = useFirestore();
  const { user } = useUser();
  const [visibleCount, setVisibleCount] = useState(INITIAL_COMMENT_LIMIT);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [mineFilter, setMineFilter] = useState<MineFilterType>('answered');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    if (params.get('view') === 'mine') {
      setActiveFilter('mine');
      setMineFilter('answered');
    }
  }, []);


  const commentsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    
    const baseQuery = query(
      collection(firestore, 'figures', figureId, 'comments'),
      orderBy('createdAt', 'desc')
    );

    return baseQuery;
  }, [firestore, figureId]);


  const { data: comments, isLoading } = useCollection<Comment>(commentsQuery);

  const filteredComments = useMemo(() => {
    if (!comments) return [];
    
    const tree = buildCommentTree(comments);

    if (activeFilter === 'mine') {
      if (!user) return [];
      const myComments = tree.filter(comment => comment.userId === user.uid);
      
      if (mineFilter === 'answered') {
        return myComments.filter(comment => comment.children && comment.children.length > 0);
      }
      return myComments.filter(comment => !comment.children || comment.children.length === 0);

    } else if (typeof activeFilter === 'number') {
       return tree.filter(comment => comment.rating === activeFilter);
    }

    return tree;
  }, [comments, activeFilter, user, mineFilter]);


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

  const visibleComments = filteredComments.slice(0, visibleCount);
  
  const FilterButton = ({ filter, children }: { filter: FilterType; children: React.ReactNode }) => (
    <Button
        variant={activeFilter === filter ? 'secondary' : 'ghost'}
        className="h-8 px-3"
        onClick={() => setActiveFilter(filter)}
    >
        {children}
    </Button>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 flex-wrap">
        <FilterButton filter="all">Todo</FilterButton>
        {user && <FilterButton filter="mine">Mis Opiniones</FilterButton>}
        <div className="flex-grow" />
        {[5, 4, 3, 2, 1].map(rating => (
          <FilterButton key={rating} filter={rating}>
            {rating} <Star className="ml-1 h-3 w-3" />
          </FilterButton>
        ))}
      </div>

       {activeFilter === 'mine' && (
        <Tabs value={mineFilter} onValueChange={(value) => setMineFilter(value as MineFilterType)} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="unanswered">No Respondidas</TabsTrigger>
                <TabsTrigger value="answered">Respondidas</TabsTrigger>
            </TabsList>
        </Tabs>
      )}


      {visibleComments.length > 0 ? (
        visibleComments.map((comment) => (
            <CommentThread 
                key={comment.id} 
                comment={comment} 
                figureId={figureId} 
                figureName={figureName}
            />
        ))
      ) : (
        <div className="text-center py-10">
            <MessageCircle className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-2 text-lg font-semibold">No se encontraron opiniones</h3>
            <p className="mt-1 text-sm text-muted-foreground">
                No hay comentarios que coincidan con el filtro seleccionado.
            </p>
        </div>
      )}


        <div className="flex items-center justify-center gap-4">
            {filteredComments.length > visibleCount && (
                <Button variant="outline" onClick={() => setVisibleCount(prev => prev + COMMENT_INCREMENT)}>
                    Ver más comentarios
                </Button>
            )}
            {visibleCount > INITIAL_COMMENT_LIMIT && (
                 <Button variant="ghost" onClick={() => setVisibleCount(INITIAL_COMMENT_LIMIT)}>
                    Mostrar menos
                </Button>
            )}
        </div>
    </div>
  );
}
