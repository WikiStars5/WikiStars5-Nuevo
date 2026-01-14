'use client';

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { collection, query, orderBy, where, doc, getDocs } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import type { Comment } from '@/lib/types';
import { Skeleton } from '../ui/skeleton';
import { MessageCircle, Star, MoreHorizontal, ChevronDown } from 'lucide-react';
import CommentThread from './comment-thread';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Image from 'next/image';
import { useLanguage } from '@/context/LanguageContext';

type AttitudeOption = 'neutral' | 'fan' | 'simp' | 'hater';
const INITIAL_COMMENT_LIMIT = 5;
const COMMENT_INCREMENT = 5;

type FilterType = 'featured' | 'popular' | 'newest' | 'mine' | number;


interface CommentListProps {
  figureId: string;
  figureName: string;
  sortPreference: AttitudeOption | null;
  onCommentsLoaded: (comments: Comment[], hasUserCommented: boolean) => void;
}

const K_REPLY_WEIGHT = 1.0;
const C_DECAY_CONSTANT = 24.0;

const calculateHotScore = (comment: Comment): number => {
    const likes = comment.likes ?? 0;
    const dislikes = comment.dislikes ?? 0;
    const replies = comment.replyCount ?? 0;
    
    const s = (likes) - (dislikes) + K_REPLY_WEIGHT * replies;

    if (s === 0) return 0;
    
    const y = Math.sign(s);
    const z = y * Math.log10(Math.max(1, Math.abs(s)));

    const commentDate = comment.createdAt?.toDate ? comment.createdAt.toDate() : new Date();
    const hoursAgo = (new Date().getTime() - commentDate.getTime()) / (1000 * 3600);
    const decay = hoursAgo / C_DECAY_CONSTANT;
    
    return z - decay;
}


export default function CommentList({ figureId, figureName, sortPreference, onCommentsLoaded }: CommentListProps) {
  const firestore = useFirestore();
  const { user } = useUser();
  const { t } = useLanguage();
  const [commentsVisible, setCommentsVisible] = useState(false);
  const [visibleCount, setVisibleCount] = useState(INITIAL_COMMENT_LIMIT);
  const [activeFilter, setActiveFilter] = useState<FilterType>('featured');
  const [localComments, setLocalComments] = useState<Comment[]>([]);

  useEffect(() => {
    // This effect runs only on the client
    const fetchComments = async () => {
      if (!firestore) return;
      const q = query(
        collection(firestore, 'figures', figureId, 'comments'),
        orderBy('createdAt', 'desc')
      );
      try {
        const snapshot = await getDocs(q);
        const fetchedComments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comment));
        setLocalComments(fetchedComments);
        const userHasCommented = user ? fetchedComments.some(c => c.userId === user.uid && !c.parentId) : false;
        onCommentsLoaded(fetchedComments, userHasCommented);
      } catch (error) {
        console.error("Error fetching comments:", error);
      }
    };
    fetchComments();
  }, [firestore, figureId, user, onCommentsLoaded]);

  const handleRefetch = useCallback(async () => {
     if (!firestore) return;
      const q = query(
        collection(firestore, 'figures', figureId, 'comments'),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const fetchedComments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comment));
      setLocalComments(fetchedComments);
      const userHasCommented = user ? fetchedComments.some(c => c.userId === user.uid && !c.parentId) : false;
      onCommentsLoaded(fetchedComments, userHasCommented);
  }, [firestore, figureId, user, onCommentsLoaded]);


  const filteredRootComments = useMemo(() => {
    if (!localComments) return [];
    
    const rootComments = localComments.filter(comment => !comment.parentId);

    if (activeFilter === 'mine') {
      if (!user) return [];
      return rootComments.filter(comment => comment.userId === user.uid);
    } else if (typeof activeFilter === 'number') {
       return rootComments.filter(comment => comment.rating === activeFilter);
    }
    
    return rootComments;
  }, [localComments, activeFilter, user]);

 const sortedAndFilteredComments = useMemo(() => {
      let tempComments = [...filteredRootComments];
      const hotScoreSort = (a: Comment, b: Comment) => calculateHotScore(b) - calculateHotScore(a);

      const provocativeSort = (commentsToSort: Comment[], isProvocativeCheck: (comment: Comment) => boolean) => {
          const provocative = commentsToSort.filter(isProvocativeCheck).sort(hotScoreSort);
          const nonProvocative = commentsToSort.filter(comment => !isProvocativeCheck(comment)).sort(hotScoreSort);
          return [...provocative, ...nonProvocative];
      };

      if (sortPreference === 'fan' || sortPreference === 'simp') {
          tempComments = provocativeSort(tempComments, c => (c.rating ?? 3) < 3 && c.rating !== -1);
      } else if (sortPreference === 'hater') {
          tempComments = provocativeSort(tempComments, c => (c.rating ?? 0) >= 3);
      } else { 
        switch(activeFilter) {
          case 'featured':
              tempComments.sort((a, b) => {
                  if (a.isFeatured && !b.isFeatured) return -1;
                  if (!a.isFeatured && b.isFeatured) return 1;
                  return calculateHotScore(b) - calculateHotScore(a);
              });
              break;
          case 'popular':
              tempComments.sort((a, b) => (b.likes ?? 0) - (a.likes ?? 0));
              break;
          case 'newest':
              // Already sorted by createdAt desc
              break;
          default:
              tempComments.sort(hotScoreSort);
              break;
        }
      }

      return tempComments;

  }, [filteredRootComments, sortPreference, activeFilter]);
  
  const handleDeleteSuccess = useCallback((deletedCommentId: string) => {
      setLocalComments(prev => prev.filter(c => c.id !== deletedCommentId));
      const userHasCommented = user ? localComments.some(c => c.id !== deletedCommentId && c.userId === user.uid && !c.parentId) : false;
      onCommentsLoaded(localComments.filter(c => c.id !== deletedCommentId), userHasCommented);
  }, [localComments, onCommentsLoaded, user]);

  const handleReplySuccess = useCallback((newReply: Comment) => {
    // Find the parent and update its reply count optimistically
    setLocalComments(prev => {
      return prev.map(c => {
        if (c.id === newReply.parentId) {
          return { ...c, replyCount: (c.replyCount || 0) + 1 };
        }
        return c;
      });
    });
    // Add the reply to the list to show it instantly
    setLocalComments(prev => [...prev, newReply]);
  }, []);

  const visibleComments = sortedAndFilteredComments.slice(0, visibleCount);
  
  const FilterButton = ({ filter, children, isActive }: { filter: FilterType; children: React.ReactNode; isActive: boolean; }) => (
    <Button
        variant={isActive ? 'default' : 'ghost'}
        className={`h-8 px-3 ${isActive ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""}`}
        onClick={() => setActiveFilter(filter)}
    >
        {children}
    </Button>
  );

  const isStarFilterActive = typeof activeFilter === 'number';

  if (!localComments) {
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

  if (!commentsVisible) {
      return (
          <div className="text-center py-10 border-2 border-dashed rounded-lg">
              <MessageCircle className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">Ver opiniones</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                  Mira lo que otros opinan sobre este perfil.
              </p>
              <Button className="mt-4" onClick={() => setCommentsVisible(true)}>Ver comentarios</Button>
          </div>
      )
  }


  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
            <FilterButton filter="featured" isActive={activeFilter === 'featured'}>{t('CommentList.filters.featured')}</FilterButton>
            <FilterButton filter="popular" isActive={activeFilter === 'popular'}>{t('CommentList.filters.popular')}</FilterButton>
            {user && <FilterButton filter="mine" isActive={activeFilter === 'mine'}>{t('CommentList.filters.myOpinion')}</FilterButton>}
            
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
                    <DropdownMenuLabel>{t('CommentList.filters.byStars')}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {[5, 4, 3, 2, 1, 0].map(rating => (
                        <DropdownMenuItem key={rating} onSelect={() => setActiveFilter(rating)}>
                            {rating} {rating > 0 ? t('CommentList.stars') : ''}
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
                onDeleteSuccess={() => handleDeleteSuccess(comment.id)}
                onReplySuccess={handleReplySuccess}
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
                {activeFilter === 'featured' && (localComments.length === 0) 
                    ? t('CommentList.beTheFirst.title')
                    : t('CommentList.noComments.title')
                }
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
                {activeFilter === 'featured' && (localComments.length === 0)
                    ? t('CommentList.beTheFirst.description')
                    : t('CommentList.noComments.description')
                }
            </p>
        </div>
      )}


        <div className="flex items-center justify-center gap-4">
            {sortedAndFilteredComments.length > visibleCount && (
                <Button variant="outline" onClick={() => setVisibleCount(prev => prev + COMMENT_INCREMENT)}>
                    {t('CommentList.buttons.seeMore')}
                </Button>
            )}
            {visibleCount > INITIAL_COMMENT_LIMIT && (
                 <Button variant="ghost" onClick={() => setVisibleCount(INITIAL_COMMENT_LIMIT)}>
                    {t('CommentList.buttons.showLess')}
                </Button>
            )}
        </div>
    </div>
  );
}
