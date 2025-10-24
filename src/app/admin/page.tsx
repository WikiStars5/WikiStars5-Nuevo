
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { List, PlusCircle, Users, Trophy } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, doc, runTransaction, Timestamp, serverTimestamp } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';


export default function AdminDashboard() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isStartingBattle, setIsStartingBattle] = useState(false);


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

  const handleStartGoatBattle = async () => {
    if (!firestore) return;
    setIsStartingBattle(true);

    const battleId = 'messi-vs-ronaldo';
    const battleRef = doc(firestore, 'goat_battles', battleId);
    const votesCollectionRef = collection(firestore, 'users'); // Reference to the top-level users collection

    try {
        await runTransaction(firestore, async (transaction) => {
            // This is a placeholder for a more complex operation.
            // In a real scenario, you might want to clear out old votes.
            // For now, we will just reset the main battle document.

            const newEndTime = new Date();
            newEndTime.setDate(newEndTime.getDate() + 30);

            transaction.set(battleRef, {
                messiVotes: 0,
                ronaldoVotes: 0,
                endTime: Timestamp.fromDate(newEndTime),
                winner: null,
                startedAt: serverTimestamp()
            });

             // Note: Deleting all subcollections (votes) from the client is not recommended
             // for production apps due to performance and security. This would typically be
             // handled by a Cloud Function. For this prototype, we are just resetting the main doc.
        });

        toast({
            title: '¡Batalla del GOAT Iniciada!',
            description: 'El evento de 30 días ha comenzado. Los contadores se han reiniciado.',
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
                <CardTitle>Gestión de Eventos</CardTitle>
                <CardDescription>Controla los eventos especiales de la plataforma.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                        <h3 className="font-semibold">Batalla del GOAT</h3>
                        <p className="text-sm text-muted-foreground">Inicia una nueva temporada de 30 días y reinicia todos los votos.</p>
                    </div>
                    <Button onClick={handleStartGoatBattle} disabled={isStartingBattle}>
                        {isStartingBattle ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Trophy className="mr-2 h-4 w-4" />
                        )}
                        Iniciar/Reiniciar Batalla GOAT (30 Días)
                    </Button>
                </div>
            </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Acciones Rápidas</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <Button asChild>
              <Link href="/admin/figures/new">
                <PlusCircle className="mr-2 h-4 w-4" /> Añadir Nuevo Perfil
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
