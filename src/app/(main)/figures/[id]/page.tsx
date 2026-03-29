
import { Suspense } from 'react';
import FigureDetailClient from './client-page';
import { Skeleton } from '@/components/ui/skeleton';
import type { Metadata } from 'next';
import { getSdks } from '@/firebase/server';
import type { Figure } from '@/lib/types';
import { unstable_cache as cache } from 'next/cache';

type FigurePageProps = {
  params: { id: string };
  searchParams: { [key: string]: string | string[] | undefined };
};

/**
 * Serializes Firestore Admin data for client components.
 */
function serializeFigure(id: string, data: any): Figure {
  return {
    ...data,
    id,
    createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
    updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
  } as unknown as Figure;
}

/**
 * Cached function to get figure data using Firebase Admin SDK.
 * Wraps Admin SDK calls in cache to reduce Firestore reads on high traffic.
 */
const getFigureData = cache(
  async (figureId: string): Promise<Figure | null> => {
    try {
      const { firestore } = getSdks();
      const docSnap = await firestore.collection('figures').doc(figureId).get();
      
      if (docSnap.exists) {
        return serializeFigure(docSnap.id, docSnap.data());
      }
      return null;
    } catch (error) {
      console.error(`Error fetching figure metadata for ${figureId}:`, error);
      return null;
    }
  },
  ['figure-data-single'],
  { revalidate: 300 } // Cache for 5 minutes
);


// Generate dynamic metadata for SEO and social sharing (WhatsApp, FB, X)
export async function generateMetadata({ params, searchParams }: FigurePageProps): Promise<Metadata> {
  const { id } = params;

  const figure = await getFigureData(id);
  
  // Clean fallback name if figure is not found
  const figureName = figure?.name || id.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

  const shareType = searchParams.shareType as string | undefined;
  const emotion = searchParams.emotion as string | undefined;
  const attitude = searchParams.attitude as string | undefined;
  const rating = searchParams.rating as string | undefined;
  
  let title = `Perfil de ${figureName} - Starryz5`;
  let description = `Explora el perfil, las opiniones y las calificaciones de ${figureName} en Starryz5. El YELP de las celebridades.`;
  
  // Default Starryz5 logo for fallback
  const defaultImageUrl = 'https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/logo%2Festrellados%20(3).jpg?alt=media&token=4c5ff945-b737-4bd6-bb41-98b609c654c9';
  
  let imageUrl = figure?.imageUrl || defaultImageUrl;
  let imageAlt = figure?.name || 'Starryz5';

  if (shareType === 'emotion' && emotion) {
      const emotionText = emotion.charAt(0).toUpperCase() + emotion.slice(1);
      title = `${figureName} me genera ${emotionText}. ¿Y a ti?`;
      description = `Descubre qué emociones genera ${figureName} en los demás. Entra, vota y comenta en Starryz5.`;
  } else if (shareType === 'attitude' && attitude) {
      const attitudeText = attitude.charAt(0).toUpperCase() + attitude.slice(1);
      title = `Soy ${attitudeText} de ${figureName}. ¿Cuál es tu actitud?`;
      description = `Define tu actitud hacia ${figureName} y ve lo que piensa la comunidad. ¡Vota ahora en Starryz5!`;
  } else if (shareType === 'rating' && rating) {
      title = `¡Califiqué a ${figureName} con ${rating} ${parseInt(rating) > 1 ? 'estrellas' : 'estrella'}!`;
      description = `¿Estás de acuerdo con mi calificación? Entra a Starryz5, deja tu propia reseña y únete al debate.`;
  }

  return {
    title: title,
    description: description,
    openGraph: {
      siteName: 'Starryz5',
      title: title,
      description: description,
      url: `https://starryz5.com/figures/${id}`,
      type: 'profile',
      images: [
        {
          url: imageUrl,
          width: 800,
          height: 600,
          alt: imageAlt,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: title,
      description: description,
      images: [imageUrl],
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}


function FigureDetailSkeleton() {
  return (
    <div className="container mx-auto max-w-4xl px-4 pb-8 pt-0 md:pb-16 md:pt-0">
      <div className="h-[250px] md:h-[320px] w-full rounded-lg bg-muted animate-pulse mb-6" />
      <div className="mt-6">
        <Skeleton className="h-10 w-full mb-4" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
}


export default async function FigureDetailPage({ params }: FigurePageProps) {
  const { id } = params;
  const initialFigure = await getFigureData(id);

  return (
    <Suspense fallback={<FigureDetailSkeleton />}>
      <FigureDetailClient figureId={id} initialFigure={initialFigure} />
    </Suspense>
  );
}
