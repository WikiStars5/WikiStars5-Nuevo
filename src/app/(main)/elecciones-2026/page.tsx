'use client';

import { useState, useMemo } from 'react';
import { useFirestore, useCollection, useAdmin, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, addDoc, deleteDoc, doc } from 'firebase/firestore';
import type { Figure } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Trash2, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import FigureSearchInput from '@/components/figure/figure-search-input';
import Image from 'next/image';
import FigureCard from '@/components/shared/figure-card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";


// Define a type for the election candidates, similar to FeaturedFigure
interface ElectionCandidate {
  id: string;
  figureId: string;
  figureName: string;
  figureImageUrl: string;
  order: number;
}

function AddCandidateDialog({ onAdd, existingIds }: { onAdd: (figure: Figure) => void, existingIds: string[] }) {
    const [selectedFigure, setSelectedFigure] = useState<Figure | null>(null);
    const { toast } = useToast();

    const handleSelect = (figure: Figure) => {
        if (existingIds.includes(figure.id)) {
            toast({
                title: "Candidato ya existente",
                description: `${figure.name} ya está en la lista de candidatos.`,
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
                <DialogTitle>Añadir Candidato</DialogTitle>
                <DialogDescription>
                    Busca y selecciona un perfil para añadirlo a la lista de candidatos para las Elecciones 2026.
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
                    Añadir Candidato
                </Button>
            </DialogFooter>
        </DialogContent>
    );
}


function CandidateCard({ candidate, onRemove }: { candidate: ElectionCandidate, onRemove: (id: string) => void }) {
    const { isAdmin } = useAdmin();
    const [isDeleting, setIsDeleting] = useState(false);
    const firestore = useFirestore();

    const figureDocRef = useMemoFirebase(() => {
        if (!firestore) return null;
        return doc(firestore, 'figures', candidate.figureId);
    }, [firestore, candidate.figureId]);

    const { data: figure, isLoading } = useDoc<Figure>(figureDocRef);

    const handleDelete = async () => {
        setIsDeleting(true);
        await onRemove(candidate.id);
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
                            <AlertDialogTitle>¿Eliminar Candidato?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Esta acción eliminará a <span className="font-bold">{candidate.figureName}</span> de la lista de elecciones. No eliminará el perfil de la figura.
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

export default function ElectionsPage() {
  const { isAdmin } = useAdmin();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const candidatesQuery = useMemoFirebase(() => {
      if (!firestore) return null;
      return query(collection(firestore, 'election_candidates_2026'), orderBy('order'));
  }, [firestore]);

  const { data: candidates, isLoading, refetch } = useCollection<ElectionCandidate>(candidatesQuery);

  const handleAdd = async (figure: Figure) => {
    if (!firestore) return;
    
    const currentMaxOrder = candidates?.reduce((max, fig) => fig.order > max ? fig.order : max, 0) ?? 0;

    const newCandidateData = {
        figureId: figure.id,
        figureName: figure.name,
        figureImageUrl: figure.imageUrl,
        order: currentMaxOrder + 1
    };

    setIsAddDialogOpen(false);
    try {
        await addDoc(collection(firestore, 'election_candidates_2026'), newCandidateData);
        toast({
            title: "Candidato Añadido",
            description: `${figure.name} ahora está en la lista de elecciones.`
        });
        refetch();
    } catch (error) {
         console.error("Error adding election candidate: ", error);
         toast({
            title: "Error",
            description: "No se pudo añadir el candidato.",
            variant: "destructive",
        });
    }
  };

  const handleRemove = async (docId: string) => {
      if (!firestore) return;
      try {
          await deleteDoc(doc(firestore, 'election_candidates_2026', docId));
          toast({ title: "Candidato eliminado" });
          refetch();
      } catch (error) {
          console.error("Error removing candidate: ", error);
          toast({ title: "Error", description: "No se pudo eliminar el candidato.", variant: "destructive" });
      }
  };
  
  const existingFigureIds = useMemo(() => candidates?.map(c => c.figureId) || [], [candidates]);


  return (
    <div className="container mx-auto max-w-7xl px-4 py-12">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-3xl font-headline">Elecciones 2026</CardTitle>
              <CardDescription>Perfiles de los candidatos para las próximas elecciones.</CardDescription>
            </div>
            {isAdmin && (
               <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                  <DialogTrigger asChild>
                      <Button variant="outline">
                          <PlusCircle className="mr-2 h-4 w-4" />
                          Añadir Candidato
                      </Button>
                  </DialogTrigger>
                  <AddCandidateDialog onAdd={handleAdd} existingIds={existingFigureIds} />
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
           {isLoading && (
                 <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {Array.from({length: 5}).map((_, i) => (
                        <div key={i}>
                            <Skeleton className="aspect-[4/5] w-full" />
                            <Skeleton className="h-5 w-3/4 mt-2" />
                        </div>
                    ))}
                 </div>
            )}
             {!isLoading && candidates && candidates.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {candidates.map((candidate) => (
                        <CandidateCard key={candidate.id} candidate={candidate} onRemove={handleRemove} />
                    ))}
                </div>
            ) : (
                !isLoading && (
                    <div className="text-center py-16 border-2 border-dashed rounded-lg">
                        <p className="text-muted-foreground">Aún no se han añadido candidatos.</p>
                        {isAdmin && <p className="text-sm text-muted-foreground">Haz clic en "Añadir Candidato" para empezar.</p>}
                    </div>
                )
            )}
        </CardContent>
      </Card>
    </div>
  );
}
