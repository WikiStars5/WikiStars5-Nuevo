
'use client';

import { useEffect, useState, useContext } from 'react';
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collection, query, orderBy, doc, getDoc, limit } from 'firebase/firestore';
import type { Thought, Streak } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Cloud } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { useLanguage } from '@/context/LanguageContext';
import { ThoughtDisplay } from '@/components/figure/thoughts-section';

interface UserThoughtsProps {
    userId: string;
}

interface ThoughtReference {
    figureId: string;
    thoughtId: string;
    createdAt: any;
}

function ThoughtCardWrapper({ refData, onDeleteSuccess }: { refData: ThoughtReference, onDeleteSuccess: () => void }) {
    const firestore = useFirestore();
    const [thought, setThought] = useState<Thought | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchThought = async () => {
            if (!firestore || !refData.figureId || !refData.thoughtId) return;
            try {
                const thoughtDocRef = doc(firestore, 'figures', refData.figureId, 'thoughts', refData.thoughtId);
                const snap = await getDoc(thoughtDocRef);
                if (snap.exists()) {
                    setThought({ id: snap.id, ...snap.data() } as Thought);
                }
            } catch (error) {
                console.error("Error fetching individual thought:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchThought();
    }, [firestore, refData]);

    if (isLoading) return <Skeleton className="h-32 w-full rounded-xl mb-4" />;
    if (!thought) return null;

    return (
        <Card className="hover:border-primary/50 transition-all group mb-4 overflow-hidden dark:bg-black">
            <CardContent className="p-4">
                <ThoughtDisplay 
                    thought={thought} 
                    figureId={thought.figureId} 
                    figureName={thought.figureName} 
                    onDeleteSuccess={onDeleteSuccess}
                />
                <div className="mt-2 pt-2 border-t flex justify-between items-center">
                    <p className="text-xs text-muted-foreground">
                        Publicado en <Link href={`/figures/${thought.figureId}`} className="text-primary hover:underline font-bold">{thought.figureName}</Link>
                    </p>
                    <Button variant="link" size="sm" asChild className="h-auto p-0 text-xs font-bold">
                        <Link href={`/figures/${thought.figureId}?tab=pensamientos`}>
                            Ir al hilo →
                        </Link>
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

import { Button } from '@/components/ui/button';

export default function UserThoughts({ userId }: UserThoughtsProps) {
    const firestore = useFirestore();
    const { theme } = useTheme();

    const referencesQuery = useMemoFirebase(() => {
        if (!firestore || !userId) return null;
        return query(collection(firestore, 'users', userId, 'thoughts'), orderBy('createdAt', 'desc'), limit(50));
    }, [firestore, userId]);

    const { data: references, isLoading: isLoadingReferences } = useCollection<ThoughtReference>(referencesQuery);

    if (isLoadingReferences) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-32 w-full rounded-xl" />
                <Skeleton className="h-32 w-full rounded-xl" />
                <Skeleton className="h-32 w-full rounded-xl" />
            </div>
        );
    }

    if (!references || references.length === 0) {
        return (
            <div className="text-center py-16 border-2 border-dashed rounded-xl">
                <Cloud className="mx-auto h-12 w-12 text-muted-foreground/30" />
                <h3 className="mt-2 text-md font-semibold">Aún no has compartido pensamientos</h3>
                <p className="text-sm text-muted-foreground">¡Entra al perfil de una figura y comparte lo que piensas!</p>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {references.map(ref => (
                <ThoughtCardWrapper 
                    key={ref.thoughtId} 
                    refData={ref} 
                    onDeleteSuccess={() => { /* Handled by realtime query eventually */ }} 
                />
            ))}
        </div>
    );
}
