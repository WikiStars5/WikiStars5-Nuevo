
'use client';

import { useState, useContext, useEffect } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase, useAuth } from '@/firebase';
import { doc, runTransaction, serverTimestamp, increment, setDoc, deleteDoc, getDoc, updateDoc } from 'firebase/firestore'; 
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
import { setDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';


type AttitudeOption = 'neutral' | 'fan' | 'simp' | 'hater';

const allAttitudeOptions: {
  id: AttitudeOption;
  labelKey: string;
  gifUrl: string;
  colorClass: string;
  selectedClass: string;
}[] = [
  { id: 'neutral', labelKey: 'AttitudeVoting.labels.neutral', gifUrl: 'https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/actitud%2Fneutral.png?alt=media&token=aac1fe00-4e42-49d1-98a2-3dab605987d3', colorClass: 'border-transparent', selectedClass: 'bg-gray-500/20 border-gray-400' },
  { id: 'fan', labelKey: 'AttitudeVoting.labels.fan', gifUrl: 'https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/actitud%2Ffan.png?alt=media&token=a937aee9-04b6-48e8-bf37-25eef5f28e90', colorClass: 'border-transparent', selectedClass: 'bg-yellow-400/20 border-yellow-300' },
  { id: 'simp', labelKey: 'AttitudeVoting.labels.simp', gifUrl: 'https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/actitud%2Fsimp.png?alt=media&token=2575cc73-9b85-4571-9983-3681c7741be3', colorClass: 'border-transparent', selectedClass: 'bg-pink-400/20 border-pink-300' },
  { id: 'hater', labelKey: 'AttitudeVoting.labels.hater', gifUrl: 'https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/actitud%2Fhater2.png?alt=media&token=141e1c39-fbf2-4a35-b1ae-570dbed48d81', colorClass: 'border-transparent', selectedClass: 'bg-red-500/20 border-red-400' },
];

interface AttitudeVotingProps {
  figure: Figure;
  onVote: (attitude: AttitudeOption | null) => void;
  variant?: 'full' | 'header';
}

export default function AttitudeVoting({ figure, onVote, variant = 'full' }: AttitudeVotingProps) {
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

  const { data: userVote, isLoading: isVoteLoading, refetch } = useDoc<AttitudeVote>(userVoteRef);
  
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
    
    const previousVote = optimisticVote?.vote;
    const isRetracting = previousVote === vote;
    const isChanging = previousVote && !isRetracting;

    // --- Optimistic Update ---
    onVote(isRetracting ? null : vote);
    setOptimisticFigure(prev => {
        const newAttitude = { ...(prev.attitude || {}) };
        if (isRetracting) {
            newAttitude[vote] = Math.max(0, (newAttitude[vote] || 1) - 1);
        } else {
            if (previousVote) {
                newAttitude[previousVote] = Math.max(0, (newAttitude[previousVote] || 1) - 1);
            }
            newAttitude[vote] = (newAttitude[vote] || 0) + 1;
        }
        return { ...prev, attitude: newAttitude };
    });
     setOptimisticVote(isRetracting ? null : { vote } as AttitudeVote);
    // --- End Optimistic Update ---

    try {
        const figureRef = doc(firestore, `figures/${figure.id}`);
        const userProfileRef = doc(firestore, 'users', currentUser.uid);
        const privateVoteRef = doc(firestore, `users/${currentUser.uid}/attitudeVotes`, figure.id);
        const attitudeStatsRef = (v: string) => doc(firestore, `figures/${figure.id}/attitudeStats`, v);

        const userProfileSnap = await getDoc(userProfileRef);
        const userProfileData = userProfileSnap.exists() ? userProfileSnap.data() as AppUser : {};
        const country = userProfileData.country || 'unknown';
        const gender = userProfileData.gender || 'unknown';
        
        // --- Figure document main counters ---
        const figureUpdates: { [key: string]: any } = {};
        if (isRetracting) {
            figureUpdates[`attitude.${vote}`] = increment(-1);
        } else {
            if (isChanging) {
                figureUpdates[`attitude.${previousVote}`] = increment(-1);
            }
            figureUpdates[`attitude.${vote}`] = increment(1);
        }
        updateDocumentNonBlocking(figureRef, figureUpdates);

        // --- Detailed demographic stats ---
        if (isChanging) {
            const oldStatRef = attitudeStatsRef(previousVote!);
            updateDocumentNonBlocking(oldStatRef, {
                [`${country}.total`]: increment(-1),
                [`${country}.${gender}`]: increment(-1)
            });
        }
        if (isRetracting) {
            const oldStatRef = attitudeStatsRef(vote);
             updateDocumentNonBlocking(oldStatRef, {
                [`${country}.total`]: increment(-1),
                [`${country}.${gender}`]: increment(-1)
            });
        } else { // New vote or changing vote
             const newStatRef = attitudeStatsRef(vote);
             setDocumentNonBlocking(newStatRef, {
                [country]: {
                    total: increment(1),
                    [gender]: increment(1)
                }
            }, { merge: true });
        }


        // --- User's private vote record ---
        if (isRetracting) {
            deleteDocumentNonBlocking(privateVoteRef);
        } else {
            const voteData = {
                userId: currentUser.uid, figureId: figure.id, vote: vote,
                createdAt: serverTimestamp(), figureName: figure.name, figureImageUrl: figure.imageUrl,
                userCountry: country, userGender: gender,
            };
            setDocumentNonBlocking(privateVoteRef, voteData);
        }

        refetch();
        toast({ title: isRetracting ? t('AttitudeVoting.voteToast.removed') : t('AttitudeVoting.voteToast.registered') });

    } catch (error: any) {
      console.error('Error al registrar el voto:', error);
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
    return <Skeleton className={cn(variant === 'full' ? "h-48 w-full" : "h-10 w-full")} />;
  }
  
  if (!areVotesEnabled) {
    return (
      <div className={cn("flex flex-col items-center justify-center text-center p-8 border-2 border-dashed rounded-lg bg-muted", variant === 'header' && 'p-2')}>
        <Lock className="h-8 w-8 text-muted-foreground" />
        {variant === 'full' && (
            <>
                <h3 className="mt-4 text-lg font-semibold">{t('AttitudeVoting.locked.title')}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{t('AttitudeVoting.locked.description')}</p>
            </>
        )}
      </div>
    );
  }

  const sentimentColors: Record<AttitudeOption, string> = {
    fan: 'bg-yellow-400',
    hater: 'bg-red-500',
    simp: 'bg-pink-400',
    neutral: 'bg-gray-500'
  };


  if (variant === 'header') {
    return (
      <div className="w-full space-y-2">
        <div className="flex items-center gap-2">
          {attitudeOptions.map(({ id, labelKey }) => {
            const isSelected = optimisticVote?.vote === id;
            return (
              <Button
                key={id}
                variant={isSelected ? 'default' : 'outline'}
                size="sm"
                className={cn("h-8 px-3 text-xs", isSelected && "bg-primary text-primary-foreground")}
                onClick={() => handleVote(id)}
                disabled={!!isVoting}
              >
                {isVoting === id ? <Loader2 className="h-4 w-4 animate-spin" /> : t(labelKey)}
              </Button>
            )
          })}
        </div>
        {totalVotes > 0 && (
          <TooltipProvider>
            <div className="flex h-2 w-full rounded-full overflow-hidden bg-muted">
              {attitudeOptions.map(({ id }) => {
                const votes = optimisticFigure.attitude?.[id] ?? 0;
                const percentage = totalVotes > 0 ? (votes / totalVotes) * 100 : 0;
                if (percentage === 0) return null;
                return (
                  <Tooltip key={id}>
                    <TooltipTrigger asChild>
                      <div
                        className={cn("h-full transition-all duration-300", sentimentColors[id])}
                        style={{ width: `${percentage}%` }}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{`${t(`AttitudeVoting.labels.${id}`)}: ${percentage.toFixed(1)}% (${votes.toLocaleString()})`}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </TooltipProvider>
        )}
      </div>
    )
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
      <div className={cn("grid grid-cols-2 gap-4", attitudeOptions.length === 3 ? 'md:grid-cols-3' : 'md:grid-cols-4')}>
          {attitudeOptions.map(({ id, labelKey, gifUrl, colorClass, selectedClass }) => {
          const isSelected = optimisticVote?.vote === id;
          return (
          <Button
              key={id}
              variant="outline"
              className={cn(
              'relative h-36 flex-col items-center justify-center gap-2 p-4 transition-all duration-200 hover:scale-105',
              'dark:bg-black',
              isSelected ? `scale-105 border-4 ${selectedClass}` : `border-2 ${colorClass}`
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

