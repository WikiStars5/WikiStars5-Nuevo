
'use client';

import { useState, useEffect } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit, getCountFromServer, where, getDocs } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, Award } from 'lucide-react';
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
import { Separator } from '@/components/ui/separator';

interface AchievementsProps {
    figure: Figure;
}

const PIONEER_IMAGE_URL = "https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/LOGROS%2Fpionero.png?alt=media&token=6cd4c34e-38d1-4a47-8c08-7c96b5533ecf";
const RECRUITER_IMAGE_URL = "https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/LOGROS%2Freclutador.png?alt=media&token=b389cd59-d524-4fdd-94f7-3994ec5694f5";
const RECRUITER_BRONZE_URL = "https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/LOGROS%2F2.png?alt=media&token=6bfc89ae-e6a8-4401-82eb-5928bfdaf783";
const RECRUITER_SILVER_URL = "https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/LOGROS%2F5.png?alt=media&token=aab6061e-ec0b-48b6-8262-3489f104b067";
const RECRUITER_GOLD_URL = "https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/LOGROS%2F10.png?alt=media&token=d6aa20e2-2b79-4dbf-bf3a-2d646bc59565";

const PIONEER_TOTAL_LIMIT = 1000;
const PIONEER_DISPLAY_LIMIT = 10;
const RECRUITER_DISPLAY_LIMIT = 10;


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
            limit(PIONEER_DISPLAY_LIMIT)
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

const RecruiterTier = ({ title, imageUrl, min, max, firestore }: { title: string; imageUrl: string; min: number; max?: number, firestore: any }) => {
    const recruitersQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        let q = query(
            collection(firestore, 'users'),
            where('referralCount', '>=', min),
            orderBy('referralCount', 'desc'),
            limit(RECRUITER_DISPLAY_LIMIT)
        );
        if (max) {
             q = query(q, where('referralCount', '<=', max));
        }
        return q;
    }, [firestore, min, max]);

    const { data: recruiters, isLoading } = useCollection<User>(recruitersQuery);

    return (
        <div className="flex flex-col gap-2 rounded-lg border p-4">
            <div className="flex flex-col items-center text-center gap-2">
                <Image src={imageUrl} alt={title} width={64} height={64} />
                <h3 className="font-bold text-lg">{title}</h3>
            </div>
            <Separator />
            <div className="space-y-2">
                {isLoading && Array.from({ length: 2 }).map((_, i) => <StreakItemSkeleton key={i} />)}
                {!isLoading && recruiters && recruiters.length > 0 ? (
                    recruiters.map(user => (
                         <Link key={user.id} href={`/u/${user.username}`} className="flex items-center justify-between p-2 rounded-md hover:bg-muted group">
                            <div className="flex items-center gap-2">
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={(user as any).photoURL ?? undefined} alt={user.username} />
                                    <AvatarFallback>{user.username.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <span className="text-sm font-medium group-hover:underline">{user.username}</span>
                            </div>
                            <span className="text-sm font-bold text-muted-foreground">{user.referralCount || 0}</span>
                         </Link>
                    ))
                ) : (
                    !isLoading && <p className="text-xs text-muted-foreground text-center py-4">Aún no hay reclutadores.</p>
                )}
            </div>
        </div>
    );
};


function RecruiterList() {
    const firestore = useFirestore();

    return (
         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <RecruiterTier title="Oro" imageUrl={RECRUITER_GOLD_URL} min={10} firestore={firestore} />
             <RecruiterTier title="Plata" imageUrl={RECRUITER_SILVER_URL} min={5} max={9} firestore={firestore} />
             <RecruiterTier title="Bronce" imageUrl={RECRUITER_BRONZE_URL} min={2} max={4} firestore={firestore} />
         </div>
    );
}

const StreakItemSkeleton = () => (
    <div className="flex items-center justify-between p-2">
        <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="space-y-1">
                <Skeleton className="h-4 w-20" />
            </div>
        </div>
        <Skeleton className="h-6 w-8 rounded-md" />
    </div>
);


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
                <CardDescription className="text-muted-foreground">Reconocimientos especiales obtenidos por los usuarios.</CardDescription>
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
                                El logro se otorga a los primeros {PIONEER_TOTAL_LIMIT} usuarios, pero aquí solo se muestra el Top {PIONEER_DISPLAY_LIMIT} de pioneros para el perfil de {figure.name}.
                            </DialogDescription>
                        </DialogHeader>
                        <PioneerList figureId={figure.id} />
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
                            <p className="font-bold">Reclutador de Base</p>
                            <p className="text-xs text-muted-foreground">Top Reclutadores</p>
                         </button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl">
                        <DialogHeader>
                            <DialogTitle>Top Reclutadores de la Plataforma</DialogTitle>
                            <DialogDescription>
                                Los usuarios que más nuevos miembros han traído a WikiStars5, clasificados por nivel.
                            </DialogDescription>
                        </DialogHeader>
                        <RecruiterList />
                    </DialogContent>
                </Dialog>
            </CardContent>
        </Card>
    );
}
