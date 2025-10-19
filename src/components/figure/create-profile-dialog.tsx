'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirestore } from '@/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';


const profileSchema = z.object({
  name: z.string().min(2, { message: 'El nombre debe tener al menos 2 caracteres.' }),
  nationality: z.string().min(2, { message: 'La nacionalidad debe tener al menos 2 caracteres.' }),
  bio: z.string().min(10, { message: 'La biografía debe tener al menos 10 caracteres.' }),
  tags: z.string().min(1, { message: 'Añade al menos una etiqueta.' }),
  imageUrl: z.string().url({ message: 'Por favor, introduce una URL de imagen válida.' }),
  imageHint: z.string().min(1, { message: 'Por favor, añade una pista para la imagen.' }),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

interface CreateProfileDialogProps {
  onOpenChange: (open: boolean) => void;
}

export default function CreateProfileDialog({ onOpenChange }: CreateProfileDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: '',
      nationality: '',
      bio: '',
      tags: '',
      imageUrl: '',
      imageHint: '',
    },
  });

  const onSubmit = async (data: ProfileFormValues) => {
    if (!firestore) return;
    setIsSubmitting(true);

    const figureData = {
      name: data.name,
      nationality: data.nationality,
      bio: data.bio,
      tags: data.tags.split(',').map(tag => tag.trim()),
      imageUrl: data.imageUrl,
      imageHint: data.imageHint,
      isFeatured: false,
      // Default empty rating structure
      ratings: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
      socials: {},
    };

    try {
      const figuresCollection = collection(firestore, 'figures');
      addDocumentNonBlocking(figuresCollection, figureData)

      toast({
        title: '¡Perfil Creado!',
        description: `El perfil para ${data.name} ha sido añadido.`,
      });
      form.reset();
      onOpenChange(false); // Close the dialog on success
    } catch (error) {
      console.error('Error creating profile:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo crear el perfil. Por favor, inténtalo de nuevo.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DialogContent className="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>Crear Perfil de Personaje</DialogTitle>
        <DialogDescription>Añade un nuevo perfil a la base de datos de WikiStars5.</DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre</FormLabel>
                <FormControl>
                  <Input placeholder="Ej: Aurora Velle" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="nationality"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nacionalidad</FormLabel>
                <FormControl>
                  <Input placeholder="Ej: Francia" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="bio"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Biografía</FormLabel>
                <FormControl>
                  <Textarea placeholder="Una breve descripción de la figura..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="tags"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Etiquetas</FormLabel>
                <FormControl>
                  <Input placeholder="Ej: Arte Digital, Ilustración" {...field} />
                </FormControl>
                 <DialogDescription className="text-xs">Separar con comas.</DialogDescription>
                <FormMessage />
              </FormItem>
            )}
          />
           <FormField
            control={form.control}
            name="imageUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>URL de la Imagen</FormLabel>
                <FormControl>
                  <Input placeholder="https://images.unsplash.com/..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
           <FormField
            control={form.control}
            name="imageHint"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Pista de la Imagen (para IA)</FormLabel>
                <FormControl>
                  <Input placeholder="Ej: woman portrait" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmitting ? 'Guardando...' : 'Guardar Perfil'}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  );
}
