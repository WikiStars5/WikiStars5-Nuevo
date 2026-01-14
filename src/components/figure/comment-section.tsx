'use client';

import React, { useCallback, useState, useEffect } from 'react';
import CommentForm from './comment-form';
import CommentList from './comment-list';
import { Separator } from '../ui/separator';
import { Comment } from '@/lib/types';
import { useUser } from '@/firebase';

type AttitudeOption = 'neutral' | 'fan' | 'simp' | 'hater';

interface CommentSectionProps {
  figureId: string;
  figureName: string;
  sortPreference: AttitudeOption | null;
}

export default function CommentSection({ figureId, figureName, sortPreference }: CommentSectionProps) {
  const { user } = useUser();
  const [allComments, setAllComments] = useState<Comment[]>([]);
  const [hasUserCommented, setHasUserCommented] = useState(false);
  const [key, setKey] = useState(Date.now()); // Key to force re-render

  const handleCommentPosted = useCallback(() => {
    // This will force CommentList to re-fetch its data
    setKey(Date.now());
    // Also, optimistically update hasUserCommented
    setHasUserCommented(true);
  }, []);

  const handleCommentsLoaded = useCallback((comments: Comment[], userHasCommented: boolean) => {
      setAllComments(comments);
      setHasUserCommented(userHasCommented);
  }, []);


  return (
    <div className="space-y-6">
      <CommentForm 
        figureId={figureId} 
        figureName={figureName}
        hasUserCommented={hasUserCommented}
        onCommentPosted={handleCommentPosted}
      />
      <Separator />
      <CommentList 
        key={key} 
        figureId={figureId} 
        figureName={figureName} 
        sortPreference={sortPreference} 
        onCommentsLoaded={handleCommentsLoaded}
      />
    </div>
  );
}
