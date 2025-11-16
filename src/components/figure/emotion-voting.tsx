
'use client';

import { useState, useContext } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase, useAuth } from '@/firebase';
import { doc, runTransaction, serverTimestamp, increment, setDoc, deleteDoc } from 'firebase/firestore'; 
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Smile, Meh, Frown, AlertTriangle, ThumbsDown, Angry, Loader2, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Figure, EmotionVote, GlobalSettings } from '@/lib/types';
import Image from 'next/image';
import { LoginPromptDialog } from '@/components/shared/login-prompt-dialog';


type EmotionOption = 'alegria' | 'envidia' | 'tristeza' | 'miedo' | 'desagrado' | 'furia';

const emotionOptions: {
  id: EmotionOption;
  label: string;
  gifUrl: string;
  colorClass: string;
  textColorClass: string;
  selectedClass: string;
}[] = [
  { id: 'alegria', label: 'Alegría', gifUrl: 'https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/Emoci%C3%B3n%2Falegria.png?alt=media&token=c6ea80e2-b3f9-463c-be2a-d7499053eeba', colorClass: 'border-yellow-400', textColorClass: 'text-yellow-400', selectedClass: 'bg-yellow-400/20 border-4 border-yellow-300' },
  { id: 'envidia', label: 'Envidia', gifUrl: 'https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/Emoci%C3%B3n%2Fenvidia.png?alt=media&token=8c596bec-ad23-4b32-9b31-f9e79a9006b4', colorClass: 'border-green-500', textColorClass: 'text-green-500', selectedClass: 'bg-green-500/20 border-4 border-green-400' },
  { id: 'tristeza', label: 'Tristeza', gifUrl: 'https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/Emoci%C3%B3n%2Ftrizteza.png?alt=media&token=84884715-cd24-4bb9-9e66-a838cb4b7264', colorClass: 'border-blue-500', textColorClass: 'text-blue-500', selectedClass: 'bg-blue-500/20 border-4 border-blue-400' },
  { id: 'miedo', label: 'Miedo', gifUrl: 'https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/Emoci%C3%B3n%2Fmiedo.png?alt=media&token=904c948b-2b47-4b73-abda-ff9906598cc3', colorClass: 'border-purple-500', textColorClass: 'text-purple-500', selectedClass: 'bg-purple-500/20 border-4 border-purple-400' },
  { id: 'desagrado', label: 'Desagrado', gifUrl: 'https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/Emoci%C3%B3n%2Fdesagrado.png?alt=media&token=88161fe7-a756-4d4c-ba27-f831682da537', colorClass: 'border-lime-600', textColorClass: 'text-lime-600', selectedClass: 'bg-lime-600/20 border-4 border-lime-500' },
  { id: 'furia', label: 'Furia', gifUrl: 'https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/Emoci%C3%B3n%2Ffuria.png?alt=media&token=69a8a540-82a9-457b-8993-2076902475d6', colorClass: 'border-red-500', textColorClass: 'text-red-500', selectedClass: 'bg-red-500/20 border-4 border-red-400' },
];

interface EmotionVotingProps {
  figure: Figure;
}

export default function EmotionVoting({ figure }: EmotionVotingProps) {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  
  const [isVoting, setIsVoting] = useState<EmotionOption | null>(null);
  const [showLoginDialog, setShowLoginDialog] = useState(false);

  // Fetch global settings
  const settingsDocRef = useMemoFirebase(() => firestore ? doc(firestore, 'settings', 'global') : null, [firestore]);
  const { data: globalSettings } = useDoc<GlobalSettings>(settingsDocRef);
  const areVotesEnabled = globalSettings?.isVotingEnabled ?? true;


  const userVoteRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, `users/${user.uid}/emotionVotes`, figure.id);
  }, [firestore, user, figure.id]);

  const { data: userVote, isLoading: isVoteLoading } = useDoc<EmotionVote>(userVoteRef);

  const handleVote = async (vote: EmotionOption) => {
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
    
    try {
      const publicVoteRef = doc(firestore, `figures/${figure.id}/emotionVotes`, user.uid);
      const privateVoteRef = doc(firestore, `users/${user.uid}/emotionVotes`, figure.id);
      const figureRef = doc(firestore, `figures/${figure.id}`);

      await runTransaction(firestore, async (transaction) => {
        const privateVoteDoc = await transaction.get(privateVoteRef);
        const previousVote = privateVoteDoc.exists() ? (privateVoteDoc.data() as EmotionVote).vote : null;

        const isRetracting = previousVote === vote;
        
        const updates: any = {
          __oldVote: previousVote,
          __newVote: isRetracting ? previousVote : vote,
        };

        if (isRetracting) {
          // --- RETRACTING VOTE ---
          transaction.delete(publicVoteRef);
          transaction.delete(privateVoteRef);
          updates[`emotion.${vote}`] = increment(-1);
          toast({ title: 'Voto eliminado' });
        
        } else if (previousVote) {
          // --- CHANGING VOTE ---
          const voteData = { userId: user.uid, figureId: figure.id, vote: vote, createdAt: serverTimestamp() };
          transaction.set(publicVoteRef, voteData, { merge: true });
          transaction.set(privateVoteRef, voteData, { merge: true });

          updates[`emotion.${previousVote}`] = increment(-1);
          updates[`emotion.${vote}`] = increment(1);
          toast({ title: '¡Voto actualizado!' });
        
        } else {
          // --- FIRST VOTE ---
          const voteData = { userId: user.uid, figureId: figure.id, vote: vote, createdAt: serverTimestamp() };
          transaction.set(publicVoteRef, voteData);
          transaction.set(privateVoteRef, voteData);
          
          updates[`emotion.${vote}`] = increment(1);
          toast({ title: '¡Voto registrado!' });
        }

        updates.updatedAt = serverTimestamp();
        transaction.update(figureRef, updates);
      });
    } catch (error: any) {
      console.error('Error al registrar el voto:', error);
      toast({
        variant: 'destructive',
        title: 'Error al votar',
        description: 'Hubo un problema al registrar tu voto. Es posible que las reglas de seguridad lo hayan impedido.',
      });
    } finally {
      setIsVoting(null);
    }
  };


  const totalVotes = Object.values(figure.emotion || {}).reduce(
    (sum, count) => sum + count,
    0
  );

  const isLoading = isUserLoading || (!!user && isVoteLoading);
  
  if (isLoading && user) {
    return <Skeleton className="h-48 w-full" />;
  }

  if (!areVotesEnabled) {
    return (
      <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed rounded-lg bg-muted">
        <Lock className="h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold">Votaciones Deshabilitadas</h3>
        <p className="mt-1 text-sm text-muted-foreground">El administrador ha desactivado temporalmente las votaciones de emoción.</p>
      </div>
    );
  }

  return (
    <LoginPromptDialog open={showLoginDialog} onOpenChange={setShowLoginDialog}>
      <div className="w-full">
        <div className="mb-4 text-left">
          <h3 className="text-xl font-bold font-headline">¿Qué emoción te genera?</h3>
          <p className="text-muted-foreground">Elige la emoción principal que {figure.name} te provoca.</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {emotionOptions.map(({ id, label, gifUrl, colorClass, selectedClass, textColorClass }) => {
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
                            {(figure.emotion?.[id] ?? 0).toLocaleString()}
                            </span>
                        </div>
                    </div>
                )}
              </Button>
            );
          })}
        </div>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Total de respuestas: {totalVotes.toLocaleString()}
        </p>
      </div>
    </LoginPromptDialog>
  );
}

    