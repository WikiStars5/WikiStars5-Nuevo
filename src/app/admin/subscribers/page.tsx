
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
import { collection, query, where, orderBy, limit, startAfter, DocumentSnapshot } from 'firebase/firestore';
import type { User } from '@/lib/types';
import { ArrowLeft, Bell, ChevronLeft, ChevronRight, Smartphone } from 'lucide-react';
import { countries } from '@/lib/countries';
import { useLanguage } from '@/context/LanguageContext';

const ITEMS_PER_PAGE = 20;

export default function SubscribersAdminPage() {
  const firestore = useFirestore();
  const { t } = useLanguage();
  const [currentPage, setCurrentPage] = React.useState(1);
  const [lastVisible, setLastVisible] = React.useState<DocumentSnapshot | null>(null);
  const [pageSnapshots, setPageSnapshots] = React.useState<Record<number, DocumentSnapshot>>({});

  const subscribersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    
    let q = query(
      collection(firestore, 'users'),
      where('tokenCount', '>', 0),
      orderBy('tokenCount', 'desc'),
      limit(ITEMS_PER_PAGE)
    );

    if (currentPage > 1 && pageSnapshots[currentPage - 1]) {
        q = query(q, startAfter(pageSnapshots[currentPage - 1]));
    }

    return q;
  }, [firestore, currentPage, pageSnapshots]);

  const { data: subscribers, isLoading } = useCollection<User>(subscribersQuery, {
      onNewData: (snapshot) => {
          if (snapshot.docs.length > 0) {
              const last = snapshot.docs[snapshot.docs.length - 1];
              setLastVisible(last);
          }
      }
  });

  const handleNextPage = () => {
      if (lastVisible) {
          setPageSnapshots(prev => ({ ...prev, [currentPage]: lastVisible }));
          setCurrentPage(prev => prev + 1);
      }
  };

  const handlePrevPage = () => {
      setCurrentPage(prev => Math.max(1, prev - 1));
  };

  const getCountryName = (countryKey?: string) => {
    if (!countryKey) return 'N/A';
    return t(`countries.${countryKey.toLowerCase().replace(/ /g, '_')}`);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="text-primary" />
              Suscriptores de Notificaciones
            </CardTitle>
            <CardDescription>
              Usuarios que han habilitado las notificaciones push (FCM).
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
              <TableHead>Usuario</TableHead>
              <TableHead>País</TableHead>
              <TableHead>Sexo</TableHead>
              <TableHead className="text-center">Dispositivos</TableHead>
              <TableHead className="text-right">Última Visita</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={`skel-${i}`}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <Skeleton className="h-5 w-32" />
                    </div>
                  </TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-8 mx-auto" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-5 w-24 ml-auto" /></TableCell>
                </TableRow>
              ))}
            {!isLoading && (!subscribers || subscribers.length === 0) && (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  Aún no hay usuarios suscritos.
                </TableCell>
              </TableRow>
            )}
            {!isLoading && subscribers?.map((sub) => {
                const countryData = sub.country ? countries.find(c => c.key === sub.country?.toLowerCase()) : null;
                return (
                    <TableRow key={sub.id}>
                        <TableCell>
                        <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={sub.profilePhotoUrl || undefined} />
                                <AvatarFallback>{sub.username?.charAt(0) || 'U'}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{sub.username || 'Invitado'}</span>
                        </div>
                        </TableCell>
                        <TableCell>
                            <div className="flex items-center gap-2">
                                {countryData && (
                                    <Image
                                        src={`https://flagcdn.com/w20/${countryData.code.toLowerCase()}.png`}
                                        alt={countryData.key}
                                        width={20}
                                        height={15}
                                        className="object-contain"
                                    />
                                )}
                                <span className="text-xs">{getCountryName(sub.country || undefined)}</span>
                            </div>
                        </TableCell>
                        <TableCell className="text-xs">{sub.gender || 'N/A'}</TableCell>
                        <TableCell className="text-center">
                            <div className="inline-flex items-center gap-1 bg-muted px-2 py-1 rounded-md text-xs font-bold">
                                <Smartphone className="h-3 w-3" />
                                {sub.tokenCount || sub.fcmTokens?.length || 0}
                            </div>
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                            {sub.lastVisit ? format(sub.lastVisit.toDate(), 'PP', { locale: es }) : 'Nunca'}
                        </TableCell>
                    </TableRow>
                )
            })}
          </TableBody>
        </Table>
      </CardContent>
       <CardFooter className="flex justify-between items-center">
        <div className="text-xs text-muted-foreground">
          Página <strong>{currentPage}</strong>
        </div>
        <div className="flex items-center gap-2">
            <Button
                size="sm"
                variant="outline"
                onClick={handlePrevPage}
                disabled={currentPage === 1 || isLoading}
            >
                <ChevronLeft className="h-4 w-4" />
                Anterior
            </Button>
            <Button
                size="sm"
                variant="outline"
                onClick={handleNextPage}
                disabled={isLoading || (subscribers?.length || 0) < ITEMS_PER_PAGE}
            >
                Siguiente
                <ChevronRight className="h-4 w-4" />
            </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
