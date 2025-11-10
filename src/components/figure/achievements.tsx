
'use client';

import { useState, useEffect } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit, where } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy } from 'lucide-react';
import type { UserAchievement } from '@/lib/types';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import Link from 'next/link';

interface AchievementsProps {
    figureId: string;
}

const PIONEER_IMAGE_URL = "https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/LOGROS%2Fpionero.png?alt=media&token=6cd4c34e-38d1-4a47-8c08-7c96b5533ecf";

const AchievementItemSkeleton = () => (
    <div className="flex items-center justify-between p-2">
        <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-32" />
            </div>
        </div>
        <Skeleton className="h-10 w-10" />
    </div>
);

export default function Achievements({ figureId }: AchievementsProps) {
    const firestore = useFirestore();

    const achievementsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(
            collection(firestore, `figures/${figureId}/achievements`),
            where('achievementId', '==', 'pioneer_voter'),
            orderBy('unlockedAt', 'asc'),
            limit(10) // Limit to the first 10 pioneers
        );
    }, [firestore, figureId]);

    const { data: pioneers, isLoading } = useCollection<UserAchievement>(achievementsQuery);

    return (
        <Card className="dark:bg-black">
            <CardHeader>
                <CardTitle>Logros de la Comunidad</CardTitle>
                <CardDescription className="text-muted-foreground">Reconocimientos especiales obtenidos por los usuarios en este perfil.</CardDescription>
            </CardHeader>
            <CardContent>
                <h3 className="font-semibold text-lg mb-2">Pioneros</h3>
                <p className="text-sm text-muted-foreground mb-4">Los primeros 10 usuarios que votaron en este perfil.</p>
                {isLoading ? (
                    <div className="space-y-2">
                        {Array.from({ length: 3 }).map((_, i) => <AchievementItemSkeleton key={i} />)}
                    </div>
                ) : pioneers && pioneers.length > 0 ? (
                    <div className="space-y-1">
                        {pioneers.map((pioneer, index) => (
                            <div key={pioneer.userId} className="flex items-center justify-between rounded-lg p-2 hover:bg-muted/50">
                                <div className="flex items-center gap-3">
                                    <span className="font-bold text-lg w-6 text-center text-muted-foreground">{index + 1}</span>
                                    <Link href={`/u/${pioneer.userDisplayName}`} className="flex items-center gap-3 group">
                                        <Avatar className="h-10 w-10">
                                            <AvatarImage src={pioneer.userPhotoURL ?? undefined} alt={pioneer.userDisplayName} />
                                            <AvatarFallback>{pioneer.userDisplayName.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-semibold text-sm group-hover:underline">{pioneer.userDisplayName}</p>
                                            <p className="text-xs text-muted-foreground">Desbloqueado el {pioneer.unlockedAt.toDate().toLocaleDateString()}</p>
                                        </div>
                                    </Link>
                                </div>
                                <Image
                                    src={PIONEER_IMAGE_URL}
                                    alt="Logro de Pionero"
                                    width={40}
                                    height={40}
                                />
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-center text-muted-foreground py-6">
                        Aún no hay pioneros. ¡Sé el primero en votar!
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
