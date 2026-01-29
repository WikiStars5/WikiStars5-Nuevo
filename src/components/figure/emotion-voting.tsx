'use client';

import { useState, useEffect, useContext } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase, useAuth } from '@/firebase';
import { doc, runTransaction, serverTimestamp, increment, getDoc } from 'firebase/firestore'; 
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Figure, EmotionVote, GlobalSettings, User as AppUser } from '@/lib/types';
import Image from 'next/image';
import { signInAnonymously, User as FirebaseUser } from 'firebase/auth';
import { ShareButton } from '../shared/ShareButton';
import { useLanguage } from '@/context/LanguageContext';
import { updateStreak } from '@/firebase/streaks';
import { StreakAnimationContext } from '@/context/StreakAnimationContext';

type EmotionOption = 'alegria' | 'envidia' | 'tristeza' | 'miedo' | 'desagrado' | 'furia';

const emotionOptions: {
  id: EmotionOption;
  labelKey: string;
  gifUrl: string;
  colorClass: string;
  textColorClass: string;
  selectedClass: string;
}[] = [
  { id: 'alegria', labelKey: 'EmotionVoting.labels.alegria', gifUrl: 'https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/Emoci%C3%B3n%2Falegria%20(1).png?alt=media&token=a5ca7c3a-1137-4b0a-8126-e18ba286ae66', colorClass: 'border-transparent', textColorClass: 'text-yellow-400', selectedClass: 'bg-yellow-400/20 border-yellow-300' },
  { id: 'envidia', labelKey: 'EmotionVoting.labels.envidia', gifUrl: 'https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/Emoci%C3%B3n%2Fenvidia%20(1).png?alt=media&token=66814422-e842-4f1b-8d73-f45adfec3047', colorClass: 'border-transparent', textColorClass: 'text-green-500', selectedClass: 'bg-green-500/20 border-green-400' },
  { id: 'tristeza', labelKey: 'EmotionVoting.labels.tristeza', gifUrl: 'https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/Emoci%C3%B3n%2Ftrizteza%20(1).png?alt=media&token=b9f6d508-744a-471b-b7b9-ff382cd086fd', colorClass: 'border-transparent', textColorClass: 'text-blue-500', selectedClass: 'bg-blue-500/20 border-blue-400' },
  { id: 'miedo', labelKey: 'EmotionVoting.labels.miedo', gifUrl: 'https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/Emoci%C3%B3n%2Fmiedo%20(1)%20(1).png?alt=media&token=dc5950c9-50d9-4b1d-80db-81e528088867', colorClass: 'border-transparent', textColorClass: 'text-purple-500', selectedClass: 'bg-purple-500/20 border-purple-400' },
  { id: 'desagrado', labelKey: 'EmotionVoting.labels.desagrado', gifUrl: 'https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/Emoci%C3%B3n%2Fdesagrado%20(1).png?alt=media&token=5a33d02b-f1a2-4a97-89af-9765c782a213', colorClass: 'border-transparent', textColorClass: 'text-lime-600', selectedClass: 'bg-lime-600/20 border-lime-500' },
  { id: 'furia', labelKey: 'EmotionVoting.labels.furia', gifUrl: 'https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/Emoci%C3%B3n%2Ffuria%20(1).png?alt=media&token=3a085f26-98ae-4804-86fa-8c5b91af385b', colorClass: 'border-transparent', textColorClass: 'text-red-500', selectedClass: 'bg-red-500/20 border-red-400' },
];

interface EmotionVotingProps {
  figure: Figure;
}

export default function EmotionVoting({ figure: initialFigure }: EmotionVotingProps) {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const { showStreakAnimation } = useContext(StreakAnimationContext);

  const [figure, setFigure] = useState(initialFigure);
  const [isVoting, setIsVoting] = useState<EmotionOption | null>(null);

  useEffect(() => {
    setFigure(initialFigure);
  }, [initialFigure]);

  // Fetch global settings
  const settingsDocRef = useMemoFirebase(() => firestore ? doc(firestore, 'settings', 'global') : null, [firestore]);
  const { data: globalSettings } = useDoc<GlobalSettings>(settingsDocRef);
  const areVotesEnabled = globalSettings?.isVotingEnabled ?? true;


  const userVoteRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, `users/${user.uid}/emotionVotes`, figure.id);
  }, [firestore, user, figure.id]);

  const { data: userVote, isLoading: isVoteLoading, refetch } = useDoc<EmotionVote>(userVoteRef);

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
    
    // --- Optimistic UI Update ---
    const previousVote = userVote?.vote;
    const isRetracting = previousVote === vote;

    setFigure(currentFigure => {
        const newEmotion = { ...currentFigure.emotion };
        if (isRetracting) {
            newEmotion[vote] = (newEmotion[vote] || 1) - 1;
        } else {
            newEmotion[vote] = (newEmotion[vote] || 0) + 1;
            if (previousVote) {
                newEmotion[previousVote] = (newEmotion[previousVote] || 1) - 1;
            }
        }
        return { ...currentFigure, emotion: newEmotion };
    });
    // --- End Optimistic UI Update ---


    try {
        await runTransaction(firestore, async (transaction) => {
            const figureRef = doc(firestore, 'figures', figure.id);
            const userProfileRef = doc(firestore, 'users', currentUser!.uid);
            const privateVoteRef = doc(firestore, `users/${currentUser!.uid}/emotionVotes`, figure.id);

            const [figureDoc, userProfileDoc, privateVoteDoc] = await Promise.all([
                transaction.get(figureRef),
                transaction.get(userProfileRef),
                transaction.get(privateVoteDoc)
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
                updates[`emotion.${vote}`] = increment(-1);
                transaction.delete(privateVoteRef);
            } else {
                updates[`emotion.${vote}`] = increment(1);
                if (dbIsChanging) {
                    updates[`emotion.${dbPreviousVote}`] = increment(-1);
                }
                
                const userProfileData = userProfileDoc.exists() ? userProfileDoc.data() as AppUser : {};
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

        const streakResult = await updateStreak({
            firestore,
            figureId: figure.id,
            figureName: figure.name,
            userId: currentUser!.uid,
            isAnonymous: currentUser!.isAnonymous,
        });

        if (streakResult?.streakGained) {
            showStreakAnimation(streakResult.newStreakCount, { showPrompt: true });
        }

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


  const totalVotes = Object.values(figure.emotion || {}).reduce(
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

  return (
      <div className="w-full relative">
        {userVote?.vote && (
            <div className="absolute top-0 right-0 z-10">
                <ShareButton
                    figureId={figure.id}
                    figureName={figure.name}
                    isEmotionShare={true}
                    emotion={userVote.vote}
                    showText={false}
                />
            </div>
        )}
        <div className="mb-4 text-left">
          <h3 className="text-xl font-bold font-headline">{t('EmotionVoting.title')}</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {emotionOptions.map(({ id, labelKey, gifUrl, colorClass, selectedClass, textColorClass }) => {
            const isSelected = userVote?.vote === id;
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
        <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground">
                {t('EmotionVoting.totalVotes').replace('{count}', totalVotes.toLocaleString())}
            </p>
        </div>
      </div>
  );
}
