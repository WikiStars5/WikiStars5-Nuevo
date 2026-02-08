
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
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, writeBatch, serverTimestamp, increment, query, where, runTransaction, getDoc, deleteDoc } from 'firebase/firestore';
import { Loader2, ArrowLeft, Bot, User, Image as ImageIcon, Send, XCircle, Trash2, Tag } from 'lucide-react';
import type { Figure, Comment } from '@/lib/types';
import FigureSearchInput from '@/components/figure/figure-search-input';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import StarInput from '@/components/figure/star-input';
import { v4 as uuidv4 } from 'uuid';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { StarRating } from '@/components/shared/star-rating';
import { Separator } from '@/components/ui/separator';
import { updateStreak } from '@/firebase/streaks';
import { commentTags, type CommentTagId } from '@/lib/tags';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';


const simulatorSchema = z.object({
  virtualUsername: z.string().min(3, 'El nombre de usuario virtual es obligatorio.'),
  virtualAvatarUrl: z.string().url('Debe ser una URL de imagen válida.').optional().or(z.literal('')),
  commentText: z.string().min(1, 'El comentario no puede estar vacío.'),
  rating: z.number().min(0).max(5),
  tag: z.custom<CommentTagId>().optional(),
});

type SimulatorFormValues = z.infer<typeof simulatorSchema>;

function ArtificialCommentList({ figure }: { figure: Figure }) {
    const firestore = useFirestore();
    const { toast } = useToast();
    
    const commentsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(
            collection(firestore, 'figures', figure.id, 'comments'),
            where('userId', '>=', 'virtual_'),
            where('userId', '<', 'virtual_z')
        );
    }, [firestore, figure.id]);

    const { data: comments, isLoading, refetch } = useCollection<Comment>(commentsQuery);
    const [deletingId, setDeletingId] = React.useState<string | null>(null);

    const handleDelete = async (comment: Comment) => {
        if (!firestore) return;
        setDeletingId(comment.id);
        
        const figureRef = doc(firestore, 'figures', figure.id);
        const commentRef = doc(firestore, 'figures', figure.id, 'comments', comment.id);

        try {
            await runTransaction(firestore, async (transaction) => {
                const figureDoc = await transaction.get(figureRef);
                if (!figureDoc.exists()) {
                    throw new Error("El perfil de la figura ya no existe.");
                }

                if (typeof comment.rating === 'number' && comment.rating >= 0) {
                    const ratingUpdates = {
                        ratingCount: increment(-1),
                        totalRating: increment(-comment.rating),
                        [`ratingsBreakdown.${comment.rating}`]: increment(-1),
                    };
                    transaction.update(figureRef, ratingUpdates);
                    
                    const ratingStatRef = doc(firestore, `figures/${figure.id}/ratingStats`, String(comment.rating));
                    const statDoc = await transaction.get(ratingStatRef);
                    
                    if (statDoc.exists()) {
                        const country = comment.userCountry || 'unknown';
                        const gender = comment.userGender || 'unknown';
                        const statData = statDoc.data();
                        
                        if (statData[country]) {
                            statData[country].total = (statData[country].total || 1) - 1;
                            statData[country][gender] = (statData[country][gender] || 1) - 1;
                            
                            // Prevent negative counts
                            if(statData[country].total < 0) statData[country].total = 0;
                            if(statData[country][gender] < 0) statData[country][gender] = 0;

                            transaction.set(ratingStatRef, statData);
                        }
                    }
                }
                
                transaction.delete(commentRef);
            });
            
            toast({
                title: "Comentario Eliminado",
                description: "El comentario artificial ha sido eliminado y las estadísticas han sido ajustadas.",
            });
            refetch(); // Refreshes the list after deletion

        } catch (error: any) {
            console.error("Error deleting artificial comment:", error);
            toast({
                title: 'Error al Eliminar',
                description: error.message || 'No se pudo eliminar el comentario artificial.',
                variant: 'destructive',
            });
        } finally {
            setDeletingId(null);
        }
    };


    if (isLoading) {
        return <p className="text-muted-foreground">Cargando comentarios artificiales...</p>
    }

    if (!comments || comments.length === 0) {
        return (
            <div className="text-center text-muted-foreground py-4">
                <p>No se han encontrado comentarios artificiales para este perfil.</p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <Separator />
             <h3 className="font-semibold text-lg">Comentarios Artificiales Activos ({comments.length})</h3>
            {comments.map(comment => (
                <div key={comment.id} className="flex items-start gap-4 rounded-md border p-3">
                    <Avatar>
                        <AvatarImage src={comment.userPhotoURL || undefined} />
                        <AvatarFallback>{comment.userDisplayName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                        <div className="flex items-center justify-between">
                            <p className="font-semibold text-sm">{comment.userDisplayName}</p>
                            {typeof comment.rating === 'number' && comment.rating >= 0 && <StarRating rating={comment.rating} />}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{comment.text}</p>
                    </div>
                     <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => handleDelete(comment)}
                        disabled={deletingId === comment.id}
                     >
                        {deletingId === comment.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                     </Button>
                </div>
            ))}
        </div>
    )

}

export default function ActivitySimulatorPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [selectedFigure, setSelectedFigure] = React.useState<Figure | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isTagPopoverOpen, setIsTagPopoverOpen] = React.useState(false);


  const form = useForm<SimulatorFormValues>({
    resolver: zodResolver(simulatorSchema),
    defaultValues: {
      virtualUsername: '',
      virtualAvatarUrl: '',
      commentText: '',
      rating: 0,
      tag: undefined,
    },
  });

  const selectedTagId = form.watch('tag');
  const selectedTag = selectedTagId ? commentTags.find(t => t.id === selectedTagId) : null;

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
    
    const virtualUserId = `virtual_${uuidv4()}`;

    try {
        await runTransaction(firestore, async (transaction) => {
            const commentRef = doc(collection(firestore, `figures/${selectedFigure.id}/comments`));
            const newComment: Omit<Comment, 'id'> = {
                userId: virtualUserId,
                figureId: selectedFigure.id,
                text: data.commentText,
                rating: data.rating,
                tag: data.tag || null,
                createdAt: serverTimestamp() as any,
                userDisplayName: data.virtualUsername,
                userPhotoURL: data.virtualAvatarUrl || null,
                likes: Math.floor(Math.random() * 25),
                dislikes: Math.floor(Math.random() * 5),
                parentId: null,
                replyCount: 0,
                threadId: commentRef.id,
            };
            transaction.set(commentRef, newComment);

            const figureRef = doc(firestore, 'figures', selectedFigure.id);
            if (typeof data.rating === 'number' && data.rating >= 0) {
                const ratingUpdates = {
                    ratingCount: increment(1),
                    totalRating: increment(data.rating),
                    [`ratingsBreakdown.${data.rating}`]: increment(1),
                };
                transaction.update(figureRef, ratingUpdates);

                // Update ratingStats with the correct structure
                const ratingStatRef = doc(firestore, `figures/${selectedFigure.id}/ratingStats`, String(data.rating));
                const statDoc = await transaction.get(ratingStatRef);
                const statData = statDoc.exists() ? statDoc.data() : {};
                
                const country = 'unknown'; // Virtual users have unknown country/gender
                const gender = 'unknown';

                const countryData = statData[country] || { total: 0 };
                countryData.total = (countryData.total || 0) + 1;
                countryData[gender] = (countryData[gender] || 0) + 1;
                
                statData[country] = countryData;
                transaction.set(ratingStatRef, statData);
            }
        });

        // After comment is created, update the streak for the virtual user.
        await updateStreak({
          firestore,
          figureId: selectedFigure.id,
          figureName: selectedFigure.name,
          userId: virtualUserId,
          userDisplayName: data.virtualUsername,
          userPhotoURL: data.virtualAvatarUrl || null,
          isAnonymous: true,
        });

        toast({
            title: '¡Comentario Publicado!',
            description: `Se ha publicado un comentario de "${data.virtualUsername}" en el perfil de ${selectedFigure.name}.`,
        });

        form.reset({
            ...form.getValues(),
            commentText: '',
            rating: 0,
            tag: undefined
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

                            <div className="flex items-center gap-4">
                                <FormField
                                    control={form.control}
                                    name="tag"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-col gap-2">
                                            <FormLabel>Etiqueta (Opcional)</FormLabel>
                                            <Popover open={isTagPopoverOpen} onOpenChange={setIsTagPopoverOpen}>
                                                <PopoverTrigger asChild>
                                                    <FormControl>
                                                        <Button
                                                            variant="outline"
                                                            role="combobox"
                                                            className={cn("w-[150px] justify-between", !field.value && "text-muted-foreground")}
                                                        >
                                                            {selectedTag ? (
                                                                <span className="flex items-center gap-2">{selectedTag.emoji} {selectedTag.label}</span>
                                                            ) : (
                                                                <span className="flex items-center gap-2"><Tag className="h-4 w-4"/>Añadir Etiqueta</span>
                                                            )}
                                                        </Button>
                                                    </FormControl>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-[300px] p-0">
                                                    <div className="grid grid-cols-2 gap-2 p-2">
                                                        {commentTags.map(tag => (
                                                            <Button
                                                                key={tag.id}
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                className={cn("transition-all h-10 text-xs justify-start", selectedTagId === tag.id ? `${tag.color} border-2 font-bold` : 'border-dashed')}
                                                                onClick={() => {
                                                                    field.onChange(selectedTagId === tag.id ? undefined : tag.id);
                                                                    setIsTagPopoverOpen(false);
                                                                }}
                                                            >
                                                                <span className="mr-1.5">{tag.emoji}</span> {tag.label}
                                                            </Button>
                                                        ))}
                                                    </div>
                                                </PopoverContent>
                                            </Popover>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            
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
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                Publicar Comentario Artificial
                            </Button>
                        </div>
                    )}
                     {selectedFigure && <ArtificialCommentList figure={selectedFigure} />}
                </CardContent>
            </form>
        </Form>
      </Card>
    </div>
  );
}
