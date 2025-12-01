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
import { UserCog } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';
import Link from 'next/link';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, getDocs, doc, getDoc, where, collectionGroup } from 'firebase/firestore';
import type { User } from '@/lib/types';


interface EnrichedUser extends User {
    attitudeVotes: number;
    emotionVotes: number;
    goatVote: string | null;
    ratingsCount: number;
}


export default function UserManagementTable() {
    const firestore = useFirestore();
    const usersCollection = useMemoFirebase(() => firestore ? query(collection(firestore, 'users')) : null, [firestore]);
    const { data: users, isLoading: isLoadingUsers } = useCollection<User>(usersCollection);

    const [enrichedUsers, setEnrichedUsers] = React.useState<EnrichedUser[]>([]);
    const [isLoadingDetails, setIsLoadingDetails] = React.useState(true);

    React.useEffect(() => {
        const fetchDetails = async () => {
            if (!users || !firestore) return;

            setIsLoadingDetails(true);
            const enrichedData = await Promise.all(
                users.map(async (user) => {
                    // Get attitude votes count
                    const attitudeVotesSnap = await getDocs(collection(firestore, `users/${user.id}/attitudeVotes`));
                    
                    // Get emotion votes count
                    const emotionVotesSnap = await getDocs(collection(firestore, `users/${user.id}/emotionVotes`));

                    // Get GOAT vote
                    const goatVoteDoc = await getDoc(doc(firestore, `goat_battles/messi-vs-ronaldo/votes/${user.id}`));
                    const goatVote = goatVoteDoc.exists() ? goatVoteDoc.data().vote : null;

                    // Get ratings count
                    const commentsQuery = query(
                        collectionGroup(firestore, 'comments'), 
                        where('userId', '==', user.id),
                        where('rating', '>=', 0)
                    );
                    const ratingsSnap = await getDocs(commentsQuery);

                    return {
                        ...user,
                        attitudeVotes: attitudeVotesSnap.size,
                        emotionVotes: emotionVotesSnap.size,
                        goatVote: goatVote,
                        ratingsCount: ratingsSnap.size,
                    };
                })
            );
            setEnrichedUsers(enrichedData);
            setIsLoadingDetails(false);
        };

        fetchDetails();

    }, [users, firestore]);


    const getAvatarFallback = (name: string | null) => {
        return name ? name.charAt(0).toUpperCase() : 'U';
    };
    
    const isLoading = isLoadingUsers || isLoadingDetails;

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
                            <TableHead className="text-center">Actitud</TableHead>
                            <TableHead className="text-center">Emocion</TableHead>
                            <TableHead className="text-center">Goat</TableHead>
                            <TableHead className="text-center">Calificacion</TableHead>
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
                                <TableCell className="text-center"><Skeleton className="h-4 w-8 mx-auto" /></TableCell>
                                <TableCell className="text-center"><Skeleton className="h-4 w-8 mx-auto" /></TableCell>
                                <TableCell className="text-center"><Skeleton className="h-4 w-16 mx-auto" /></TableCell>
                                <TableCell className="text-center"><Skeleton className="h-4 w-8 mx-auto" /></TableCell>
                             </TableRow>
                        ))}
                        {!isLoading && enrichedUsers.map(user => (
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
                                    {user.attitudeVotes}
                                </TableCell>
                                <TableCell className="text-center font-bold">
                                    {user.emotionVotes}
                                </TableCell>
                                <TableCell className="text-center">
                                    {user.goatVote ? `Votó por ${user.goatVote}` : 'No ha votado'}
                                </TableCell>
                                <TableCell className="text-center font-bold">
                                    {user.ratingsCount}
                                </TableCell>
                            </TableRow>
                        ))}
                         {!isLoading && enrichedUsers.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                No se encontraron usuarios.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                 </Table>
            </CardContent>
            <CardFooter>
                 <div className="text-xs text-muted-foreground">
                    Mostrando <strong>{enrichedUsers.length}</strong> de <strong>{enrichedUsers.length}</strong> usuarios.
                 </div>
            </CardFooter>
        </Card>
    )
}
