
import { Suspense } from 'react';
import FigureDetailClient from './client-page';
import { Skeleton } from '@/components/ui/skeleton';
import type { Metadata } from 'next';

type FigurePageProps = {
  params: { id: string };
  searchParams: { [key: string]: string | string[] | undefined };
};

// Generate dynamic metadata for SEO and social sharing
export async function generateMetadata({ params, searchParams }: FigurePageProps): Promise<Metadata> {
  const { id } = params;
  const isGoatShare = searchParams.tab === 'goat';
  
  const figureName = id
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  const title = isGoatShare ? 'Batalla del GOAT: Messi vs Ronaldo' : `Perfil de ${figureName} - WikiStars5`;
  const description = isGoatShare 
    ? 'Vota y decide quién es el mejor de todos los tiempos en WikiStars5.'
    : `Explora el perfil, las opiniones y las calificaciones de ${figureName} en WikiStars5.`;
    
  const imageUrl = isGoatShare 
    ? 'https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/goat%2FGOAR%20CUADRADO.png?alt=media&token=3a3bed2f-672a-4a9d-88ef-36a7bb867034'
    : 'https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/logo%2Flogodia.png?alt=media&token=fb7367da-8db6-4f1d-a1f0-d03f57e6b9f6';

  const imageAlt = isGoatShare ? 'Batalla del GOAT: Messi vs Ronaldo' : `Logo de WikiStars5`;

  return {
    title: title,
    description: description,
    openGraph: {
      title: title,
      description: description,
      images: [
        {
          url: imageUrl,
          width: 800,
          height: 600,
          alt: imageAlt,
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
  const { id } = params;
  return (
    <Suspense fallback={<FigureDetailSkeleton />}>
      <FigureDetailClient figureId={id} />
    </Suspense>
  );
}
