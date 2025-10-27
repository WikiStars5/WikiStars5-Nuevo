
import { Suspense } from 'react';
import FigureDetailClient from './client-page';
import { Skeleton } from '@/components/ui/skeleton';

type FigurePageProps = {
  params: { id: string };
};

function FigureDetailSkeleton() {
  return (
    <div className="container mx-auto max-w-4xl px-4 pb-8 pt-0 md:pb-16 md:pt-0">
      <Skeleton className="h-48 w-full" />
      <div className="mt-6">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full mt-4" />
      </div>
    </div>
  );
}


export default async function FigureDetailPage({ params }: FigurePageProps) {
  // Data fetching for the page itself is now handled on the client side.
  // We just pass the figure ID to the client component.
  const { id } = params;
  return (
    <Suspense fallback={<FigureDetailSkeleton />}>
      <FigureDetailClient figureId={id} />
    </Suspense>
  );
}
