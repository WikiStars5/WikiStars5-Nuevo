
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
import Image from 'next/image';

type EmotionOption = 'alegria' | 'envidia' | 'tristeza' | 'miedo' | 'desagrado' | 'furia';

const emotionOptions: {
  id: EmotionOption;
  label: string;
  gifUrl: string;
  colorClass: string;
  textColorClass: string;
}[] = [
  { id: 'alegria', label: 'Alegría', gifUrl: 'https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/gif%2Falegria.gif?alt=media&token=74d9307f-4b9d-4dba-8f52-ae51de1016bd', colorClass: 'border-yellow-400', textColorClass: 'text-yellow-400' },
  { id: 'envidia', label: 'Envidia', gifUrl: 'https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/gif%2Fenvidia.gif?alt=media&token=38b3a744-8c82-45e1-883a-4467554b901e', colorClass: 'border-green-500', textColorClass: 'text-green-500' },
  { id: 'tristeza', label: 'Tristeza', gifUrl: 'https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/gif%2Ftrizteza.gif?alt=media&token=858bdee9-659b-43b8-8199-dc49d120fb17', colorClass: 'border-blue-500', textColorClass: 'text-blue-500' },
  { id: 'miedo', label: 'Miedo', gifUrl: 'https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/gif%2Fmiedo.gif?alt=media&token=8d277b5f-1558-46b3-9097-98782a2491a5', colorClass: 'border-purple-500', textColorClass: 'text-purple-500' },
  { id: 'desagrado', label: 'Desagrado', gifUrl: 'https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/gif%2Fdesagrado.gif?alt=media&token=e9e2b17f-d51a-4710-91a1-945761a293ad', colorClass: 'border-lime-600', textColorClass: 'text-lime-600' },
  { id: 'furia', label: 'Furia', gifUrl: 'https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/gif%2Ffuria.gif?alt=media&token=9d65a477-15b5-462a-ad01-953310b0bfb6', colorClass: 'border-red-500', textColorClass: 'text-red-500' },
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
    // New path: users/{userId}/emotionVotes/{figureId}
    return doc(firestore, `users/${user.uid}/emotionVotes`, figure.id);
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
      // New path for user-specific vote tracking
      const voteRef = doc(firestore, `users/${currentUser.uid}/emotionVotes`, figure.id);

      await runTransaction(firestore, async (transaction) => {
        const existingVoteDoc = await transaction.get(voteRef);
        const figureDoc = await transaction.get(figureRef);

        if (!figureDoc.exists()) {
          throw new Error('¡El perfil no existe!');
        }

        const newVoteData: Omit<EmotionVote, 'id'> = {
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
        {emotionOptions.map(({ id, label, gifUrl, colorClass, textColorClass }) => {
            const isSelected = userVote?.vote === id;
            return (
              <Button
                key={id}
                variant="outline"
                className={cn(
                  'relative h-auto flex-col items-center justify-start gap-2 border-2 p-4 transition-all duration-200',
                  'flex h-36 flex-col',
                   isSelected ? `${colorClass} bg-card shadow-inner` : 'border-border hover:bg-muted/50',
                   isVoting === id ? 'cursor-not-allowed' : ''
                )}
                onClick={() => handleVote(id)}
                disabled={!!isVoting}
              >
                {isVoting === id ? (
                  <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : (
                    <div className="flex h-full flex-col items-center justify-center">
                        <div className="flex-1 flex items-center justify-center">
                             <Image src={gifUrl} alt={label} width={48} height={48} unoptimized className="h-12 w-12" />
                        </div>
                        <div className="text-center">
                            <span className={cn("font-semibold", isSelected ? textColorClass : '')}>{label}</span>
                            <span className={cn("block text-xl font-bold", isSelected ? textColorClass : '')}>
                            {figure.emotion?.[id] ?? 0}
                            </span>
                        </div>
                    </div>
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
