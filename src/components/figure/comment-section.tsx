
'use client';

import React, { useCallback, useState, useEffect } from 'react';
import CommentForm from './comment-form';
import CommentList from './comment-list';
import { Separator } from '../ui/separator';
import { useUser, useFirestore } from '@/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

type AttitudeOption = 'neutral' | 'fan' | 'simp' | 'hater';

interface CommentSectionProps {
  figureId: string;
  figureName: string;
  sortPreference: AttitudeOption | null;
}

export default function CommentSection({ figureId, figureName, sortPreference }: CommentSectionProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const [hasUserCommented, setHasUserCommented] = useState(false);
  const [isCheckingComment, setIsCheckingComment] = useState(true);
  
  // This key will be used to force a re-render of CommentList when a new comment is posted by the current user.
  const [commentListKey, setCommentListKey] = useState(Date.now());

  useEffect(() => {
    if (!user || !firestore) {
      setHasUserCommented(false);
      setIsCheckingComment(false);
      return;
    }
    
    setIsCheckingComment(true);

    const q = query(
      collection(firestore, 'figures', figureId, 'comments'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setHasUserCommented(!snapshot.empty);
      setIsCheckingComment(false);
    }, (error) => {
      console.error("Error listening to user's comment:", error);
      setIsCheckingComment(false);
    });

    return () => unsubscribe();
  }, [user, firestore, figureId]);


  const handleCommentPosted = useCallback(() => {
    setCommentListKey(Date.now());
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
      />
    </div>
  );
}
