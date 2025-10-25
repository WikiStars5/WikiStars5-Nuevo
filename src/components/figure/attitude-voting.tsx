'use client';

import { useState } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase, useAuth } from '@/firebase';
import { doc, runTransaction, serverTimestamp, increment } from 'firebase/firestore';
import { getAuth, onAuthStateChanged, User as FirebaseUser, Auth } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Heart, Star, ThumbsDown, User, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Figure, AttitudeVote } from '@/lib/types';
import { initiateAnonymousSignIn } from '@/firebase/non-blocking-login';

type AttitudeOption = 'neutral' | 'fan' | 'simp' | 'hater';

const allAttitudeOptions: {
  id: AttitudeOption;
  label: string;
  icon: React.ElementType;
}[] = [
  { id: 'neutral', label: 'Neutral', icon: User },
  { id: 'fan', label: 'Fan', icon: Star },
  { id: 'simp', label: 'Simp', icon: Heart },
  { id: 'hater', label: 'Hater', icon: ThumbsDown },
];

interface AttitudeVotingProps {
  figure: Figure;
}

/**
 * Waits for the next auth state change to get the new user.
 * This is useful after an anonymous sign-in is initiated.
 */
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


export default function AttitudeVoting({ figure }: AttitudeVotingProps) {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();

  const [isVoting, setIsVoting] = useState<AttitudeOption | null>(null);

  const attitudeOptions = figure.nationality === 'Web'
    ? allAttitudeOptions.filter(option => option.id !== 'simp')
    : allAttitudeOptions;

  const userVoteRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    // New path: users/{userId}/attitudeVotes/{figureId}
    return doc(firestore, `users/${user.uid}/attitudeVotes`, figure.id);
  }, [firestore, user, figure.id]);

  const { data: userVote, isLoading: isVoteLoading } = useDoc<AttitudeVote>(userVoteRef);

  const handleVote = async (vote: AttitudeOption) => {
    if (isVoting || !firestore || !auth) return;

    setIsVoting(vote);

    try {
        let currentUser = user;

        if (!currentUser) {
            await initiateAnonymousSignIn(auth);
            currentUser = await getNextUser(auth);
        }
        
        const figureRef = doc(firestore, 'figures', figure.id);
        // New path for user-specific vote tracking
        const voteRef = doc(firestore, `users/${currentUser.uid}/attitudeVotes`, figure.id);

        await runTransaction(firestore, async (transaction) => {
            const existingVoteDoc = await transaction.get(voteRef);
            const figureDoc = await transaction.get(figureRef);

            if (!figureDoc.exists()) {
                throw new Error('¡El perfil no existe!');
            }

            const newVoteData: Omit<AttitudeVote, 'id'> = {
                userId: currentUser!.uid,
                figureId: figure.id,
                vote: vote,
                createdAt: serverTimestamp(),
            };

            if (existingVoteDoc.exists()) {
                const previousVote = existingVoteDoc.data().vote as AttitudeOption;

                if (previousVote === vote) {
                    transaction.update(figureRef, {
                        [`attitude.${vote}`]: increment(-1),
                    });
                    transaction.delete(voteRef);
                    toast({
                        title: 'Voto eliminado',
                        description: `Has quitado tu voto de '${vote}'.`,
                    });
                } else {
                    transaction.update(figureRef, {
                        [`attitude.${previousVote}`]: increment(-1),
                        [`attitude.${vote}`]: increment(1),
                    });
                    transaction.set(voteRef, newVoteData);
                    toast({
                        title: '¡Voto actualizado!',
                        description: `Tu actitud hacia ${figure.name} ha sido actualizada a '${vote}'.`,
                    });
                }
            } else {
                transaction.update(figureRef, {
                    [`attitude.${vote}`]: increment(1),
                });
                transaction.set(voteRef, newVoteData);
                toast({
                    title: '¡Voto registrado!',
                    description: `Tu actitud hacia ${figure.name} ha sido registrada como '${vote}'.`,
                });
            }
        });
    } catch (error: any) {
        console.error('Error al registrar el voto:', error);
        toast({
            variant: 'destructive',
            title: 'Error al votar',
            description: error.message || 'No se pudo registrar tu voto. Inténtalo de nuevo.',
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

  return (
    <div className="w-full">
      <div className="mb-4 text-left">
        <h3 className="text-xl font-bold font-headline">¿Qué te consideras?</h3>
        <p className="text-muted-foreground">Define tu actitud hacia {figure.name}. Tu voto es anónimo.</p>
      </div>
      <div className={cn("grid grid-cols-2 gap-4", gridColsClass)}>
        {attitudeOptions.map(({ id, label, icon: Icon }) => (
          <Button
            key={id}
            variant="outline"
            className={cn(
              'h-auto flex-col items-center justify-center gap-2 border-2 p-4 transition-all duration-200',
              'flex h-24 flex-col items-center justify-center gap-2',
              userVote?.vote === id
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-primary/50 hover:bg-primary/5'
            )}
            onClick={() => handleVote(id)}
            disabled={!!isVoting}
          >
            {isVoting === id ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <Icon className="h-6 w-6" />
            )}
            <span className="font-semibold">{label}</span>
            <span className="text-xl font-bold">
              {figure.attitude?.[id] ?? 0}
            </span>
          </Button>
        ))}
      </div>
      <p className="mt-4 text-center text-sm text-muted-foreground">
        Total de respuestas: {totalVotes}
      </p>
    </div>
  );
}
