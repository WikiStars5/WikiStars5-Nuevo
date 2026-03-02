
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
 * Cached function to get figure data using Firebase Admin SDK.
 * This is optimized for Server Components and SEO.
 */
const getFigureData = cache(
  async (figureId: string): Promise<Figure | null> => {
    try {
      const { firestore } = getSdks();
      // Using Admin SDK syntax: .collection().doc().get()
      const figureRef = firestore.collection('figures').doc(figureId);
      const docSnap = await figureRef.get();
      
      if (docSnap.exists) {
        return { id: docSnap.id, ...docSnap.data() } as Figure;
      }
      return null;
    } catch (error) {
      console.error(`Error fetching figure metadata for ${figureId}:`, error);
      return null;
    }
  },
  ['figure-data'],
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
  
  let title = `Perfil de ${figureName} - WikiStars5`;
  let description = `Explora el perfil, las opiniones y las calificaciones de ${figureName} en WikiStars5. El YELP de las celebridades.`;
  
  // Default WikiStars5 logo for fallback
  const defaultImageUrl = 'https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/logo%2Flogodia.png?alt=media&token=fb7367da-8db6-4f1d-a1f0-d03f57e6b9f6';
  
  // Crucial: Extract the actual profile image URL
  let imageUrl = figure?.imageUrl || defaultImageUrl;
  let imageAlt = figure?.name || 'WikiStars5';

  // Customize title and description based on share intent
  if (shareType === 'emotion' && emotion) {
      const emotionText = emotion.charAt(0).toUpperCase() + emotion.slice(1);
      title = `${figureName} me genera ${emotionText}. ¿Y a ti?`;
      description = `Descubre qué emociones genera ${figureName} en los demás. Entra, vota y comenta en WikiStars5.`;
  } else if (shareType === 'attitude' && attitude) {
      const attitudeText = attitude.charAt(0).toUpperCase() + attitude.slice(1);
      title = `Soy ${attitudeText} de ${figureName}. ¿Cuál es tu actitud?`;
      description = `Define tu actitud hacia ${figureName} y ve lo que piensa la comunidad. ¡Vota ahora en WikiStars5!`;
  } else if (shareType === 'rating' && rating) {
      title = `¡Califiqué a ${figureName} con ${rating} ${parseInt(rating) > 1 ? 'estrellas' : 'estrella'}!`;
      description = `¿Estás de acuerdo con mi calificación? Entra a WikiStars5, deja tu propia reseña y únete al debate.`;
  }

  return {
    title: title,
    description: description,
    openGraph: {
      siteName: 'WikiStars5',
      title: title,
      description: description,
      url: `https://wikistars5.com/figures/${id}`,
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
