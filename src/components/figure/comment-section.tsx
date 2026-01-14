

'use client';

import React, { useCallback, useState, useEffect } from 'react';
import CommentForm from './comment-form';
import CommentList from './comment-list';
import { Separator } from '../ui/separator';
import { useUser, useFirestore } from '@/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { Comment } from '@/lib/types';

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
  const [isCheckingComment, setIsCheckingComment] = useState(true);
  
  // This key will be used to force a re-render of CommentList when a new comment is posted by the current user.
  const [commentListKey, setCommentListKey] = useState(Date.now());

  useEffect(() => {
    if (!user) {
      setHasUserCommented(false);
      setIsCheckingComment(false);
      return;
    }
    
    // Check if the user's comment exists in the already loaded comments
    const userComment = allComments.find(comment => comment.userId === user.uid && !comment.parentId);
    setHasUserCommented(!!userComment);
    setIsCheckingComment(false); // We can determine this from the loaded comments
  }, [user, allComments]);


  const handleCommentPosted = useCallback(() => {
    // onSnapshot will handle the update, no need to force a re-render with a key
  }, []);

  const handleCommentsLoaded = useCallback((comments: Comment[]) => {
      setAllComments(comments);
  }, []);


  return (
    <div className="space-y-6">
      {!isCheckingComment && (
        <CommentForm 
          figureId={figureId} 
          figureName={figureName}
          hasUserCommented={hasUserCommented}
          onCommentPosted={handleCommentPosted}
        />
      )}
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

