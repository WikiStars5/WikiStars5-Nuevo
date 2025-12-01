
'use client';

import { useState } from 'react';
import { DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Link as LinkIcon, X } from 'lucide-react';
import { useFirestore } from '@/firebase';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { collection, serverTimestamp } from 'firebase/firestore';
import type { Figure, RelatedFigure } from '@/lib/types';
import FigureSearchInput from './figure-search-input';
import Image from 'next/image';
import { useLanguage } from '@/context/LanguageContext';

interface AddRelatedFigureDialogProps {
    sourceFigure: Figure;
    onDialogClose: () => void;
}

export default function AddRelatedFigureDialog({ sourceFigure, onDialogClose }: AddRelatedFigureDialogProps) {
    const { toast } = useToast();
    const firestore = useFirestore();
    const { t } = useLanguage();
    const [selectedFigure, setSelectedFigure] = useState<Figure | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const handleSelectFigure = (figure: Figure) => {
        if (figure.id === sourceFigure.id) {
            toast({
                title: t('FigurePage.relatedFigures.addDialog.selfRelationError'),
                variant: 'destructive',
            });
            return;
        }
        setSelectedFigure(figure);
    };

    const handleAddRelation = async () => {
        if (!firestore || !selectedFigure) return;

        setIsSaving(true);
        try {
            const relatedFiguresCol = collection(firestore, 'related_figures');
            const newRelation: Partial<RelatedFigure> = {
                sourceFigureId: sourceFigure.id,
                sourceFigureName: sourceFigure.name,
                targetFigureId: selectedFigure.id,
                targetFigureName: selectedFigure.name,
                createdAt: serverTimestamp(),
            };

            await addDocumentNonBlocking(relatedFiguresCol, newRelation);

            toast({
                title: t('FigurePage.relatedFigures.addDialog.addSuccessTitle'),
                description: t('FigurePage.relatedFigures.addDialog.addSuccessDescription')
                                .replace('{sourceName}', sourceFigure.name)
                                .replace('{targetName}', selectedFigure.name),
            });
            onDialogClose();
        } catch (error) {
            console.error("Error adding related figure:", error);
            toast({
                title: t('FigurePage.relatedFigures.addDialog.addErrorTitle'),
                description: t('FigurePage.relatedFigures.addDialog.addErrorDescription'),
                variant: 'destructive',
            });
        } finally {
            setIsSaving(false);
        }
    };


    return (
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>{t('FigurePage.relatedFigures.addDialog.title')}</DialogTitle>
                <DialogDescription>
                    {t('FigurePage.relatedFigures.addDialog.description').replace('{name}', sourceFigure.name)}
                </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
                {!selectedFigure ? (
                    <FigureSearchInput 
                        onFigureSelect={handleSelectFigure}
                    />
                ) : (
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
                        <Button type="button" variant="ghost" size="icon" onClick={() => setSelectedFigure(null)}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                )}
            </div>
            <DialogFooter>
                <Button type="button" variant="outline" onClick={onDialogClose}>
                    {t('FigurePage.relatedFigures.addDialog.cancelButton')}
                </Button>
                <Button type="button" onClick={handleAddRelation} disabled={!selectedFigure || isSaving}>
                    {isSaving ? <Loader2 className="animate-spin" /> : <LinkIcon className="mr-2"/>}
                    {t('FigurePage.relatedFigures.addDialog.confirmButton')}
                </Button>
            </DialogFooter>
        </DialogContent>
    );
}

