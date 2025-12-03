
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { List, PlusCircle, Users, Trophy, Loader2, StarOff, Smile, Sparkles, MessageSquare, MessagesSquare, MessageCircle, Share2, Bot, Calendar as CalendarIcon, Clock } from 'lucide-react';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const battleFormSchema = z.object({
  startDate: z.date().optional(),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'El formato debe ser HH:MM').optional(),
  endDate: z.date({
    required_error: "La fecha de finalización es obligatoria.",
  }),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'El formato debe ser HH:MM'),
}).refine(data => {
    // Si no hay fecha de inicio, no podemos validar
    if (!data.startDate || !data.endDate) return true;

    const startDateTime = new Date(data.startDate);
    const [startHours, startMinutes] = (data.startTime || "00:00").split(':');
    startDateTime.setHours(parseInt(startHours, 10), parseInt(startMinutes, 10), 0, 0);

    const endDateTime = new Date(data.endDate);
    const [endHours, endMinutes] = (data.endTime || "00:00").split(':');
    endDateTime.setHours(parseInt(endHours, 10), parseInt(endMinutes, 10), 0, 0);

    return endDateTime > startDateTime;
}, {
    message: "La fecha y hora de finalización debe ser posterior a la de inicio.",
    path: ["endDate"], // Asignar el error al campo de fecha de finalización
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
      startDate: new Date(),
      startTime: '00:00',
      endTime: '00:00',
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
        // Determine start time
        let startTime = data.startDate ? new Date(data.startDate) : new Date();
        if (data.startTime) {
            const [startHours, startMinutes] = data.startTime.split(':');
            startTime.setHours(parseInt(startHours, 10), parseInt(startMinutes, 10), 0, 0);
        }

        // Determine end time
        let endTime = new Date(data.endDate);
        const [endHours, endMinutes] = data.endTime.split(':');
        endTime.setHours(parseInt(endHours, 10), parseInt(endMinutes, 10), 0, 0);
        
        await runTransaction(firestore, async (transaction) => {
            transaction.set(battleRef, {
                messiVotes: 0,
                ronaldoVotes: 0,
                startTime: Timestamp.fromDate(startTime),
                endTime: Timestamp.fromDate(endTime),
                winner: null,
                isPaused: false,
            }, { merge: false });
        });

        toast({
            title: '¡Batalla del GOAT Programada!',
            description: `Inicio: ${format(startTime, 'Pp', { locale: es })}. Fin: ${format(endTime, 'Pp', { locale: es })}.`,
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                             <FormField
                                control={battleForm.control}
                                name="startDate"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                    <FormLabel>Fecha de Inicio (Opcional)</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button
                                            variant={"outline"}
                                            className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                                            >
                                            {field.value ? format(field.value, "PPP", { locale: es }) : <span>Selecciona una fecha</span>}
                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                            </Button>
                                        </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={battleForm.control}
                                name="startTime"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Hora de Inicio (Opcional)</FormLabel>
                                        <FormControl><Input type="time" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={battleForm.control}
                                name="endDate"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                    <FormLabel>Fecha de Finalización*</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button
                                            variant={"outline"}
                                            className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                                            >
                                            {field.value ? format(field.value, "PPP", { locale: es }) : <span>Selecciona una fecha</span>}
                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                            </Button>
                                        </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))} initialFocus />
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={battleForm.control}
                                name="endTime"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Hora de Finalización*</FormLabel>
                                        <FormControl><Input type="time" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <Button type="submit" disabled={isStartingBattle}>
                            {isStartingBattle ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trophy className="mr-2 h-4 w-4" />}
                            Programar/Reiniciar Batalla
                        </Button>
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
               <Link href="/admin/shares">
                <Share2 className="mr-2 h-4 w-4" /> Ver Compartidos
              </Link>
            </Button>
            <Button asChild variant="secondary">
               <Link href="/admin/activity-simulator">
                <Bot className="mr-2 h-4 w-4" /> Simulador de Actividad
              </Link>
            </Button>
          </CardContent>
        </Card>
    </>
  );
}
