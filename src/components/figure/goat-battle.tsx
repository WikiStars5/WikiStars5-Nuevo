
'use client';

import { useState, useEffect, useContext } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Loader2, Timer } from 'lucide-react';
import { useFirestore, useUser, useDoc, useMemoFirebase, useAuth } from '@/firebase';
import type { GoatBattle, GoatVote, Figure, GlobalSettings } from '@/lib/types';
import { doc, runTransaction, serverTimestamp, increment, getDoc, query, where, collection, getDocs, limit, Timestamp, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '../ui/skeleton';
import { ShareButton } from '../shared/ShareButton';
import { usePathname } from 'next/navigation';
import { LoginPromptDialog } from '../shared/login-prompt-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { signInAnonymously } from 'firebase/auth';
import { useLanguage } from '@/context/LanguageContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { updateStreak } from '@/firebase/streaks';
import { StreakAnimationContext } from '@/context/StreakAnimationContext';


const BATTLE_ID = 'messi-vs-ronaldo';
const GOAT_ICON_URL = "https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/goat%2FGOAT2.png?alt=media&token=50973a60-0bff-4fcb-9c17-986f067d834e";


interface PlayerData {
  id: string;
  name: string;
  imageUrl: string;
}

// Fetches a single figure by name. Limited to find Messi or Ronaldo.
async function fetchFigureByName(firestore: any, name: string): Promise<PlayerData | null> {
    const figuresRef = collection(firestore, 'figures');
    const q = query(figuresRef, where('name', '==', name), limit(1));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
        // Fallback data if not found in DB
        return {
            id: name.toLowerCase().replace(' ', '-'),
            name,
            imageUrl: name === 'Lionel Messi'
                ? 'https://upload.wikimedia.org/wikipedia/commons/c/c1/Lionel_Messi_20180626.jpg'
                : 'https://upload.wikimedia.org/wikipedia/commons/2/22/Cristiano_Ronaldo_2019.jpg'
        };
    }
    const figureDoc = snapshot.docs[0];
    const data = figureDoc.data() as Figure;
    return {
        id: figureDoc.id,
        name: data.name,
        imageUrl: data.imageUrl,
    };
}


export default function GoatBattle() {
  const firestore = useFirestore();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const pathname = usePathname();
  const { t } = useLanguage();
  const { showStreakAnimation } = useContext(StreakAnimationContext);

  const [isVoting, setIsVoting] = useState(false);
  const [battleData, setBattleData] = useState<GoatBattle | null>(null);
  const [messiData, setMessiData] = useState<PlayerData | null>(null);
  const [ronaldoData, setRonaldoData] = useState<PlayerData | null>(null);
  const [arePlayersLoading, setArePlayersLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState('');


  // Get global battle data
  const battleDocRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'goat_battles', BATTLE_ID);
  }, [firestore]);
  const { data: initialBattleData, isLoading: isBattleLoading, refetch: refetchBattle } = useDoc<GoatBattle>(battleDocRef);

  useEffect(() => {
    if(initialBattleData) {
      setBattleData(initialBattleData)
    }
  }, [initialBattleData]);
  

  // Get user's personal vote
  const userVoteDocRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, `goat_battles/${BATTLE_ID}/votes`, user.uid);
  }, [firestore, user]);
  const { data: userVote, isLoading: isUserVoteLoading, refetch: refetchUserVote } = useDoc<GoatVote>(userVoteDocRef);

  // Fetch global settings to check if voting is enabled
  const settingsDocRef = useMemoFirebase(() => firestore ? doc(firestore, 'settings', 'global') : null, [firestore]);
  const { data: globalSettings } = useDoc<GlobalSettings>(settingsDocRef);
  const areVotesEnabled = globalSettings?.isVotingEnabled ?? true;


  useEffect(() => {
    async function fetchPlayers() {
        if (!firestore) return;
        setArePlayersLoading(true);
        const [messi, ronaldo] = await Promise.all([
            fetchFigureByName(firestore, 'Lionel Messi'),
            fetchFigureByName(firestore, 'Cristiano Ronaldo')
        ]);
        setMessiData(messi);
        setRonaldoData(ronaldo);
        setArePlayersLoading(false);
    }
    if (firestore) {
        fetchPlayers();
    }
  }, [firestore]);
  
  const battleStartTime = battleData?.startTime?.toDate();
  const battleEndTime = battleData?.endTime?.toDate();
  
  const now = new Date();
  const isBattleUpcoming = battleStartTime && now < battleStartTime;
  const isBattleActive = battleStartTime && now >= battleStartTime && battleEndTime && now < battleEndTime && !battleData?.isPaused;
  const isBattleOver = battleEndTime ? now > battleEndTime : false;
  let winner = battleData?.winner;

  // Determine winner if battle is over and winner isn't set yet
  if (isBattleOver && !winner && battleData) {
      if (battleData.messiVotes > battleData.ronaldoVotes) {
          winner = 'messi';
      } else if (battleData.ronaldoVotes > battleData.messiVotes) {
          winner = 'ronaldo';
      } else {
          winner = 'tie'; // Or handle ties as you see fit
      }
      // Non-blocking write to update the winner in Firestore
      if (firestore && winner !== 'tie' && battleDocRef) {
          updateDoc(battleDocRef, { winner: winner });
      }
  }


  useEffect(() => {
    if (!battleEndTime || !isBattleActive) {
      setTimeLeft('00:00:00:00');
      return;
    }

    const interval = setInterval(() => {
      const now = new Date();
      const distance = battleEndTime.getTime() - now.getTime();

      if (distance < 0) {
        clearInterval(interval);
        setTimeLeft('00:00:00:00');
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);
      setTimeLeft(
        `${days.toString().padStart(2, '0')}:${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        );
    }, 1000);

    return () => clearInterval(interval);
  }, [battleEndTime, isBattleActive]);


  const handleVote = async (player: 'messi' | 'ronaldo') => {
    if (!areVotesEnabled) {
      toast({
        title: t('AttitudeVoting.disabledToast.title'),
        description: t('AttitudeVoting.disabledToast.description'),
        variant: 'destructive',
      });
      return;
    }
    
    if (isVoting || !firestore || !auth || !isBattleActive) return;

    let currentUser = user;
    if (!currentUser) {
        setIsVoting(true);
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
            setIsVoting(false);
            return;
        }
    }
    
    if (!currentUser) {
        toast({ title: t('AttitudeVoting.userErrorToast.title'), description: t('AttitudeVoting.userErrorToast.description'), variant: 'destructive'});
        return;
    }
    
    setIsVoting(true);

    const previousVote = userVote?.vote;
    const isRetracting = previousVote === player;

    setBattleData(currentBattleData => {
        if (!currentBattleData) return null;
        const newBattleData = { ...currentBattleData };
        if (isRetracting) {
            newBattleData[`${player}Votes`] = (newBattleData[`${player}Votes`] || 1) - 1;
        } else {
            newBattleData[`${player}Votes`] = (newBattleData[`${player}Votes`] || 0) + 1;
            if (previousVote) {
                const otherPlayer = player === 'messi' ? 'ronaldo' : 'messi';
                newBattleData[`${otherPlayer}Votes`] = (newBattleData[`${otherPlayer}Votes`] || 1) - 1;
            }
        }
        return newBattleData;
    });

    try {
        await runTransaction(firestore, async (transaction) => {
            const battleRef = doc(firestore, 'goat_battles', BATTLE_ID);
            const userVoteRef = doc(firestore, `goat_battles/${BATTLE_ID}/votes`, currentUser!.uid);
            
            const [battleDoc, userVoteDoc] = await Promise.all([
                transaction.get(battleRef),
                transaction.get(userVoteRef)
            ]);

            if (!battleDoc.exists() || !battleDoc.data()?.endTime || new Date() > battleDoc.data()!.endTime.toDate()) {
                throw new Error("La batalla no está activa.");
            }

            const dbVote = userVoteDoc.exists() ? userVoteDoc.data().vote : null;
            const updates: { [key: string]: any } = {};
            
            if (dbVote === player) {
                updates[`${player}Votes`] = increment(-1);
                transaction.delete(userVoteRef);
                toast({ title: t('AttitudeVoting.voteToast.removed') });

            } else {
                updates[`${player}Votes`] = increment(1);
                if (dbVote) {
                    const otherPlayer = player === 'messi' ? 'ronaldo' : 'messi';
                    updates[`${otherPlayer}Votes`] = increment(-1);
                }
                
                transaction.set(userVoteRef, { 
                    userId: currentUser!.uid, 
                    vote: player, 
                    createdAt: serverTimestamp() 
                });
                toast({ title: t('GoatBattle.toast.voted').replace('{player}', player === 'messi' ? 'Messi' : 'Ronaldo') });
                if (player === 'ronaldo') {
                    const audio = new Audio('https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/sonido%20goat%2Fsiuuu%20(1).mp3?alt=media&token=46407682-9c42-4226-98c7-7486db802039');
                    audio.play();
                } else if (player === 'messi') {
                    const audio = new Audio('https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/sonido%20goat%2Fmagisterial-lionel.mp3?alt=media&token=c9b0dc23-b008-4665-84d4-3d8f237cc6b7');
                    audio.play();
                }
            }

            transaction.update(battleRef, updates);
        });

        const streakResult = await updateStreak({
            firestore,
            figureId: player === 'messi' ? (messiData?.id || 'lionel-messi') : (ronaldoData?.id || 'cristiano-ronaldo'),
            figureName: player === 'messi' ? 'Lionel Messi' : 'Cristiano Ronaldo',
            userId: currentUser.uid,
            isAnonymous: currentUser.isAnonymous,
        });

        if (streakResult?.streakGained) {
            showStreakAnimation(streakResult.newStreakCount, { showPrompt: true });
        }
        
        refetchUserVote(); // Refreshes user's vote status for UI update
    } catch (error: any) {
        console.error("Error casting vote:", error);
        setBattleData(initialBattleData); // Revert optimistic update
        toast({
            title: t('AttitudeVoting.errorToast.title'),
            description: error.message || t('AttitudeVoting.errorToast.description'),
            variant: "destructive"
        });
    } finally {
        setIsVoting(false);
    }
  };

  const messiVotes = battleData?.messiVotes ?? 0;
  const ronaldoVotes = battleData?.ronaldoVotes ?? 0;
  const totalVotes = messiVotes + ronaldoVotes;

  const messiPercentage = totalVotes > 0 ? (messiVotes / totalVotes) * 100 : 50;
  const balanceRotation = totalVotes > 0 ? -((messiPercentage - 50) / 5) * 1 : 0;


  const GoatIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M16 16h3a2 2 0 0 0 2 -2v-4a2 2 0 0 0 -2 -2h-3v10z" />
        <path d="M11 16v-10" />
        <path d="M7 10h1.5a1.5 1.5 0 0 1 0 3h-1.5a1.5 1.5 0 0 1 0 3h2" />
        <path d="M4 16v-5" />
    </svg>
  );
  
  const isLoading = isUserLoading || isBattleLoading || (user && isUserVoteLoading) || arePlayersLoading;
  
  if (isLoading) {
    return (
        <Card>
            <CardHeader className="items-center text-center">
                <Skeleton className="h-8 w-2/3" />
                <Skeleton className="h-5 w-1/2" />
            </CardHeader>
            <CardContent>
                <div className="relative w-full max-w-md h-48 mb-8">
                     <div className="absolute top-1/2 left-0 w-full h-1.5 bg-muted rounded-full">
                        <div className="absolute -left-8 -top-12">
                           <Skeleton className="h-20 w-20 rounded-full" />
                        </div>
                        <div className="absolute -right-8 -top-12">
                           <Skeleton className="h-20 w-20 rounded-full" />
                        </div>
                     </div>
                     <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[40px] border-l-transparent border-r-[40px] border-r-transparent border-b-[60px] border-b-muted"></div>
                </div>
                 <div className="grid grid-cols-2 gap-4 w-full max-w-md mt-6">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                 </div>
            </CardContent>
        </Card>
    )
  }

  if (!messiData || !ronaldoData) return null;

  if (!battleData || !battleData.endTime) {
    return (
        <Card className="dark:bg-black">
            <CardHeader className="items-center text-center">
                 <CardTitle className="flex items-center gap-2 text-3xl">
                    <GoatIcon/> {t('GoatBattle.title')}
                </CardTitle>
                <CardDescription className="text-muted-foreground">{t('GoatBattle.notStarted')}</CardDescription>
            </CardHeader>
             <CardContent className="text-center text-muted-foreground">
                {t('GoatBattle.adminNotStarted')}
            </CardContent>
        </Card>
    )
  }
  
  const figureIdForShare = pathname.split('/').pop() || (messiData ? messiData.id : 'lionel-messi');

  return (
      <Card className="relative dark:bg-black">
        <CardHeader className="items-center text-center pt-12">
            <CardTitle className="flex items-center gap-2 text-3xl">
            <GoatIcon/> {t('GoatBattle.title')}
            </CardTitle>
            <CardDescription className="max-w-md flex flex-col items-center text-center gap-2 text-muted-foreground">
                <span>{t('GoatBattle.description')}</span>
                <Image src={GOAT_ICON_URL} alt="GOAT Icon" width={80} height={80} className="h-40 w-40" />
            </CardDescription>
            {isBattleOver ? (
                <div className="font-bold text-lg text-primary">{t('GoatBattle.countdownFinished')}</div>
            ) : isBattleUpcoming && battleStartTime ? (
                 <div className="font-bold text-lg text-yellow-500">Comienza el: {format(battleStartTime, 'PPPp', { locale: es })}</div>
            ) : battleData.isPaused ? (
                 <div className="flex items-center gap-2 font-mono text-lg font-bold text-yellow-500">
                    <Timer className="h-5 w-5" />
                    <span>{t('GoatBattle.paused')}</span>
                </div>
            ) : (
                <div className="flex items-center gap-2 font-mono text-lg font-bold text-primary animate-pulse">
                    <Timer className="h-5 w-5" />
                    <span>{timeLeft}</span>
                </div>
            )}
        </CardHeader>
        <CardContent className="flex flex-col items-center">
            <div className="relative w-full max-w-md h-48 mb-8">
            <div
                className="absolute top-1/2 left-0 w-full h-1.5 bg-muted rounded-full transition-transform duration-500"
                style={{ transform: `translateY(-50%) rotate(${balanceRotation}deg)` }}
            >
                <div className="absolute -left-8 -top-12 flex flex-col items-center">
                <div className="relative h-20 w-20 rounded-full border-4 border-blue-500 overflow-hidden shadow-lg">
                    <Image src={messiData.imageUrl} alt={messiData.name} layout="fill" objectFit="cover" />
                </div>
                </div>
                <div className="absolute -right-8 -top-12 flex flex-col items-center">
                <div className="relative h-20 w-20 rounded-full border-4 border-red-500 overflow-hidden shadow-lg">
                    <Image src={ronaldoData.imageUrl} alt={ronaldoData.name} layout="fill" objectFit="cover" />
                </div>
                </div>
            </div>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[40px] border-l-transparent border-r-[40px] border-r-transparent border-b-[60px] border-b-muted"></div>
            </div>

            <div className="w-full max-w-md mb-6">
                <div className="relative h-4 w-full bg-red-500/30 rounded-full overflow-hidden">
                    <div 
                        className="absolute top-0 left-0 h-full bg-blue-500/50 rounded-full transition-all duration-500"
                        style={{ width: `${messiPercentage}%`}}
                    />
                </div>
                <div className="flex justify-between text-sm font-bold mt-1">
                    <span className="text-blue-400">{messiVotes.toLocaleString()} {t('GoatBattle.votesLabel')}</span>
                    <span className="text-red-400">{ronaldoVotes.toLocaleString()} {t('GoatBattle.votesLabel')}</span>
                </div>
                 <p className="text-center text-sm text-muted-foreground mt-2">{t('GoatBattle.callToAction')}</p>
            </div>

            {isBattleOver ? (
                <div className="text-center font-bold text-xl py-6">
                    {winner === 'tie' && t('GoatBattle.tieMessage')}
                    {winner && winner !== 'tie' && t('GoatBattle.winnerMessage').replace('{winner}', winner === 'messi' ? 'Lionel Messi' : 'Cristiano Ronaldo')}
                    {!winner && t('GoatBattle.calculating')}
                </div>
            ) : isBattleUpcoming ? (
                 <div className="text-center font-semibold text-lg py-6 text-yellow-500">
                    ¡La batalla aún no ha comenzado!
                 </div>
            ) : (
                <div className="grid grid-cols-2 gap-4 w-full max-w-md">
                <Button
                    size="lg"
                    className={cn(
                        "h-16 text-lg bg-blue-500/20 text-blue-300 border-2 border-blue-500/50 hover:bg-blue-500/30",
                        userVote?.vote === 'messi' && "ring-2 ring-offset-2 ring-blue-400 ring-offset-background"
                    )}
                    onClick={() => handleVote('messi')}
                    disabled={isVoting || battleData?.isPaused}
                >
                    {isVoting && userVote?.vote !== 'messi' ? <Loader2 className="animate-spin" /> : t('GoatBattle.messiButton')}
                </Button>
                <Button
                    size="lg"
                    className={cn(
                        "h-16 text-lg bg-red-500/20 text-red-300 border-2 border-red-500/50 hover:bg-red-500/30",
                        userVote?.vote === 'ronaldo' && "ring-2 ring-offset-2 ring-red-400 ring-offset-background"
                    )}
                    onClick={() => handleVote('ronaldo')}
                    disabled={isVoting || battleData?.isPaused}
                >
                    {isVoting && userVote?.vote !== 'ronaldo' ? <Loader2 className="animate-spin" /> : t('GoatBattle.ronaldoButton')}
                </Button>
                </div>
            )}
             {userVote && isBattleActive && (
                <div className="mt-6 w-full max-w-md">
                    <Alert className="flex items-center justify-between gap-4">
                        <AlertDescription className="text-sm font-semibold">
                            {userVote.vote === 'messi'
                            ? t('GoatBattle.shareAlert.messi')
                            : t('GoatBattle.shareAlert.ronaldo')
                            }
                        </AlertDescription>
                        <ShareButton
                            figureId={figureIdForShare}
                            figureName="La Batalla del GOAT: Messi vs Ronaldo"
                            isGoatShare={true}
                            goatVote={userVote.vote}
                            showText={false}
                        />
                    </Alert>
                </div>
            )}
        </CardContent>
      </Card>
  );
}

    
