'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import type { Comment, AttitudeVote, NewsItem, GalleryItem, FeaturedFigure } from '@/lib/types';
import FeaturedFigures from '@/components/shared/featured-figures';
import StarPostCard from '@/components/shared/starpost-card';
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
import { RefreshCw, Sparkles, Loader2 } from 'lucide-react';

// LAZY LOAD NON-CRITICAL COMPONENTS
const GlobalStarPostForm = dynamic(() => import('@/components/shared/global-starpost-form'), { 
  ssr: false,
  loading: () => <Skeleton className="h-40 w-full mb-8 rounded-xl" />
});
const CookieConsentBanner = dynamic(() => import('@/components/shared/cookie-consent-banner'), { ssr: false });

// PERFORMANCE CONFIG
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

export default function HomePageContent({ initialFeaturedFigures }: { initialFeaturedFigures: FeaturedFigure[] }) {
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
      
      const figuresRef = collection(firestore, 'figures');
      const qFigures = query(figuresRef, where('__name__', 'in', selectedIds));
      const figuresSnap = await getDocs(qFigures);
      const figuresMap = new Map<string, { name: string; imageUrl: string }>();
      figuresSnap.docs.forEach(d => {
        const data = d.data();
        figuresMap.set(d.id, { name: data.name, imageUrl: data.imageUrl });
      });

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

      const results = await Promise.all(contentPromises.map(p => p.catch(() => [])));
      const allNewItems = results.flat().filter(item => item && !seenItemIdsRef.current.has(item.id));
      
      const starposts = allNewItems.filter(item => item.feedType === 'starpost');
      const otherContent = allNewItems.filter(item => item.feedType !== 'starpost');

      const shuffledStarposts = shuffleArray(starposts);
      const leadStarposts = shuffledStarposts.slice(0, 3);
      const remainingStarposts = shuffledStarposts.slice(3);
      const remainingMixed = shuffleArray([...remainingStarposts, ...shuffleArray(otherContent)]);

      const finalBatch = [...leadStarposts, ...remainingMixed].slice(0, MAX_BATCH_TO_SHOW);
      finalBatch.forEach(item => seenItemIdsRef.current.add(item.id));

      if (append) {
        setFeedItems(prev => [...prev, ...finalBatch]);
      } else {
        setFeedItems(finalBatch);
      }
    } catch (error) {
      console.error("Error building dynamic feed:", error);
    } finally {
      setIsLoading(false);
      setIsAppending(false);
    }
  }, [firestore]);

  React.useEffect(() => {
    if (!isLoadingVotes) {
      // Defer feed fetching to prioritize LCP rendering
      const timer = setTimeout(() => {
        fetchFeed(activeFeedIds);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [activeFeedIds, isLoadingVotes, fetchFeed]);

  const renderContent = () => {
    if (isLoading && feedItems.length === 0) {
      return (
        <div className="space-y-8">
            {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="p-4 border rounded-xl space-y-3 animate-pulse bg-muted/10">
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

    if (feedItems.length > 0) {
      return (
        <>
            <div className="space-y-8">
                {feedItems.map((item, index) => {
                    if (item.feedType === 'starpost') return <StarPostCard key={`${item.id}-${index}`} post={item as any} />;
                    if (item.feedType === 'news') return <NewsFeedCard key={`${item.id}-${index}`} item={item as any} />;
                    if (item.feedType === 'gallery') return <GalleryFeedCard key={`${item.id}-${index}`} item={item as any} />;
                    return null;
                })}
            </div>
            <div className="mt-12 flex flex-col items-center">
                <button 
                    className="w-full py-6 flex items-center justify-center gap-3 text-lg font-bold border border-primary/20 hover:bg-primary/5 rounded-2xl shadow-sm transition-colors"
                    onClick={() => fetchFeed(activeFeedIds, true)} 
                    disabled={isAppending}
                >
                    {isAppending ? <Loader2 className="h-5 w-5 animate-spin" /> : <RefreshCw className="h-5 w-5" />}
                    {isAppending ? 'Descubriendo novedades...' : 'Explorar más contenido'}
                </button>
            </div>
        </>
      );
    }

    return null;
  };

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <FeaturedFigures initialData={initialFeaturedFigures} />
      <GlobalStarPostForm />
      <div className="min-h-[600px]">
        {renderContent()}
      </div>
      <CookieConsentBanner />
    </div>
  );
}
