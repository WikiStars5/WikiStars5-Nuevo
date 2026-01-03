
'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Star, Trash2, Loader2 } from 'lucide-react';
import type { Figure, FeaturedFigure } from '@/lib/types';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import FigureCard from '../shared/figure-card';
import { useFirestore, useCollection, useMemoFirebase, useAdmin, useDoc } from '@/firebase';
import { collection, query, orderBy, doc, deleteDoc, writeBatch, getDocs, addDoc } from 'firebase/firestore';
import { Skeleton } from '../ui/skeleton';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { useToast } from '@/hooks/use-toast';
import FigureSearchInput from '../figure/figure-search-input';
import Image from 'next/image';
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
} from "@/components/ui/alert-dialog"

function FeaturedFigureCard({ featuredFigure, onRemove }: { featuredFigure: FeaturedFigure, onRemove: (id: string) => void }) {
    const { isAdmin } = useAdmin();
    const [isDeleting, setIsDeleting] = useState(false);
    const firestore = useFirestore();

    const figureDocRef = useMemoFirebase(() => {
        if (!firestore) return null;
        return doc(firestore, 'figures', featuredFigure.figureId);
    }, [firestore, featuredFigure.figureId]);

    const { data: figure, isLoading } = useDoc<Figure>(figureDocRef);

    const handleDelete = async () => {
        setIsDeleting(true);
        await onRemove(featuredFigure.id);
        // Component will unmount, no need to setIsDeleting(false)
    };

    if (isLoading) {
        return (
            <div className="space-y-2">
                <Skeleton className="aspect-[4/5] w-full" />
                <Skeleton className="h-5 w-3/4" />
            </div>
        );
    }

    if (!figure) return null;

    return (
        <div className="group relative">
            <FigureCard figure={figure} />
             {isAdmin && (
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                         <Button
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                            disabled={isDeleting}
                        >
                            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar de Destacados?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Esta acción eliminará a <span className="font-bold">{featuredFigure.figureName}</span> de la lista de figuras destacadas. No eliminará el perfil de la figura.
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


function AddFeaturedDialog({ onAdd, existingIds }: { onAdd: (figure: Figure) => void, existingIds: string[] }) {
    const [selectedFigure, setSelectedFigure] = useState<Figure | null>(null);
    const { toast } = useToast();

    const handleSelect = (figure: Figure) => {
        if (existingIds.includes(figure.id)) {
            toast({
                title: "Figura ya destacada",
                description: `${figure.name} ya está en la lista de destacados.`,
                variant: 'destructive',
            });
            return;
        }
        setSelectedFigure(figure);
    };

    const handleConfirm = () => {
        if (selectedFigure) {
            onAdd(selectedFigure);
        }
    };

    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Añadir Figura Destacada</DialogTitle>
                <DialogDescription>
                    Busca y selecciona un perfil para añadirlo a la sección de destacados de la página principal.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
                <FigureSearchInput onFigureSelect={handleSelect} />
                {selectedFigure && (
                     <div className="flex items-center justify-between rounded-lg border p-3">
                        <div className="flex items-center gap-3">
                            <Image 
                                src={selectedFigure.imageUrl} 
                                alt={selectedFigure.name}
                                width={40}
                                height={50}
                                className="rounded-md object-cover aspect-[4/5]"
                            />
                            <p className="font-semibold">{selectedFigure.name}</p>
                        </div>
                    </div>
                )}
            </div>
            <DialogFooter>
                <Button onClick={handleConfirm} disabled={!selectedFigure}>
                    Añadir a Destacados
                </Button>
            </DialogFooter>
        </DialogContent>
    );
}

export default function FeaturedFigures() {
    const firestore = useFirestore();
    const { isAdmin } = useAdmin();
    const { toast } = useToast();
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

    const featuredQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'featured_figures'), orderBy('order'));
    }, [firestore]);

    const { data: featured, isLoading, refetch } = useCollection<FeaturedFigure>(featuredQuery);
    
    const handleRemove = async (docId: string) => {
        if (!firestore) return;
        try {
            await deleteDoc(doc(firestore, 'featured_figures', docId));
            refetch(); // Trigger a refetch
            toast({
                title: "Figura eliminada de destacados",
            });
        } catch (error) {
            console.error("Error removing featured figure: ", error);
            toast({
                title: "Error",
                description: "No se pudo eliminar la figura de destacados.",
                variant: "destructive",
            });
        }
    };

     const handleAdd = async (figure: Figure) => {
        if (!firestore) return;
        
        const currentMaxOrder = featured?.reduce((max, fig) => fig.order > max ? fig.order : max, 0) ?? 0;

        const newFeaturedFigure = {
            figureId: figure.id,
            figureName: figure.name,
            figureImageUrl: figure.imageUrl,
            order: currentMaxOrder + 1
        };

        try {
            await addDoc(collection(firestore, 'featured_figures'), newFeaturedFigure);
            refetch();
            setIsAddDialogOpen(false);
            toast({
                title: "Figura añadida",
                description: `${figure.name} ahora está en destacados.`
            });
        } catch (error) {
             console.error("Error adding featured figure: ", error);
             toast({
                title: "Error",
                description: "No se pudo añadir la figura a destacados.",
                variant: "destructive",
            });
        }
    };

    const existingFigureIds = useMemo(() => featured?.map(f => f.figureId) || [], [featured]);
    const showAddButton = isAdmin;

    return (
        <section className="mb-12">
            <div className="flex items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-2">
                    <Star className="h-6 w-6 text-yellow-400" fill="currentColor" />
                    <h2 className="text-2xl font-bold tracking-tight font-headline">
                        Figuras Destacadas
                    </h2>
                </div>
                 {showAddButton && (
                    <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline">
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Añadir
                            </Button>
                        </DialogTrigger>
                        <AddFeaturedDialog onAdd={handleAdd} existingIds={existingFigureIds} />
                    </Dialog>
                )}
            </div>
            
            {isLoading && (
                 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="space-y-2">
                            <Skeleton className="aspect-[4/5] w-full" />
                            <Skeleton className="h-5 w-3/4" />
                        </div>
                    ))}
                </div>
            )}

            {!isLoading && featured && featured.length > 0 && (
                <Carousel
                    opts={{ align: "start", loop: featured.length > 2 }}
                    className="w-full"
                >
                    <CarouselContent>
                        {featured.map((figure) => (
                        <CarouselItem key={figure.id} className="basis-1/2 md:basis-1/3 lg:basis-1/4">
                           <FeaturedFigureCard featuredFigure={figure} onRemove={handleRemove} />
                        </CarouselItem>
                        ))}
                    </CarouselContent>
                    <CarouselPrevious className="hidden sm:flex" />
                    <CarouselNext className="hidden sm:flex" />
                </Carousel>
            )}

             {!isLoading && (!featured || featured.length === 0) && (
                <div className="text-center py-10 border-2 border-dashed rounded-lg">
                    <p className="text-muted-foreground">Aún no se han añadido perfiles destacados.</p>
                    {isAdmin && <p className="text-sm text-muted-foreground">Haz clic en "Añadir" para empezar.</p>}
                </div>
            )}
        </section>
    );
}
