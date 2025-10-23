
'use client';

import { useState, useMemo } from 'react';
import { MoreHorizontal, XCircle } from 'lucide-react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { CountrySelector } from '@/components/figure/country-selector';

export default function AdminUsersPage() {
  const firestore = useFirestore();
  const usersCollection = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'users'));
  }, [firestore]);

  const { data: users, isLoading } = useCollection<any>(usersCollection);

  const [countryFilter, setCountryFilter] = useState<string>('');
  const [genderFilter, setGenderFilter] = useState<string>('');
  
  const filteredUsers = useMemo(() => {
    if (!users) return [];
    return users.filter(user => {
        const countryMatch = !countryFilter || user.country === countryFilter;
        const genderMatch = !genderFilter || user.gender === genderFilter;
        return countryMatch && genderMatch;
    });
  }, [users, countryFilter, genderFilter]);

  const clearFilters = () => {
    setCountryFilter('');
    setGenderFilter('');
  }

  const getAvatarFallback = (user: any) => {
    return user.displayName?.charAt(0) || user.email?.charAt(0) || 'U';
  }
  
  return (
    <Card>
      <CardHeader>
         <div className="flex items-center justify-between">
            <div>
                <CardTitle>Users</CardTitle>
                <CardDescription>
                    {isLoading ? 'Cargando usuarios...' : `Mostrando ${filteredUsers.length} de ${users?.length || 0} usuarios.`}
                </CardDescription>
            </div>
            <div className="flex items-center gap-2">
                <CountrySelector value={countryFilter} onChange={setCountryFilter} />
                <Select value={genderFilter} onValueChange={setGenderFilter}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filtrar por sexo" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Masculino">Masculino</SelectItem>
                        <SelectItem value="Femenino">Femenino</SelectItem>
                        <SelectItem value="Otro">Otro</SelectItem>
                    </SelectContent>
                </Select>
                 {(countryFilter || genderFilter) && (
                    <Button variant="ghost" size="icon" onClick={clearFilters}>
                        <XCircle className="h-5 w-5" />
                    </Button>
                )}
            </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="hidden md:table-cell">Country</TableHead>
              <TableHead className="hidden md:table-cell">Last Access</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
             {isLoading && (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-9 w-9 rounded-full" />
                      <Skeleton className="h-5 w-24" />
                    </div>
                  </TableCell>
                  <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-12" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                </TableRow>
              ))
            )}
            {filteredUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                    <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                            <AvatarImage src={user.photoURL} alt={user.displayName} />
                            <AvatarFallback>{getAvatarFallback(user)}</AvatarFallback>
                        </Avatar>
                        <div className="font-medium">{user.username || 'N/A'}</div>
                    </div>
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Badge variant={user.role === 'admin' ? 'destructive' : 'outline'}>
                    {user.role || 'user'}
                  </Badge>
                </TableCell>
                <TableCell className="hidden md-table-cell">{user.country || 'N/A'}</TableCell>
                <TableCell className="hidden md:table-cell">
                    {user.lastLogin?.seconds ? format(new Date(user.lastLogin.seconds * 1000), "MMMM d, yyyy") : 'N/A'}
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
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem>Make Admin</DropdownMenuItem>
                      <DropdownMenuItem>Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
             {!isLoading && filteredUsers.length === 0 && (
                <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                        No se encontraron usuarios con los filtros seleccionados.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
