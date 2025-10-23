'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

// Placeholder data - In a real scenario, this would come from props or a hook
const messiData = {
    name: 'Lionel Messi',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Lionel_Messi_WC2022.jpg/800px-Lionel_Messi_WC2022.jpg'
};

const ronaldoData = {
    name: 'Cristiano Ronaldo',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/2/23/Cristiano_Ronaldo_WC2022_-_Portugal_vs_Uruguay.jpg'
};

export default function GoatBattle() {
  const [messiVotes, setMessiVotes] = useState(1500);
  const [ronaldoVotes, setRonaldoVotes] = useState(1450);
  const [userVote, setUserVote] = useState<'messi' | 'ronaldo' | null>(null);
  const [isVoting, setIsVoting] = useState(false);

  const totalVotes = messiVotes + ronaldoVotes;
  const messiPercentage = totalVotes > 0 ? (messiVotes / totalVotes) * 100 : 50;
  const ronaldoPercentage = totalVotes > 0 ? (ronaldoVotes / totalVotes) * 100 : 50;

  // This will determine the rotation of the balance beam.
  // It's a value between -10 (all Ronaldo) and 10 (all Messi).
  const balanceRotation = totalVotes > 0 ? ((messiPercentage - 50) / 5) : 0;

  const handleVote = async (player: 'messi' | 'ronaldo') => {
    setIsVoting(true);
    // TODO: Implement Firestore vote logic here
    console.log(`Voted for ${player}`);
    
    // Simulate a network request
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // This is temporary local state update. It will be replaced by Firestore data.
    if (userVote === player) { // If user is canceling their vote
      setUserVote(null);
      if (player === 'messi') setMessiVotes(v => v - 1);
      else setRonaldoVotes(v => v - 1);
    } else { // If user is changing vote or voting for the first time
      if (userVote === 'messi') setMessiVotes(v => v - 1);
      if (userVote === 'ronaldo') setRonaldoVotes(v => v - 1);
      setUserVote(player);
      if (player === 'messi') setMessiVotes(v => v + 1);
      else setRonaldoVotes(v => v + 1);
    }

    setIsVoting(false);
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
                <span className="text-blue-400">{messiPercentage.toFixed(1)}%</span>
                <span className="text-red-400">{ronaldoPercentage.toFixed(1)}%</span>
            </div>
        </div>


        {/* Voting Buttons */}
        <div className="grid grid-cols-2 gap-4 w-full max-w-md">
          <Button
            size="lg"
            className={cn(
                "h-16 text-lg bg-blue-500/20 text-blue-300 border-2 border-blue-500/50 hover:bg-blue-500/30",
                userVote === 'messi' && "ring-2 ring-offset-2 ring-blue-400 ring-offset-background"
            )}
            onClick={() => handleVote('messi')}
            disabled={isVoting}
          >
            {isVoting && userVote !== 'messi' ? <Loader2 className="animate-spin" /> : 'Votar por Messi'}
          </Button>
          <Button
            size="lg"
            className={cn(
                "h-16 text-lg bg-red-500/20 text-red-300 border-2 border-red-500/50 hover:bg-red-500/30",
                userVote === 'ronaldo' && "ring-2 ring-offset-2 ring-red-400 ring-offset-background"
            )}
            onClick={() => handleVote('ronaldo')}
            disabled={isVoting}
          >
            {isVoting && userVote !== 'ronaldo' ? <Loader2 className="animate-spin" /> : 'Votar por Ronaldo'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
