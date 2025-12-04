
'use client';

import { 
    doc, 
    runTransaction, 
    serverTimestamp, 
    increment,
    Firestore,
    Timestamp,
    writeBatch,
    collection,
    addDoc
} from 'firebase/firestore';
import type { Streak } from '@/lib/types';

interface UpdateStreakParams {
    firestore: Firestore;
    figureId: string;
    figureName: string;
    userId: string;
    userDisplayName: string;
    userPhotoURL: string | null;
    isAnonymous: boolean;
    userCountry?: string | null;
    userGender?: string | null;
    figureImageUrl?: string | null;
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
    figureName,
    userId,
    isAnonymous,
    figureImageUrl,
    ...denormalizedUserData
}: UpdateStreakParams): Promise<StreakUpdateResult | null> {
    
    // Path for the user's private copy of the streak
    const privateStreakRef = doc(firestore, `users/${userId}/streaks`, figureId);
    
    // Path for the public-readable streak data for the figure's leaderboard
    const publicStreakRef = doc(firestore, `figures/${figureId}/streaks`, userId);
    
    try {
        const batch = writeBatch(firestore);
        let newStreakCount = 1;
        let streakGained = false;

        const privateStreakDoc = await runTransaction(firestore, async (transaction) => {
            const doc = await transaction.get(privateStreakRef);
            return doc;
        });

        const now = new Date();

        if (!privateStreakDoc.exists()) {
            // Rule 1: No existing streak, create a new one.
            newStreakCount = 1;
            streakGained = true;
        } else {
            const streakData = privateStreakDoc.data() as Streak;
            const lastCommentDate = streakData.lastCommentDate.toDate();

            if (isSameDay(lastCommentDate, now)) {
                // Rule 3: Last comment was today. Just update timestamp.
                newStreakCount = streakData.currentStreak;
                streakGained = false;
            } else if (isYesterday(lastCommentDate, now)) {
                // Rule 2: Last comment was yesterday, continue the streak.
                newStreakCount = (streakData.currentStreak || 0) + 1;
                streakGained = true;
            } else {
                // Rule 4: Last comment was before yesterday, reset the streak.
                newStreakCount = 1;
                streakGained = true;
            }
        }
        
        // Prepare the data payload for both documents.
        const streakPayload: Omit<Streak, 'id'> = {
            userId,
            figureId,
            currentStreak: newStreakCount,
            lastCommentDate: Timestamp.now(),
            userDisplayName: denormalizedUserData.userDisplayName,
            userPhotoURL: denormalizedUserData.userPhotoURL,
            userCountry: denormalizedUserData.userCountry ?? null,
            userGender: denormalizedUserData.userGender ?? null,
            figureName: figureName,
            figureImageUrl: figureImageUrl ?? null,
        };

        // Add both set/update operations to the batch.
        batch.set(privateStreakRef, streakPayload, { merge: true });
        batch.set(publicStreakRef, streakPayload, { merge: true });

        // Commit the batch to write both documents atomically.
        await batch.commit();

        return { streakGained, newStreakCount };
        
    } catch (error) {
        console.error("Error updating streak with dual-write:", error);
        // We can choose to not throw an error to the user for a background task like this.
        return null;
    }
}
