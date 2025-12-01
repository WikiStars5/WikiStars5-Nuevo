
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
import { Button } from '@/components/ui/button';
import { UserCog, Eye } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';
import Link from 'next/link';

// Mock data - replace with real data from Firebase later
const mockUsers = [
  {
    id: '1',
    username: 'tifany',
    profilePhotoUrl: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=100&q=80',
    attitudeVotes: 5,
    emotionVotes: 8,
    goatVote: 'Messi',
    ratingsCount: 12,
  },
  {
    id: '2',
    username: 'juanperez',
    profilePhotoUrl: 'https://images.unsplash.com/photo-1636377985931-898218afd306?w=100&q=80',
    attitudeVotes: 2,
    emotionVotes: 15,
    goatVote: 'Ronaldo',
    ratingsCount: 20,
  },
  {
    id: '3',
    username: 'maria_g',
    profilePhotoUrl: null,
    attitudeVotes: 10,
    emotionVotes: 3,
    goatVote: null,
    ratingsCount: 5,
  },
];

export default function UserManagementTable() {
    const isLoading = false; // Replace with real loading state later

    const getAvatarFallback = (name: string | null) => {
        return name ? name.charAt(0).toUpperCase() : 'U';
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><UserCog /> Gestión de Usuarios</CardTitle>
                <CardDescription>
                    Visualiza, busca y gestiona la actividad de todos los usuarios de la plataforma.
                </CardDescription>
            </CardHeader>
            <CardContent>
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Usuarios</TableHead>
                            <TableHead>Actitud</TableHead>
                            <TableHead>Emocion</TableHead>
                            <TableHead>Goat</TableHead>
                            <TableHead>Calificacion</TableHead>
                            <TableHead><span className="sr-only">Acciones</span></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading && Array.from({length: 3}).map((_, i) => (
                             <TableRow key={`skel-${i}`}>
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <Skeleton className="h-10 w-10 rounded-full" />
                                        <Skeleton className="h-4 w-24" />
                                    </div>
                                </TableCell>
                                <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                                <TableCell><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                             </TableRow>
                        ))}
                        {!isLoading && mockUsers.map(user => (
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
                                <TableCell>
                                    La cantidad de perfiles en la cual votó en actitud: <span className="font-bold">{user.attitudeVotes}</span>
                                </TableCell>
                                <TableCell>
                                    La cantidad de perfiles en la cual votó en emoción: <span className="font-bold">{user.emotionVotes}</span>
                                </TableCell>
                                <TableCell>
                                    {user.goatVote ? `Votó por ${user.goatVote}` : 'No ha votado'}
                                </TableCell>
                                <TableCell>
                                    La cantidad de perfiles que calificó con estrellas: <span className="font-bold">{user.ratingsCount}</span>
                                </TableCell>
                                 <TableCell className="text-right">
                                     <Button variant="outline" size="sm" asChild>
                                        <Link href={`/u/${user.username}`}>
                                            <Eye className="mr-2 h-4 w-4" /> Ver Perfil
                                        </Link>
                                     </Button>
                                 </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                 </Table>
            </CardContent>
            <CardFooter>
                 <div className="text-xs text-muted-foreground">
                    Mostrando <strong>{mockUsers.length}</strong> de <strong>{mockUsers.length}</strong> usuarios.
                 </div>
            </CardFooter>
        </Card>
    )
}
