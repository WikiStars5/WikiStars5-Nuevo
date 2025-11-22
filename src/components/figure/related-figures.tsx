
'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Users, Trash2, Loader2 } from 'lucide-react';
import type { Figure, RelatedFigure } from '@/lib/types';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import AddRelatedFigureDialog from './add-related-figure-dialog';
import FigureCard from '../shared/figure-card';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, where, doc, getDoc, deleteDoc } from 'firebase/firestore';
import { Skeleton } from '../ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';


interface RelatedFiguresProps {
    figure: Figure;
}

// A new component to fetch the actual figure data based on the relation
function RelatedFigureCard({ figureId, relationId }: { figureId: string, relationId: string }) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [figureData, setFigureData] = useState<Figure | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);
    const { user } = useUser();
    
    const handleDelete = async () => {
        if (!firestore) return;
        setIsDeleting(true);
        try {
            const relationRef = doc(firestore, 'related_figures', relationId);
            await deleteDoc(relationRef);
            toast({
                title: 'Relación Eliminada',
                description: 'El perfil relacionado ha sido eliminado.',
            });
            // The component will unmount as the parent's `relations` data updates
        } catch (error) {
            console.error("Failed to delete relation:", error);
            toast({
                title: 'Error al Eliminar',
                description: 'No se pudo eliminar la relación.',
                variant: 'destructive',
            });
            setIsDeleting(false);
        }
    }


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
                <Skeleton className="aspect-[4/5] w-full" />
                <Skeleton className="h-5 w-3/4" />
            </div>
        )
    }

    if (!figureData) return null;

    return (
        <div className="relative group">
            <FigureCard figure={figureData} />
            {user && !user.isAnonymous && (
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                            disabled={isDeleting}
                        >
                            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                            <AlertDialogDescription>
                               Esta acción eliminará la relación con {figureData.name}. No se puede deshacer.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDelete}>Continuar</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </div>
    );
}


export default function RelatedFigures({ figure }: RelatedFiguresProps) {
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const firestore = useFirestore();
    const { user } = useUser();

    // Query only for relationships where the current figure is the SOURCE.
    const relationsAsSourceQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'related_figures'), where('sourceFigureId', '==', figure.id));
    }, [firestore, figure.id]);

    const { data: relations, isLoading } = useCollection<RelatedFigure>(relationsAsSourceQuery);

    const relatedItems = useMemo(() => {
        if (!relations) return [];
        return relations.map(rel => ({
            figureId: rel.targetFigureId,
            relationId: rel.id
        }));
    }, [relations]);
    
    const isLimitReached = relatedItems.length >= 6;

    return (
        <Card className="bg-black">
            <CardHeader>
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                           <Users /> Perfiles Relacionados
                        </CardTitle>
                        <CardDescription className="text-muted-foreground">Otros perfiles que podrían interesarte (Máx. 6).</CardDescription>
                    </div>
                     {user && !user.isAnonymous && (
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
                                            <p>Has alcanzado el límite de 6 perfiles relacionados.</p>
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
                     )}
                </div>
            </CardHeader>
            <CardContent>
                {isLoading && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                         {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="space-y-4">
                                <Skeleton className="aspect-[4/5] w-full" />
                                <Skeleton className="h-5 w-3/4" />
                            </div>
                        ))}
                    </div>
                )}
                {!isLoading && relatedItems.length > 0 && (
                     <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {relatedItems.slice(0, 6).map(item => (
                            <RelatedFigureCard key={item.relationId} figureId={item.figureId} relationId={item.relationId} />
                        ))}
                    </div>
                )}
                {!isLoading && relatedItems.length === 0 && (
                     <p className="text-sm text-muted-foreground text-center py-8">
                        Aún no se han añadido perfiles relacionados.
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
