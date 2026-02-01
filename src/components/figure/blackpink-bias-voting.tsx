
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useFirestore, useUser, useAdmin, useCollection, useDoc, useMemoFirebase, useAuth, signInAnonymously } from '@/firebase';
import { collection, query, orderBy, where, getDocs, doc, runTransaction, serverTimestamp, increment, deleteDoc, addDoc } from 'firebase/firestore';
import type { Figure, BlackpinkBiasMember, BlackpinkBiasVote } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, Trash2, Crown, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import AddBlackpinkBiasMemberDialog from './add-blackpink-bias-member-dialog';
import { cn, formatCompactNumber } from '@/lib/utils';
import { useLanguage } from '@/context/LanguageContext';
import { LoginPromptDialog } from '../shared/login-prompt-dialog';
import { useTheme } from 'next-themes';

function BiasMemberCard({ 
    member, 
    onRemove, 
    onVote, 
    isVoted, 
    isVoting,
    isWinner
}: { 
    member: (BlackpinkBiasMember & { voteCount: number });
    onRemove: (id: string) => void;
    onVote: () => void;
    isVoted: boolean;
    isVoting: boolean;
    isWinner: boolean;
}) {
    const { isAdmin } = useAdmin();
    const [isDeleting, setIsDeleting] = useState(false);
    
    const handleDelete = async () => {
        setIsDeleting(true);
        await onRemove(member.id);
    };

    return (
        <div className="group relative text-center flex flex-col h-full">
            <Card className={cn("overflow-hidden transition-all flex-grow flex flex-col", isVoted && "border-primary ring-2 ring-primary")}>
                <div className="relative aspect-square w-full">
                    {isWinner && (
                        <div className="absolute top-1 right-1 z-10 p-1 bg-black/50 rounded-full">
                           <Crown className="h-5 w-5 text-yellow-400" />
                        </div>
                    )}
                     <Image
                        src={member.figureImageUrl}
                        alt={member.figureName}
                        fill
                        className="object-cover"
                    />
                </div>
                <CardContent className="p-3 flex-grow flex flex-col justify-between">
                     <div>
                        <h3 className="text-sm font-semibold truncate">{member.figureName}</h3>
                        <p className="text-xs text-muted-foreground">{formatCompactNumber(member.voteCount)} votos</p>
                    </div>
                    <Button size="sm" className="mt-2 w-full" onClick={onVote} disabled={isVoting}>
                        {isVoting ? <Loader2 className="h-4 w-4 animate-spin" /> : isVoted ? 'Cambiar Voto' : 'Votar'}
                    </Button>
                </CardContent>
            </Card>
            {isAdmin && (
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button
                            variant="destructive"
                            size="icon"
                            className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 z-10"
                            disabled={isDeleting}
                        >
                            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                        </Button>
                    </AlertDialogTrigger>
                     <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar Miembro?</AlertDialogTitle>
                            <AlertDialogDescription>
                                ¿Estás seguro de que quieres eliminar a {member.figureName} de la votación de bias?
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDelete}>Eliminar</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </div>
    );
}

export default function BlackpinkBiasVoting() {
    const firestore = useFirestore();
    const { user } = useUser();
    const { isAdmin } = useAdmin();
    const { toast } = useToast();
    const auth = useAuth();
    const { theme } = useTheme();
    
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [membersWithVotes, setMembersWithVotes] = useState<(BlackpinkBiasMember & { voteCount: number })[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isVoting, setIsVoting] = useState<string | null>(null);
    const [showLoginDialog, setShowLoginDialog] = useState(false);

    const membersQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'blackpink_bias_members'), orderBy('order'));
    }, [firestore]);

    const { data: biasMembers, isLoading: isLoadingMembers, refetch: refetchMembers } = useCollection<BlackpinkBiasMember>(membersQuery);

    const userVoteDocRef = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return doc(firestore, `users/${user.uid}/blackpinkBiasVote`, 'blackpink-bias-battle');
    }, [firestore, user]);

    const { data: userVote, refetch: refetchUserVote } = useDoc<BlackpinkBiasVote>(userVoteDocRef, { enabled: !!user });
    
    useEffect(() => {
        if (isLoadingMembers) return;
        if (!biasMembers || biasMembers.length === 0) {
            setMembersWithVotes([]);
            setIsLoading(false);
            return;
        }

        const fetchVoteCounts = async () => {
            if (!firestore) return;
            setIsLoading(true);
            const figureIds = biasMembers.map(m => m.figureId);
            const figuresRef = collection(firestore, 'figures');
            const q = query(figuresRef, where('__name__', 'in', figureIds));
            const snapshot = await getDocs(q);
            const figuresData = new Map<string, Figure>();
            snapshot.docs.forEach(doc => figuresData.set(doc.id, doc.data() as Figure));
            
            const combined = biasMembers
                .map(member => ({
                    ...member,
                    voteCount: figuresData.get(member.figureId)?.blackpinkBiasVoteCount || 0,
                }))
                .sort((a, b) => b.voteCount - a.voteCount);
            
            setMembersWithVotes(combined);
            setIsLoading(false);
        };
        
        fetchVoteCounts();
    }, [biasMembers, firestore, isLoadingMembers]);

    const handleAdd = async (figure: Figure) => {
        if (!firestore) return;
        const currentMaxOrder = biasMembers?.reduce((max, fig) => fig.order > max ? fig.order : max, 0) ?? 0;
        const newMemberData = {
            figureId: figure.id,
            figureName: figure.name,
            figureImageUrl: figure.imageUrl,
            order: currentMaxOrder + 1,
        };
        setIsAddDialogOpen(false);
        try {
            await addDoc(collection(firestore, 'blackpink_bias_members'), newMemberData);
            toast({ title: "Miembro añadido", description: `${figure.name} ha sido añadido a la votación.` });
            refetchMembers();
        } catch (error) {
            console.error("Error adding bias member:", error);
            toast({ title: "Error", description: "No se pudo añadir el miembro.", variant: "destructive" });
        }
    };

    const handleRemove = async (docId: string) => {
        if (!firestore) return;
        try {
            await deleteDoc(doc(firestore, 'blackpink_bias_members', docId));
            toast({ title: "Miembro eliminado" });
            refetchMembers();
        } catch (error) {
            console.error("Error removing bias member:", error);
            toast({ title: "Error", description: "No se pudo eliminar el miembro.", variant: "destructive" });
        }
    };

    const handleVote = async (selectedFigureId: string) => {
        let currentUser = user;
        if (!currentUser) {
            setShowLoginDialog(true);
            return;
        }
        if (!firestore || isVoting) return;

        setIsVoting(selectedFigureId);
        
        try {
            await runTransaction(firestore, async (transaction) => {
                const privateVoteRef = doc(firestore, `users/${currentUser!.uid}/blackpinkBiasVote`, 'blackpink-bias-battle');
                const privateVoteDoc = await transaction.get(privateVoteRef);
                const existingVoteFigureId = privateVoteDoc.exists() ? privateVoteDoc.data().figureId : null;

                if (existingVoteFigureId) {
                    const oldFigureRef = doc(firestore, 'figures', existingVoteFigureId);
                    transaction.update(oldFigureRef, { blackpinkBiasVoteCount: increment(-1) });
                }

                if (existingVoteFigureId !== selectedFigureId) {
                    const newFigureRef = doc(firestore, 'figures', selectedFigureId);
                    transaction.update(newFigureRef, { blackpinkBiasVoteCount: increment(1) });
                    transaction.set(privateVoteRef, { figureId: selectedFigureId, createdAt: serverTimestamp() });
                } else {
                    transaction.delete(privateVoteRef);
                }
            });

            // Optimistic UI Update
            setMembersWithVotes(prevMembers => {
                const newMembers = [...prevMembers];
                const existingVoteFigureId = userVote?.figureId;

                const newMembersWithVotes = newMembers.map(member => {
                    let newVoteCount = member.voteCount;
                    // Decrement old vote
                    if (member.figureId === existingVoteFigureId) newVoteCount = Math.max(0, newVoteCount - 1);
                    // Increment new vote
                    if (member.figureId === selectedFigureId && existingVoteFigureId !== selectedFigureId) newVoteCount += 1;
                    return { ...member, voteCount: newVoteCount };
                }).sort((a,b) => b.voteCount - a.voteCount);

                return newMembersWithVotes;
            });
            
            refetchUserVote();
            toast({ title: 'Voto registrado con éxito!' });

        } catch (error) {
            console.error("Error processing vote:", error);
            toast({ title: "Error al votar", variant: "destructive" });
        } finally {
            setIsVoting(null);
        }
    };

    const existingFigureIds = useMemo(() => biasMembers?.map(f => f.figureId) || [], [biasMembers]);
    const winnerId = membersWithVotes.length > 0 ? membersWithVotes[0].id : null;

    return (
        <LoginPromptDialog open={showLoginDialog} onOpenChange={setShowLoginDialog}>
            <Card className={cn((theme === 'dark' || theme === 'army') && 'bg-black')}>
                <CardHeader>
                    <div className="flex items-start justify-between">
                         <div>
                            <CardTitle>Votación de Bias</CardTitle>
                            <CardDescription>Elige a tu miembro favorito de Blackpink.</CardDescription>
                        </div>
                        {isAdmin && (
                            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline">
                                        <PlusCircle className="mr-2 h-4 w-4" /> Añadir
                                    </Button>
                                </DialogTrigger>
                                <AddBlackpinkBiasMemberDialog onAdd={handleAdd} existingIds={existingFigureIds} onClose={() => setIsAddDialogOpen(false)} />
                            </Dialog>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                         <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="space-y-2">
                                    <Skeleton className="aspect-square w-full rounded-md" />
                                    <Skeleton className="h-4 w-3/4 mx-auto" />
                                    <Skeleton className="h-8 w-full rounded-md" />
                                </div>
                            ))}
                        </div>
                    ) : membersWithVotes.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4">
                            {membersWithVotes.map((member) => (
                                <BiasMemberCard 
                                    key={member.id}
                                    member={member}
                                    onRemove={handleRemove}
                                    onVote={() => handleVote(member.figureId)}
                                    isVoted={userVote?.figureId === member.figureId}
                                    isVoting={isVoting === member.figureId}
                                    isWinner={member.id === winnerId}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-10 text-muted-foreground">
                            El administrador aún no ha añadido miembros a la votación.
                        </div>
                    )}
                </CardContent>
            </Card>
        </LoginPromptDialog>
    );
}
