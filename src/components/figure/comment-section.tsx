'use client';

import CommentForm from './comment-form';
import CommentList from './comment-list';
import { Separator } from '../ui/separator';

interface CommentSectionProps {
  figureId: string;
  figureName: string;
  initialOpenThreadId: string | null;
}

export default function CommentSection({ figureId, figureName, initialOpenThreadId }: CommentSectionProps) {
  return (
    <div className="space-y-6">
      <CommentForm figureId={figureId} figureName={figureName} />
      <Separator />
      <CommentList 
        figureId={figureId} 
        figureName={figureName}
        initialOpenThreadId={initialOpenThreadId}
      />
    </div>
  );
}
