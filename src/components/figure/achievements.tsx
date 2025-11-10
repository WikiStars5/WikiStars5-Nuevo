
'use client';

import { useState, useEffect } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit, getCountFromServer } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy } from 'lucide-react';
import type { UserAchievement, Figure } from '@/lib/types';
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
const PIONEER_TOTAL_LIMIT = 1000;
const PIONEER_DISPLAY_LIMIT = 10;


const getTrophyColor = (rank: number) => {
    if (rank === 0) return 'text-yellow-400';
    if (rank === 1) return 'text-gray-400';
    if (rank === 2) return 'text-yellow-600';
    return 'text-muted-foreground';
};

function PioneerList({ figureId }: { figureId: string }) {
    const firestore = useFirestore();
    const pioneersQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(
            collection(firestore, `figures/${figureId}/achievements`),
            orderBy('unlockedAt', 'asc'),
            limit(PIONEER_DISPLAY_LIMIT) // Only fetch the top 10 to display
        );
    }, [firestore, figureId]);

    const { data: pioneers, isLoading } = useCollection<UserAchievement>(pioneersQuery);

    if (isLoading) {
        return (
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
        );
    }
    
    if (!pioneers || pioneers.length === 0) {
        return <p className="text-sm text-muted-foreground text-center py-4">Aún no hay pioneros. ¡Sé el primero en votar!</p>;
    }

    return (
        <div className="space-y-1">
            {pioneers.map((pioneer, index) => (
                <div key={pioneer.userId} className="flex items-center justify-between rounded-lg p-2 hover:bg-muted/50">
                    <div className="flex items-center gap-3">
                        <Trophy className={cn("h-5 w-5", getTrophyColor(index))} />
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
                </div>
            ))}
        </div>
    );
}


export default function Achievements({ figure }: AchievementsProps) {
    const firestore = useFirestore();
    const [pioneerCount, setPioneerCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchPioneerCount = async () => {
            if (!firestore) return;
            setIsLoading(true);
            try {
                const achievementsColRef = collection(firestore, `figures/${figure.id}/achievements`);
                const snapshot = await getCountFromServer(achievementsColRef);
                setPioneerCount(snapshot.data().count);
            } catch (error) {
                console.error("Error fetching pioneer count:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchPioneerCount();
    }, [firestore, figure.id]);

    return (
        <Card className="dark:bg-black">
            <CardHeader>
                <CardTitle>Logros de la Comunidad</CardTitle>
                <CardDescription className="text-muted-foreground">Reconocimientos especiales obtenidos por los usuarios en este perfil.</CardDescription>
            </CardHeader>
            <CardContent>
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
                                <p className="text-xs text-muted-foreground">{Math.min(pioneerCount, PIONEER_DISPLAY_LIMIT)} / {PIONEER_DISPLAY_LIMIT} Ganadores</p>
                            )}
                         </button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Ganadores del Logro "Pionero"</DialogTitle>
                            <DialogDescription>
                                Los primeros {PIONEER_DISPLAY_LIMIT} usuarios que votaron en el perfil de {figure.name}.
                            </DialogDescription>
                        </DialogHeader>
                        <PioneerList figureId={figure.id} />
                    </DialogContent>
                </Dialog>
            </CardContent>
        </Card>
    );
}
