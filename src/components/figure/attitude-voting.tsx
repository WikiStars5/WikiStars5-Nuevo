
'use client';

import { useState } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase, useAuth } from '@/firebase';
import { doc, runTransaction, serverTimestamp, increment } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Heart, Star, ThumbsDown, User, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Figure, AttitudeVote } from '@/lib/types';
import { initiateAnonymousSignIn } from '@/firebase/non-blocking-login';

type AttitudeOption = 'neutral' | 'fan' | 'simp' | 'hater';

const attitudeOptions: {
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

export default function AttitudeVoting({ figure }: AttitudeVotingProps) {
  const { user, isUserLoading, reloadUser } = useUser();
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();

  const [isVoting, setIsVoting] = useState(false);

  const userVoteRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, `figures/${figure.id}/attitudeVotes`, user.uid);
  }, [firestore, user, figure.id]);

  const { data: userVote, isLoading: isVoteLoading } = useDoc<AttitudeVote>(userVoteRef);

  const handleVote = async (vote: AttitudeOption) => {
    if (isVoting || !firestore || !auth) return;

    setIsVoting(true);

    let currentUser = user;

    // If user is not logged in, sign them in anonymously
    if (!currentUser) {
      try {
        await initiateAnonymousSignIn(auth);
        // After anonymous sign-in, we need to get the new user object.
        // We will trigger a reload and let the effect handle the re-render.
        await reloadUser();
        // The user state will update, and we can retry the vote on the next click.
        toast({
          title: 'Cuenta de invitado creada',
          description: 'Ahora puedes votar. Haz clic de nuevo para registrar tu voto.',
        });
        setIsVoting(false);
        return; // Exit here. The user will click again with a valid user object.
      } catch (error) {
        console.error('Error signing in anonymously:', error);
        toast({
          variant: 'destructive',
          title: 'Error de autenticación',
          description: 'No se pudo crear una sesión de invitado. Inténtalo de nuevo.',
        });
        setIsVoting(false);
        return;
      }
    }
    
    // After the check, currentUser must be valid.
    const finalUser = auth.currentUser;
    if (!finalUser) {
        setIsVoting(false);
        return;
    }


    const figureRef = doc(firestore, 'figures', figure.id);
    const voteRef = doc(firestore, `figures/${figure.id}/attitudeVotes`, finalUser.uid);

    try {
      await runTransaction(firestore, async (transaction) => {
        const existingVoteDoc = await transaction.get(voteRef);
        const figureDoc = await transaction.get(figureRef);

        if (!figureDoc.exists()) {
          throw new Error('¡El perfil no existe!');
        }

        const newVoteData = {
          userId: finalUser.uid,
          figureId: figure.id,
          vote: vote,
          createdAt: serverTimestamp(),
        };

        if (existingVoteDoc.exists()) {
          const previousVote = existingVoteDoc.data().vote as AttitudeOption;

          if (previousVote === vote) {
            toast({
              title: 'Ya has votado',
              description: `Tu voto actual ya es '${vote}'.`,
            });
            return;
          }

          transaction.update(figureRef, {
            [`attitude.${previousVote}`]: increment(-1),
          });

          transaction.update(figureRef, {
            [`attitude.${vote}`]: increment(1),
          });

          transaction.set(voteRef, newVoteData);
        } else {
          transaction.update(figureRef, {
            [`attitude.${vote}`]: increment(1),
          });
          transaction.set(voteRef, newVoteData);
        }
      });

      toast({
        title: '¡Voto registrado!',
        description: `Tu actitud hacia ${figure.name} ha sido registrada como '${vote}'.`,
      });
    } catch (error: any) {
      console.error('Error al registrar el voto:', error);
      toast({
        variant: 'destructive',
        title: 'Error al votar',
        description: error.message || 'No se pudo registrar tu voto. Inténtalo de nuevo.',
      });
    } finally {
      setIsVoting(false);
    }
  };

  const totalVotes = Object.values(figure.attitude || {}).reduce(
    (sum, count) => sum + count,
    0
  );

  if (isUserLoading || isVoteLoading) {
    return <Skeleton className="h-48 w-full" />;
  }

  return (
    <div className="w-full">
      <div className="mb-4 text-left">
        <h3 className="text-xl font-bold font-headline">¿Qué te consideras?</h3>
        <p className="text-muted-foreground">Define tu actitud hacia {figure.name}. Tu voto es anónimo.</p>
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {attitudeOptions.map(({ id, label, icon: Icon }) => (
          <Button
            key={id}
            variant="outline"
            className={cn(
              'h-auto flex flex-col items-center justify-center gap-2 border-2 p-4 transition-all duration-200',
              userVote?.vote === id
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-primary/50 hover:bg-primary/5'
            )}
            onClick={() => handleVote(id)}
            disabled={isVoting}
          >
            {isVoting ? (
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
