'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useUser, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { collection, query, where, getDocs, doc, getDoc, orderBy, collectionGroup } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Figure, AttitudeVote, EmotionVote, Streak } from '@/lib/types';
import { cn } from '@/lib/utils';
import { isDateActive } from '@/lib/streaks';
import { Star, Smile, Meh, Frown, AlertTriangle, ThumbsDown, Angry, Flame, Heart, Trophy, Award } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useLanguage } from '@/context/LanguageContext';
import { Button } from '../ui/button';


// The fetched votes will now contain the denormalized data
interface FetchedVote extends AttitudeVote {
  figureName?: string;
  figureImageUrl?: string;
}

interface FetchedStreak extends Streak {
  figureData?: Figure;
}

interface UserActivityProps {
    userId: string;
}

const INITIAL_VOTE_LIMIT = 4;
const VOTE_INCREMENT = 4;

function ActivityDisplay({ votes, category }: { votes: FetchedVote[], category: string }) {
    const { t } = useLanguage();
    const [visibleCount, setVisibleCount] = useState(INITIAL_VOTE_LIMIT);

    if (!votes || votes.length === 0) {
        return <p className="text-sm text-muted-foreground text-center py-8">{t('UserActivity.noVotes').replace('{category}', category)}</p>;
    }
    
    const visibleVotes = votes.slice(0, visibleCount);
    const hasMore = votes.length > visibleCount;

    return (
        <div className="py-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {visibleVotes.map((vote) => {
                    if (!vote.figureName) return null; // Skip if denormalized data is missing
                    return (
                        <Link key={vote.figureId} href={`/figures/${vote.figureId}`} className="flex flex-col items-center gap-2 text-center group">
                            <Image 
                              src={vote.figureImageUrl || 'https://placehold.co/64x64'} 
                              alt={vote.figureName} 
                              width={64} 
                              height={64} 
                              className="rounded-full object-cover aspect-square border-2 border-transparent group-hover:border-primary transition-colors" 
                            />
                            <span className="text-xs font-medium group-hover:text-primary transition-colors">{vote.figureName}</span>
                        </Link>
                    );
                })}
            </div>
            {hasMore && (
                <div className="text-center mt-6">
                    <Button variant="outline" onClick={() => setVisibleCount(prev => prev + VOTE_INCREMENT)}>
                        Ver más
                    </Button>
                </div>
            )}
        </div>
    );
}

function StreaksDisplay({ streaks }: { streaks: FetchedStreak[] }) {
  const { t } = useLanguage();
  if (streaks.length === 0) {
    return (
        <div className="text-center py-8">
            <Flame className="mx-auto h-12 w-12 text-muted-foreground/30" />
            <h3 className="mt-2 text-md font-semibold">{t('UserActivity.noStreaksTitle')}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
                {t('UserActivity.noStreaksDescription')}
            </p>
        </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 py-4">
      {streaks.map((streak) => {
        if (!streak.figureName) return null;
        return (
          <Link key={streak.figureId} href={`/figures/${streak.figureId}`} className="flex flex-col items-center gap-2 text-center group relative">
            <Image src={streak.figureImageUrl || 'https://placehold.co/64x64'} alt={streak.figureName} width={64} height={64} className="rounded-full object-cover aspect-square border-2 border-transparent group-hover:border-primary transition-colors" />
            <span className="text-xs font-medium group-hover:text-primary transition-colors">{streak.figureName}</span>
            <div className="absolute top-0 right-0 flex items-center gap-1 rounded-full bg-card border px-2 py-0.5 text-xs font-bold text-orange-500">
                <span>{streak.currentStreak}</span>
                <Flame className="w-3 h-3" />
            </div>
          </Link>
        );
      })}
    </div>
  );
}


export default function UserActivity({ userId }: UserActivityProps) {
  const firestore = useFirestore();
  const { t } = useLanguage();

  const attitudeOptions = useMemo(() => [
    { id: 'neutral', label: t('AttitudeVoting.labels.neutral') },
    { id: 'fan', label: t('AttitudeVoting.labels.fan') },
    { id: 'simp', label: t('AttitudeVoting.labels.simp') },
    { id: 'hater', label: t('AttitudeVoting.labels.hater') },
  ], [t]);

  const emotionOptions = useMemo(() => [
    { id: 'alegria', label: t('EmotionVoting.labels.alegria') },
    { id: 'envidia', label: t('EmotionVoting.labels.envidia') },
    { id: 'tristeza', label: t('EmotionVoting.labels.tristeza') },
    { id: 'miedo', label: t('EmotionVoting.labels.miedo') },
    { id: 'desagrado', label: t('EmotionVoting.labels.desagrado') },
    { id: 'furia', label: t('EmotionVoting.labels.furia') },
  ], [t]);

  const attitudeQuery = useMemoFirebase(() => {
    if (!firestore || !userId) return null;
    return query(collection(firestore, 'users', userId, 'attitudeVotes'));
  }, [firestore, userId]);
  const { data: attitudeVotes, isLoading: isLoadingAttitudes } = useCollection<FetchedVote>(attitudeQuery);

  const emotionQuery = useMemoFirebase(() => {
    if (!firestore || !userId) return null;
    return query(collection(firestore, 'users', userId, 'emotionVotes'));
  }, [firestore, userId]);
  const { data: emotionVotes, isLoading: isLoadingEmotions } = useCollection<FetchedVote>(emotionQuery);
  
  const streaksQuery = useMemoFirebase(() => {
    if (!firestore || !userId) return null;
    return query(collection(firestore, 'users', userId, 'streaks'), orderBy('currentStreak', 'desc'));
  }, [firestore, userId]);
  const { data: allStreaks, isLoading: isLoadingStreaks } = useCollection<FetchedStreak>(streaksQuery);
  
  const activeStreaks = useMemo(() => {
    if (!allStreaks) return [];
    return allStreaks.filter(s => s.lastCommentDate && isDateActive(s.lastCommentDate));
  }, [allStreaks]);

  const isLoading = isLoadingAttitudes || isLoadingEmotions || isLoadingStreaks;

  if (isLoading) {
    return (
        <Card>
            <CardHeader>
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-4 w-2/3" />
            </CardHeader>
            <CardContent>
                <Skeleton className="h-32 w-full" />
            </CardContent>
        </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('UserActivity.title')}</CardTitle>
        <CardDescription>{t('UserActivity.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="attitudes" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="attitudes">{t('UserActivity.tabs.attitudes')}</TabsTrigger>
            <TabsTrigger value="emotions">{t('UserActivity.tabs.emotions')}</TabsTrigger>
            <TabsTrigger value="streaks">{t('UserActivity.tabs.streaks')}</TabsTrigger>
          </TabsList>
          
          <TabsContent value="attitudes" className="mt-4">
             <Tabs defaultValue="neutral">
                <TabsList className="grid w-full grid-cols-4">
                    {attitudeOptions.map(opt => (
                        <TabsTrigger key={opt.id} value={opt.id}>{opt.label}</TabsTrigger>
                    ))}
                </TabsList>
                {attitudeOptions.map(opt => (
                    <TabsContent key={opt.id} value={opt.id}>
                        <ActivityDisplay
                            votes={attitudeVotes?.filter(v => v.vote === opt.id) || []}
                            category={opt.label}
                        />
                    </TabsContent>
                ))}
             </Tabs>
          </TabsContent>

          <TabsContent value="emotions" className="mt-4">
             <Tabs defaultValue="alegria">
                <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6">
                    {emotionOptions.map(opt => (
                        <TabsTrigger key={opt.id} value={opt.id}>{opt.label}</TabsTrigger>
                    ))}
                </TabsList>
                 {emotionOptions.map(opt => (
                    <TabsContent key={opt.id} value={opt.id}>
                        <ActivityDisplay
                            votes={emotionVotes?.filter(v => v.vote === opt.id) || []}
                            category={opt.label}
                        />
                    </TabsContent>
                ))}
             </Tabs>
          </TabsContent>

           <TabsContent value="streaks" className="mt-4">
             <StreaksDisplay streaks={activeStreaks} />
          </TabsContent>

        </Tabs>
      </CardContent>
    </Card>
  );
}
