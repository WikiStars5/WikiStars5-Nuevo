
'use client';

import * as React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '../ui/skeleton';
import Link from 'next/link';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import type { User } from '@/lib/types';
import { CalendarDays } from 'lucide-react';


export default function UserVisitTable() {
    const firestore = useFirestore();
    const usersQuery = useMemoFirebase(() => 
        firestore 
            ? query(
                collection(firestore, 'users'), 
                orderBy('visitCount', 'desc')
              ) 
            : null, 
        [firestore]
    );
    const { data: users, isLoading } = useCollection<User>(usersQuery);

    const getAvatarFallback = (name: string | null | undefined) => {
        return name ? name.charAt(0).toUpperCase() : 'U';
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><CalendarDays /> Días Activos de Usuarios</CardTitle>
                <CardDescription>
                    Usuarios ordenados por la cantidad de días únicos que han visitado el sitio.
                </CardDescription>
            </CardHeader>
            <CardContent>
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Usuario</TableHead>
                            <TableHead className="text-center">Días Activos</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading && Array.from({length: 3}).map((_, i) => (
                             <TableRow key={`skel-visit-${i}`}>
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <Skeleton className="h-10 w-10 rounded-full" />
                                        <Skeleton className="h-4 w-24" />
                                    </div>
                                </TableCell>
                                <TableCell className="text-center"><Skeleton className="h-4 w-8 mx-auto" /></TableCell>
                             </TableRow>
                        ))}
                        {!isLoading && users?.map(user => (
                            <TableRow key={user.id}>
                                <TableCell>
                                    <Link href={`/u/${user.username}`} className="flex items-center gap-3 group">
                                        <Avatar>
                                            <AvatarImage src={user.profilePhotoUrl || undefined} />
                                            <AvatarFallback>{getAvatarFallback(user.username)}</AvatarFallback>
                                        </Avatar>
                                        <p className="font-medium group-hover:underline">{user.username}</p>
                                    </Link>
                                </TableCell>
                                <TableCell className="text-center font-bold">
                                    {user.visitCount || 0}
                                </TableCell>
                            </TableRow>
                        ))}
                         {!isLoading && (!users || users.length === 0) && (
                            <TableRow>
                                <TableCell colSpan={2} className="h-24 text-center">
                                    No se encontraron datos de visitas de usuarios.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                 </Table>
            </CardContent>
            <CardFooter>
                 <div className="text-xs text-muted-foreground">
                    Mostrando <strong>{users?.length ?? 0}</strong> usuarios.
                 </div>
            </CardFooter>
        </Card>
    )
}
