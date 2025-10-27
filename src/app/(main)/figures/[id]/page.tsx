
import { Suspense } from 'react';
import FigureDetailClient from './client-page';
import { Skeleton } from '@/components/ui/skeleton';
import type { Metadata } from 'next';

type FigurePageProps = {
  params: { id: string };
};

// Generate dynamic metadata for SEO and social sharing
export async function generateMetadata({ params }: FigurePageProps): Promise<Metadata> {
  const { id } = params;

  // Capitalize the name from the ID for the title. e.g., "lionel-messi" -> "Lionel Messi"
  const figureName = id
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  const description = `Explora el perfil, las opiniones y las calificaciones de ${figureName} en WikiStars5.`;

  return {
    title: `Perfil de ${figureName} - WikiStars5`,
    description: description,
    openGraph: {
      title: `Perfil de ${figureName} - WikiStars5`,
      description: description,
      // We use the application logo as a consistent and reliable fallback 
      // to avoid the server-side fetching errors we encountered previously.
      // This ensures a professional-looking preview for all shared links.
      images: [
        {
          url: 'https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/logo%2Flogodia.png?alt=media&token=fb7367da-8db6-4f1d-a1f0-d03f57e6b9f6',
          width: 800,
          height: 600,
          alt: `Logo de WikiStars5`,
        },
      ],
    },
  };
}


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
