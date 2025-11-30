
'use client';

import { useCallback } from 'react';
import CommentForm from './comment-form';
import CommentList from './comment-list';
import { Separator } from '../ui/separator';

type AttitudeOption = 'neutral' | 'fan' | 'simp' | 'hater';

interface CommentSectionProps {
  figureId: string;
  figureName: string;
  sortPreference: AttitudeOption | null;
}

export default function CommentSection({ figureId, figureName, sortPreference }: CommentSectionProps) {
  // We need a way to trigger a refetch in CommentList when a new comment is posted.
  // A simple way is to use a key that changes.
  const [commentListKey, setCommentListKey] = React.useState(Date.now());

  const handleCommentPosted = useCallback(() => {
    // Change the key to force CommentList to re-mount and refetch its data.
    setCommentListKey(Date.now());
  }, []);

  return (
    <div className="space-y-6">
      <CommentForm 
        figureId={figureId} 
        figureName={figureName}
        onCommentPosted={handleCommentPosted}
      />
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
