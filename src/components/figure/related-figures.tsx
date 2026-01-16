
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
import { collection, query, where, doc, getDoc, deleteDoc, limit } from 'firebase/firestore';
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
import { useLanguage } from '@/context/LanguageContext';


interface RelatedFiguresProps {
    figure: Figure;
}

// A new component to render the card with delete functionality
function RelatedFigureDisplay({ figure, relationId, onRelationDeleted }: { figure: Figure, relationId: string, onRelationDeleted: () => void }) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isDeleting, setIsDeleting] = useState(false);
    const { user } = useUser();
    const { t } = useLanguage();
    
    const handleDelete = async () => {
        if (!firestore) return;
        setIsDeleting(true);
        try {
            const relationRef = doc(firestore, 'related_figures', relationId);
            await deleteDoc(relationRef);
            toast({
                title: t('FigurePage.relatedFigures.deleteToastTitle'),
                description: t('FigurePage.relatedFigures.deleteToastDescription'),
            });
            onRelationDeleted();
        } catch (error) {
            console.error("Failed to delete relation:", error);
            toast({
                title: t('FigurePage.relatedFigures.errorDeleteToastTitle'),
                description: t('FigurePage.relatedFigures.errorDeleteToastDescription'),
                variant: 'destructive',
            });
            setIsDeleting(false);
        }
    }


    if (!figure) return null;

    return (
        <div className="relative group">
            <FigureCard figure={figure} />
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
                            <AlertDialogTitle>{t('FigurePage.relatedFigures.deleteConfirmTitle')}</AlertDialogTitle>
                            <AlertDialogDescription>
                               {t('FigurePage.relatedFigures.deleteConfirmDescription').replace('{name}', figure.name)}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>{t('FigurePage.relatedFigures.addDialog.cancelButton')}</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDelete}>{t('FigurePage.relatedFigures.deleteConfirmContinue')}</AlertDialogAction>
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
    const { t } = useLanguage();

    const relationsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(
            collection(firestore, 'related_figures'), 
            where('sourceFigureId', '==', figure.id),
            limit(6)
        );
    }, [firestore, figure.id]);

    const { data: relations, isLoading: isLoadingRelations, refetch: refetchRelations } = useCollection<RelatedFigure>(relationsQuery, {realtime: true});

    const relatedFigureIds = useMemo(() => {
        if (!relations) return [];
        return relations.map(rel => rel.targetFigureId).filter(Boolean);
    }, [relations]);

    const figuresQuery = useMemoFirebase(() => {
        if (!firestore || relatedFigureIds.length === 0) return null;
        return query(collection(firestore, 'figures'), where('__name__', 'in', relatedFigureIds));
    }, [firestore, relatedFigureIds]);

    const { data: relatedFiguresData, isLoading: isLoadingFigures } = useCollection<Figure>(figuresQuery);

    const relatedFiguresMap = useMemo(() => {
        if (!relatedFiguresData) return new Map();
        return new Map(relatedFiguresData.map(fig => [fig.id, fig]));
    }, [relatedFiguresData]);
    
    const isLoading = isLoadingRelations || (relatedFigureIds.length > 0 && isLoadingFigures);

    const isLimitReached = relations ? relations.length >= 6 : false;

    return (
        <Card className="bg-black">
            <CardHeader>
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                           <Users /> {t('FigurePage.relatedFigures.title')}
                        </CardTitle>
                        <CardDescription className="text-muted-foreground">{t('FigurePage.relatedFigures.description')}</CardDescription>
                    </div>
                     {user && !user.isAnonymous && (
                         <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <DialogTrigger asChild>
                                            <Button variant="outline" disabled={isLimitReached}>
                                                <PlusCircle className="mr-2" />
                                                {t('FigurePage.relatedFigures.addButton')}
                                            </Button>
                                        </DialogTrigger>
                                    </TooltipTrigger>
                                    {isLimitReached && (
                                        <TooltipContent>
                                            <p>{t('FigurePage.relatedFigures.limitReached')}</p>
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
                {!isLoading && relations && relations.length > 0 && relatedFiguresMap.size > 0 && (
                     <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {relations.map(rel => {
                            const relatedFigure = relatedFiguresMap.get(rel.targetFigureId);
                            if (!relatedFigure) return null;
                            return <RelatedFigureDisplay key={rel.id} figure={relatedFigure} relationId={rel.id} onRelationDeleted={refetchRelations} />;
                        })}
                    </div>
                )}
                {!isLoading && (!relations || relations.length === 0) && (
                     <p className="text-sm text-muted-foreground text-center py-8">
                        {t('FigurePage.relatedFigures.noRelated')}
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
