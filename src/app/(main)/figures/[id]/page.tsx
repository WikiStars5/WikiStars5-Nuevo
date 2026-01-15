
import { Suspense } from 'react';
import FigureDetailClient from './client-page';
import { Skeleton } from '@/components/ui/skeleton';
import type { Metadata } from 'next';
import { getSdks } from '@/firebase/server';
import { doc, getDoc } from 'firebase/firestore';
import type { Figure } from '@/lib/types';
import { unstable_cache as cache } from 'next/cache';

type FigurePageProps = {
  params: { id: string };
  searchParams: { [key: string]: string | string[] | undefined };
};

// Cached function to get figure data
const getFigureData = cache(
  async (figureId: string): Promise<Figure | null> => {
    try {
      const { firestore } = getSdks();
      const figureRef = doc(firestore, 'figures', figureId);
      const docSnap = await getDoc(figureRef);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Figure;
      }
      return null;
    } catch (error) {
      console.error(`Error fetching figure ${figureId}:`, error);
      return null;
    }
  },
  ['figure-data'], // Cache key prefix
  { revalidate: 300 } // Revalidate every 5 minutes (300 seconds)
);


// Generate dynamic metadata for SEO and social sharing
export async function generateMetadata({ params, searchParams }: FigurePageProps): Promise<Metadata> {
  const { id } = params;

  // Fetch the figure data using our cached function
  const figure = await getFigureData(id);
  const figureName = figure?.name || id.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

  const shareType = searchParams.shareType as string | undefined;
  const emotion = searchParams.emotion as string | undefined;
  const attitude = searchParams.attitude as string | undefined;
  const rating = searchParams.rating as string | undefined;
  const isGoatShare = searchParams.tab === 'goat';
  const vote = searchParams.vote as 'messi' | 'ronaldo' | undefined;
  
  let title = `Perfil de ${figureName} - WikiStars5`;
  let description = `Explora el perfil, las opiniones y las calificaciones de ${figureName} en WikiStars5.`;
  
  // Use the figure's specific image as the default, falling back to the logo
  let imageUrl = figure?.imageUrl || 'https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/logo%2Flogodia.png?alt=media&token=fb7367da-8db6-4f1d-a1f0-d03f57e6b9f6';
  let imageAlt = figure?.name || 'WikiStars5';

  if (isGoatShare) {
      if (vote === 'messi') {
          title = '¡Ya voté por Messi en la Batalla del GOAT!';
          description = 'Demostré mi lealtad al verdadero GOAT. Ahora te toca a ti decidir. ¡Entra y vota!';
      } else if (vote === 'ronaldo') {
          title = '¡Ya voté por Cristiano Ronaldo en la Batalla del GOAT!';
          description = 'Demostré mi lealtad al verdadero GOAT. Ahora te toca a ti decidir. ¡Entra y vota!';
      } else {
          title = 'Batalla del GOAT: Messi vs Ronaldo';
          description = 'Vota y decide quién es el mejor de todos los tiempos en WikiStars5.';
      }
      // Use the specific GOAT battle image
      imageUrl = 'https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/goat%2FGOAR%20CUADRADO.png?alt=media&token=3a3bed2f-672a-4a9d-88ef-36a7bb867034';
      imageAlt = 'Batalla del GOAT: Messi vs Ronaldo';
  } else if (shareType === 'emotion' && emotion) {
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
