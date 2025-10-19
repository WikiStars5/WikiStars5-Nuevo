'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { List, PlusCircle } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';

export default function AdminDashboard() {
  const firestore = useFirestore();
  const figuresCollection = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'figures');
  }, [firestore]);

  const { data: figures, isLoading } = useCollection(figuresCollection);

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold md:text-2xl">Panel de Administración</h1>
        <div className='flex gap-2'>
            <Button variant="outline">Panel</Button>
            <Button asChild>
                <Link href="/admin/figures">
                    Gestionar Figuras
                </Link>
            </Button>
        </div>
      </div>
      <Card>
          <CardHeader>
            <CardTitle>Panel de Administración</CardTitle>
            <CardDescription>Resumen del estado de la aplicación WikiStars5. Datos de figuras desde Firestore.</CardDescription>
          </Header>
          <CardContent>
            <div className="p-6 rounded-lg bg-muted">
              <div>
                <div className='flex justify-between items-center mb-2'>
                    <h3 className="text-sm font-medium text-muted-foreground">Total de Perfiles</h3>
                    <List className="h-4 w-4 text-muted-foreground" />
                </div>
                {isLoading ? (
                    <Skeleton className="h-9 w-1/4" />
                ) : (
                    <div className="text-4xl font-bold">{figures?.length ?? 0}</div>
                )}
                <p className="text-xs text-muted-foreground mt-1">perfiles gestionados en Firestore</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Acciones Rápidas</CardTitle>
          </Header>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Button asChild>
              <Link href="/admin/figures">
                <PlusCircle className="mr-2 h-4 w-4" /> Añadir Nuevo Perfil
              </Link>
            </Button>
            <Button asChild variant="secondary">
               <Link href="/admin/figures">
                <List className="mr-2 h-4 w-4" /> Gestionar Perfiles
              </Link>
            </Button>
          </CardContent>
        </Card>
    </>
  );
}
