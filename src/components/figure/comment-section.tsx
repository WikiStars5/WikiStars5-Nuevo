
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
  const firestore = useFirestore();
  const [allComments, setAllComments] = useState<Comment[]>([]);
  const [hasUserCommented, setHasUserCommented] = useState(false);
  const [isCheckingComment, setIsCheckingComment] = useState(true);
  
  // This key will be used to force a re-render of CommentList when a new comment is posted by the current user.
  const [commentListKey, setCommentListKey] = useState(Date.now());

  // This effect listens for the user's comments in real-time to enable/disable the form.
  useEffect(() => {
    if (!user || !firestore) {
      setHasUserCommented(false);
      setIsCheckingComment(false);
      return;
    }

    setIsCheckingComment(true);
    const commentsQuery = query(
      collection(firestore, 'figures', figureId, 'comments'),
      where('userId', '==', user.uid),
      where('parentId', '==', null) // Only check for root comments
    );

    const unsubscribe = onSnapshot(commentsQuery, (snapshot) => {
      setHasUserCommented(!snapshot.empty);
      setIsCheckingComment(false);
    });

    return () => unsubscribe();
  }, [user, firestore, figureId]);


  const handleCommentPosted = useCallback(() => {
    // onSnapshot will handle the update, but we can force a key change if needed, though it's often not necessary with real-time listeners.
    // setCommentListKey(Date.now());
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
