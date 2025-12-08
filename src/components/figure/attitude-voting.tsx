'use client';

import { useState, useContext, useEffect } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase, useAuth } from '@/firebase';
import { doc, runTransaction, serverTimestamp, increment, setDoc, deleteDoc, getDoc } from 'firebase/firestore'; 
import { onAuthStateChanged, User as FirebaseUser, Auth, signInAnonymously } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Lock, ArrowDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Figure, AttitudeVote, GlobalSettings, User as AppUser } from '@/lib/types';
import Image from 'next/image';
import { LoginPromptDialog } from '../shared/login-prompt-dialog';
import { ShareButton } from '../shared/ShareButton';
import { useLanguage } from '@/context/LanguageContext';


type AttitudeOption = 'neutral' | 'fan' | 'simp' | 'hater';

const allAttitudeOptions: {
  id: AttitudeOption;
  labelKey: string;
  gifUrl: string;
  colorClass: string;
  selectedClass: string;
}[] = [
  { id: 'neutral', labelKey: 'AttitudeVoting.labels.neutral', gifUrl: 'https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/actitud%2Fneutral.png?alt=media&token=aac1fe00-4e42-49d1-98a2-3dab605987d3', colorClass: 'border-gray-500', selectedClass: 'bg-gray-500/20 border-4 border-gray-400' },
  { id: 'fan', labelKey: 'AttitudeVoting.labels.fan', gifUrl: 'https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/actitud%2Ffan.png?alt=media&token=a937aee9-04b6-48e8-bf37-25eef5f28e90', colorClass: 'border-yellow-400', selectedClass: 'bg-yellow-400/20 border-4 border-yellow-300' },
  { id: 'simp', labelKey: 'AttitudeVoting.labels.simp', gifUrl: 'https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/actitud%2Fsimp.png?alt=media&token=2575cc73-9b85-4571-9983-3681c7741be3', colorClass: 'border-pink-400', selectedClass: 'bg-pink-400/20 border-4 border-pink-300' },
  { id: 'hater', labelKey: 'AttitudeVoting.labels.hater', gifUrl: 'https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/actitud%2Fhater2.png?alt=media&token=141e1c39-fbf2-4a35-b1ae-570dbed48d81', colorClass: 'border-red-500', selectedClass: 'bg-red-500/20 border-4 border-red-400' },
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
  const { t } = useLanguage();

  const [isVoting, setIsVoting] = useState<AttitudeOption | null>(null);
  const [optimisticFigure, setOptimisticFigure] = useState(figure);
  const [optimisticVote, setOptimisticVote] = useState<AttitudeVote | null>(null);

  useEffect(() => {
    setOptimisticFigure(figure);
  }, [figure]);


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
  
  const isGoatCandidate = figure?.name === 'Lionel Messi' || figure?.name === 'Cristiano Ronaldo';

  useEffect(() => {
    if (userVote) {
      setOptimisticVote(userVote);
    } else {
      setOptimisticVote(null);
    }
  }, [userVote]);


  const handleVote = async (vote: AttitudeOption) => {
    if (!areVotesEnabled) {
      toast({
        title: t('AttitudeVoting.disabledToast.title'),
        description: t('AttitudeVoting.disabledToast.description'),
        variant: 'destructive',
      });
      return;
    }
    if (isVoting || !firestore || !auth) return;

    let currentUser = user;
    if (!currentUser) {
        try {
            const userCredential = await signInAnonymously(auth);
            currentUser = userCredential.user;
            toast({
                title: t('AttitudeVoting.anonymousToast.title'),
                description: t('AttitudeVoting.anonymousToast.description')
            });
        } catch (error) {
            console.error("Error signing in anonymously:", error);
            toast({ title: t('AttitudeVoting.authErrorToast.title'), description: t('AttitudeVoting.authErrorToast.description'), variant: 'destructive'});
            return;
        }
    }

    if (!currentUser) {
        toast({ title: t('AttitudeVoting.userErrorToast.title'), description: t('AttitudeVoting.userErrorToast.description'), variant: 'destructive'});
        return;
    }


    setIsVoting(vote);
    
    // --- Optimistic Update ---
    const previousVote = optimisticVote?.vote;
    const isRetracting = previousVote === vote;
    const previousOptimisticFigure = { ...optimisticFigure };
    const previousOptimisticVote = optimisticVote;

    // Update vote selection optimistically
    if (isRetracting) {
        setOptimisticVote(null);
        onVote(null);
    } else {
        setOptimisticVote({ vote } as AttitudeVote); // Dummy object for selection
        onVote(vote);
    }

    // Update counts optimistically
    setOptimisticFigure(prevFigure => {
      const newAttitude = { ...(prevFigure.attitude || {}) };
      if (isRetracting) {
        newAttitude[vote] = (newAttitude[vote] || 1) - 1;
      } else {
        if (previousVote) {
          newAttitude[previousVote] = (newAttitude[previousVote] || 1) - 1;
        }
        newAttitude[vote] = (newAttitude[vote] || 0) + 1;
      }
      return { ...prevFigure, attitude: newAttitude };
    });
    // --- End Optimistic Update ---

    try {
      const userProfileRef = doc(firestore, 'users', currentUser.uid);
      const publicVoteRef = doc(firestore, `figures/${figure.id}/attitudeVotes`, currentUser.uid);
      const privateVoteRef = doc(firestore, `users/${currentUser.uid}/attitudeVotes`, figure.id);
      const figureRef = doc(firestore, `figures/${figure.id}`);

      await runTransaction(firestore, async (transaction) => {
        const [privateVoteDoc, userProfileDoc] = await Promise.all([
          transaction.get(privateVoteRef),
          transaction.get(userProfileRef),
        ]);
        
        const dbPreviousVote = privateVoteDoc.exists() ? (privateVoteDoc.data() as AttitudeVote).vote : null;
        const userProfileData = userProfileDoc.exists() ? userProfileDoc.data() as AppUser : null;
        const country = userProfileData?.country || 'unknown';
        const gender = userProfileData?.gender || 'unknown';
        const isDbRetracting = dbPreviousVote === vote;

        // --- Aggregation Logic ---
        if (dbPreviousVote) {
            // Decrement the old stat if the user is changing their vote or retracting it.
            const oldStatId = `${country}_${gender}_${dbPreviousVote}`;
            const oldStatRef = doc(firestore, `figures/${figure.id}/attitudeStats`, oldStatId);
            transaction.set(oldStatRef, { count: increment(-1) }, { merge: true });
        }
        if (!isDbRetracting) {
            // Increment the new stat if it's a new vote or a changed vote.
            const newStatId = `${country}_${gender}_${vote}`;
            const newStatRef = doc(firestore, `figures/${figure.id}/attitudeStats`, newStatId);
            transaction.set(newStatRef, { count: increment(1) }, { merge: true });
        }
        // --- End Aggregation Logic ---
        
        const updates: any = {
          __oldVote: dbPreviousVote,
          __newVote: isDbRetracting ? dbPreviousVote : vote, 
        };
        
        const denormalizedData = {
            figureName: figure.name,
            figureImageUrl: figure.imageUrl,
            userCountry: country,
            userGender: gender,
        };

        if (isDbRetracting) {
          transaction.delete(publicVoteRef);
          transaction.delete(privateVoteRef);
          updates[`attitude.${vote}`] = increment(-1);
          toast({ title: t('AttitudeVoting.voteToast.removed') });

        } else {
            const voteData: Omit<AttitudeVote, 'id'> & { createdAt: any } = {
                userId: currentUser!.uid,
                figureId: figure.id,
                vote: vote,
                createdAt: serverTimestamp(),
                ...denormalizedData,
            };

            if (dbPreviousVote) {
                transaction.set(publicVoteRef, voteData, { merge: true });
                transaction.set(privateVoteRef, voteData, { merge: true });
                updates[`attitude.${dbPreviousVote}`] = increment(-1);
                updates[`attitude.${vote}`] = increment(1);
                toast({ title: t('AttitudeVoting.voteToast.updated') });
            } else {
                transaction.set(publicVoteRef, voteData);
                transaction.set(privateVoteRef, voteData);
                updates[`attitude.${vote}`] = increment(1);
                toast({ title: t('AttitudeVoting.voteToast.registered') });
            }
        }
        
        updates.updatedAt = serverTimestamp();
        transaction.update(figureRef, updates);
      });
      
    } catch (error: any) {
      console.error('Error al registrar el voto:', error);
      // Revert optimistic update on error
      setOptimisticFigure(previousOptimisticFigure);
      setOptimisticVote(previousOptimisticVote);
      toast({
        variant: 'destructive',
        title: t('AttitudeVoting.errorToast.title'),
        description: t('AttitudeVoting.errorToast.description'),
      });
    } finally {
      setIsVoting(null);
    }
  };

  const totalVotes = Object.values(optimisticFigure.attitude || {}).reduce(
    (sum, count) => sum + count,
    0
  );

  const isLoading = isUserLoading || (!!user && isVoteLoading);
  
  if (isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }

  const gridColsClass = attitudeOptions.length === 3 ? 'md:grid-cols-3' : 'md:grid-cols-4';
  
  if (!areVotesEnabled) {
    return (
      <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed rounded-lg bg-muted">
        <Lock className="h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold">{t('AttitudeVoting.locked.title')}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{t('AttitudeVoting.locked.description')}</p>
      </div>
    );
  }

  return (
    <div className="w-full relative">
      {optimisticVote?.vote && (
        <div className="absolute top-0 right-0 z-10">
          <ShareButton
              figureId={figure.id}
              figureName={figure.name}
              isAttitudeShare={true}
              attitude={optimisticVote.vote}
              showText={false}
          />
        </div>
      )}
      <div className="mb-4 text-left">
          <h3 className="text-xl font-bold font-headline">{t('AttitudeVoting.title')}</h3>
      </div>
      <div className={cn("grid grid-cols-2 gap-4", gridColsClass)}>
          {attitudeOptions.map(({ id, labelKey, gifUrl, colorClass, selectedClass }) => {
          const isSelected = optimisticVote?.vote === id;
          return (
          <Button
              key={id}
              variant="outline"
              className={cn(
              'relative h-36 flex-col items-center justify-center gap-2 p-4 transition-all duration-200 hover:scale-105',
              'dark:bg-black',
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
                          <Image src={gifUrl} alt={t(labelKey)} width={48} height={48} unoptimized className="h-12 w-12" />
                      </div>
                      <div>
                          <span className="font-semibold text-sm">{t(labelKey)}</span>
                          <span className="block text-lg font-bold">
                          {(optimisticFigure.attitude?.[id] ?? 0).toLocaleString()}
                          </span>
                      </div>
                  </div>
              )}
          </Button>
          )})}
      </div>
      <div className="mt-4 text-center">
          <p className="text-sm text-muted-foreground">
              {t('AttitudeVoting.totalVotes').replace('{count}', totalVotes.toLocaleString())}
          </p>
      </div>
    </div>
  );
}
