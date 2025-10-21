'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Users } from 'lucide-react';
import type { Figure, RelatedFigure } from '@/lib/types';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import AddRelatedFigureDialog from './add-related-figure-dialog';
import FigureCard from '../shared/figure-card';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { Skeleton } from '../ui/skeleton';
import { doc, getDoc } from 'firebase/firestore';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

interface RelatedFiguresProps {
    figure: Figure;
}

// A new component to fetch the actual figure data based on the relation
function RelatedFigureCard({ figureId }: { figureId: string }) {
    const firestore = useFirestore();
    const [figureData, setFigureData] = useState<Figure | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchFigure = async () => {
            if (!firestore) return;
            try {
                const figureRef = doc(firestore, 'figures', figureId);
                const docSnap = await getDoc(figureRef);
                if (docSnap.exists()) {
                    setFigureData({ id: docSnap.id, ...docSnap.data() } as Figure);
                }
            } catch (error) {
                console.error("Failed to fetch related figure data:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchFigure();
    }, [figureId, firestore]);

    if (isLoading) {
        return (
             <div className="space-y-4">
                <Skeleton className="h-[350px] w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
            </div>
        )
    }

    if (!figureData) return null;

    return <FigureCard figure={figureData} />;
}


export default function RelatedFigures({ figure }: RelatedFiguresProps) {
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const firestore = useFirestore();

    const relationsAsSourceQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'related_figures'), where('sourceFigureId', '==', figure.id));
    }, [firestore, figure.id]);

    const relationsAsTargetQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'related_figures'), where('targetFigureId', '==', figure.id));
    }, [firestore, figure.id]);

    const { data: sourceRelations, isLoading: isLoadingSource } = useCollection<RelatedFigure>(relationsAsSourceQuery);
    const { data: targetRelations, isLoading: isLoadingTarget } = useCollection<RelatedFigure>(targetRelationsQuery);

    const relatedFigureIds = useMemo(() => {
        const ids = new Set<string>();
        sourceRelations?.forEach(rel => ids.add(rel.targetFigureId));
        targetRelations?.forEach(rel => ids.add(rel.sourceFigureId));
        return Array.from(ids);
    }, [sourceRelations, targetRelations]);
    
    const isLoading = isLoadingSource || isLoadingTarget;
    const isLimitReached = relatedFigureIds.length >= 5;

    return (
        <Card>
            <CardHeader>
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                           <Users /> Perfiles Relacionados
                        </CardTitle>
                        <CardDescription>Otros perfiles que podrían interesarte (Máx. 5).</CardDescription>
                    </div>
                     <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <DialogTrigger asChild>
                                        <Button variant="outline" disabled={isLimitReached}>
                                            <PlusCircle className="mr-2" />
                                            Añadir
                                        </Button>
                                    </DialogTrigger>
                                </TooltipTrigger>
                                {isLimitReached && (
                                    <TooltipContent>
                                        <p>Has alcanzado el límite de 5 perfiles relacionados.</p>
                                    </TooltipContent>
                                )}
                            </Tooltip>
                        </TooltipProvider>

                        {!isLimitReached && (
                             <AddRelatedFigureDialog 
                                sourceFigure={figure} 
                                onDialogClose={() => setIsAddDialogOpen(false)} 
                             />
                        )}
                     </Dialog>
                </div>
            </CardHeader>
            <CardContent>
                {isLoading && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                         {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="space-y-4">
                                <Skeleton className="aspect-[4/5] w-full" />
                                <Skeleton className="h-5 w-3/4" />
                            </div>
                        ))}
                    </div>
                )}
                {!isLoading && relatedFigureIds.length > 0 && (
                     <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {relatedFigureIds.slice(0, 5).map(id => (
                            <RelatedFigureCard key={id} figureId={id} />
                        ))}
                    </div>
                )}
                {!isLoading && relatedFigureIds.length === 0 && (
                     <p className="text-sm text-muted-foreground text-center py-8">
                        Aún no se han añadido perfiles relacionados.
                    </p>
                )}
            </CardContent>
        </Card>
    );
}