'use client';

import { useState, useContext } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase, useAuth } from '@/firebase';
import { doc, runTransaction, serverTimestamp, increment, setDoc, deleteDoc } from 'firebase/firestore'; 
import { onAuthStateChanged, User as FirebaseUser, Auth } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Figure, AttitudeVote, GlobalSettings } from '@/lib/types';
import Image from 'next/image';
import { LoginPromptDialog } from '@/components/shared/login-prompt-dialog';


type AttitudeOption = 'neutral' | 'fan' | 'simp' | 'hater';

const allAttitudeOptions: {
  id: AttitudeOption;
  label: string;
  gifUrl: string;
  colorClass: string;
  selectedClass: string;
}[] = [
  { id: 'neutral', label: 'Neutral', gifUrl: 'https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/actitud%2Fneutral.png?alt=media&token=aac1fe00-4e42-49d1-98a2-3dab605987d3', colorClass: 'border-gray-500', selectedClass: 'bg-gray-500/20 border-4 border-gray-400' },
  { id: 'fan', label: 'Fan', gifUrl: 'https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/actitud%2Ffan.png?alt=media&token=a937aee9-04b6-48e8-bf37-25eef5f28e90', colorClass: 'border-yellow-400', selectedClass: 'bg-yellow-400/20 border-4 border-yellow-300' },
  { id: 'simp', label: 'Simp', gifUrl: 'https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/actitud%2Fsimp.png?alt=media&token=2575cc73-9b85-4571-9983-3681c7741be3', colorClass: 'border-pink-400', selectedClass: 'bg-pink-400/20 border-4 border-pink-300' },
  { id: 'hater', label: 'Hater', gifUrl: 'https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/actitud%2Fhater2.png?alt=media&token=141e1c39-fbf2-4a35-b1ae-570dbed48d81', colorClass: 'border-red-500', selectedClass: 'bg-red-500/20 border-4 border-red-400' },
];

interface AttitudeVotingProps {
  figure: Figure;
  onVote: (attitude: AttitudeOption | null) => void;
}

export default function AttitudeVoting({ figure, onVote }: AttitudeVotingProps) {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();

  const [isVoting, setIsVoting] = useState<AttitudeOption | null>(null);
  const [showLoginDialog, setShowLoginDialog] = useState(false);

  // Fetch global settings
  const settingsDocRef = useMemoFirebase(() => firestore ? doc(firestore, 'settings', 'global') : null, [firestore]);
  const { data: globalSettings } = useDoc<GlobalSettings>(settingsDocRef);
  const areVotesEnabled = globalSettings?.isVotingEnabled ?? true;


  const attitudeOptions = figure.nationality === 'Web'
    ? allAttitudeOptions.filter(option => option.id !== 'simp')
    : allAttitudeOptions;

  const userVoteRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, `users/${user.uid}/attitudeVotes`, figure.id);
  }, [firestore, user, figure.id]);

  const { data: userVote, isLoading: isVoteLoading } = useDoc<AttitudeVote>(userVoteRef);

  const handleVote = async (vote: AttitudeOption) => {
    if (!areVotesEnabled) {
      toast({
        title: 'Votaciones deshabilitadas',
        description: 'El administrador ha desactivado temporalmente las votaciones.',
        variant: 'destructive',
      });
      return;
    }
    if (!user) {
      setShowLoginDialog(true);
      return;
    }
    if (isVoting || !firestore || !auth) return;
    setIsVoting(vote);

    let finalAttitude: AttitudeOption | null = null;
    
    try {
      const publicVoteRef = doc(firestore, `figures/${figure.id}/attitudeVotes`, user.uid);
      const privateVoteRef = doc(firestore, `users/${user.uid}/attitudeVotes`, figure.id);
      const figureRef = doc(firestore, `figures/${figure.id}`);

      await runTransaction(firestore, async (transaction) => {
        const privateVoteDoc = await transaction.get(privateVoteRef);
        const previousVote = privateVoteDoc.exists() ? (privateVoteDoc.data() as AttitudeVote).vote : null;
        
        const isRetracting = previousVote === vote;
        const updates: any = {
          updatedAt: serverTimestamp(),
          __oldVote: previousVote,
          __newVote: isRetracting ? previousVote : vote, // On retract, old and new are the same
        };


        if (isRetracting) {
          transaction.delete(publicVoteRef);
          transaction.delete(privateVoteRef);
          updates[`attitude.${vote}`] = increment(-1);
          finalAttitude = null;
          toast({ title: 'Voto eliminado' });
        } else {
          const voteData = {
            userId: user.uid,
            figureId: figure.id,
            vote: vote,
            createdAt: serverTimestamp(),
          };
          transaction.set(publicVoteRef, voteData);
          transaction.set(privateVoteRef, voteData);

          if (previousVote) {
            updates[`attitude.${previousVote}`] = increment(-1);
          }
          updates[`attitude.${vote}`] = increment(1);

          finalAttitude = vote;
          toast({ title: previousVote ? '¡Voto actualizado!' : '¡Voto registrado!' });
        }
         transaction.update(figureRef, updates);
      });
      
      onVote(finalAttitude);
      
    } catch (error: any) {
      console.error('Error al registrar el voto:', error);
      toast({
        variant: 'destructive',
        title: 'Error al votar',
        description: error.message || 'No se pudo registrar tu voto.',
      });
    } finally {
      setIsVoting(null);
    }
  };

  const totalVotes = Object.values(figure.attitude || {}).reduce(
    (sum, count) => sum + count,
    0
  );

  const isLoading = isUserLoading || (!!user && isVoteLoading);
  
  if (isLoading && user) {
    return <Skeleton className="h-48 w-full" />;
  }

  const gridColsClass = attitudeOptions.length === 3 ? 'md:grid-cols-3' : 'md:grid-cols-4';
  
  if (!areVotesEnabled) {
    return (
      <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed rounded-lg bg-muted">
        <Lock className="h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold">Votaciones Deshabilitadas</h3>
        <p className="mt-1 text-sm text-muted-foreground">El administrador ha desactivado temporalmente las votaciones de actitud.</p>
      </div>
    );
  }

  return (
    <LoginPromptDialog open={showLoginDialog} onOpenChange={setShowLoginDialog}>
        <div className="w-full">
        <div className="mb-4 text-left">
            <h3 className="text-xl font-bold font-headline">¿Qué te consideras?</h3>
            <p className="text-muted-foreground">Define tu actitud hacia {figure.name}. Tu voto es anónimo.</p>
        </div>
        <div className={cn("grid grid-cols-2 gap-4", gridColsClass)}>
            {attitudeOptions.map(({ id, label, gifUrl, colorClass, selectedClass }) => {
            const isSelected = userVote?.vote === id;
            return (
            <Button
                key={id}
                variant="outline"
                className={cn(
                'relative h-36 flex-col items-center justify-center gap-2 p-4 transition-all duration-200 hover:scale-105',
                'dark:bg-black dark:hover:bg-neutral-900',
                isSelected ? `scale-105 ${selectedClass}` : `${colorClass}`,
                isVoting === id ? 'cursor-not-allowed' : ''
                )}
                onClick={() => handleVote(id)}
                disabled={!!isVoting}
            >
                {isVoting === id ? (
                <Loader2 className="h-8 w-8 animate-spin" />
                ) : (
                    <div className="flex h-full flex-col items-center justify-center text-center">
                        <div className="flex-1 flex items-center justify-center">
                            <Image src={gifUrl} alt={label} width={48} height={48} unoptimized className="h-12 w-12" />
                        </div>
                        <div>
                            <span className="font-semibold text-sm">{label}</span>
                            <span className="block text-lg font-bold">
                            {(figure.attitude?.[id] ?? 0).toLocaleString()}
                            </span>
                        </div>
                    </div>
                )}
            </Button>
            )})}
        </div>
        <p className="mt-4 text-center text-sm text-muted-foreground">
            Total de respuestas: {totalVotes.toLocaleString()}
        </p>
        </div>
    </LoginPromptDialog>
  );
}