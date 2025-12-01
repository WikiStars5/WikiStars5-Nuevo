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
import { MoreHorizontal, User, Eye, UserCog } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '../ui/skeleton';
import Image from 'next/image';

// Mock data - replace with real data from Firebase
const mockUsers = [
  {
    id: '1',
    profilePhotoUrl: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=100&q=80',
    username: 'alicew',
    email: 'alice.w@example.com',
    country: 'Argentina',
    countryCode: 'ar'
  },
  {
    id: '2',
    profilePhotoUrl: 'https://images.unsplash.com/photo-1636377985931-898218afd306?w=100&q=80',
    username: 'bob.j',
    email: 'b.johnson@example.com',
    country: 'México',
    countryCode: 'mx'
  },
  {
    id: '3',
    profilePhotoUrl: null,
    username: 'invitado_x4f',
    email: null,
    country: 'España',
    countryCode: 'es'
  },
];


export default function UserManagementTable() {
    const isLoading = false; // Replace with real loading state later
    const users = mockUsers; // Replace with real users data later

    const getAvatarFallback = (name: string | null) => {
        return name ? name.charAt(0).toUpperCase() : <User className="h-4 w-4" />;
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><UserCog /> Gestión de Usuarios</CardTitle>
                <CardDescription>
                    Visualiza, busca y gestiona todos los usuarios de la plataforma.
                </CardDescription>
            </CardHeader>
            <CardContent>
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Usuario</TableHead>
                            <TableHead>País</TableHead>
                            <TableHead><span className="sr-only">Acciones</span></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading && Array.from({length: 3}).map((_, i) => (
                             <TableRow key={`skel-${i}`}>
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <Skeleton className="h-10 w-10 rounded-full" />
                                        <div className="space-y-1">
                                            <Skeleton className="h-4 w-24" />
                                            <Skeleton className="h-3 w-32" />
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                             </TableRow>
                        ))}
                        {!isLoading && users.map(user => (
                            <TableRow key={user.id}>
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <Avatar>
                                            <AvatarImage src={user.profilePhotoUrl || undefined} />
                                            <AvatarFallback>{getAvatarFallback(user.username)}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-medium">{user.username}</p>
                                            <p className="text-sm text-muted-foreground">{user.email || 'Cuenta de invitado'}</p>
                                        </div>
                                    </div>
                                </TableCell>
                                 <TableCell>
                                    <div className="flex items-center gap-2">
                                        {user.countryCode && (
                                             <Image 
                                                src={`https://flagcdn.com/w20/${user.countryCode.toLowerCase()}.png`}
                                                width={20}
                                                height={15}
                                                alt={user.country}
                                                className="object-contain"
                                            />
                                        )}
                                        <span>{user.country || 'N/A'}</span>
                                    </div>
                                 </TableCell>
                                 <TableCell className="text-right">
                                     <Button variant="outline" size="sm">
                                        <Eye className="mr-2 h-4 w-4" /> Ver detalles
                                     </Button>
                                 </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                 </Table>
            </CardContent>
            <CardFooter>
                 <div className="text-xs text-muted-foreground">
                    Mostrando <strong>{users.length}</strong> de <strong>{users.length}</strong> usuarios.
                 </div>
            </CardFooter>
        </Card>
    )
}