import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getFigures } from '@/lib/data';
import { List, PlusCircle } from 'lucide-react';

export default async function AdminDashboard() {
  const figures = await getFigures();

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
          </CardHeader>
          <CardContent>
            <div className="p-6 rounded-lg bg-muted">
                <div className='flex justify-between items-center mb-2'>
                    <h3 className="text-sm font-medium text-muted-foreground">Total de Perfiles</h3>
                    <List className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="text-4xl font-bold">{figures.length}</div>
                <p className="text-xs text-muted-foreground">perfiles gestionados en Firestore</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Acciones Rápidas</CardTitle>
          </CardHeader>
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
