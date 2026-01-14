
'use client';

import React, { useCallback, useState, useEffect } from 'react';
import CommentForm from './comment-form';
import CommentList from './comment-list';
import { Separator } from '../ui/separator';
import { Comment } from '@/lib/types';

type AttitudeOption = 'neutral' | 'fan' | 'simp' | 'hater';

interface CommentSectionProps {
  figureId: string;
  figureName: string;
  sortPreference: AttitudeOption | null;
}

export default function CommentSection({ figureId, figureName, sortPreference }: CommentSectionProps) {
  const [allComments, setAllComments] = useState<Comment[]>([]);
  const [hasUserCommented, setHasUserCommented] = useState(false);
  
  // This key will be used to force a re-render of CommentList when a new comment is posted by the current user.
  const [commentListKey, setCommentListKey] = useState(Date.now());

  const handleCommentPosted = useCallback(() => {
    // Force a re-fetch of the comments list
    setCommentListKey(Date.now());
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
        key={commentListKey} 
        figureId={figureId} 
        figureName={figureName} 
        sortPreference={sortPreference} 
        onCommentsLoaded={handleCommentsLoaded}
      />
    </div>
  );
}
