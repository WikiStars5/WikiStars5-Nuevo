
'use client';

import Link from 'next/link';
import { MoreHorizontal, PlusCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import Image from 'next/image';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import type { Figure } from '@/lib/types';

export default function AdminFiguresPage() {
  const firestore = useFirestore();
  const figuresCollection = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'figures'));
  }, [firestore]);

  const { data: figures, isLoading } = useCollection<Figure>(figuresCollection);
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
            <div>
                <CardTitle>Figuras Públicas</CardTitle>
                <CardDescription>Gestiona los perfiles de las figuras públicas.</CardDescription>
            </div>
            <div className="flex gap-2">
                 <Button asChild>
                    <Link href="/admin/figures/new">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Añadir Nuevo Perfil
                    </Link>
                 </Button>
            </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="hidden w-[100px] sm:table-cell">
                <span className="sr-only">Image</span>
              </TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Nacionalidad</TableHead>
              <TableHead className="hidden md:table-cell">Etiquetas</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  <TableCell className="hidden sm:table-cell">
                    <Skeleton className="aspect-square rounded-md h-16 w-16" />
                  </TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                </TableRow>
              ))
            )}
            {figures?.map((figure) => (
              <TableRow key={figure.id}>
                <TableCell className="hidden sm:table-cell">
                  <Link href={`/figures/${figure.id}`}>
                    <Image
                      alt={figure.name}
                      className="aspect-square rounded-md object-cover"
                      height="64"
                      src={figure.imageUrl || `https://placehold.co/64x64?text=${encodeURIComponent(figure.name.charAt(0))}`}
                      width="64"
                      data-ai-hint={figure.imageHint}
                    />
                  </Link>
                </TableCell>
                <TableCell className="font-medium">
                  <Link href={`/figures/${figure.id}`} className="hover:underline">
                    {figure.name}
                  </Link>
                </TableCell>
                <TableCell>{figure.nationality}</TableCell>
                <TableCell className="hidden md:table-cell">
                    <div className="flex flex-wrap gap-1">
                        {figure.tags?.map((tag:string) => <Badge key={tag} variant="outline">{tag}</Badge>)}
                    </div>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button aria-haspopup="true" size="icon" variant="ghost">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Toggle menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                      <DropdownMenuItem asChild>
                        <Link href={`/admin/figures/${figure.id}/edit`}>Editar</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem>Eliminar</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
         {figures?.length === 0 && !isLoading && (
            <div className="text-center py-16 text-muted-foreground">
                <p>No se encontraron figuras en la base de datos.</p>
                <p className="text-sm">Puedes añadir una usando el botón "Añadir Nuevo Perfil".</p>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
