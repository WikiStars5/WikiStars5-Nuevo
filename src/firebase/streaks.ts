
'use client';

import { 
    doc, 
    runTransaction, 
    serverTimestamp, 
    increment,
    Firestore,
    Timestamp,
    getDoc,
    DocumentReference,
} from 'firebase/firestore';
import type { Streak, User, AttitudeVote } from '@/lib/types';
import { isDateActive } from '@/lib/streaks';

interface UpdateStreakParams {
    firestore: Firestore;
    figureId: string;
    figureName: string;
    userId: string;
    isAnonymous: boolean;
}

interface StreakUpdateResult {
    streakGained: boolean;
    newStreakCount: number;
}

function isSameDay(date1: Date, date2: Date): boolean {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
}

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
}: UpdateStreakParams): Promise<StreakUpdateResult | null> {
    
    const privateStreakRef = doc(firestore, `users/${userId}/streaks`, figureId);
    const publicStreakRef = doc(firestore, `figures/${figureId}/streaks`, userId);
    const userRef = doc(firestore, 'users', userId);
    const attitudeVoteRef = doc(firestore, `users/${userId}/attitudeVotes`, figureId);
    const figureRef = doc(firestore, 'figures', figureId);

    try {
        let finalStreakCount = 1;
        let streakGained = false;

        const result = await runTransaction(firestore, async (transaction) => {
            const [privateStreakDoc, userDoc, attitudeVoteDoc, figureDoc] = await Promise.all([
                transaction.get(privateStreakRef),
                transaction.get(userRef),
                transaction.get(attitudeVoteRef),
                transaction.get(figureRef) // Get figure doc within transaction
            ]);

            if (!userDoc.exists()) {
                transaction.set(userRef, { id: userId, createdAt: serverTimestamp() });
            }
            if (!figureDoc.exists()) {
                throw new Error("Figure document does not exist.");
            }
            
            const userData = userDoc.data() as User | undefined || {};
            const userCountry = userData.country || 'unknown';
            const userGender = userData.gender || 'unknown';
            const userDisplayName = userData.username || 'Invitado';
            const userPhotoURL = userData.profilePhotoUrl || null;
            const figureImageUrl = figureDoc.data()?.imageUrl || null;

            const attitude = attitudeVoteDoc.exists() ? (attitudeVoteDoc.data() as AttitudeVote).vote : null;

            const now = new Date();
            let wasActiveBefore = false;
            let streakIsNowActive = true; // A comment always makes the streak active for today.

            if (!privateStreakDoc.exists()) {
                finalStreakCount = 1;
                streakGained = true;
            } else {
                const streakData = privateStreakDoc.data() as Streak;
                wasActiveBefore = streakData.isActive;
                const lastCommentDate = streakData.lastCommentDate.toDate();

                if (isSameDay(lastCommentDate, now)) {
                    finalStreakCount = streakData.currentStreak;
                    streakGained = false;
                } else if (isYesterday(lastCommentDate, now)) {
                    finalStreakCount = (streakData.currentStreak || 0) + 1;
                    streakGained = true;
                } else {
                    finalStreakCount = 1;
                    streakGained = true; // It's a new streak
                }
            }
            
            // Only update the global counter if the active status changes
            if (!wasActiveBefore && streakIsNowActive) {
                // A streak just became active
                transaction.update(figureRef, { activeStreakCount: increment(1) });
            } else if (wasActiveBefore && !streakIsNowActive) {
                // A streak just became inactive (handled by a separate job/function)
                // For now, we only handle activation. Deactivation on expiry needs another mechanism.
                // Or, if a user's new streak is 1 (meaning it was broken), we can decrement.
                if (finalStreakCount === 1 && wasActiveBefore) {
                    transaction.update(figureRef, { activeStreakCount: increment(-1) });
                }
            }


            const streakPayload: Streak = {
                id: figureId,
                userId,
                figureId,
                isActive: streakIsNowActive,
                currentStreak: finalStreakCount,
                lastCommentDate: Timestamp.now(),
                attitude: attitude,
                userDisplayName: userDisplayName,
                userPhotoURL: userPhotoURL,
                userCountry: userCountry,
                userGender: userGender,
                figureName: figureName,
                figureImageUrl: figureImageUrl,
            };

            transaction.set(privateStreakRef, streakPayload);
            transaction.set(publicStreakRef, streakPayload);
            
            return { streakGained, newStreakCount: finalStreakCount };
        });

        return result;
        
    } catch (error) {
        console.error("Error updating streak:", error);
        return null;
    }
}
