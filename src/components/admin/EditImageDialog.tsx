'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirestore } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import Image from 'next/image';

import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, Trash2 } from 'lucide-react';
import type { Figure } from '@/lib/types';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';

const editImageSchema = z.object({
  imageUrl: z.string().url('Debe ser una URL válida.').or(z.literal('')),
});

type EditImageFormValues = z.infer<typeof editImageSchema>;

interface EditImageDialogProps {
  figure: Figure;
  onImageUpdate: (figureId: string, newImageUrl: string) => void;
}

const isValidImageUrl = (url: string | undefined | null): boolean => {
    if (!url) return false;
    try {
        new URL(url);
        return true;
    } catch (e) {
        return false;
    }
};

export default function EditImageDialog({ figure, onImageUpdate }: EditImageDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = React.useState(false);
  const [isDialogOpen, setIsDialogOpen] = React.useState(true);

  const form = useForm<EditImageFormValues>({
    resolver: zodResolver(editImageSchema),
    defaultValues: {
      imageUrl: figure.imageUrl,
    },
  });

  const imageUrlWatcher = form.watch('imageUrl');

  const handleUpdate = async (newUrl: string) => {
    if (!firestore) return;
    setIsSaving(true);
    try {
      const figureRef = doc(firestore, 'figures', figure.id);
      await updateDoc(figureRef, { imageUrl: newUrl });

      onImageUpdate(figure.id, newUrl);
      toast({
        title: 'Imagen Actualizada',
        description: `La imagen para ${figure.name} ha sido actualizada.`,
      });
      setIsDialogOpen(false); // Close dialog on success
    } catch (error) {
      console.error('Error updating image:', error);
      toast({
        variant: 'destructive',
        title: 'Error al Guardar',
        description: 'No se pudo actualizar la imagen.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const onSubmit = (data: EditImageFormValues) => {
    handleUpdate(data.imageUrl);
  };
  
  const handleRemoveLink = () => {
    const placeholderUrl = `https://placehold.co/600x400?text=${encodeURIComponent(figure.name)}`;
    form.setValue('imageUrl', placeholderUrl);
    handleUpdate(placeholderUrl);
  };


  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Editar Imagen de Perfil</DialogTitle>
        <DialogDescription>
          Cambia la imagen para <span className="font-bold">{figure.name}</span>.
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
                <div className="space-y-2">
                    <FormField
                    control={form.control}
                    name="imageUrl"
                    render={({ field }) => (
                        <FormItem>
                        <Label htmlFor="imageUrl">URL de la Imagen</Label>
                        <FormControl>
                            <Input id="imageUrl" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                </div>
                 <div className="space-y-2">
                    <Label>Vista Previa</Label>
                    <div className="aspect-[4/5] relative w-full max-w-[150px] mx-auto rounded-md overflow-hidden border-2 border-dashed flex items-center justify-center bg-muted">
                    {isValidImageUrl(imageUrlWatcher) ? (
                        <Image src={imageUrlWatcher} alt="Vista previa" fill objectFit="cover" />
                    ) : (
                        <span className="text-xs text-muted-foreground p-2 text-center">URL inválida o vacía</span>
                    )}
                    </div>
                </div>
            </div>

            <DialogFooter className="grid grid-cols-2 gap-2 sm:flex">
                <Button type="button" variant="destructive" onClick={handleRemoveLink} disabled={isSaving}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Eliminar Enlace
                </Button>
                <DialogClose asChild>
                  <Button type="button" variant="outline">
                    Cancelar
                  </Button>
                </DialogClose>
                <Button type="submit" disabled={isSaving}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Guardar
                </Button>
            </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  );
}
