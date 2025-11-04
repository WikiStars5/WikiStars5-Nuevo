
'use client';

import { 
    doc, 
    runTransaction, 
    serverTimestamp, 
    increment,
    Firestore,
    Timestamp
} from 'firebase/firestore';
import type { Streak } from '@/lib/types';

interface UpdateStreakParams {
    firestore: Firestore;
    figureId: string;
    userId: string;
    userDisplayName: string;
    userPhotoURL: string | null;
    isAnonymous: boolean;
    userCountry?: string | null;
    userGender?: string | null;
}

interface StreakUpdateResult {
    streakGained: boolean;
    newStreakCount: number;
}

/**
 * Checks if two dates are on the same day, ignoring time.
 */
function isSameDay(date1: Date, date2: Date): boolean {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
}

/**
 * Checks if a date is yesterday relative to a reference date (usually today).
 */
function isYesterday(date: Date, today: Date): boolean {
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    return isSameDay(date, yesterday);
}


export async function updateStreak({
    firestore,
    figureId,
    userId,
    isAnonymous,
    ...denormalizedUserData
}: UpdateStreakParams): Promise<StreakUpdateResult | null> {

    // Anonymous users cannot have streaks.
    if (isAnonymous) {
        return null;
    }
    
    const streakRef = doc(firestore, `users/${userId}/streaks`, figureId);
    
    try {
        return await runTransaction(firestore, async (transaction) => {
            const streakDoc = await transaction.get(streakRef);
            const now = new Date();

            if (!streakDoc.exists()) {
                // Rule 1: No existing streak, create a new one.
                const newStreak: Omit<Streak, 'id'> = {
                    userId,
                    figureId, // Add figureId to the streak document itself
                    currentStreak: 1,
                    lastCommentDate: Timestamp.now(),
                    ...denormalizedUserData,
                };
                transaction.set(streakRef, newStreak);
                
                const userRef = doc(firestore, 'users', userId);
                transaction.set(userRef, { createdAt: serverTimestamp() }, { merge: true });

                return { streakGained: true, newStreakCount: 1 };
            } else {
                const streakData = streakDoc.data() as Streak;
                const lastCommentDate = streakData.lastCommentDate.toDate();

                if (isSameDay(lastCommentDate, now)) {
                     // Rule 3: Last comment was today. Just update timestamp and user data, no animation.
                    transaction.update(streakRef, {
                        lastCommentDate: serverTimestamp(),
                        ...denormalizedUserData
                    });
                    return { streakGained: false, newStreakCount: streakData.currentStreak };
                } else if (isYesterday(lastCommentDate, now)) {
                    // Rule 2: Last comment was yesterday, continue the streak.
                    const newStreakCount = (streakData.currentStreak || 0) + 1;
                    transaction.update(streakRef, {
                        currentStreak: increment(1),
                        lastCommentDate: serverTimestamp(),
                        ...denormalizedUserData
                    });
                     return { streakGained: true, newStreakCount };
                } else {
                    // Rule 4: Last comment was before yesterday, reset the streak.
                    transaction.update(streakRef, {
                        currentStreak: 1,
                        lastCommentDate: serverTimestamp(),
                        ...denormalizedUserData
                    });
                    return { streakGained: true, newStreakCount: 1 };
                }
            }
        });
    } catch (error) {
        console.error("Error updating streak:", error);
        return null;
    }
}
