'use client';

import { useState, useEffect } from 'react';
import { useFirestore } from '@/firebase';
import { collection, query, orderBy, getDocs, where, limit, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Flame, Trophy } from 'lucide-react';
import { Streak } from '@/lib/types';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface TopStreaksProps {
    figureId: string;
}

/**
 * Checks if a Firestore Timestamp is from today or yesterday.
 */
function isDateActive(timestamp: Timestamp): boolean {
    const date = timestamp.toDate();
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    // Reset time part for accurate date comparison
    today.setHours(0, 0, 0, 0);
    yesterday.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);

    return date.getTime() === today.getTime() || date.getTime() === yesterday.getTime();
}

async function getTopStreaksForFigure(firestore: any, figureId: string): Promise<Streak[]> {
    const streaksRef = collection(firestore, `figures/${figureId}/streaks`);
    const q = query(streaksRef, orderBy('currentStreak', 'desc'));
    
    const snapshot = await getDocs(q);
    
    const allStreaks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Streak));

    // Filter for active streaks in-memory
    const activeStreaks = allStreaks.filter(streak => isDateActive(streak.lastCommentDate));
    
    // Return top 10
    return activeStreaks.slice(0, 10);
}

const getTrophyColor = (rank: number) => {
    if (rank === 0) return 'text-yellow-400';
    if (rank === 1) return 'text-gray-400';
    if (rank === 2) return 'text-yellow-600';
    return 'text-muted-foreground';
};

const StreakItemSkeleton = () => (
    <div className="flex items-center justify-between p-2">
        <div className="flex items-center gap-3">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-16" />
            </div>
        </div>
        <Skeleton className="h-6 w-12 rounded-md" />
    </div>
);

export default function TopStreaks({ figureId }: TopStreaksProps) {
    const firestore = useFirestore();
    const [topStreaks, setTopStreaks] = useState<Streak[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchStreaks = async () => {
            if (!firestore) return;
            setIsLoading(true);
            try {
                const streaks = await getTopStreaksForFigure(firestore, figureId);
                setTopStreaks(streaks);
            } catch (error) {
                console.error("Failed to fetch top streaks:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchStreaks();
    }, [firestore, figureId]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Top Rachas Activas</CardTitle>
                <CardDescription>Los usuarios con las rachas de comentarios más largas para este perfil.</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="space-y-2">
                        {Array.from({ length: 3 }).map((_, i) => <StreakItemSkeleton key={i} />)}
                    </div>
                ) : topStreaks.length > 0 ? (
                    <div className="space-y-1">
                        {topStreaks.map((streak, index) => (
                            <div key={streak.id} className="flex items-center justify-between rounded-lg p-2 hover:bg-muted/50">
                                <div className="flex items-center gap-3">
                                    <Trophy className={cn("h-5 w-5", getTrophyColor(index))} />
                                    <Avatar className="h-10 w-10">
                                        <AvatarImage src={streak.userPhotoURL ?? undefined} alt={streak.userDisplayName} />
                                        <AvatarFallback>{streak.userDisplayName.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-semibold text-sm">{streak.userDisplayName}</p>
                                        <p className="text-xs text-muted-foreground">{streak.isAnonymous ? 'Invitado' : 'Usuario Registrado'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 font-bold text-lg text-orange-500">
                                    <span>{streak.currentStreak}</span>
                                    <Image
                                        src="https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/racha%2Ffire.gif?alt=media&token=c6eefbb1-b51c-48a4-ae20-7ca8bef2cf63"
                                        alt="Streak flame"
                                        width={24}
                                        height={24}
                                        unoptimized // GIF animations are not optimized by next/image
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-center text-muted-foreground py-6">
                        Aún no hay rachas activas. ¡Sé el primero en comentar varios días seguidos!
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
