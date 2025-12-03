
'use client';

import * as React from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { collection, doc, writeBatch, serverTimestamp, increment } from 'firebase/firestore';
import { Loader2, ArrowLeft, Bot, User, Image as ImageIcon, Send, XCircle } from 'lucide-react';
import type { Figure, Comment } from '@/lib/types';
import FigureSearchInput from '@/components/figure/figure-search-input';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import StarInput from '@/components/figure/star-input';
import { v4 as uuidv4 } from 'uuid';

const simulatorSchema = z.object({
  virtualUsername: z.string().min(3, 'El nombre de usuario virtual es obligatorio.'),
  virtualAvatarUrl: z.string().url('Debe ser una URL de imagen válida.').optional().or(z.literal('')),
  commentText: z.string().min(1, 'El comentario no puede estar vacío.'),
  rating: z.number().min(0).max(5),
});

type SimulatorFormValues = z.infer<typeof simulatorSchema>;

export default function ActivitySimulatorPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [selectedFigure, setSelectedFigure] = React.useState<Figure | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<SimulatorFormValues>({
    resolver: zodResolver(simulatorSchema),
    defaultValues: {
      virtualUsername: '',
      virtualAvatarUrl: '',
      commentText: '',
      rating: 0,
    },
  });

  const onSubmit = async (data: SimulatorFormValues) => {
    if (!firestore || !selectedFigure) {
        toast({
            title: 'Error',
            description: 'Por favor, selecciona un perfil de figura pública primero.',
            variant: 'destructive',
        });
        return;
    }

    setIsSubmitting(true);

    try {
        const batch = writeBatch(firestore);
        
        // 1. Prepare the new comment
        const commentRef = doc(collection(firestore, `figures/${selectedFigure.id}/comments`));
        const newComment: Omit<Comment, 'id'> = {
            userId: `virtual_${uuidv4()}`,
            figureId: selectedFigure.id,
            text: data.commentText,
            rating: data.rating,
            createdAt: serverTimestamp() as any,
            userDisplayName: data.virtualUsername,
            userPhotoURL: data.virtualAvatarUrl || null,
            likes: Math.floor(Math.random() * 25),
            dislikes: Math.floor(Math.random() * 5),
            parentId: null,
            replyCount: 0,
            threadId: commentRef.id,
        };
        batch.set(commentRef, newComment);

        // 2. Prepare the update for the figure's rating statistics
        const figureRef = doc(firestore, 'figures', selectedFigure.id);
        if (typeof data.rating === 'number' && data.rating >= 0) {
            const ratingUpdates = {
                ratingCount: increment(1),
                totalRating: increment(data.rating),
                [`ratingsBreakdown.${data.rating}`]: increment(1),
            };
            batch.update(figureRef, ratingUpdates);
        }
        
        // 3. Commit both operations atomically
        await batch.commit();

        toast({
            title: '¡Comentario Publicado!',
            description: `Se ha publicado un comentario de "${data.virtualUsername}" en el perfil de ${selectedFigure.name}.`,
        });

        form.reset({
            ...form.getValues(),
            commentText: '',
            rating: 0,
        });

    } catch (error) {
        console.error("Error creating artificial comment:", error);
        toast({
            title: 'Error al Publicar',
            description: 'No se pudo crear el comentario artificial.',
            variant: 'destructive',
        });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><Bot /> Simulador de Actividad</CardTitle>
              <CardDescription>
                Crea comentarios y valoraciones artificiales para dar la impresión de actividad inicial en el sitio.
              </CardDescription>
            </div>
            <Button variant="outline" asChild>
              <Link href="/admin"><ArrowLeft className="mr-2 h-4 w-4" /> Volver al panel</Link>
            </Button>
          </div>
        </CardHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
                <CardContent className="space-y-8">
                     <div className="space-y-4">
                        <h3 className="font-semibold text-lg">Paso 1: Selecciona el Perfil</h3>
                        {selectedFigure ? (
                             <div className="flex items-center justify-between rounded-lg border p-3">
                                <p className="font-semibold">Perfil seleccionado: <span className="text-primary">{selectedFigure.name}</span></p>
                                <Button type="button" variant="ghost" size="icon" onClick={() => setSelectedFigure(null)}>
                                    <XCircle className="h-4 w-4" />
                                </Button>
                            </div>
                        ) : (
                            <FigureSearchInput onFigureSelect={setSelectedFigure} />
                        )}
                    </div>
                    
                    {selectedFigure && (
                        <div className="space-y-4">
                            <h3 className="font-semibold text-lg">Paso 2: Define el Autor Virtual</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="virtualUsername"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="flex items-center gap-2"><User /> Nombre de Usuario Virtual</FormLabel>
                                            <FormControl>
                                                <Input {...field} placeholder="Ej: FanDelCine88" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="virtualAvatarUrl"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="flex items-center gap-2"><ImageIcon /> URL de Avatar (Opcional)</FormLabel>
                                            <FormControl>
                                                <Input {...field} placeholder="https://..." />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>
                    )}

                    {selectedFigure && (
                        <div className="space-y-4">
                             <h3 className="font-semibold text-lg">Paso 3: Crea el Contenido</h3>
                             <FormField
                                control={form.control}
                                name="rating"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Calificación con Estrellas</FormLabel>
                                        <FormControl>
                                            <StarInput 
                                                value={field.value}
                                                onChange={field.onChange}
                                            />
                                        </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="commentText"
                                render={({ field }) => (
                                    <FormItem>
                                         <FormLabel>Texto del Comentario</FormLabel>
                                        <FormControl>
                                            <Textarea {...field} placeholder="Escribe aquí el comentario artificial..." rows={4} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    )}
                </CardContent>
                {selectedFigure && (
                    <CardFooter>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                            Publicar Comentario Artificial
                        </Button>
                    </CardFooter>
                )}
            </form>
        </Form>
      </Card>
    </div>
  );
}

    