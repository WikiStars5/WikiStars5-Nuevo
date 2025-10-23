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
    userCountry?: string | null;
    userGender?: string | null;
    isAnonymous: boolean;
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
    ...denormalizedUserData
}: UpdateStreakParams): Promise<void> {

    const streakRef = doc(firestore, `figures/${figureId}/streaks`, userId);
    
    try {
        await runTransaction(firestore, async (transaction) => {
            const streakDoc = await transaction.get(streakRef);
            const now = new Date();

            if (!streakDoc.exists()) {
                // Rule 1: No existing streak, create a new one.
                const newStreak: Omit<Streak, 'id'> = {
                    userId,
                    currentStreak: 1,
                    lastCommentDate: Timestamp.now(),
                    ...denormalizedUserData,
                };
                transaction.set(streakRef, newStreak);
            } else {
                // Streak exists, check the date.
                const streakData = streakDoc.data() as Streak;
                const lastCommentDate = streakData.lastCommentDate.toDate();

                if (isYesterday(lastCommentDate, now)) {
                    // Rule 2: Last comment was yesterday, continue the streak.
                    transaction.update(streakRef, {
                        currentStreak: increment(1),
                        lastCommentDate: serverTimestamp(),
                         // Also update user data in case it changed
                        ...denormalizedUserData
                    });
                } else if (!isSameDay(lastCommentDate, now)) {
                    // Rule 4 (Implicit): Last comment was before yesterday, reset the streak.
                    transaction.update(streakRef, {
                        currentStreak: 1,
                        lastCommentDate: serverTimestamp(),
                        ...denormalizedUserData
                    });
                } else {
                     // Rule 3: Last comment was today. Just update timestamp and user data.
                    transaction.update(streakRef, {
                        lastCommentDate: serverTimestamp(),
                        ...denormalizedUserData
                    });
                }
            }
        });
    } catch (error) {
        console.error("Error updating streak:", error);
        // We don't throw the error or show a toast to the user,
        // as streak update is a background task and shouldn't block the UI.
    }
}
