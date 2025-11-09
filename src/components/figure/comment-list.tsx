
'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { collection, query, orderBy, where, doc, getDoc } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from '@/firebase';
import type { Comment, AttitudeVote } from '@/lib/types';
import { Skeleton } from '../ui/skeleton';
import { MessageCircle, Star, MoreHorizontal, ChevronDown } from 'lucide-react';
import CommentThread from './comment-thread';
import { Button } from '../ui/button';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"


type AttitudeOption = 'neutral' | 'fan' | 'simp' | 'hater';
const INITIAL_COMMENT_LIMIT = 5;
const COMMENT_INCREMENT = 5;

type FilterType = 'featured' | 'popular' | 'newest' | 'mine' | number;
type MyCommentsFilterType = 'all' | 'answered' | 'unanswered';


interface CommentListProps {
  figureId: string;
  figureName: string;
  sortPreference: AttitudeOption | null;
}

const GRAVITY = 1.8;
const INITIAL_OFFSET_HOURS = 2;

const calculateHotScore = (comment: Comment): number => {
    const likes = comment.likes ?? 0;
    const dislikes = comment.dislikes ?? 0;
    const score = likes - dislikes;
    
    if (score === 0) return 0;
    
    const hoursAgo = (new Date().getTime() - comment.createdAt.toDate().getTime()) / (1000 * 3600);
    
    // The core of the hot sort algorithm
    return score / Math.pow(hoursAgo + INITIAL_OFFSET_HOURS, GRAVITY);
}

export default function CommentList({ figureId, figureName, sortPreference }: CommentListProps) {
  const firestore = useFirestore();
  const { user } = useUser();
  const [visibleCount, setVisibleCount] = useState(INITIAL_COMMENT_LIMIT);
  const [activeFilter, setActiveFilter] = useState<FilterType>('featured');
  const [myCommentsFilter, setMyCommentsFilter] = useState<MyCommentsFilterType>('all');


  // The base query now sorts by creation date by default.
  const commentsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    
    let baseQuery = query(
      collection(firestore, 'figures', figureId, 'comments'),
      orderBy('createdAt', 'desc')
    );

    return baseQuery;
  }, [firestore, figureId]);


  const { data: comments, isLoading } = useCollection<Comment>(commentsQuery);

  const { rootComments, allReplies } = useMemo(() => {
    if (!comments) return { rootComments: [], allReplies: [] };
    const roots = comments.filter(c => !c.parentId);
    const replies = comments.filter(c => c.parentId);
    return { rootComments: roots, allReplies: replies };
  }, [comments]);


  const filteredRootComments = useMemo(() => {
    if (!rootComments) return [];
    
    if (activeFilter === 'mine') {
      if (!user) return [];
      
      const userComments = rootComments.filter(comment => comment.userId === user.uid);
      const replyIds = new Set(allReplies.map(reply => reply.parentId));

      if (myCommentsFilter === 'answered') {
          return userComments.filter(comment => replyIds.has(comment.id));
      }
      if (myCommentsFilter === 'unanswered') {
          return userComments.filter(comment => !replyIds.has(comment.id));
      }
      // 'all' case
      return userComments;

    } else if (typeof activeFilter === 'number') {
       return rootComments.filter(comment => comment.rating === activeFilter);
    }
    // For 'featured', 'popular' and 'newest', we start with all root comments.
    // The sorting logic below will handle these.
    return rootComments;
  }, [rootComments, allReplies, activeFilter, user, myCommentsFilter]);

  const sortedAndFilteredComments = useMemo(() => {
      let tempComments = [...filteredRootComments];
      
      switch(activeFilter) {
        case 'featured':
            tempComments.sort((a, b) => calculateHotScore(b) - calculateHotScore(a));
            break;
        case 'popular':
            tempComments.sort((a, b) => (b.likes ?? 0) - (a.likes ?? 0));
            break;
        case 'newest':
             // Already sorted by createdAt descending from the query
            break;
        default:
             // For 'mine' and star ratings, default to newest first
            tempComments.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
            break;
      }
      
      // The maquiavélico sort is an override that only applies when triggered from attitude voting
      if (sortPreference) {
          tempComments.sort((a, b) => {
              const ratingA = a.rating ?? 3;
              const ratingB = b.rating ?? 3;
              let ratingDiff;

              if (sortPreference === 'fan' || sortPreference === 'simp') {
                  ratingDiff = ratingB - ratingA; // Higher ratings first
              } else { // 'hater'
                  ratingDiff = ratingA - ratingB; // Lower ratings first
              }
              
              if (ratingDiff !== 0) return ratingDiff;
              return b.createdAt.toMillis() - a.createdAt.toMillis();
          });
      }


      return tempComments;

  }, [filteredRootComments, sortPreference, activeFilter]);

  if (isLoading) {
    return (
        <div className="space-y-6">
            {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-start gap-4 p-4 rounded-lg border">
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

  const visibleComments = sortedAndFilteredComments.slice(0, visibleCount);
  
  const FilterButton = ({ filter, children, isActive }: { filter: FilterType; children: React.ReactNode; isActive: boolean; }) => (
    <Button
        variant={isActive ? 'default' : 'ghost'}
        className={cn(
            "h-8 px-3",
            isActive && "bg-primary text-primary-foreground hover:bg-primary/90"
        )}
        onClick={() => {
            setActiveFilter(filter);
            setMyCommentsFilter('all'); // Reset sub-filter when main filter changes
        }}
    >
        {children}
    </Button>
  );

  const SubFilterButton = ({ filter, children, isActive }: { filter: MyCommentsFilterType, children: React.ReactNode, isActive: boolean }) => (
     <Button
        variant={isActive ? 'secondary' : 'ghost'}
        className={cn(
            "h-7 px-2.5 text-xs",
            isActive && "bg-secondary text-secondary-foreground"
        )}
        onClick={() => setMyCommentsFilter(filter)}
     >
        {children}
     </Button>
  )

  const isStarFilterActive = typeof activeFilter === 'number';

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
            <FilterButton filter="featured" isActive={activeFilter === 'featured'}>Destacados</FilterButton>
            <FilterButton filter="popular" isActive={activeFilter === 'popular'}>Más Populares</FilterButton>
            <FilterButton filter="newest" isActive={activeFilter === 'newest'}>Más Recientes</FilterButton>
            {user && <FilterButton filter="mine" isActive={activeFilter === 'mine'}>Mis Opiniones</FilterButton>}
            
            <div className="flex-grow" />
            
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant={isStarFilterActive ? 'default' : 'ghost'} className="h-8 px-3">
                    {isStarFilterActive ? (
                            <>
                            {activeFilter} <Star className="ml-1 h-3 w-3" />
                            </>
                        ) : (
                        <MoreHorizontal className="h-4 w-4" />
                        )}
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Filtrar por estrellas</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {[5, 4, 3, 2, 1, 0].map(rating => (
                        <DropdownMenuItem key={rating} onSelect={() => setActiveFilter(rating)}>
                            {rating} {rating > 0 && <Star className="ml-2 h-3 w-3" />}
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>

        </div>
        {activeFilter === 'mine' && (
            <div className="flex items-center gap-2 p-2 rounded-md bg-muted">
                <SubFilterButton filter='all' isActive={myCommentsFilter === 'all'}>Todos</SubFilterButton>
                <SubFilterButton filter='answered' isActive={myCommentsFilter === 'answered'}>Respondidas</SubFilterButton>
                <SubFilterButton filter='unanswered' isActive={myCommentsFilter === 'unanswered'}>No Respondidas</SubFilterButton>
            </div>
        )}
      </div>


      {visibleComments.length > 0 ? (
         visibleComments.map((comment) => (
            <CommentThread 
                key={comment.id} 
                comment={comment}
                allReplies={allReplies}
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
            {sortedAndFilteredComments.length > visibleCount && (
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
