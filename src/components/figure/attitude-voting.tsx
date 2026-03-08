'use client';

import { useState, useEffect, useContext, useCallback } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase, useAuth } from '@/firebase';
import { doc, runTransaction, serverTimestamp, increment, getDoc } from 'firebase/firestore'; 
import { signInAnonymously } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Lock, ArrowRight, Check, Heart } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn, formatCompactNumber } from '@/lib/utils';
import type { Figure, AttitudeVote, GlobalSettings, User as AppUser } from '@/lib/types';
import Image from 'next/image';
import { ShareButton } from '../shared/ShareButton';
import { useLanguage } from '@/context/LanguageContext';
import { updateStreak } from '@/firebase/streaks';
import { StreakAnimationContext } from '@/context/StreakAnimationContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';

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

const btsMemberIds = ["rm", "kim-seok-jin", "suga-agust-d", "j-hope", "jimin", "v-cantante", "jungkook"];
const blackpinkMemberIds = ["jennie", "lalisa-manobal", "rose", "jisoo"];

interface AttitudeVotingProps {
  figure: Figure;
  onVote: (attitude: AttitudeOption | null) => void;
  variant?: 'full' | 'header';
}

export default function AttitudeVoting({ figure: initialFigure, onVote, variant = 'full' }: AttitudeVotingProps) {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const auth = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { t } = useLanguage();
  const { showStreakAnimation } = useContext(StreakAnimationContext);
  
  const [figure, setFigure] = useState(initialFigure);
  const [isVoting, setIsVoting] = useState<AttitudeOption | null>(null);
  const [biasConfirmType, setBiasConfirmType] = useState<'bts' | 'blackpink' | null>(null);
  const [isConfirmingBias, setIsConfirmingBias] = useState(false);

  useEffect(() => {
    setFigure(initialFigure);
  }, [initialFigure]);

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
      toast({ title: t('AttitudeVoting.disabledToast.title'), variant: 'destructive' });
      return;
    }
    if (isVoting || !firestore || !auth) return;

    let currentUser = user;
    if (!currentUser) {
        try {
            const userCredential = await signInAnonymously(auth);
            currentUser = userCredential.user;
        } catch (error) {
            toast({ title: t('AttitudeVoting.authErrorToast.title'), variant: 'destructive'});
            return;
        }
    }

    setIsVoting(vote);
    
    const previousVote = userVote?.vote;
    const isRetracting = previousVote === vote;

    setFigure(currentFigure => {
        const newAttitude = { ...currentFigure.attitude };
        if (isRetracting) {
            newAttitude[vote] = Math.max(0, (newAttitude[vote] || 1) - 1);
        } else {
            newAttitude[vote] = (newAttitude[vote] || 0) + 1;
            if (previousVote) {
                newAttitude[previousVote] = Math.max(0, (newAttitude[previousVote] || 1) - 1);
            }
        }
        return { ...currentFigure, attitude: newAttitude };
    });

    try {
        await runTransaction(firestore, async (transaction) => {
            const figureRef = doc(firestore, 'figures', figure.id);
            const userRef = doc(firestore, 'users', currentUser!.uid);
            const privateVoteRef = doc(firestore, `users/${currentUser!.uid}/attitudeVotes`, figure.id);

            const [figureSnap, userSnap, privateVoteSnap] = await Promise.all([
                transaction.get(figureRef),
                transaction.get(userRef),
                transaction.get(privateVoteRef)
            ]);

            if (!figureSnap.exists()) throw new Error("Figure not found");

            if (!userSnap.exists()) {
                transaction.set(userRef, { id: currentUser!.uid, createdAt: serverTimestamp() });
            }

            const dbPreviousVote = privateVoteSnap.exists() ? privateVoteSnap.data().vote : null;
            const dbIsRetracting = dbPreviousVote === vote;

            const updates: { [key: string]: any } = {
                __oldVote: dbPreviousVote,
                __newVote: dbIsRetracting ? null : vote,
                updatedAt: serverTimestamp()
            };

            if (dbIsRetracting) {
                updates[`attitude.${vote}`] = increment(-1);
                transaction.delete(privateVoteRef);
            } else {
                updates[`attitude.${vote}`] = increment(1);
                if (dbPreviousVote) {
                    updates[`attitude.${dbPreviousVote}`] = increment(-1);
                }
                
                const userData = userSnap.exists() ? userSnap.data() : {};
                transaction.set(privateVoteRef, {
                    userId: currentUser!.uid,
                    figureId: figure.id,
                    vote: vote,
                    createdAt: serverTimestamp(),
                    figureName: figure.name,
                    figureImageUrl: figure.imageUrl,
                    userCountry: userData.country || null,
                    userGender: userData.gender || null,
                });
            }
            transaction.update(figureRef, updates);
        });
        
        const streakResult = await updateStreak({
            firestore, figureId: figure.id, figureName: figure.name,
            userId: currentUser!.uid, isAnonymous: currentUser!.isAnonymous,
            userPhotoURL: currentUser!.photoURL
        });

        if (streakResult?.streakGained) {
            showStreakAnimation(streakResult.newStreakCount, { 
                showPrompt: true,
                figureId: figure.id,
                figureName: figure.name
            });
        }

        const isBts = btsMemberIds.includes(figure.id.toLowerCase());
        const isBlackpink = blackpinkMemberIds.includes(figure.id.toLowerCase());
        
        if ((isBts || isBlackpink) && (vote === 'fan' || vote === 'simp') && !isRetracting) {
            const battleKey = isBts ? 'btsBiasVote' : 'blackpinkBiasVote';
            const battleId = isBts ? 'bts-bias-battle' : 'blackpink-bias-battle';
            const userBiasVoteRef = doc(firestore, `users/${currentUser.uid}/${battleKey}`, battleId);
            const userBiasVoteSnap = await getDoc(userBiasVoteRef);
            
            if (!userBiasVoteSnap.exists()) {
                setBiasConfirmType(isBts ? 'bts' : 'blackpink');
            }
        } else if (isRetracting || (vote !== 'fan' && vote !== 'simp')) {
            setBiasConfirmType(null);
        }

        onVote(isRetracting ? null : vote);
        toast({ 
          title: isRetracting ? t('AttitudeVoting.voteToast.removed') : t('AttitudeVoting.voteToast.registered'),
          action: !isRetracting ? (
            <ShareButton 
              figureId={figure.id} 
              figureName={figure.name} 
              isAttitudeShare={true} 
              attitude={vote} 
              showText={true}
              className="h-8"
            />
          ) : undefined
        });
        refetch();

    } catch (error: any) {
      console.error('Vote error:', error);
      setFigure(initialFigure);
      toast({ variant: 'destructive', title: t('AttitudeVoting.errorToast.title') });
    } finally {
      setIsVoting(null);
    }
  };

  const handleConfirmBias = async () => {
    if (!firestore || !user || !biasConfirmType) return;
    setIsConfirmingBias(true);

    const battleKey = biasConfirmType === 'bts' ? 'btsBiasVote' : 'blackpinkBiasVote';
    const battleId = biasConfirmType === 'bts' ? 'bts-bias-battle' : 'blackpink-bias-battle';
    const voteCountKey = biasConfirmType === 'bts' ? 'btsBiasVoteCount' : 'blackpinkBiasVoteCount';

    try {
        await runTransaction(firestore, async (transaction) => {
            const privateVoteRef = doc(firestore, `users/${user.uid}/${battleKey}`, battleId);
            const figureRef = doc(firestore, 'figures', figure.id);
            transaction.update(figureRef, { [voteCountKey]: increment(1) });
            transaction.set(privateVoteRef, { figureId: figure.id, createdAt: serverTimestamp() });
        });
        toast({ title: '¡Bias Confirmado!', description: `Has votado por ${figure.name}.` });
        setBiasConfirmType(null);
    } catch (error) {
        console.error("Bias error:", error);
        toast({ title: "Error", variant: 'destructive' });
    } finally {
        setIsConfirmingBias(false);
    }
  };

  const handleRedirectToBias = () => {
    const tab = biasConfirmType === 'bts' ? 'bias-bts' : 'bias-blackpink';
    setBiasConfirmType(null);
    
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.push(`?${params.toString()}`, { scroll: false });

    setTimeout(() => {
        const tabsElement = document.querySelector('[role="tablist"]');
        tabsElement?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const totalVotes = Object.values(figure.attitude || {}).reduce((sum, count) => sum + count, 0);
  const isLoading = isUserLoading || (!!user && isVoteLoading);
  
  if (isLoading) return <Skeleton className={cn(variant === 'full' ? "h-48 w-full" : "h-10 w-full")} />;
  
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

  return (
    <div className="w-full space-y-4">
      {variant === 'header' ? (
        <div className="flex flex-wrap items-start justify-center md:justify-start gap-4">
          {attitudeOptions.map(({ id, labelKey, selectedClass }) => {
            const isSelected = userVote?.vote === id;
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
                <span className="text-xs font-bold text-muted-foreground">{formatCompactNumber(figure.attitude?.[id] ?? 0)}</span>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="relative">
          {userVote?.vote && (
            <div className="absolute top-0 right-0 z-10">
              <ShareButton figureId={figure.id} figureName={figure.name} isAttitudeShare={true} attitude={userVote.vote} showText={false} />
            </div>
          )}
          <div className="mb-4"><h3 className="text-xl font-bold font-headline">{t('AttitudeVoting.title')}</h3></div>
          <div className={cn("grid grid-cols-2 gap-4", attitudeOptions.length === 3 ? 'md:grid-cols-3' : 'md:grid-cols-4')}>
              {attitudeOptions.map(({ id, labelKey, gifUrl, selectedClass }) => {
                const isSelected = userVote?.vote === id;
                return (
                  <Button
                      key={id}
                      variant="outline"
                      className={cn(
                      'relative h-36 flex-col items-center justify-center gap-2 p-4 transition-all duration-200 hover:scale-105 dark:bg-black',
                      isSelected ? `scale-105 border-4 ${selectedClass}` : `border-2`
                      )}
                      onClick={() => handleVote(id)}
                      disabled={!!isVoting}
                  >
                      {isVoting === id ? <Loader2 className="h-8 w-8 animate-spin" /> : (
                          <div className="flex h-full flex-col items-center justify-center text-center">
                              <div className="flex-1 flex items-center justify-center">
                                  <Image src={gifUrl} alt={t(labelKey)} width={48} height={48} unoptimized className="h-12 w-12" />
                              </div>
                              <div>
                                  <span className="font-semibold text-sm">{t(labelKey)}</span>
                                  <span className="block text-lg font-bold">{formatCompactNumber(figure.attitude?.[id] ?? 0)}</span>
                              </div>
                          </div>
                      )}
                  </Button>
              )})}
          </div>
        </div>
      )}

      {biasConfirmType && (
        <Card className="mt-4 border-2 border-primary/50 bg-primary/5 overflow-hidden animate-border-blink animate-in slide-in-from-top duration-500 max-w-lg mx-auto md:mx-0">
            <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="bg-primary/20 p-2 rounded-full animate-pulse">
                        <Heart className="h-5 w-5 text-primary fill-primary" />
                    </div>
                    <p className="text-sm font-bold">¿Es {figure.name} tu bias de {biasConfirmType.toUpperCase()}?</p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <Button size="sm" variant="outline" className="flex-1 sm:flex-none" onClick={handleRedirectToBias}>
                        No, buscar mi bias
                    </Button>
                    <Button size="sm" className="flex-1 sm:flex-none" onClick={handleConfirmBias} disabled={isConfirmingBias}>
                        {isConfirmingBias ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="mr-1 h-4 w-4"/> Sí</>}
                    </Button>
                </div>
            </CardContent>
        </Card>
      )}

      {variant === 'full' && (
        <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground">{t('AttitudeVoting.totalVotes').replace('{count}', totalVotes.toLocaleString())}</p>
        </div>
      )}
    </div>
  );
}
