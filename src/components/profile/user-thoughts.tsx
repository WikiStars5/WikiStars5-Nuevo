'use client';

import { useEffect, useState } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, getDoc, limit } from 'firebase/firestore';
import type { Thought } from '@/components/figure/thoughts-section';
import { Skeleton } from '@/components/ui/skeleton';
import { Cloud, ArrowRight } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { cn, formatCompactNumber } from '@/lib/utils';
import Link from 'next/link';
import { useTheme } from 'next-themes';

interface UserThoughtsProps {
    userId: string;
}

interface ThoughtReference {
    figureId: string;
    thoughtId: string;
    createdAt: any;
}

export default function UserThoughts({ userId }: UserThoughtsProps) {
    const firestore = useFirestore();
    const { theme } = useTheme();
    const [thoughts, setThoughts] = useState<Thought[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const referencesQuery = useMemoFirebase(() => {
        if (!firestore || !userId) return null;
        return query(collection(firestore, 'users', userId, 'thought_refs'), orderBy('createdAt', 'desc'), limit(50));
    }, [firestore, userId]);

    const { data: references, isLoading: isLoadingReferences } = useCollection<ThoughtReference>(referencesQuery);

    useEffect(() => {
        if (isLoadingReferences) {
            setIsLoading(true);
            return;
        }

        if (!references || references.length === 0 || !firestore) {
            setThoughts([]);
            setIsLoading(false);
            return;
        }

        const fetchThoughts = async () => {
            setIsLoading(true);
            try {
                const thoughtPromises = references.map(ref => {
                    if (ref.figureId && ref.thoughtId) {
                        const thoughtDocRef = doc(firestore, 'figures', ref.figureId, 'thoughts', ref.thoughtId);
                        return getDoc(thoughtDocRef);
                    }
                    return Promise.resolve(null);
                });

                const snapshots = await Promise.all(thoughtPromises);

                const fetchedThoughts = snapshots
                    .filter((snap): snap is any => snap !== null && snap.exists())
                    .map(snap => ({ id: snap.id, ...snap.data() } as Thought));
                
                setThoughts(fetchedThoughts);

            } catch (error) {
                console.error("Error fetching user thoughts:", error);
                setThoughts([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchThoughts();

    }, [references, isLoadingReferences, firestore]);

    if (isLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-24 w-full rounded-xl" />
                <Skeleton className="h-24 w-full rounded-xl" />
                <Skeleton className="h-24 w-full rounded-xl" />
            </div>
        );
    }

    if (thoughts.length === 0) {
        return (
            <div className="text-center py-16 border-2 border-dashed rounded-xl">
                <Cloud className="mx-auto h-12 w-12 text-muted-foreground/30" />
                <h3 className="mt-2 text-md font-semibold">Aún no has compartido pensamientos</h3>
                <p className="text-sm text-muted-foreground">¡Entra al perfil de una figura y comparte lo que piensas!</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {thoughts.map(thought => (
                <Link key={thought.id} href={`/figures/${thought.figureId}?tab=pensamientos`}>
                    <Card className={cn("hover:border-primary/50 transition-all group mb-4", (theme === 'dark' || theme === 'army') && 'bg-black')}>
                        <CardContent className="p-4 flex gap-4">
                            <Avatar className="h-10 w-10 border border-primary/20">
                                <AvatarImage src={thought.figureImageUrl || undefined} />
                                <AvatarFallback>{thought.figureName[0]}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                    <p className="font-bold text-sm text-primary group-hover:underline">{thought.figureName}</p>
                                    <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground">
                                        Ir al hilo <ArrowRight className="h-3 w-3" />
                                    </div>
                                </div>
                                <p className="text-sm text-foreground/90 line-clamp-2 italic">"{thought.text}"</p>
                                {thought.likes && thought.likes > 0 && (
                                    <div className="flex items-center gap-1 mt-2 text-pink-500 text-xs font-bold">
                                        <Heart className="h-3 w-3 fill-current" />
                                        <span>{formatCompactNumber(thought.likes)} corazones</span>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </Link>
            ))}
        </div>
    );
}
