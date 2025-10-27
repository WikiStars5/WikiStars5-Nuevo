
import { Suspense } from 'react';
import FigureDetailClient from './client-page';
import { Skeleton } from '@/components/ui/skeleton';
import { getSdks } from '@/firebase/server';
import type { Metadata, ResolvingMetadata } from 'next';
import type { Figure } from '@/lib/types';

type Props = {
  params: { id: string }
  searchParams: { [key: string]: string | string[] | undefined }
}

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const figureId = params.id;
  const { firestore } = getSdks();

  try {
    const figureRef = firestore.collection('figures').doc(figureId);
    const figureDoc = await figureRef.get();

    if (!figureDoc.exists) {
      // Devolver metadatos genéricos si no se encuentra el perfil
      return {
        title: 'Perfil no encontrado | WikiStars5',
        description: 'El perfil que buscas no existe o fue eliminado.',
      };
    }

    const figure = figureDoc.data() as Figure;
    const previousImages = (await parent).openGraph?.images || [];

    const title = `${figure.name} | WikiStars5`;
    const description = `Mira el perfil de ${figure.name} en WikiStars5. Vota, comenta y descubre lo que otros piensan.`;
    const imageUrl = figure.imageUrl;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        images: imageUrl ? [imageUrl, ...previousImages] : [...previousImages],
        url: `/figures/${figureId}`,
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: imageUrl ? [imageUrl] : [],
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


export default async function FigureDetailPage({ params }: { params: { id: string } }) {
  // Data fetching is now handled on the client side.
  // We just pass the figure ID to the client component.
  // We extract the 'id' from 'params' here to align with Next.js best practices.
  const { id } = params;
  return (
    <Suspense fallback={<FigureDetailSkeleton />}>
      <FigureDetailClient figureId={id} />
    </Suspense>
  );
}
