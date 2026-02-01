
'use client';

import { useState } from 'react';
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, X } from 'lucide-react';
import type { Figure } from '@/lib/types';
import FigureSearchInput from './figure-search-input';
import Image from 'next/image';

interface AddBlackpinkBiasMemberDialogProps {
  onAdd: (figure: Figure) => void;
  existingIds: string[];
  onClose: () => void;
}

export default function AddBlackpinkBiasMemberDialog({ onAdd, existingIds, onClose }: AddBlackpinkBiasMemberDialogProps) {
  const [selectedFigure, setSelectedFigure] = useState<Figure | null>(null);
  const { toast } = useToast();

  const handleSelect = (figure: Figure) => {
    if (existingIds.includes(figure.id)) {
      toast({
        title: 'Miembro ya añadido',
        description: `${figure.name} ya está en la lista de bias.`,
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
        <DialogTitle>Añadir Miembro a Bias Blackpink</DialogTitle>
        <DialogDescription>
          Busca y selecciona un perfil para añadirlo a la sección de votación de bias.
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
             <Button type="button" variant="ghost" size="icon" onClick={() => setSelectedFigure(null)}>
                <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={handleConfirm} disabled={!selectedFigure}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Añadir Miembro
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
