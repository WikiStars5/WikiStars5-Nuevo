'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import type { Figure } from '@/lib/types';
import { ArrowLeft, ChevronLeft, ChevronRight, Flame } from 'lucide-react';
import { formatCompactNumber } from '@/lib/utils';

const ITEMS_PER_PAGE = 20;

export default function LoyaltyDashboardPage() {
  const firestore = useFirestore();
  const [currentPage, setCurrentPage] = React.useState(1);

  const figuresQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'figures'), orderBy('activeStreakCount', 'desc'));
  }, [firestore]);

  const { data: figures, isLoading } = useCollection<Figure>(figuresQuery);

  const totalPages = figures ? Math.ceil(figures.length / ITEMS_PER_PAGE) : 1;

  const paginatedFigures = React.useMemo(() => {
    if (!figures) return [];
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return figures.slice(startIndex, endIndex);
  }, [figures, currentPage]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Flame className="text-orange-500" />
              Panel de Lealtad
            </CardTitle>
            <CardDescription>
              Figuras ordenadas por el número de usuarios con rachas activas.
            </CardDescription>
          </div>
          <Button variant="outline" asChild>
            <Link href="/admin">
              <ArrowLeft className="mr-2 h-4 w-4" /> Volver al panel
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Perfil de Figura</TableHead>
              <TableHead className="text-right">Usuarios Leales (Rachas Activas)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 10 }).map((_, i) => (
                <TableRow key={`skel-${i}`}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-md" />
                      <Skeleton className="h-5 w-32" />
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Skeleton className="h-5 w-16 ml-auto" />
                  </TableCell>
                </TableRow>
              ))}
            {!isLoading && paginatedFigures.length === 0 && (
              <TableRow>
                <TableCell colSpan={2} className="h-24 text-center">
                  Aún no hay datos de lealtad. ¡Los usuarios necesitan empezar a comentar!
                </TableCell>
              </TableRow>
            )}
            {paginatedFigures.map((figure) => (
              <TableRow key={figure.id}>
                <TableCell>
                  <Link href={`/figures/${figure.id}`} className="flex items-center gap-3 group">
                    <div className="relative h-12 w-12 rounded-md overflow-hidden">
                       <Image
                          src={figure.imageUrl || 'https://placehold.co/64x64'}
                          alt={figure.name}
                          fill
                          className="object-cover"
                        />
                    </div>
                    <span className="font-medium group-hover:underline">{figure.name}</span>
                  </Link>
                </TableCell>
                <TableCell className="text-right font-bold text-lg text-orange-500">
                  {formatCompactNumber(figure.activeStreakCount || 0)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
       <CardFooter>
        <div className="text-xs text-muted-foreground">
          Mostrando <strong>{paginatedFigures.length}</strong> de <strong>{figures?.length ?? 0}</strong> perfiles.
        </div>
        <div className="ml-auto flex items-center gap-2">
            <Button
                size="sm"
                variant="outline"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1 || isLoading}
            >
                <ChevronLeft className="h-4 w-4" />
                Anterior
            </Button>
             <span className="text-sm font-medium">
              Página {currentPage} de {totalPages}
            </span>
            <Button
                size="sm"
                variant="outline"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages || isLoading}
            >
                Siguiente
                <ChevronRight className="h-4 w-4" />
            </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
