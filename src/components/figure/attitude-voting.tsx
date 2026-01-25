'use client';

import { useState, useEffect } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase, useAuth } from '@/firebase';
import { doc, runTransaction, serverTimestamp, increment, getDoc, updateDoc } from 'firebase/firestore'; 
import { User as FirebaseUser, signInAnonymously } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn, formatCompactNumber } from '@/lib/utils';
import type { Figure, AttitudeVote, GlobalSettings, User as AppUser } from '@/lib/types';
import Image from 'next/image';
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
  { id: 'neutral', labelKey: 'AttitudeVoting.labels.neutral', gifUrl: 'https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/actitud%2Fneutral.png?alt=media&token=aac1fe00-4e42-49d1-98a2-3dab605987d3', colorClass: 'border-transparent', selectedClass: 'border-gray-400' },
  { id: 'fan', labelKey: 'AttitudeVoting.labels.fan', gifUrl: 'https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/actitud%2Ffan.png?alt=media&token=a937aee9-04b6-48e8-bf37-25eef5f28e90', colorClass: 'border-transparent', selectedClass: 'border-yellow-300' },
  { id: 'simp', labelKey: 'AttitudeVoting.labels.simp', gifUrl: 'https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/actitud%2Fsimp.png?alt=media&token=2575cc73-9b85-4571-9983-3681c7741be3', colorClass: 'border-transparent', selectedClass: 'border-pink-300' },
  { id: 'hater', labelKey: 'AttitudeVoting.labels.hater', gifUrl: 'https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/actitud%2Fhater2.png?alt=media&token=141e1c39-fbf2-4a35-b1ae-570dbed48d81', colorClass: 'border-transparent', selectedClass: 'border-red-400' },
];

interface AttitudeVotingProps {
  figure: Figure;
  onVote: (attitude: AttitudeOption | null) => void;
  variant?: 'full' | 'header';
}

export default function AttitudeVoting({ figure: initialFigure, onVote, variant = 'full' }: AttitudeVotingProps) {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  
  const [figure, setFigure] = useState(initialFigure);
  const [isVoting, setIsVoting] = useState<AttitudeOption | null>(null);

  useEffect(() => {
    setFigure(initialFigure);
  }, [initialFigure]);

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
    
    // --- Optimistic UI Update ---
    const previousVote = userVote?.vote;
    const isRetracting = previousVote === vote;

    setFigure(currentFigure => {
        const newAttitude = { ...currentFigure.attitude };
        if (isRetracting) {
            newAttitude[vote] = (newAttitude[vote] || 1) - 1;
        } else {
            newAttitude[vote] = (newAttitude[vote] || 0) + 1;
            if (previousVote) {
                newAttitude[previousVote] = (newAttitude[previousVote] || 1) - 1;
            }
        }
        return { ...currentFigure, attitude: newAttitude };
    });
    // --- End Optimistic UI Update ---


    try {
        await runTransaction(firestore, async (transaction) => {
            const figureRef = doc(firestore, 'figures', figure.id);
            const userProfileRef = doc(firestore, 'users', currentUser!.uid);
            const privateVoteRef = doc(firestore, `users/${currentUser!.uid}/attitudeVotes`, figure.id);

            const [figureDoc, userProfileDoc, privateVoteDoc] = await Promise.all([
                transaction.get(figureRef),
                transaction.get(userProfileRef),
                transaction.get(privateVoteRef)
            ]);

            if (!figureDoc.exists()) {
                throw new Error("Figure does not exist.");
            }
            
            // Create user profile if it doesn't exist (for anonymous users on first action)
            if (!userProfileDoc.exists()) {
                transaction.set(userProfileRef, { 
                    id: currentUser!.uid,
                    createdAt: serverTimestamp() 
                });
            }

            const dbPreviousVote = privateVoteDoc.exists() ? privateVoteDoc.data().vote : null;
            const dbIsRetracting = dbPreviousVote === vote;
            const dbIsChanging = dbPreviousVote && !dbIsRetracting;

            const updates: { [key: string]: any } = {
                __oldVote: dbPreviousVote,
                __newVote: dbIsRetracting ? null : vote,
            };

            if (dbIsRetracting) {
                updates[`attitude.${vote}`] = increment(-1);
                transaction.delete(privateVoteRef);
            } else {
                updates[`attitude.${vote}`] = increment(1);
                if (dbIsChanging) {
                    updates[`attitude.${dbPreviousVote}`] = increment(-1);
                }

                // Use the fetched userProfileDoc data, even if it was just created
                const userProfileData = userProfileDoc.exists() 
                    ? userProfileDoc.data() as AppUser 
                    : {};
                
                const voteData = {
                    userId: currentUser!.uid,
                    figureId: figure.id,
                    vote: vote,
                    createdAt: serverTimestamp(),
                    figureName: figure.name,
                    figureImageUrl: figure.imageUrl,
                    userCountry: userProfileData.country || null,
                    userGender: userProfileData.gender || null,
                };
                transaction.set(privateVoteRef, voteData);
            }
            transaction.update(figureRef, updates);
        });
        
        onVote(userVote?.vote === vote ? null : vote);
        toast({ title: userVote?.vote === vote ? t('AttitudeVoting.voteToast.removed') : t('AttitudeVoting.voteToast.registered') });
        refetch();

    } catch (error: any) {
      console.error('Error al registrar el voto:', error);
      // Revert optimistic update on error
      setFigure(initialFigure);
      toast({
        variant: 'destructive',
        title: t('AttitudeVoting.errorToast.title'),
        description: error.message || t('AttitudeVoting.errorToast.description'),
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

  if (variant === 'header') {
    return (
      <div className="w-full">
        <div className="flex flex-wrap items-start justify-center md:justify-start gap-4">
          {attitudeOptions.map(({ id, labelKey, selectedClass }) => {
            const isSelected = userVote?.vote === id;
            const votes = figure.attitude?.[id] ?? 0;
            return (
              <div key={id} className="flex flex-col items-center gap-1">
                <Button
                  variant={'outline'}
                  size="sm"
                  className={cn("h-8 px-3 text-xs border-2", isSelected ? selectedClass : 'border-transparent')}
                  onClick={() => handleVote(id)}
                  disabled={!!isVoting}
                >
                  {isVoting === id ? <Loader2 className="h-4 w-4 animate-spin" /> : t(labelKey)}
                </Button>
                <span className="text-xs font-bold text-muted-foreground">{formatCompactNumber(votes)}</span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="w-full relative">
      {userVote?.vote && (
        <div className="absolute top-0 right-0 z-10">
          <ShareButton
              figureId={figure.id}
              figureName={figure.name}
              isAttitudeShare={true}
              attitude={userVote.vote}
              showText={false}
          />
        </div>
      )}
      <div className="mb-4 text-left">
          <h3 className="text-xl font-bold font-headline">{t('AttitudeVoting.title')}</h3>
      </div>
      <div className={cn("grid grid-cols-2 gap-4", attitudeOptions.length === 3 ? 'md:grid-cols-3' : 'md:grid-cols-4')}>
          {attitudeOptions.map(({ id, labelKey, gifUrl, colorClass, selectedClass }) => {
          const isSelected = userVote?.vote === id;
          return (
          <Button
              key={id}
              variant="outline"
              className={cn(
              'relative h-36 flex-col items-center justify-center gap-2 p-4 transition-all duration-200 hover:scale-105',
              'dark:bg-black',
              isSelected ? `scale-105 border-2 ${selectedClass}` : `border-2 ${colorClass}`
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
                              {formatCompactNumber(figure.attitude?.[id] ?? 0)}
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
