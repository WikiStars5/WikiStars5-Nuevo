
'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import type { Figure } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function AdminSharesPage() {
  const firestore = useFirestore();

  const figuresQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    // We fetch all figures and sort them on the client-side
    return query(collection(firestore, 'figures'));
  }, [firestore]);

  const { data: figures, isLoading } = useCollection<Figure>(figuresQuery);

  const sortedFigures = useMemo(() => {
    if (!figures) return [];

    return figures
      .map(figure => {
        const shareCounts = figure.shareCounts || {};
        const totalShares = Object.values(shareCounts).reduce((sum, count) => sum + (count || 0), 0);
        return { ...figure, totalShares };
      })
      .filter(figure => figure.totalShares > 0)
      .sort((a, b) => b.totalShares - a.totalShares);
  }, [figures]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Perfiles Más Compartidos</CardTitle>
            <CardDescription>
              Una lista de los perfiles ordenados por cuántas veces han sido compartidos.
            </CardDescription>
          </div>
          <Button variant="outline" asChild>
            <Link href="/admin"><ArrowLeft className="mr-2 h-4 w-4" /> Volver al panel</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Perfil</TableHead>
              <TableHead className="text-center">Total</TableHead>
              <TableHead className="text-center">Perfil</TableHead>
              <TableHead className="text-center">GOAT</TableHead>
              <TableHead className="text-center">Actitud</TableHead>
              <TableHead className="text-center">Emoción</TableHead>
              <TableHead className="text-center">Calificación</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <Skeleton className="h-5 w-24" />
                    </div>
                  </TableCell>
                  <TableCell><Skeleton className="h-5 w-12 mx-auto" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-12 mx-auto" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-12 mx-auto" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-12 mx-auto" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-12 mx-auto" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-12 mx-auto" /></TableCell>
                </TableRow>
              ))}
            {!isLoading && sortedFigures.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  Aún no se ha compartido ningún perfil.
                </TableCell>
              </TableRow>
            )}
            {sortedFigures.map((figure) => (
              <TableRow key={figure.id}>
                <TableCell>
                  <Link href={`/figures/${figure.id}`} className="flex items-center gap-3 group">
                    <Avatar>
                      <AvatarImage src={figure.imageUrl} alt={figure.name} />
                      <AvatarFallback>{figure.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium group-hover:underline">{figure.name}</span>
                  </Link>
                </TableCell>
                <TableCell className="text-center font-bold">{figure.totalShares}</TableCell>
                <TableCell className="text-center">{figure.shareCounts?.profile || 0}</TableCell>
                <TableCell className="text-center">{figure.shareCounts?.goat || 0}</TableCell>
                <TableCell className="text-center">{figure.shareCounts?.attitude || 0}</TableCell>
                <TableCell className="text-center">{figure.shareCounts?.emotion || 0}</TableCell>
                <TableCell className="text-center">{figure.shareCounts?.rating || 0}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
