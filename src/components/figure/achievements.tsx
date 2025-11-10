'use client';

import { useState, useEffect, useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit, where } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, Award, Users } from 'lucide-react';
import type { UserAchievement, Figure, User } from '@/lib/types';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';

interface AchievementsProps {
    figure: Figure;
}

const PIONEER_IMAGE_URL = "https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/LOGROS%2Fpionero.png?alt=media&token=6cd4c34e-38d1-4a47-8c08-7c96b5533ecf";
const RECRUITER_IMAGE_URL = "https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/LOGROS%2Freclutador.png?alt=media&token=b389cd59-d524-4fdd-94f7-3994ec5694f5";

const PIONEER_TOTAL_LIMIT = 1000;
const RECRUITER_DISPLAY_LIMIT = 10;
const PIONEER_DISPLAY_LIMIT = 10;


const getTrophyColor = (rank: number) => {
    if (rank === 0) return 'text-yellow-400';
    if (rank === 1) return 'text-gray-400';
    if (rank === 2) return 'text-yellow-600';
    return 'text-muted-foreground';
};

function AchievementList({ achievements, limit: displayLimit, type }: { achievements: UserAchievement[], limit: number, type: string }) {
    
    const filteredAchievements = useMemo(() => {
        return achievements
            .filter(ach => ach.achievementId === type)
            .sort((a, b) => a.unlockedAt.toMillis() - b.unlockedAt.toMillis())
            .slice(0, displayLimit);
    }, [achievements, displayLimit, type]);


    if (filteredAchievements.length === 0) {
        return <p className="text-sm text-muted-foreground text-center py-4">Aún no hay ganadores. ¡Participa para ser el primero!</p>;
    }

    return (
        <div className="space-y-1">
            {filteredAchievements.map((achievement, index) => (
                <div key={achievement.userId} className="flex items-center justify-between rounded-lg p-2 hover:bg-muted/50">
                    <div className="flex items-center gap-3">
                        <Trophy className={cn("h-5 w-5", getTrophyColor(index))} />
                        <Link href={`/u/${achievement.userDisplayName}`} className="flex items-center gap-3 group">
                            <Avatar className="h-10 w-10">
                                <AvatarImage src={achievement.userPhotoURL ?? undefined} alt={achievement.userDisplayName} />
                                <AvatarFallback>{achievement.userDisplayName?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="font-semibold text-sm group-hover:underline">{achievement.userDisplayName}</p>
                                <p className="text-xs text-muted-foreground">Desbloqueado el {achievement.unlockedAt.toDate().toLocaleDateString()}</p>
                            </div>
                        </Link>
                    </div>
                </div>
            ))}
        </div>
    );
}


export default function Achievements({ figure }: AchievementsProps) {
    const firestore = useFirestore();

    const allAchievementsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, `figures/${figure.id}/achievements`));
    }, [firestore, figure.id]);

    const { data: allAchievements, isLoading } = useCollection<UserAchievement>(allAchievementsQuery);

    const { pioneerCount, recruiterCount } = useMemo(() => {
        if (!allAchievements) {
            return { pioneerCount: 0, recruiterCount: 0 };
        }
        const pioneerCount = allAchievements.filter(a => a.achievementId === 'pioneer_voter').length;
        const recruiterCount = allAchievements.filter(a => a.achievementId === 'recruiter').length;
        return { pioneerCount, recruiterCount };
    }, [allAchievements]);


    return (
        <Card className="dark:bg-black">
            <CardHeader>
                <CardTitle>Logros de la Comunidad</CardTitle>
                <CardDescription className="text-muted-foreground">Reconocimientos especiales obtenidos por los usuarios en este perfil.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-4">
                 <Dialog>
                    <DialogTrigger asChild>
                         <button className="flex flex-col items-center justify-center gap-2 p-4 rounded-lg border-2 border-dashed w-48 h-48 text-center hover:border-primary hover:bg-primary/5 transition-colors">
                             <Image
                                src={PIONEER_IMAGE_URL}
                                alt="Logro de Pionero"
                                width={80}
                                height={80}
                            />
                            <p className="font-bold">Pionero</p>
                            {isLoading ? (
                                <Skeleton className="h-4 w-20" />
                            ) : (
                                <p className="text-xs text-muted-foreground">{pioneerCount} / {PIONEER_TOTAL_LIMIT} Ganadores</p>
                            )}
                         </button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Ganadores del Logro "Pionero"</DialogTitle>
                            <DialogDescription>
                                El logro se otorga a los primeros {PIONEER_TOTAL_LIMIT} usuarios en votar. Aquí se muestra el Top {PIONEER_DISPLAY_LIMIT}.
                            </DialogDescription>
                        </DialogHeader>
                        {isLoading ? (
                           <div className="space-y-2">
                                {Array.from({ length: 3 }).map((_, i) => (
                                    <div key={i} className="flex items-center justify-between p-2">
                                        <div className="flex items-center gap-3">
                                            <Skeleton className="h-5 w-5" />
                                            <Skeleton className="h-10 w-10 rounded-full" />
                                            <div className="space-y-1">
                                                <Skeleton className="h-4 w-24" />
                                                <Skeleton className="h-3 w-32" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                           <AchievementList achievements={allAchievements || []} limit={PIONEER_DISPLAY_LIMIT} type="pioneer_voter" />
                        )}
                    </DialogContent>
                </Dialog>

                 <Dialog>
                    <DialogTrigger asChild>
                         <button className="flex flex-col items-center justify-center gap-2 p-4 rounded-lg border-2 border-dashed w-48 h-48 text-center hover:border-primary hover:bg-primary/5 transition-colors">
                             <Image
                                src={RECRUITER_IMAGE_URL}
                                alt="Logro de Reclutador"
                                width={80}
                                height={80}
                            />
                            <p className="font-bold">Reclutador</p>
                             {isLoading ? (
                                <Skeleton className="h-4 w-20" />
                            ) : (
                                <p className="text-xs text-muted-foreground">{recruiterCount} Ganadores</p>
                            )}
                         </button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Ganadores del Logro "Reclutador"</DialogTitle>
                            <DialogDescription>
                                Se otorga a quienes traen nuevos usuarios a votar a este perfil. Aquí se muestra el Top {RECRUITER_DISPLAY_LIMIT}.
                            </DialogDescription>
                        </DialogHeader>
                          {isLoading ? (
                           <div className="space-y-2">
                                {Array.from({ length: 3 }).map((_, i) => (
                                    <div key={i} className="flex items-center justify-between p-2">
                                        <div className="flex items-center gap-3">
                                            <Skeleton className="h-5 w-5" />
                                            <Skeleton className="h-10 w-10 rounded-full" />
                                            <div className="space-y-1">
                                                <Skeleton className="h-4 w-24" />
                                                <Skeleton className="h-3 w-32" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                           <AchievementList achievements={allAchievements || []} limit={RECRUITER_DISPLAY_LIMIT} type="recruiter" />
                        )}
                    </DialogContent>
                </Dialog>
            </CardContent>
        </Card>
    );
}