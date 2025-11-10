
'use client';

import { useState, useEffect } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit, getCountFromServer, where, getDocs } from 'firebase/firestore';
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
import { Separator } from '@/components/ui/separator';
import { countries } from '@/lib/countries';

interface AchievementsProps {
    figure: Figure;
}

const PIONEER_IMAGE_URL = "https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/LOGROS%2Fpionero.png?alt=media&token=6cd4c34e-38d1-4a47-8c08-7c96b5533ecf";
const RECRUITER_IMAGE_URL = "https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/LOGROS%2Freclutador.png?alt=media&token=b389cd59-d524-4fdd-94f7-3994ec5694f5";

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

const RecruiterListSkeleton = () => (
    <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between p-2">
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
        ))}
    </div>
);


function TopRecruitersList() {
    const firestore = useFirestore();

    // Query the new 'recruiters' collection directly
    const recruitersQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(
            collection(firestore, 'recruiters'),
            orderBy('referralCount', 'desc'),
            limit(RECRUITER_DISPLAY_LIMIT)
        );
    }, [firestore]);

    const { data: recruiters, isLoading } = useCollection<any>(recruitersQuery);

    if (isLoading) {
        return <RecruiterListSkeleton />;
    }

    if (!recruiters || recruiters.length === 0) {
        return (
            <p className="text-sm text-muted-foreground text-center py-4">Aún no hay reclutadores. ¡Comparte la app para ser el primero!</p>
        );
    }
    
    return (
        <div className="space-y-1">
            {recruiters.map((user, index) => {
                 const country = countries.find(c => c.name === user.country);
                return (
                    <div key={user.userId} className="flex items-center justify-between rounded-lg p-2 hover:bg-muted/50">
                        <div className="flex items-center gap-3">
                            <Trophy className={cn("h-5 w-5", getTrophyColor(index))} />
                            <Link href={`/u/${user.username}`} className="flex items-center gap-3 group">
                                <Avatar className="h-10 w-10">
                                    <AvatarImage src={user.photoURL ?? undefined} alt={user.username} />
                                    <AvatarFallback>{user.username.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="font-semibold text-sm group-hover:underline">{user.username}</p>
                                        {user.gender === 'Masculino' && <span className="text-blue-400 font-bold" title="Masculino">♂</span>}
                                        {user.gender === 'Femenino' && <span className="text-pink-400 font-bold" title="Femenino">♀</span>}
                                        {country && (
                                            <Image
                                                src={`https://flagcdn.com/w20/${country.code.toLowerCase()}.png`}
                                                alt={country.name}
                                                width={20}
                                                height={15}
                                                className="object-contain"
                                                title={country.name}
                                            />
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground">Usuario Registrado</p>
                                </div>
                            </Link>
                        </div>
                        <div className="flex items-center gap-2 font-bold text-lg text-primary">
                            <span>{user.referralCount || 0}</span>
                            <Users className="h-4 w-4" />
                        </div>
                    </div>
                )
            })}
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
                            <p className="font-bold">Reclutador</p>
                            <p className="text-xs text-muted-foreground">Top Reclutadores</p>
                         </button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Top Reclutadores de la Plataforma</DialogTitle>
                            <DialogDescription>
                                Los usuarios que más nuevos miembros han traído a WikiStars5, clasificados por su número de referidos.
                            </DialogDescription>
                        </DialogHeader>
                        <TopRecruitersList />
                    </DialogContent>
                </Dialog>
            </CardContent>
        </Card>
    );
}
