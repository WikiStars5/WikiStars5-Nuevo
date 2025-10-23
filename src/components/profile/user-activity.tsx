
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDocs, doc, getDoc, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Figure, AttitudeVote, EmotionVote, Streak } from '@/lib/types';
import { cn } from '@/lib/utils';
import { isDateActive } from '@/lib/streaks';
import { Star, Smile, Meh, Frown, AlertTriangle, ThumbsDown, Angry, Flame, Heart } from 'lucide-react';


interface FetchedVote {
  figureId: string;
  vote: string;
}

interface FetchedStreak extends Streak {
  figureData?: Figure;
}

const attitudeOptions = [
  { id: 'fan', label: 'Fan', icon: Star },
  { id: 'simp', label: 'Simp', icon: Heart },
  { id: 'hater', label: 'Hater', icon: ThumbsDown },
  { id: 'neutral', label: 'Neutral', icon: Meh },
];

const emotionOptions = [
  { id: 'alegria', label: 'Alegría', icon: Smile },
  { id: 'envidia', label: 'Envidia', icon: Meh },
  { id: 'tristeza', label: 'Tristeza', icon: Frown },
  { id: 'miedo', label: 'Miedo', icon: AlertTriangle },
  { id: 'desagrado', label: 'Desagrado', icon: ThumbsDown },
  { id: 'furia', label: 'Furia', icon: Angry },
];

const fetchFigureData = async (firestore: any, figureIds: string[]): Promise<Map<string, Figure>> => {
    const figureMap = new Map<string, Figure>();
    // Firestore 'in' queries are limited to 30 items. We batch them.
    for (let i = 0; i < figureIds.length; i += 30) {
        const batchIds = figureIds.slice(i, i + 30);
        if (batchIds.length > 0) {
            const figuresQuery = query(collection(firestore, 'figures'), where('__name__', 'in', batchIds));
            const snapshot = await getDocs(figuresQuery);
            snapshot.docs.forEach(doc => {
                figureMap.set(doc.id, { id: doc.id, ...doc.data() } as Figure);
            });
        }
    }
    return figureMap;
};


function ActivityDisplay({ votes, figures, category }: { votes: FetchedVote[], figures: Map<string, Figure>, category: string }) {
    if (!votes || votes.length === 0) {
        return <p className="text-sm text-muted-foreground text-center py-8">No has votado como '{category}' por ningún perfil.</p>;
    }
    
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 py-4">
            {votes.map(({ figureId }) => {
                const figure = figures.get(figureId);
                if (!figure) return null;
                return (
                    <Link key={figure.id} href={`/figures/${figure.id}`} className="flex flex-col items-center gap-2 text-center group">
                        <Image src={figure.imageUrl} alt={figure.name} width={80} height={80} className="rounded-full object-cover aspect-square border-2 border-transparent group-hover:border-primary transition-colors" />
                        <span className="text-xs font-medium group-hover:text-primary transition-colors">{figure.name}</span>
                    </Link>
                );
            })}
        </div>
    );
}

function StreaksDisplay({ streaks }: { streaks: FetchedStreak[] }) {
  if (streaks.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">No tienes rachas activas en ningún perfil.</p>;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 py-4">
      {streaks.map((streak) => {
        const figure = streak.figureData;
        if (!figure) return null;
        return (
          <Link key={figure.id} href={`/figures/${figure.id}`} className="flex flex-col items-center gap-2 text-center group relative">
            <Image src={figure.imageUrl} alt={figure.name} width={80} height={80} className="rounded-full object-cover aspect-square border-2 border-transparent group-hover:border-primary transition-colors" />
            <span className="text-xs font-medium group-hover:text-primary transition-colors">{figure.name}</span>
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

export default function UserActivity() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [isLoading, setIsLoading] = useState(true);
  const [attitudeVotes, setAttitudeVotes] = useState<FetchedVote[]>([]);
  const [emotionVotes, setEmotionVotes] = useState<FetchedVote[]>([]);
  const [streaks, setStreaks] = useState<FetchedStreak[]>([]);
  const [figures, setFigures] = useState<Map<string, Figure>>(new Map());

  useEffect(() => {
    const fetchData = async () => {
        if (!firestore || !user) return;
        setIsLoading(true);
        
        try {
            // Fetch all votes and streaks from subcollections of the current user
            const attitudeQuery = query(collection(firestore, 'users', user.uid, 'attitudeVotes'));
            const emotionQuery = query(collection(firestore, 'users', user.uid, 'emotionVotes'));
            const streaksQuery = query(collection(firestore, 'users', user.uid, 'streaks'), orderBy('currentStreak', 'desc'));

            const [attitudeSnapshot, emotionSnapshot, streaksSnapshot] = await Promise.all([
                getDocs(attitudeQuery),
                getDocs(emotionQuery),
                getDocs(streaksQuery),
            ]);

            const attitudes = attitudeSnapshot.docs.map(d => ({...d.data(), figureId: d.id } as AttitudeVote));
            const emotions = emotionSnapshot.docs.map(d => ({...d.data(), figureId: d.id } as EmotionVote));
            const allStreaks = streaksSnapshot.docs.map(d => ({ ...d.data(), id: d.id } as Streak));

            const activeStreaks = allStreaks.filter(s => isDateActive(s.lastCommentDate));

            setAttitudeVotes(attitudes);
            setEmotionVotes(emotions);
            setStreaks(activeStreaks);

            // Collect all unique figure IDs to fetch
            const figureIds = new Set<string>();
            attitudes.forEach(v => figureIds.add(v.figureId));
            emotions.forEach(v => figureIds.add(v.figureId));
            activeStreaks.forEach(s => figureIds.add(s.id)); // Streak ID is the figure ID
            
            // Fetch figure data
            const figureDataMap = await fetchFigureData(firestore, Array.from(figureIds));

             // Add figure data to streaks
            const streaksWithData = activeStreaks.map(streak => ({
                ...streak,
                figureData: figureDataMap.get(streak.id), // The streak document ID is the figure ID
            }));

            setStreaks(streaksWithData);
            setFigures(figureDataMap);

        } catch (error) {
            console.error("Failed to fetch user activity:", error);
        } finally {
            setIsLoading(false);
        }
    };

    fetchData();
  }, [user, firestore]);

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
        <CardTitle>Mi Actividad</CardTitle>
        <CardDescription>Un resumen de tus interacciones en la plataforma.</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="attitudes" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="attitudes">Mi Actitud</TabsTrigger>
            <TabsTrigger value="emotions">Mis Emociones</TabsTrigger>
            <TabsTrigger value="streaks">Mis Rachas</TabsTrigger>
          </TabsList>
          
          <TabsContent value="attitudes" className="mt-4">
             <Tabs defaultValue="fan">
                <TabsList className="grid w-full grid-cols-4">
                    {attitudeOptions.map(opt => (
                        <TabsTrigger key={opt.id} value={opt.id}>{opt.label}</TabsTrigger>
                    ))}
                </TabsList>
                {attitudeOptions.map(opt => (
                    <TabsContent key={opt.id} value={opt.id}>
                        <ActivityDisplay
                            votes={attitudeVotes.filter(v => v.vote === opt.id)}
                            figures={figures}
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
                            votes={emotionVotes.filter(v => v.vote === opt.id)}
                            figures={figures}
                            category={opt.label}
                        />
                    </TabsContent>
                ))}
             </Tabs>
          </TabsContent>

           <TabsContent value="streaks" className="mt-4">
             <StreaksDisplay streaks={streaks} />
          </TabsContent>

        </Tabs>
      </CardContent>
    </Card>
  );
}
