'use client';

import { useState, useContext, useEffect } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase, useAuth } from '@/firebase';
import { doc, runTransaction, serverTimestamp, increment, setDoc, deleteDoc, getDoc, updateDoc } from 'firebase/firestore'; 
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Smile, Meh, Frown, AlertTriangle, ThumbsDown, Angry, Loader2, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Figure, EmotionVote, GlobalSettings, User as AppUser } from '@/lib/types';
import Image from 'next/image';
import { signInAnonymously } from 'firebase/auth';
import { ShareButton } from '../shared/ShareButton';
import { useLanguage } from '@/context/LanguageContext';
import { setDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';


type EmotionOption = 'alegria' | 'envidia' | 'tristeza' | 'miedo' | 'desagrado' | 'furia';

const emotionOptions: {
  id: EmotionOption;
  labelKey: string;
  gifUrl: string;
  colorClass: string;
  textColorClass: string;
  selectedClass: string;
}[] = [
  { id: 'alegria', labelKey: 'EmotionVoting.labels.alegria', gifUrl: 'https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/Emoci%C3%B3n%2Falegria.png?alt=media&token=c6ea80e2-b3f9-463c-be2a-d7499053eeba', colorClass: 'border-transparent', textColorClass: 'text-yellow-400', selectedClass: 'bg-yellow-400/20 border-yellow-300' },
  { id: 'envidia', labelKey: 'EmotionVoting.labels.envidia', gifUrl: 'https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/Emoci%C3%B3n%2Fenvidia.png?alt=media&token=8c596bec-ad23-4b32-9b31-f9e79a9006b4', colorClass: 'border-transparent', textColorClass: 'text-green-500', selectedClass: 'bg-green-500/20 border-green-400' },
  { id: 'tristeza', labelKey: 'EmotionVoting.labels.tristeza', gifUrl: 'https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/Emoci%C3%B3n%2Ftrizteza.png?alt=media&token=84884715-cd24-4bb9-9e66-a838cb4b7264', colorClass: 'border-transparent', textColorClass: 'text-blue-500', selectedClass: 'bg-blue-500/20 border-blue-400' },
  { id: 'miedo', labelKey: 'EmotionVoting.labels.miedo', gifUrl: 'https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/Emoci%C3%B3n%2Fmiedo.png?alt=media&token=904c948b-2b47-4b73-abda-ff9906598cc3', colorClass: 'border-transparent', textColorClass: 'text-purple-500', selectedClass: 'bg-purple-500/20 border-purple-400' },
  { id: 'desagrado', labelKey: 'EmotionVoting.labels.desagrado', gifUrl: 'https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/Emoci%C3%B3n%2Fdesagrado.png?alt=media&token=88161fe7-a756-4d4c-ba27-f831682da537', colorClass: 'border-transparent', textColorClass: 'text-lime-600', selectedClass: 'bg-lime-600/20 border-lime-500' },
  { id: 'furia', labelKey: 'EmotionVoting.labels.furia', gifUrl: 'https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/Emoci%C3%B3n%2Ffuria.png?alt=media&token=69a8a540-82a9-457b-8993-2076902475d6', colorClass: 'border-transparent', textColorClass: 'text-red-500', selectedClass: 'bg-red-500/20 border-red-400' },
];

interface EmotionVotingProps {
  figure: Figure;
}

export default function EmotionVoting({ figure }: EmotionVotingProps) {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  
  const [isVoting, setIsVoting] = useState<EmotionOption | null>(null);
  const [optimisticFigure, setOptimisticFigure] = useState(figure);
  const [optimisticVote, setOptimisticVote] = useState<EmotionVote | null>(null);

  useEffect(() => {
    setOptimisticFigure(figure);
  }, [figure]);


  // Fetch global settings
  const settingsDocRef = useMemoFirebase(() => firestore ? doc(firestore, 'settings', 'global') : null, [firestore]);
  const { data: globalSettings } = useDoc<GlobalSettings>(settingsDocRef);
  const areVotesEnabled = globalSettings?.isVotingEnabled ?? true;


  const userVoteRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, `users/${user.uid}/emotionVotes`, figure.id);
  }, [firestore, user, figure.id]);

  const { data: userVote, isLoading: isVoteLoading, refetch } = useDoc<EmotionVote>(userVoteRef);

  useEffect(() => {
    if (userVote) {
      setOptimisticVote(userVote);
    } else {
      setOptimisticVote(null);
    }
  }, [userVote]);

  const handleVote = async (vote: EmotionOption) => {
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
    setOptimisticFigure(prev => {
        const newEmotion = { ...(prev.emotion || {}) };
        if (isRetracting) {
            newEmotion[vote] = Math.max(0, (newEmotion[vote] || 1) - 1);
        } else {
            if (previousVote) {
                newEmotion[previousVote] = Math.max(0, (newEmotion[previousVote] || 1) - 1);
            }
            newEmotion[vote] = (newEmotion[vote] || 0) + 1;
        }
        return { ...prev, emotion: newEmotion };
    });
    setOptimisticVote(isRetracting ? null : { vote } as EmotionVote);
    // --- End Optimistic Update ---

    try {
        const figureRef = doc(firestore, `figures/${figure.id}`);
        const userProfileRef = doc(firestore, 'users', currentUser.uid);
        const privateVoteRef = doc(firestore, `users/${currentUser.uid}/emotionVotes`, figure.id);
        const emotionStatsRef = (v: string) => doc(firestore, `figures/${figure.id}/emotionStats`, v);

        const userProfileSnap = await getDoc(userProfileRef);
        const userProfileData = userProfileSnap.exists() ? userProfileSnap.data() as AppUser : {};
        const country = userProfileData.country || 'unknown';
        const gender = userProfileData.gender || 'unknown';

        const figureUpdates: { [key: string]: any } = {};
        if (isRetracting) {
            figureUpdates[`emotion.${vote}`] = increment(-1);
        } else {
            if (isChanging) {
                figureUpdates[`emotion.${previousVote}`] = increment(-1);
            }
            figureUpdates[`emotion.${vote}`] = increment(1);
        }
        updateDocumentNonBlocking(figureRef, figureUpdates);
        
        if (isChanging) {
            const oldStatRef = emotionStatsRef(previousVote!);
            updateDocumentNonBlocking(oldStatRef, {
                [`${country}.total`]: increment(-1),
                [`${country}.${gender}`]: increment(-1)
            });
        }
        if (isRetracting) {
            const oldStatRef = emotionStatsRef(vote);
            updateDocumentNonBlocking(oldStatRef, {
                [`${country}.total`]: increment(-1),
                [`${country}.${gender}`]: increment(-1)
            });
        } else {
            const newStatRef = emotionStatsRef(vote);
            setDocumentNonBlocking(newStatRef, {
                [country]: { total: increment(1), [gender]: increment(1) }
            }, { merge: true });
        }

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


  const totalVotes = Object.values(optimisticFigure.emotion || {}).reduce(
    (sum, count) => sum + count,
    0
  );

  const isLoading = isUserLoading || (!!user && isVoteLoading);
  
  if (isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }

  if (!areVotesEnabled) {
    return (
      <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed rounded-lg bg-muted">
        <Lock className="h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold">{t('EmotionVoting.locked.title')}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{t('EmotionVoting.locked.description')}</p>
      </div>
    );
  }

  const showDetails = true;

  return (
      <div className="w-full relative">
        {optimisticVote?.vote && (
            <div className="absolute top-0 right-0 z-10">
                <ShareButton
                    figureId={figure.id}
                    figureName={figure.name}
                    isEmotionShare={true}
                    emotion={optimisticVote.vote}
                    showText={false}
                />
            </div>
        )}
        <div className="mb-4 text-left">
          <h3 className="text-xl font-bold font-headline">{t('EmotionVoting.title')}</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {emotionOptions.map(({ id, labelKey, gifUrl, colorClass, selectedClass, textColorClass }) => {
            const isSelected = optimisticVote?.vote === id;
            return (
              <Button
                key={id}
                variant="outline"
                className={cn(
                'relative h-36 flex-col items-center justify-center gap-2 p-4 transition-all duration-200 hover:scale-105',
                'dark:bg-black',
                isSelected ? `scale-105 border-4 ${selectedClass}` : `border-2 ${colorClass}`,
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
                             {showDetails && (
                              <span className="block text-lg font-bold">
                                {(optimisticFigure.emotion?.[id] ?? 0).toLocaleString()}
                              </span>
                            )}
                        </div>
                    </div>
                )}
              </Button>
            );
          })}
        </div>
        {showDetails && (
          <div className="mt-4 text-center">
              <p className="text-sm text-muted-foreground">
                  {t('EmotionVoting.totalVotes').replace('{count}', totalVotes.toLocaleString())}
              </p>
          </div>
        )}
      </div>
  );
}
