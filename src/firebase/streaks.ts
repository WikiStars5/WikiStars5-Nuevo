
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
    livesChanged: number; // Can be 1, -1, or 0
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
        const result = await runTransaction(firestore, async (transaction) => {
            let finalStreakCount = 1;
            let streakGained = false;
            let livesChange = 0; // +1 for gaining, -1 for using, 0 for no change
            let finalLivesCount = 0;

            const [privateStreakDoc, userDoc, attitudeVoteDoc, figureDoc] = await Promise.all([
                transaction.get(privateStreakRef),
                transaction.get(userRef),
                transaction.get(attitudeVoteRef),
                transaction.get(figureRef)
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
            let streakIsNowActive = true; 

            if (!privateStreakDoc.exists()) {
                // First time activity for this figure
                finalStreakCount = 1;
                streakGained = true;
                finalLivesCount = 0;
            } else {
                const streakData = privateStreakDoc.data() as Streak;
                wasActiveBefore = streakData.isActive;
                finalLivesCount = streakData.lives || 0;
                const lastCommentDate = streakData.lastCommentDate.toDate();

                if (isSameDay(lastCommentDate, now)) {
                    // Activity on the same day, no change to streak or lives.
                    finalStreakCount = streakData.currentStreak;
                    streakGained = false;
                } else if (isYesterday(lastCommentDate, now)) {
                    // Activity on the next day, streak continues.
                    finalStreakCount = (streakData.currentStreak || 0) + 1;
                    streakGained = true;
                    // Check if a life is earned
                    if (finalStreakCount > 0 && finalStreakCount % 10 === 0) {
                        finalLivesCount += 1;
                        livesChange = 1;
                    }
                } else {
                    // Missed one or more days.
                    if (finalLivesCount > 0) {
                        // Use a life to save the streak
                        finalLivesCount -= 1;
                        livesChange = -1;
                        finalStreakCount = streakData.currentStreak; // Streak count doesn't increase but isn't reset
                        streakGained = false;
                        streakIsNowActive = true;
                    } else {
                        // No lives left, reset streak.
                        finalStreakCount = 1;
                        streakGained = true;
                    }
                }
            }
            
            if (!wasActiveBefore && streakIsNowActive) {
                transaction.update(figureRef, { activeStreakCount: increment(1) });
            } else if (wasActiveBefore && !streakIsNowActive) {
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
                lives: finalLivesCount,
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
            
            return { streakGained, newStreakCount: finalStreakCount, livesChanged: livesChange };
        });

        return result;
        
    } catch (error) {
        console.error("Error updating streak:", error);
        return null;
    }
}
