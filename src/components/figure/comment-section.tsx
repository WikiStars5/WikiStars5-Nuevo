'use client';

import type { Figure } from '@/lib/types';
import CommentForm from './comment-form';
import CommentList from './comment-list';
import { Separator } from '../ui/separator';

interface CommentSectionProps {
  figure: Figure;
}

export default function CommentSection({ figure }: CommentSectionProps) {
  return (
    <div className="space-y-6">
      <CommentForm figure={figure} />
      <Separator />
      <CommentList figureId={figure.id} />
    </div>
  );
}
