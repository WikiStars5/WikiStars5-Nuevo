
import { Suspense } from 'react';
import FigureDetailClient from './client-page';
import { Skeleton } from '@/components/ui/skeleton';
import { getSdks } from '@/firebase/server';
import type { Metadata, ResolvingMetadata } from 'next';
import type { Figure } from '@/lib/types';

type FigurePageProps = {
  params: { id: string };
};

export async function generateMetadata(
  { params }: FigurePageProps,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { id: figureId } = params;
  const { firestore } = getSdks();

  try {
    const figureRef = firestore.collection('figures').doc(figureId);
    const figureDoc = await figureRef.get();

    if (!figureDoc.exists) {
      return {
        title: 'Figura no encontrada',
      };
    }

    const figure = figureDoc.data() as Figure;
    
    const description = figure.occupation
      ? `${figure.occupation}. Explora el perfil, opiniones y calificaciones de ${figure.name}.`
      : `Explora el perfil, opiniones y calificaciones de ${figure.name}.`;

    const previousImages = (await parent).openGraph?.images || [];

    return {
      title: `Perfil de ${figure.name} | WikiStars5`,
      description: description,
      openGraph: {
        title: `Perfil de ${figure.name} | WikiStars5`,
        description: description,
        url: `https://wikistars5.co/figures/${figureId}`,
        images: [
          {
            url: figure.imageUrl || 'https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/logo%2Flogodia.png?alt=media&token=fb7367da-8db6-4f1d-a1f0-d03f57e6b9f6',
            width: 800,
            height: 600,
            alt: `Imagen de ${figure.name}`,
          },
          ...previousImages,
        ],
        type: 'website',
      },
       twitter: {
        card: 'summary_large_image',
        title: `Perfil de ${figure.name} | WikiStars5`,
        description: description,
        images: [figure.imageUrl || 'https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/logo%2Flogodia.png?alt=media&token=fb7367da-8db6-4f1d-a1f0-d03f57e6b9f6'],
      },
    };
  } catch (error) {
    console.error("Error generating metadata:", error);
    return {
      title: 'Error | WikiStars5',
      description: 'Ocurrió un error al cargar la información del perfil.',
    };
  }
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
