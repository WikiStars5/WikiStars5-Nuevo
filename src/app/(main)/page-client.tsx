'use client';

import * as React from 'react';
import type { Comment, AttitudeVote, NewsItem, GalleryItem, Figure } from '@/lib/types';
import StarPostCard from '@/components/shared/starpost-card';
import FeaturedFigures from '@/components/shared/featured-figures';
import NewsFeedCard from '@/components/shared/news-feed-card';
import GalleryFeedCard from '@/components/shared/gallery-feed-card';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  getDocs, 
  where
} from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { RefreshCw, Sparkles, Loader2 } from 'lucide-react';
import CookieConsentBanner from '@/components/shared/cookie-consent-banner';
import GlobalStarPostForm from '@/components/shared/global-starpost-form';

// CONFIGURACIÓN DE RENDIMIENTO Y VARIEDAD
const MAX_FIGURES_TO_CONSULT = 8;
const POSTS_PER_FIGURE = 5;
const NEWS_PER_FIGURE = 3;
const PHOTOS_PER_FIGURE = 3;
const MAX_BATCH_TO_SHOW = 12;

const DEFAULT_FEED_IDS = ["rm", "kim-seok-jin", "suga-agust-d", "j-hope", "jimin", "v-cantante", "jungkook"];

type FeedItem = 
  | (Comment & { feedType: 'starpost' })
  | (NewsItem & { feedType: 'news'; figureName: string })
  | (GalleryItem & { feedType: 'gallery'; figureId: string; figureName: string; figureImageUrl: string });

function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

export default function HomePageContent({ initialFeaturedFigures }: any) {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const [feedItems, setFeedItems] = React.useState<FeedItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isAppending, setIsAppending] = React.useState(false);

  const seenItemIdsRef = React.useRef<Set<string>>(new Set());

  const attitudeVotesQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return collection(firestore, 'users', user.uid, 'attitudeVotes');
  }, [user, firestore]);

  const { data: attitudeVotes, isLoading: isLoadingVotes } = useCollection<AttitudeVote>(
    attitudeVotesQuery, 
    { enabled: !!user }
  );

  const votedFigureIds = React.useMemo(() => {
    if (!attitudeVotes) return [];
    return attitudeVotes.map(vote => vote.id); 
  }, [attitudeVotes]);
  
  const activeFeedIds = React.useMemo(() => {
    return votedFigureIds.length > 0 ? votedFigureIds : DEFAULT_FEED_IDS;
  }, [votedFigureIds]);

  const fetchFeed = React.useCallback(async (figureIds: string[], append = false) => {
    if (!firestore || figureIds.length === 0) {
      if (!append) setFeedItems([]);
      setIsLoading(false);
      return;
    }

    if (append) setIsAppending(true);
    else {
      setIsLoading(true);
      seenItemIdsRef.current.clear();
    }

    try {
      const selectedIds = shuffleArray(figureIds).slice(0, MAX_FIGURES_TO_CONSULT);
      
      // 1. Obtener datos de los personajes para nombres e imágenes
      const figuresRef = collection(firestore, 'figures');
      const qFigures = query(figuresRef, where('__name__', 'in', selectedIds));
      const figuresSnap = await getDocs(qFigures);
      const figuresMap = new Map<string, { name: string; imageUrl: string }>();
      figuresSnap.docs.forEach(d => {
        const data = d.data();
        figuresMap.set(d.id, { name: data.name, imageUrl: data.imageUrl });
      });

      // 2. Lanzar todas las promesas de contenido en paralelo
      const contentPromises = selectedIds.flatMap(id => {
        const fInfo = figuresMap.get(id) || { name: 'Figura pública', imageUrl: '' };
        
        const starpostsRef = collection(firestore, 'figures', id, 'comments');
        const newsRef = collection(firestore, 'figures', id, 'news');
        const galleryRef = collection(firestore, 'figures', id, 'gallery');

        return [
          getDocs(query(starpostsRef, orderBy('createdAt', 'desc'), limit(POSTS_PER_FIGURE))).then(snap => 
            snap.docs.map(d => ({ ...d.data(), id: d.id, feedType: 'starpost' } as FeedItem))
          ),
          getDocs(query(newsRef, orderBy('createdAt', 'desc'), limit(NEWS_PER_FIGURE))).then(snap => 
            snap.docs.map(d => ({ ...d.data(), id: d.id, feedType: 'news', figureName: fInfo.name } as FeedItem))
          ),
          getDocs(query(galleryRef, orderBy('createdAt', 'desc'), limit(PHOTOS_PER_FIGURE))).then(snap => 
            snap.docs.map(d => ({ 
              ...d.data(), 
              id: d.id, 
              feedType: 'gallery', 
              figureId: id, 
              figureName: fInfo.name, 
              figureImageUrl: fInfo.imageUrl 
            } as FeedItem))
          )
        ];
      });

      const results = await Promise.all(resultsPromises(contentPromises));
      const allNewItems = results.flat().filter(item => item && !seenItemIdsRef.current.has(item.id));
      
      // --- Lógica de prioridad de StarPosts ---
      const starposts = allNewItems.filter(item => item.feedType === 'starpost');
      const otherContent = allNewItems.filter(item => item.feedType !== 'starpost');

      const shuffledStarposts = shuffleArray(starposts);
      const shuffledOthers = shuffleArray(otherContent);

      const leadStarposts = shuffledStarposts.slice(0, 3);
      const remainingStarposts = shuffledStarposts.slice(3);

      const remainingMixed = shuffleArray([...remainingStarposts, ...shuffledOthers]);

      const finalBatch = [...leadStarposts, ...remainingMixed].slice(0, MAX_BATCH_TO_SHOW);
      
      finalBatch.forEach(item => seenItemIdsRef.current.add(item.id));

      if (append) {
        setFeedItems(prev => [...prev, ...finalBatch]);
      } else {
        setFeedItems(finalBatch);
      }
    } catch (error) {
      console.error("Error al armar el feed dinámico:", error);
    } finally {
      setIsLoading(false);
      setIsAppending(false);
    }
  }, [firestore]);

  // Helper to handle promise errors in parallel fetches
  function resultsPromises(promises: any[]) {
    return promises.map(p => p.catch((e: any) => {
        console.warn("Feed chunk failed:", e);
        return [];
    }));
  }

  React.useEffect(() => {
    if (!isLoadingVotes) {
      fetchFeed(activeFeedIds);
    }
  }, [activeFeedIds, isLoadingVotes, fetchFeed]);

  const renderContent = () => {
    const isReadyForFeed = !isUserLoading && !isLoadingVotes;
    
    if (isLoading && feedItems.length === 0) {
      return (
        <div className="space-y-8">
            {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="p-4 border rounded-xl space-y-3 animate-pulse mb-4">
                <div className="flex items-center space-x-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <Skeleton className="h-4 w-[150px]" />
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-40 w-full rounded-md" />
                </div>
            ))}
        </div>
      );
    }

    if (!isReadyForFeed) return null;
    
    if (feedItems.length > 0) {
      return (
        <>
            <div className="space-y-8">
                {feedItems.map((item, index) => {
                    if (item.feedType === 'starpost') return <StarPostCard key={`${item.id}-${index}`} post={item as Comment} />;
                    if (item.feedType === 'news') return <NewsFeedCard key={`${item.id}-${index}`} item={item as any} />;
                    if (item.feedType === 'gallery') return <GalleryFeedCard key={`${item.id}-${index}`} item={item as any} />;
                    return null;
                })}
            </div>
            
            <div className="mt-12 flex flex-col items-center">
                <Button 
                    variant="outline" 
                    className="w-full py-8 flex gap-3 text-lg font-bold border-primary/20 hover:bg-primary/5 rounded-2xl shadow-sm"
                    onClick={() => fetchFeed(activeFeedIds, true)} 
                    disabled={isAppending}
                >
                    {isAppending ? <Loader2 className="h-5 w-5 animate-spin" /> : <RefreshCw className="h-5 w-5" />}
                    {isAppending ? 'Descubriendo novedades...' : 'Explorar más contenido'}
                </Button>
                <div className="flex items-center gap-2 mt-4 text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-black">
                  <Sparkles className="h-3 w-3 text-primary" />
                  {votedFigureIds.length > 0 ? 'Mezclando tus favoritos' : 'Recomendaciones para ti'}
                </div>
            </div>
        </>
      );
    }

    return (
      <div className="text-center py-20 bg-muted/20 rounded-3xl border-2 border-dashed">
        <p className="text-lg font-medium text-muted-foreground">Tu feed está tranquilo por ahora</p>
        <p className="text-sm text-muted-foreground mb-6">¡Vota por tus figuras favoritas para ver sus novedades!</p>
      </div>
    );
  };

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <FeaturedFigures />
      <GlobalStarPostForm />
      {/* CLS Mitigation: Min-height for the feed section */}
      <div className="min-h-[600px]">
        {renderContent()}
      </div>
      <CookieConsentBanner />
    </div>
  );
}
