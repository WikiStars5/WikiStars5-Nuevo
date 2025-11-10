'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDocs, doc, getDoc, orderBy, collectionGroup } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Figure, AttitudeVote, EmotionVote, Streak, UserAchievement } from '@/lib/types';
import { cn } from '@/lib/utils';
import { isDateActive } from '@/lib/streaks';
import { Star, Smile, Meh, Frown, AlertTriangle, ThumbsDown, Angry, Flame, Heart, Trophy, Award } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';


interface FetchedVote {
  figureId: string;
  vote: string;
}

interface FetchedStreak extends Streak {
  figureData?: Figure;
}

interface FetchedAchievement extends UserAchievement {
    figureData?: Figure;
}

interface GroupedAchievements {
    [figureId: string]: {
        figureData?: Figure; // Optional if global
        achievements: UserAchievement[];
    }
}

interface UserActivityProps {
    userId: string;
}

const attitudeOptions = [
  { id: 'neutral', label: 'Neutral', icon: Meh },
  { id: 'fan', label: 'Fan', icon: Star },
  { id: 'simp', label: 'Simp', icon: Heart },
  { id: 'hater', label: 'Hater', icon: ThumbsDown },
];

const emotionOptions = [
  { id: 'alegria', label: 'Alegría', icon: Smile },
  { id: 'envidia', label: 'Envidia', icon: Meh },
  { id: 'tristeza', label: 'Tristeza', icon: Frown },
  { id: 'miedo', label: 'Miedo', icon: AlertTriangle },
  { id: 'desagrado', label: 'Desagrado', icon: ThumbsDown },
  { id: 'furia', label: 'Furia', icon: Angry },
];

const PIONEER_ACHIEVEMENT = {
    id: 'pioneer_voter',
    name: 'Pionero',
    imageUrl: 'https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/LOGROS%2Fpionero.png?alt=media&token=6cd4c34e-38d1-4a47-8c08-7c96b5533ecf'
};

const RECRUITER_ACHIEVEMENTS = {
    recruiter_bronze: { name: 'Reclutador de Bronce', imageUrl: 'https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/LOGROS%2F2.png?alt=media&token=6bfc89ae-e6a8-4401-82eb-5928bfdaf783' },
    recruiter_silver: { name: 'Reclutador de Plata', imageUrl: 'https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/LOGROS%2F5.png?alt=media&token=aab6061e-ec0b-48b6-8262-3489f104b067' },
    recruiter_gold: { name: 'Reclutador de Oro', imageUrl: 'https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/LOGROS%2F10.png?alt=media&token=d6aa20e2-2b79-4dbf-bf3a-2d646bc59565' },
};


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
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 py-4">
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
    return (
        <div className="text-center py-8">
            <Flame className="mx-auto h-12 w-12 text-muted-foreground/30" />
            <h3 className="mt-2 text-md font-semibold">Aún no tienes rachas activas</h3>
            <p className="mt-1 text-sm text-muted-foreground">
                Gana rachas dejando un comentario o respondiendo a uno en cualquier perfil durante días consecutivos.
            </p>
        </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 py-4">
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

function AchievementsDisplay({ achievements }: { achievements: GroupedAchievements }) {
    const figureIds = Object.keys(achievements);

    if (figureIds.length === 0) {
        return (
            <div className="text-center py-8">
                <Trophy className="mx-auto h-12 w-12 text-muted-foreground/30" />
                <h3 className="mt-2 text-md font-semibold">Aún no tienes logros</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                    ¡Sé el primero en votar o refiere amigos para ganar logros!
                </p>
            </div>
        );
    }
    
    return (
         <Accordion type="single" collapsible className="w-full space-y-2">
            {figureIds.map(figureId => {
                const item = achievements[figureId];
                const isGlobal = figureId === 'global';

                if (!item.figureData && !isGlobal) return null;
                
                const TriggerContent = () => (
                    <div className="flex items-center gap-3">
                        {isGlobal ? (
                            <Award className="h-10 w-10 p-2 rounded-full bg-muted text-primary" />
                        ) : (
                            <Image
                                src={item.figureData!.imageUrl}
                                alt={item.figureData!.name}
                                width={40}
                                height={40}
                                className="rounded-full object-cover aspect-square"
                            />
                        )}
                        <span className="font-semibold">{isGlobal ? 'Logros Globales' : item.figureData!.name}</span>
                    </div>
                )

                return (
                    <AccordionItem key={figureId} value={figureId} className="border-b-0">
                       <AccordionTrigger className="p-3 rounded-lg border bg-card hover:bg-muted/50 data-[state=open]:bg-muted/50 data-[state=open]:rounded-b-none">
                            <TriggerContent />
                       </AccordionTrigger>
                       <AccordionContent className="p-4 border border-t-0 rounded-b-lg">
                           <div className="flex flex-col gap-2">
                            {item.achievements.map(ach => {
                                let achievementMeta = null;
                                if (ach.achievementId === PIONEER_ACHIEVEMENT.id) {
                                    achievementMeta = PIONEER_ACHIEVEMENT;
                                } else if (Object.keys(RECRUITER_ACHIEVEMENTS).includes(ach.achievementId)) {
                                     achievementMeta = RECRUITER_ACHIEVEMENTS[ach.achievementId as keyof typeof RECRUITER_ACHIEVEMENTS];
                                }

                                if (achievementMeta) {
                                    return (
                                        <div key={ach.id} className="flex items-center gap-3">
                                            <Image src={achievementMeta.imageUrl} alt={achievementMeta.name} width={40} height={40} />
                                            <div>
                                                <p className="font-semibold">{achievementMeta.name}</p>
                                                <p className="text-xs text-muted-foreground">Desbloqueado el {ach.unlockedAt.toDate().toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                    )
                                }
                                return null;
                            })}
                           </div>
                       </AccordionContent>
                    </AccordionItem>
                )
            })}
        </Accordion>
    )

}

export default function UserActivity({ userId }: UserActivityProps) {
  const firestore = useFirestore();
  const [isLoading, setIsLoading] = useState(true);
  const [attitudeVotes, setAttitudeVotes] = useState<FetchedVote[]>([]);
  const [emotionVotes, setEmotionVotes] = useState<FetchedVote[]>([]);
  const [streaks, setStreaks] = useState<FetchedStreak[]>([]);
  const [achievements, setAchievements] = useState<GroupedAchievements>({});
  const [figures, setFigures] = useState<Map<string, Figure>>(new Map());

  useEffect(() => {
    const fetchData = async () => {
        if (!firestore || !userId) return;
        setIsLoading(true);
        
        try {
            // Fetch all data types in parallel
            const attitudeQuery = query(collectionGroup(firestore, 'attitudeVotes'), where('userId', '==', userId));
            const emotionQuery = query(collectionGroup(firestore, 'emotionVotes'), where('userId', '==', userId));
            const streaksQuery = query(collection(firestore, 'users', userId, 'streaks'), orderBy('currentStreak', 'desc'));
            const achievementsQuery = query(collection(firestore, 'users', userId, 'user_achievements'), orderBy('unlockedAt', 'desc'));

            const [
                attitudeSnapshot, 
                emotionSnapshot, 
                streaksSnapshot,
                achievementsSnapshot
            ] = await Promise.all([
                getDocs(attitudeQuery),
                getDocs(emotionQuery),
                getDocs(streaksQuery),
                getDocs(achievementsQuery)
            ]);

            const attitudes = attitudeSnapshot.docs.map(d => d.data() as AttitudeVote);
            const emotions = emotionSnapshot.docs.map(d => d.data() as EmotionVote);
            const allStreaks = streaksSnapshot.docs.map(d => ({ ...d.data(), id: d.id } as Streak));
            const allAchievements = achievementsSnapshot.docs.map(d => ({ ...d.data(), id: d.id } as UserAchievement));

            const activeStreaks = allStreaks.filter(s => s.lastCommentDate && isDateActive(s.lastCommentDate));
            
            setAttitudeVotes(attitudes);
            setEmotionVotes(emotions);
            
            const figureIds = new Set<string>();
            attitudes.forEach(v => figureIds.add(v.figureId));
            emotions.forEach(v => figureIds.add(v.figureId));
            activeStreaks.forEach(s => figureIds.add(s.figureId));
            allAchievements.forEach(a => {
                if (a.figureId !== 'global') {
                    figureIds.add(a.figureId)
                }
            });
            
            const figureDataMap = await fetchFigureData(firestore, Array.from(figureIds));
            setFigures(figureDataMap);

            const streaksWithData = activeStreaks.map(streak => ({
                ...streak,
                figureData: figureDataMap.get(streak.figureId),
            }));
            setStreaks(streaksWithData);
            
            const groupedAchievements = allAchievements.reduce((acc, ach) => {
                const key = ach.figureId || 'global';
                 if (!acc[key]) {
                    const figureData = key !== 'global' ? figureDataMap.get(key) : undefined;
                     acc[key] = { figureData, achievements: [] };
                }
                 if (acc[key]) {
                    acc[key].achievements.push(ach);
                }
                return acc;
            }, {} as GroupedAchievements);

            setAchievements(groupedAchievements);


        } catch (error) {
            console.error("Failed to fetch user activity:", error);
        } finally {
            setIsLoading(false);
        }
    };

    fetchData();
  }, [userId, firestore]);

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
        <CardTitle>Actividad del Usuario</CardTitle>
        <CardDescription>Un resumen de las interacciones del usuario en la plataforma.</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="attitudes" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="attitudes">Actitud</TabsTrigger>
            <TabsTrigger value="emotions">Emociones</TabsTrigger>
            <TabsTrigger value="streaks">Rachas</TabsTrigger>
            <TabsTrigger value="achievements">Logros</TabsTrigger>
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
           <TabsContent value="achievements" className="mt-4">
             <AchievementsDisplay achievements={achievements} />
          </TabsContent>

        </Tabs>
      </CardContent>
    </Card>
  );
}
