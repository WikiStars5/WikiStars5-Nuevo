
'use client';

import { useState } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase, useAuth } from '@/firebase';
import { doc, runTransaction, serverTimestamp, increment } from 'firebase/firestore';
import { onAuthStateChanged, User as FirebaseUser, Auth } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Smile, Meh, Frown, AlertTriangle, ThumbsDown, Angry, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Figure, EmotionVote } from '@/lib/types';
import { initiateAnonymousSignIn } from '@/firebase/non-blocking-login';

type EmotionOption = 'alegria' | 'envidia' | 'tristeza' | 'miedo' | 'desagrado' | 'furia';

const emotionOptions: {
  id: EmotionOption;
  label: string;
  icon: React.ElementType;
  colorClass: string;
  textColorClass: string;
}[] = [
  { id: 'alegria', label: 'Alegría', icon: Smile, colorClass: 'border-yellow-400', textColorClass: 'text-yellow-400' },
  { id: 'envidia', label: 'Envidia', icon: Meh, colorClass: 'border-green-500', textColorClass: 'text-green-500' },
  { id: 'tristeza', label: 'Tristeza', icon: Frown, colorClass: 'border-blue-500', textColorClass: 'text-blue-500' },
  { id: 'miedo', label: 'Miedo', icon: AlertTriangle, colorClass: 'border-purple-500', textColorClass: 'text-purple-500' },
  { id: 'desagrado', label: 'Desagrado', icon: ThumbsDown, colorClass: 'border-lime-600', textColorClass: 'text-lime-600' },
  { id: 'furia', label: 'Furia', icon: Angry, colorClass: 'border-red-500', textColorClass: 'text-red-500' },
];

interface EmotionVotingProps {
  figure: Figure;
}

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

export default function EmotionVoting({ figure }: EmotionVotingProps) {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();

  const [isVoting, setIsVoting] = useState<EmotionOption | null>(null);

  const userVoteRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, `figures/${figure.id}/emotionVotes`, user.uid);
  }, [firestore, user, figure.id]);

  const { data: userVote, isLoading: isVoteLoading } = useDoc<EmotionVote>(userVoteRef);

  const handleVote = async (vote: EmotionOption) => {
    if (isVoting || !firestore || !auth) return;
    setIsVoting(vote);

    try {
      let currentUser = user;
      if (!currentUser) {
        await initiateAnonymousSignIn(auth);
        currentUser = await getNextUser(auth);
      }
      
      const figureRef = doc(firestore, 'figures', figure.id);
      const voteRef = doc(firestore, `figures/${figure.id}/emotionVotes`, currentUser.uid);

      await runTransaction(firestore, async (transaction) => {
        const existingVoteDoc = await transaction.get(voteRef);
        const figureDoc = await transaction.get(figureRef);

        if (!figureDoc.exists()) {
          throw new Error('¡El perfil no existe!');
        }

        const newVoteData = {
          userId: currentUser!.uid,
          figureId: figure.id,
          vote: vote,
          createdAt: serverTimestamp(),
        };

        if (existingVoteDoc.exists()) {
          const previousVote = existingVoteDoc.data().vote as EmotionOption;
          if (previousVote === vote) {
            transaction.update(figureRef, { [`emotion.${vote}`]: increment(-1) });
            transaction.delete(voteRef);
            toast({ title: 'Voto eliminado' });
          } else {
            transaction.update(figureRef, {
              [`emotion.${previousVote}`]: increment(-1),
              [`emotion.${vote}`]: increment(1),
            });
            transaction.set(voteRef, newVoteData);
            toast({ title: '¡Voto actualizado!' });
          }
        } else {
          transaction.update(figureRef, { [`emotion.${vote}`]: increment(1) });
          transaction.set(voteRef, newVoteData);
          toast({ title: '¡Voto registrado!' });
        }
      });
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

  const totalVotes = Object.values(figure.emotion || {}).reduce((sum, count) => sum + count, 0);
  const isLoading = isUserLoading || (!!user && isVoteLoading);

  if (isLoading && user) {
    return <Skeleton className="h-48 w-full" />;
  }

  return (
    <div className="w-full">
      <div className="mb-4 text-left">
        <h3 className="text-xl font-bold font-headline">¿Qué emoción te provoca?</h3>
        <p className="text-muted-foreground">Elige la emoción que mejor describe lo que sientes. Tu voto es anónimo.</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {emotionOptions.map(({ id, label, icon: Icon, colorClass, textColorClass }) => {
            const isSelected = userVote?.vote === id;
            return (
              <Button
                key={id}
                variant="outline"
                className={cn(
                  'relative h-auto flex-col items-center justify-center gap-2 border-2 p-4 transition-all duration-200',
                  'flex h-24 flex-col items-center justify-center gap-2',
                   isSelected ? `${colorClass} bg-card shadow-inner` : 'border-border hover:bg-muted/50',
                   isVoting === id ? 'cursor-not-allowed' : ''
                )}
                onClick={() => handleVote(id)}
                disabled={!!isVoting}
              >
                 <div className={cn("absolute top-2 left-2 flex items-center gap-1.5", isSelected ? textColorClass : 'text-muted-foreground')}>
                   <Icon className="h-4 w-4" />
                </div>
                {isVoting === id ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                    <>
                        <span className={cn("font-semibold", isSelected ? textColorClass : '')}>{label}</span>
                        <span className={cn("text-xl font-bold", isSelected ? textColorClass : '')}>
                        {figure.emotion?.[id] ?? 0}
                        </span>
                    </>
                )}
              </Button>
            );
        })}
      </div>
      <p className="mt-4 text-center text-sm text-muted-foreground">
        Total de respuestas: {totalVotes}
      </p>
    </div>
  );
}

    