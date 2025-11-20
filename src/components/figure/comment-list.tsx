
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
import Image from 'next/image';


type AttitudeOption = 'neutral' | 'fan' | 'simp' | 'hater';
const INITIAL_COMMENT_LIMIT = 5;
const COMMENT_INCREMENT = 5;

type FilterType = 'featured' | 'popular' | 'newest' | 'mine' | number;


interface CommentListProps {
  figureId: string;
  figureName: string;
  sortPreference: AttitudeOption | null;
}

const K_REPLY_WEIGHT = 1.0;
const C_DECAY_CONSTANT = 18.0;


const calculateHotScore = (comment: Comment): number => {
    const likes = comment.likes ?? 0;
    const dislikes = comment.dislikes ?? 0;
    const replies = comment.replyCount ?? 0;
    
    // Paso A: Puntuación Neta Ajustada (s)
    const s = (likes) - (dislikes) + K_REPLY_WEIGHT * replies;

    if (s === 0) return 0;
    
    // Paso B: Magnitud Logarítmica y Dirección (z)
    const y = Math.sign(s);
    const z = y * Math.log10(Math.max(1, Math.abs(s)));

    // Paso C: Factor de Decadencia por Tiempo (t)
    const hoursAgo = (new Date().getTime() - comment.createdAt.toDate().getTime()) / (1000 * 3600);
    const decay = hoursAgo / C_DECAY_CONSTANT;
    
    // Fusión y Algoritmo Final
    return z - decay;
}


export default function CommentList({ figureId, figureName, sortPreference }: CommentListProps) {
  const firestore = useFirestore();
  const { user } = useUser();
  const [visibleCount, setVisibleCount] = useState(INITIAL_COMMENT_LIMIT);
  const [activeFilter, setActiveFilter] = useState<FilterType>('featured');


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

  const filteredRootComments = useMemo(() => {
    if (!comments) return [];
    
    const rootComments = comments.filter(comment => !comment.parentId);

    if (activeFilter === 'mine') {
      if (!user) return [];
      return rootComments.filter(comment => comment.userId === user.uid);
    } else if (typeof activeFilter === 'number') {
       return rootComments.filter(comment => comment.rating === activeFilter);
    }
    
    return rootComments;
  }, [comments, activeFilter, user]);

 const sortedAndFilteredComments = useMemo(() => {
      let tempComments = [...filteredRootComments];
      const baseSort = (a: Comment, b: Comment) => calculateHotScore(b) - calculateHotScore(a);

      // Layer 1: "Maquiavélica" Sorting Logic
      if (sortPreference === 'fan' || sortPreference === 'simp') {
          // Show provocative (negative) comments first
          tempComments.sort((a, b) => {
              const ratingA = (a.rating ?? 3) <= 3 ? 1 : 0; // 1 if provocative
              const ratingB = (b.rating ?? 3) <= 3 ? 1 : 0; // 1 if provocative
              if (ratingA !== ratingB) return ratingB - ratingA; // Prioritize provocative
              return baseSort(a, b); // Layer 2: Hot Score within groups
          });
      } else if (sortPreference === 'hater') {
          // Show provocative (positive) comments first
          tempComments.sort((a, b) => {
              const ratingA = (a.rating ?? 3) >= 4 ? 1 : 0; // 1 if provocative
              const ratingB = (b.rating ?? 3) >= 4 ? 1 : 0; // 1 if provocative
              if (ratingA !== ratingB) return ratingB - ratingA; // Prioritize provocative
              return baseSort(a, b); // Layer 2: Hot Score within groups
          });
      } else {
        // Layer 2 only: Default sorting based on the selected filter tab
        switch(activeFilter) {
          case 'featured':
              tempComments.sort(baseSort);
              break;
          case 'popular':
              tempComments.sort((a, b) => (b.likes ?? 0) - (a.likes ?? 0));
              break;
          case 'newest':
              // Already sorted by createdAt descending from the query
              break;
          default:
              // For 'mine' and star ratings, default to Hot Score
              tempComments.sort(baseSort);
              break;
        }
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
        onClick={() => setActiveFilter(filter)}
    >
        {children}
    </Button>
  );

  const isStarFilterActive = typeof activeFilter === 'number';

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
            <FilterButton filter="featured" isActive={activeFilter === 'featured'}>Destacados</FilterButton>
            <FilterButton filter="popular" isActive={activeFilter === 'popular'}>Más Populares</FilterButton>
            {user && <FilterButton filter="mine" isActive={activeFilter === 'mine'}>Mi Opinión</FilterButton>}
            
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
      </div>


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
            <Image 
                src="https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/hielo%2Fhielo1.png?alt=media&token=e49ade39-786f-4aff-aa2b-a7279546cc69"
                alt="Romper el hielo"
                width={128}
                height={128}
                className="mx-auto h-52 w-52"
            />
            <h3 className="mt-2 text-lg font-semibold">
                {activeFilter === 'featured' && (!comments || comments.length === 0) 
                    ? 'Sé el primero en romper el hielo' 
                    : 'No se encontraron opiniones'}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
                {activeFilter === 'featured' && (!comments || comments.length === 0)
                    ? 'Aún no hay comentarios para este perfil. ¡Da tu opinión!'
                    : 'No hay comentarios que coincidan con el filtro seleccionado.'
                }
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
