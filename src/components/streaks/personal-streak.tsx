
'use client';

import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, Timestamp } from 'firebase/firestore';
import type { Streak } from '@/lib/types';
import { Skeleton } from '../ui/skeleton';
import { Flame } from 'lucide-react';
import Image from 'next/image';

interface PersonalStreakProps {
    figureId: string;
}

function isStreakActive(timestamp?: Timestamp): boolean {
    if (!timestamp) return false;
    
    const date = timestamp.toDate();
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const isToday = date.getFullYear() === today.getFullYear() &&
                    date.getMonth() === today.getMonth() &&
                    date.getDate() === today.getDate();

    const isYesterday = date.getFullYear() === yesterday.getFullYear() &&
                        date.getMonth() === yesterday.getMonth() &&
                        date.getDate() === yesterday.getDate();
                        
    return isToday || isYesterday;
}

export default function PersonalStreak({ figureId }: PersonalStreakProps) {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();

    const streakDocRef = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        // New path: users/{userId}/streaks/{figureId}
        return doc(firestore, `users/${user.uid}/streaks`, figureId);
    }, [firestore, user, figureId]);

    const { data: streak, isLoading: isStreakLoading } = useDoc<Streak>(streakDocRef);
    
    const isLoading = isUserLoading || (user && isStreakLoading);

    if (isLoading) {
        return <Skeleton className="h-10 w-24 rounded-full" />;
    }

    if (!streak || !isStreakActive(streak.lastCommentDate) || streak.currentStreak === 0) {
        return null; // Don't show anything if there's no active streak
    }

    return (
        <div className="flex items-center gap-2 rounded-full bg-card border px-4 py-2 shadow-sm">
            <span className="font-bold text-orange-500">{streak.currentStreak}</span>
             <Image
                src="https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/racha%2Ffire.gif?alt=media&token=c6eefbb1-b51c-48a4-ae20-7ca8bef2cf63"
                alt="Racha activa"
                width={24}
                height={24}
                unoptimized
            />
            <span className="text-sm font-semibold text-muted-foreground">Racha</span>
        </div>
    );
}
