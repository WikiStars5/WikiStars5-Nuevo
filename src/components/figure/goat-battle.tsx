'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { useFirestore, useUser, useDoc, useMemoFirebase, useAuth } from '@/firebase';
import type { GoatBattle, GoatVote } from '@/lib/types';
import { doc, runTransaction, serverTimestamp, increment } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { initiateAnonymousSignIn } from '@/firebase/non-blocking-login';
import { onAuthStateChanged, type Auth, type User as FirebaseUser } from 'firebase/auth';
import { Skeleton } from '../ui/skeleton';

const BATTLE_ID = 'messi-vs-ronaldo';

const messiData = {
    name: 'Lionel Messi',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/c/c8/Lionel_Messi_WC2022.jpg'
};

const ronaldoData = {
    name: 'Cristiano Ronaldo',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/2/23/Cristiano_Ronaldo_WC2022_-_Portugal_vs_Uruguay.jpg'
};


function getNextUser(auth: Auth): Promise<FirebaseUser> {
  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        unsubscribe();
        resolve(user);
      }
    }, (error) => {
        unsubscribe();
        reject(error);
    });
  });
}


export default function GoatBattle() {
  const firestore = useFirestore();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const [isVoting, setIsVoting] = useState(false);

  // Get global battle data
  const battleDocRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'goat_battles', BATTLE_ID);
  }, [firestore]);
  const { data: battleData, isLoading: isBattleLoading } = useDoc<GoatBattle>(battleDocRef);

  // Get user's personal vote
  const userVoteDocRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, `users/${user.uid}/goatVotes`, BATTLE_ID);
  }, [firestore, user]);
  const { data: userVote, isLoading: isUserVoteLoading } = useDoc<GoatVote>(userVoteDocRef);


  const messiVotes = battleData?.messiVotes ?? 0;
  const ronaldoVotes = battleData?.ronaldoVotes ?? 0;
  const totalVotes = messiVotes + ronaldoVotes;

  const messiPercentage = totalVotes > 0 ? (messiVotes / totalVotes) * 100 : 50;
  const ronaldoPercentage = 100 - messiPercentage;

  // It's a value between -10 (all Ronaldo) and 10 (all Messi).
  const balanceRotation = totalVotes > 0 ? ((messiPercentage - 50) / 5) * -1 : 0;

  const handleVote = async (player: 'messi' | 'ronaldo') => {
    if (isVoting || !firestore || !auth) return;
    setIsVoting(true);

    try {
        let currentUser = user;
        if (!currentUser) {
            await initiateAnonymousSignIn(auth);
            currentUser = await getNextUser(auth);
        }
        
        await runTransaction(firestore, async (transaction) => {
            const battleRef = doc(firestore, 'goat_battles', BATTLE_ID);
            const userVoteRef = doc(firestore, `users/${currentUser!.uid}/goatVotes`, BATTLE_ID);
            
            const [battleDoc, userVoteDoc] = await Promise.all([
                transaction.get(battleRef),
                transaction.get(userVoteRef)
            ]);

            const currentVote = userVoteDoc.exists() ? userVoteDoc.data().vote : null;

            const updates: { [key: string]: any } = {};

            if (currentVote === player) { // --- Cancel Vote ---
                updates[`${player}Votes`] = increment(-1);
                transaction.delete(userVoteRef);
                toast({ title: "Voto cancelado" });
            } else {
                 if (currentVote) { // --- Change Vote ---
                    const otherPlayer = player === 'messi' ? 'ronaldo' : 'messi';
                    updates[`${otherPlayer}Votes`] = increment(-1);
                }
                updates[`${player}Votes`] = increment(1); // Add to new vote in all cases (new or change)
                transaction.set(userVoteRef, { 
                    userId: currentUser!.uid, 
                    vote: player, 
                    createdAt: serverTimestamp() 
                });
                toast({ title: `¡Has votado por ${player === 'messi' ? 'Messi' : 'Ronaldo'}!` });
            }

            if (!battleDoc.exists()) {
                 transaction.set(battleRef, { 
                    messiVotes: player === 'messi' ? 1 : 0,
                    ronaldoVotes: player === 'ronaldo' ? 1 : 0,
                    ...updates
                 });
            } else {
                transaction.update(battleRef, updates);
            }
        });

    } catch (error) {
        console.error("Error casting vote:", error);
        toast({
            title: "Error al Votar",
            description: "No se pudo registrar tu voto. Inténtalo de nuevo.",
            variant: "destructive"
        });
    } finally {
        setIsVoting(false);
    }
  };

  const GoatIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M16 16h3a2 2 0 0 0 2 -2v-4a2 2 0 0 0 -2 -2h-3v10z" />
        <path d="M11 16v-10" />
        <path d="M7 10h1.5a1.5 1.5 0 0 1 0 3h-1.5a1.5 1.5 0 0 1 0 3h2" />
        <path d="M4 16v-5" />
    </svg>
  );
  
  const isLoading = isUserLoading || isBattleLoading || (user && isUserVoteLoading);

  if (isLoading) {
    return (
        <Card>
            <CardHeader className="items-center text-center">
                <Skeleton className="h-8 w-2/3" />
                <Skeleton className="h-5 w-1/2" />
            </CardHeader>
            <CardContent>
                <Skeleton className="h-64 w-full" />
            </CardContent>
        </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="items-center text-center">
        <CardTitle className="flex items-center gap-2 text-3xl">
          <GoatIcon/> La Batalla del GOAT
        </CardTitle>
        <CardDescription>¿Quién es el mejor de todos los tiempos? Tu voto decide.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        {/* Balance Component */}
        <div className="relative w-full max-w-md h-48 mb-8">
          {/* Balance Beam */}
          <div
            className="absolute top-1/2 left-0 w-full h-1.5 bg-muted rounded-full transition-transform duration-500"
            style={{ transform: `translateY(-50%) rotate(${balanceRotation}deg)` }}
          >
            {/* Player Plates */}
            <div className="absolute -left-8 -top-12 flex flex-col items-center">
              <div className="relative h-20 w-20 rounded-full border-4 border-blue-500 overflow-hidden shadow-lg">
                <Image src={messiData.imageUrl} alt={messiData.name} layout="fill" objectFit="cover" />
              </div>
            </div>
            <div className="absolute -right-8 -top-12 flex flex-col items-center">
              <div className="relative h-20 w-20 rounded-full border-4 border-red-500 overflow-hidden shadow-lg">
                <Image src={ronaldoData.imageUrl} alt={ronaldoData.name} layout="fill" objectFit="cover" />
              </div>
            </div>
          </div>
          {/* Fulcrum */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[40px] border-l-transparent border-r-[40px] border-r-transparent border-b-[60px] border-b-muted"></div>
        </div>

        {/* Vote Percentages */}
        <div className="w-full max-w-md mb-6">
            <div className="relative h-4 w-full bg-red-500/30 rounded-full overflow-hidden">
                <div 
                    className="absolute top-0 left-0 h-full bg-blue-500/50 rounded-full transition-all duration-500"
                    style={{ width: `${messiPercentage}%`}}
                />
            </div>
            <div className="flex justify-between text-sm font-bold mt-1">
                <span className="text-blue-400">{messiVotes.toLocaleString()} votos</span>
                <span className="text-red-400">{ronaldoVotes.toLocaleString()} votos</span>
            </div>
        </div>


        {/* Voting Buttons */}
        <div className="grid grid-cols-2 gap-4 w-full max-w-md">
          <Button
            size="lg"
            className={cn(
                "h-16 text-lg bg-blue-500/20 text-blue-300 border-2 border-blue-500/50 hover:bg-blue-500/30",
                userVote?.vote === 'messi' && "ring-2 ring-offset-2 ring-blue-400 ring-offset-background"
            )}
            onClick={() => handleVote('messi')}
            disabled={isVoting}
          >
            {isVoting && userVote?.vote !== 'messi' ? <Loader2 className="animate-spin" /> : 'Votar por Messi'}
          </Button>
          <Button
            size="lg"
            className={cn(
                "h-16 text-lg bg-red-500/20 text-red-300 border-2 border-red-500/50 hover:bg-red-500/30",
                userVote?.vote === 'ronaldo' && "ring-2 ring-offset-2 ring-red-400 ring-offset-background"
            )}
            onClick={() => handleVote('ronaldo')}
            disabled={isVoting}
          >
            {isVoting && userVote?.vote !== 'ronaldo' ? <Loader2 className="animate-spin" /> : 'Votar por Ronaldo'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
