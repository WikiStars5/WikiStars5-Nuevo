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
    addDoc,
    setDoc
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
    
    const privateStreakRef = doc(firestore, `users/${userId}/streaks`, figureId);
    const publicStreakRef = doc(firestore, `figures/${figureId}/streaks`, userId);
    
    try {
        let newStreakCount = 1;
        let streakGained = false;

        await runTransaction(firestore, async (transaction) => {
            const privateStreakDoc = await transaction.get(privateStreakRef);
            const now = new Date();
            let oldStreakCount = 0;
            let streakData: Streak | null = null;
    
            if (privateStreakDoc.exists()) {
                streakData = privateStreakDoc.data() as Streak;
                oldStreakCount = streakData.currentStreak || 0;
                const lastCommentDate = streakData.lastCommentDate.toDate();
    
                if (isSameDay(lastCommentDate, now)) {
                    newStreakCount = oldStreakCount;
                    streakGained = false; // No change in streak
                } else if (isYesterday(lastCommentDate, now)) {
                    newStreakCount = oldStreakCount + 1;
                    streakGained = true;
                } else {
                    newStreakCount = 1;
                    streakGained = true;
                }
            } else {
                // First time commenting, new streak
                newStreakCount = 1;
                streakGained = true;
                oldStreakCount = 0;
            }

             const streakPayload: Omit<Streak, 'id'> = {
                userId, figureId, currentStreak: newStreakCount,
                lastCommentDate: Timestamp.now(), userDisplayName: denormalizedUserData.userDisplayName,
                userPhotoURL: denormalizedUserData.userPhotoURL, userCountry: denormalizedUserData.userCountry ?? null,
                userGender: denormalizedUserData.userGender ?? null, figureName: figureName, figureImageUrl: figureImageUrl ?? null,
            };

            // Write to both private and public streak documents
            transaction.set(privateStreakRef, streakPayload, { merge: true });
            transaction.set(publicStreakRef, streakPayload, { merge: true });
            
            // Handle streakStats aggregation if the streak count changed
            if (streakGained && oldStreakCount !== newStreakCount) {
                const country = denormalizedUserData.userCountry || 'unknown';
                const gender = denormalizedUserData.userGender || 'unknown';

                // Decrement old streak stat if it existed
                if (oldStreakCount > 0) {
                    const oldStatRef = doc(firestore, `figures/${figureId}/streakStats`, String(oldStreakCount));
                     transaction.set(oldStatRef, {
                        [country]: {
                            total: increment(-1),
                            [gender]: increment(-1)
                        }
                    }, { merge: true });
                }
                
                // Increment new streak stat
                const newStatRef = doc(firestore, `figures/${figureId}/streakStats`, String(newStreakCount));
                transaction.set(newStatRef, {
                    [country]: {
                        total: increment(1),
                        [gender]: increment(1)
                    }
                }, { merge: true });
            }
        });


        return { streakGained, newStreakCount };
        
    } catch (error) {
        console.error("Error updating streak and stats:", error);
        return null;
    }
}
