
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { List, PlusCircle, Users, Trophy, Loader2, StarOff, Smile, Sparkles, MessageSquare, MessageCircle } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase, useDoc, setDocumentNonBlocking } from '@/firebase';
import { collection, query, doc, runTransaction, Timestamp, serverTimestamp } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type { GlobalSettings } from '@/lib/types';

const battleFormSchema = z.object({
  duration: z.coerce.number().int().positive('La duración debe ser un número positivo.'),
  unit: z.enum(['minutes', 'hours', 'days']),
});

type BattleFormValues = z.infer<typeof battleFormSchema>;


export default function AdminDashboard() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isStartingBattle, setIsStartingBattle] = useState(false);

  // --- Fetch global settings ---
  const settingsDocRef = useMemoFirebase(() => firestore ? doc(firestore, 'settings', 'global') : null, [firestore]);
  const { data: globalSettings, isLoading: isLoadingSettings } = useDoc<GlobalSettings>(settingsDocRef);


  const figuresCollection = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'figures'));
  }, [firestore]);
  const { data: figures, isLoading: isLoadingFigures } = useCollection(figuresCollection);

  const usersCollection = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'users'));
  }, [firestore]);
  const { data: users, isLoading: isLoadingUsers } = useCollection(usersCollection);

  const battleForm = useForm<BattleFormValues>({
    resolver: zodResolver(battleFormSchema),
    defaultValues: {
      duration: 30,
      unit: 'days',
    },
  });

  const handleToggleRatings = async (isEnabled: boolean) => {
    if (!settingsDocRef) return;
    try {
        setDocumentNonBlocking(settingsDocRef, { isRatingEnabled: isEnabled }, { merge: true });
        toast({
            title: `Calificaciones ${isEnabled ? 'Habilitadas' : 'Deshabilitadas'}`,
            description: `Los usuarios ${isEnabled ? 'ahora pueden' : 'ya no pueden'} dejar calificaciones con estrellas.`,
        });
    } catch (error) {
        console.error("Error toggling ratings:", error);
        toast({
            title: 'Error al cambiar la configuración',
            variant: 'destructive',
        });
    }
  };

  const handleToggleVoting = async (isEnabled: boolean) => {
    if (!settingsDocRef) return;
    try {
        setDocumentNonBlocking(settingsDocRef, { isVotingEnabled: isEnabled }, { merge: true });
        toast({
            title: `Votaciones ${isEnabled ? 'Habilitadas' : 'Deshabilitadas'}`,
            description: `Los usuarios ${isEnabled ? 'ahora pueden' : 'ya no pueden'} votar por actitud y emoción.`,
        });
    } catch (error) {
        console.error("Error toggling voting:", error);
        toast({
            title: 'Error al cambiar la configuración',
            variant: 'destructive',
        });
    }
  };

  const handleToggleCommenting = async (isEnabled: boolean) => {
    if (!settingsDocRef) return;
    try {
        setDocumentNonBlocking(settingsDocRef, { isCommentingEnabled: isEnabled }, { merge: true });
        toast({
            title: `Comentarios ${isEnabled ? 'Habilitados' : 'Deshabilitados'}`,
            description: `Los usuarios ${isEnabled ? 'ahora pueden' : 'ya no pueden'} crear nuevos comentarios.`,
        });
    } catch (error) {
        console.error("Error toggling commenting:", error);
        toast({
            title: 'Error al cambiar la configuración',
            variant: 'destructive',
        });
    }
  };

  const handleToggleReplies = async (isEnabled: boolean) => {
    if (!settingsDocRef) return;
    try {
        setDocumentNonBlocking(settingsDocRef, { isReplyEnabled: isEnabled }, { merge: true });
        toast({
            title: `Respuestas ${isEnabled ? 'Habilitadas' : 'Deshabilitadas'}`,
            description: `Los usuarios ${isEnabled ? 'ahora pueden' : 'ya no pueden'} responder a comentarios.`,
        });
    } catch (error) {
        console.error("Error toggling replies:", error);
        toast({
            title: 'Error al cambiar la configuración',
            variant: 'destructive',
        });
    }
  };


  const handleStartGoatBattle = async (data: BattleFormValues) => {
    if (!firestore) return;
    setIsStartingBattle(true);

    const battleId = 'messi-vs-ronaldo';
    const battleRef = doc(firestore, 'goat_battles', battleId);

    try {
        const newEndTime = new Date();
        switch(data.unit) {
            case 'minutes':
                newEndTime.setMinutes(newEndTime.getMinutes() + data.duration);
                break;
            case 'hours':
                newEndTime.setHours(newEndTime.getHours() + data.duration);
                break;
            case 'days':
                newEndTime.setDate(newEndTime.getDate() + data.duration);
                break;
        }

        await runTransaction(firestore, async (transaction) => {
            transaction.set(battleRef, {
                messiVotes: 0,
                ronaldoVotes: 0,
                endTime: Timestamp.fromDate(newEndTime),
                winner: null,
                startedAt: serverTimestamp()
            }, { merge: true });
        });

        toast({
            title: '¡Batalla del GOAT Iniciada!',
            description: `El evento ha comenzado y durará ${data.duration} ${data.unit}. Los contadores se han reiniciado.`,
        });

    } catch (error) {
        console.error("Error starting GOAT battle:", error);
        toast({
            title: 'Error al Iniciar la Batalla',
            description: 'No se pudo iniciar el evento. Revisa la consola para más detalles.',
            variant: 'destructive',
        });
    } finally {
        setIsStartingBattle(false);
    }
};


  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold md:text-2xl">Panel de Administración</h1>
        <div className='flex gap-2'>
            <Button asChild>
                <Link href="/admin/figures">
                    Gestionar Figuras
                </Link>
            </Button>
             <Button asChild>
                <Link href="/admin/users">
                    Gestionar Usuarios
                </Link>
            </Button>
        </div>
      </div>
      <Card>
          <CardHeader>
            <CardTitle>Resumen de la Plataforma</CardTitle>
            <CardDescription>Estado general de los datos de la aplicación WikiStars5.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-6 rounded-lg bg-muted">
              <div>
                <div className='flex justify-between items-center mb-2'>
                    <h3 className="text-sm font-medium text-muted-foreground">Total de Perfiles</h3>
                    <List className="h-4 w-4 text-muted-foreground" />
                </div>
                {isLoadingFigures ? (
                    <Skeleton className="h-9 w-1/4" />
                ) : (
                    <div className="text-4xl font-bold">{figures?.length ?? 0}</div>
                )}
                <p className="text-xs text-muted-foreground mt-1">perfiles gestionados en Firestore</p>
              </div>
            </div>
             <div className="p-6 rounded-lg bg-muted">
              <div>
                <div className='flex justify-between items-center mb-2'>
                    <h3 className="text-sm font-medium text-muted-foreground">Usuarios Registrados</h3>
                    <Users className="h-4 w-4 text-muted-foreground" />
                </div>
                {isLoadingUsers ? (
                    <Skeleton className="h-9 w-1/4" />
                ) : (
                    <div className="text-4xl font-bold">{users?.length ?? 0}</div>
                )}
                <p className="text-xs text-muted-foreground mt-1">usuarios en la base de datos</p>
              </div>
            </div>
          </CardContent>
        </Card>
         <Card>
            <CardHeader>
                <CardTitle>Gestión de Eventos y Funciones</CardTitle>
                <CardDescription>Controla los eventos y funciones especiales de la plataforma.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <Form {...battleForm}>
                    <form onSubmit={battleForm.handleSubmit(handleStartGoatBattle)} className="rounded-lg border p-4 space-y-4">
                        <div>
                            <h3 className="font-semibold">Batalla del GOAT</h3>
                            <p className="text-sm text-muted-foreground">Configura e inicia una nueva temporada, reiniciando todos los votos.</p>
                        </div>
                        <div className="flex flex-col sm:flex-row items-end gap-4">
                             <FormField
                                control={battleForm.control}
                                name="duration"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Duración</FormLabel>
                                        <FormControl>
                                            <Input type="number" placeholder="Ej: 30" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={battleForm.control}
                                name="unit"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Unidad</FormLabel>
                                         <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecciona unidad" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="minutes">Minutos</SelectItem>
                                                <SelectItem value="hours">Horas</SelectItem>
                                                <SelectItem value="days">Días</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button type="submit" disabled={isStartingBattle} className="w-full sm:w-auto">
                                {isStartingBattle ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Trophy className="mr-2 h-4 w-4" />
                                )}
                                Iniciar/Reiniciar Batalla
                            </Button>
                        </div>
                    </form>
                </Form>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-lg border p-4 flex items-center justify-between">
                        <div>
                            <h3 className="font-semibold flex items-center gap-2"><StarOff /> Calificaciones</h3>
                            <p className="text-sm text-muted-foreground">Permitir calificar perfiles.</p>
                        </div>
                        {isLoadingSettings ? (
                            <Skeleton className="h-6 w-12" />
                        ) : (
                            <Switch
                                checked={globalSettings?.isRatingEnabled ?? true}
                                onCheckedChange={handleToggleRatings}
                                aria-label="Toggle star ratings"
                            />
                        )}
                    </div>
                    <div className="rounded-lg border p-4 flex items-center justify-between">
                        <div>
                            <h3 className="font-semibold flex items-center gap-2"><Smile /> Votaciones</h3>
                            <p className="text-sm text-muted-foreground">Permitir votar por actitud y emoción.</p>
                        </div>
                        {isLoadingSettings ? (
                            <Skeleton className="h-6 w-12" />
                        ) : (
                            <Switch
                                checked={globalSettings?.isVotingEnabled ?? true}
                                onCheckedChange={handleToggleVoting}
                                aria-label="Toggle attitude and emotion voting"
                            />
                        )}
                    </div>
                     <div className="rounded-lg border p-4 flex items-center justify-between">
                        <div>
                            <h3 className="font-semibold flex items-center gap-2"><MessageSquare /> Comentarios</h3>
                            <p className="text-sm text-muted-foreground">Permitir crear nuevos comentarios.</p>
                        </div>
                        {isLoadingSettings ? (
                            <Skeleton className="h-6 w-12" />
                        ) : (
                            <Switch
                                checked={globalSettings?.isCommentingEnabled ?? true}
                                onCheckedChange={handleToggleCommenting}
                                aria-label="Toggle main comments"
                            />
                        )}
                    </div>
                     <div className="rounded-lg border p-4 flex items-center justify-between">
                        <div>
                            <h3 className="font-semibold flex items-center gap-2"><MessageCircle /> Respuestas</h3>
                            <p className="text-sm text-muted-foreground">Permitir responder a comentarios.</p>
                        </div>
                        {isLoadingSettings ? (
                            <Skeleton className="h-6 w-12" />
                        ) : (
                            <Switch
                                checked={globalSettings?.isReplyEnabled ?? true}
                                onCheckedChange={handleToggleReplies}
                                aria-label="Toggle comment replies"
                            />
                        )}
                    </div>
                </div>

            </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Acciones Rápidas</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <Button asChild>
              <Link href="/admin/figures/new">
                <PlusCircle className="mr-2 h-4 w-4" /> Añadir Nuevo Perfil
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/admin/bulk-create">
                <Sparkles className="mr-2 h-4 w-4" /> Creación Rápida
              </Link>
            </Button>
            <Button asChild variant="secondary">
               <Link href="/admin/figures">
                <List className="mr-2 h-4 w-4" /> Gestionar Perfiles
              </Link>
            </Button>
            <Button asChild variant="secondary">
               <Link href="/admin/users">
                <Users className="mr-2 h-4 w-4" /> Gestionar Usuarios
              </Link>
            </Button>
          </CardContent>
        </Card>
    </>
  );
}
