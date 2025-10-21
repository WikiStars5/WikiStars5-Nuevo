
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Users } from 'lucide-react';
import type { Figure } from '@/lib/types';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import AddRelatedFigureDialog from './add-related-figure-dialog';
import FigureCard from '../shared/figure-card';

interface RelatedFiguresProps {
    figure: Figure;
}

export default function RelatedFigures({ figure }: RelatedFiguresProps) {
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

    return (
        <Card>
            <CardHeader>
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                           <Users /> Perfiles Relacionados
                        </CardTitle>
                        <CardDescription>Otros perfiles que podrían interesarte.</CardDescription>
                    </div>
                     <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline">
                                <PlusCircle className="mr-2" />
                                Añadir
                            </Button>
                        </DialogTrigger>
                        <AddRelatedFigureDialog 
                            sourceFigure={figure} 
                            onDialogClose={() => setIsAddDialogOpen(false)} 
                        />
                     </Dialog>
                </div>
            </CardHeader>
            <CardContent>
                {/* This will be populated later */}
                <p className="text-sm text-muted-foreground text-center py-8">
                    Aún no se han añadido perfiles relacionados.
                </p>
            </CardContent>
        </Card>
    );
}
