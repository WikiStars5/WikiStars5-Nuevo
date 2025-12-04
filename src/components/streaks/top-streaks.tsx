
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
import { countries } from '@/lib/countries';
import Link from 'next/link';
import { isDateActive } from '@/lib/streaks';
import { useLanguage } from '@/context/LanguageContext';


interface TopStreaksProps {
    figureId: string;
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
    const { t } = useLanguage();
    const [topStreaks, setTopStreaks] = useState<Streak[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchStreaks = async () => {
            if (!firestore) return;
            setIsLoading(true);
            try {
                // Query the new public subcollection within the figure document.
                const streaksQuery = query(
                    collection(firestore, `figures/${figureId}/streaks`),
                    orderBy('currentStreak', 'desc')
                );
                
                const snapshot = await getDocs(streaksQuery);
                const allStreaks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Streak));

                // Filter for active streaks and limit to 10
                const activeStreaks = allStreaks
                    .filter(streak => isDateActive(streak.lastCommentDate))
                    .slice(0, 10);
                
                setTopStreaks(activeStreaks);

            } catch (error) {
                console.error("Failed to fetch top streaks:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchStreaks();
    }, [firestore, figureId]);

    return (
        <Card className="dark:bg-black">
            <CardHeader>
                <CardTitle>{t('TopStreaks.title')}</CardTitle>
                <CardDescription className="text-muted-foreground">{t('TopStreaks.description')}</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="space-y-2">
                        {Array.from({ length: 3 }).map((_, i) => <StreakItemSkeleton key={i} />)}
                    </div>
                ) : topStreaks.length > 0 ? (
                    <div className="space-y-1">
                        {topStreaks.map((streak, index) => {
                             const countryData = streak.userCountry ? countries.find(c => t(`countries.${c.key}`) === streak.userCountry) : null;
                            return (
                                <div key={streak.userId} className="flex items-center justify-between rounded-lg p-2 hover:bg-muted/50">
                                    <div className="flex items-center gap-3">
                                        <Trophy className={cn("h-5 w-5", getTrophyColor(index))} />
                                        <Link href={`/u/${streak.userDisplayName}`} className="flex items-center gap-3 group">
                                            <Avatar className="h-10 w-10">
                                                <AvatarImage src={streak.userPhotoURL ?? undefined} alt={streak.userDisplayName} />
                                                <AvatarFallback>{streak.userDisplayName.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="font-semibold text-sm group-hover:underline">{streak.userDisplayName}</p>
                                                    {streak.userGender === 'Masculino' && <span className="text-blue-400 font-bold" title="Masculino">♂</span>}
                                                    {streak.userGender === 'Femenino' && <span className="text-pink-400 font-bold" title="Femenino">♀</span>}
                                                    {countryData && (
                                                        <Image
                                                            src={`https://flagcdn.com/w20/${countryData.code.toLowerCase()}.png`}
                                                            alt={countryData.name}
                                                            width={20}
                                                            height={15}
                                                            className="object-contain"
                                                            title={countryData.name}
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                        </Link>
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
                            );
                        })}
                    </div>
                ) : (
                    <p className="text-center text-muted-foreground py-6">
                        {t('TopStreaks.noStreaks')}
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
