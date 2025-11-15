
'use client';

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
  return (
    <div className="space-y-6">
      <CommentForm figureId={figureId} figureName={figureName} />
      <Separator />
      <CommentList figureId={figureId} figureName={figureName} sortPreference={sortPreference} />
    </div>
  );
}
