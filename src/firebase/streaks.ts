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

interface UpdateStreakParams {
    firestore: Firestore;
    figureId: string;
    figureName: string;
    userId: string;
    isAnonymous: boolean;
    // User data is now fetched inside, so we don't need to pass it all
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

    try {
        let finalStreakCount = 1;
        let streakGained = false;
        let oldStreakCount = 0;

        const result = await runTransaction(firestore, async (transaction) => {
            const [privateStreakDoc, userDoc, attitudeVoteDoc, figureDoc] = await Promise.all([
                transaction.get(privateStreakRef),
                transaction.get(userRef),
                transaction.get(attitudeVoteRef),
                getDoc(doc(firestore, 'figures', figureId)) // This can be a direct get as it's read-only in this context
            ]);

            if (!userDoc.exists()) {
                // If user doc doesn't exist (e.g., first action for anon user), create it.
                transaction.set(userRef, { id: userId, createdAt: serverTimestamp() });
            }
            
            const userData = userDoc.data() as User || {};
            const userCountry = userData.country || 'unknown';
            const userGender = userData.gender || 'unknown';
            const userDisplayName = userData.username || 'Invitado';
            const userPhotoURL = userData.profilePhotoUrl || null;
            const figureImageUrl = figureDoc.data()?.imageUrl || null;

            const attitudeVote = attitudeVoteDoc.exists() ? (attitudeVoteDoc.data() as AttitudeVote).vote : null;

            const now = new Date();

            if (!privateStreakDoc.exists()) {
                finalStreakCount = 1;
                streakGained = true;
                oldStreakCount = 0; // No old streak
            } else {
                const streakData = privateStreakDoc.data() as Streak;
                oldStreakCount = streakData.currentStreak || 0;
                const lastCommentDate = streakData.lastCommentDate.toDate();

                if (isSameDay(lastCommentDate, now)) {
                    finalStreakCount = streakData.currentStreak;
                    streakGained = false;
                    oldStreakCount = finalStreakCount; // No change in streak count
                } else if (isYesterday(lastCommentDate, now)) {
                    finalStreakCount = oldStreakCount + 1;
                    streakGained = true;
                } else {
                    finalStreakCount = 1;
                    streakGained = true;
                }
            }
            
            // Only perform stat updates if the streak count has changed.
            if (oldStreakCount !== finalStreakCount) {
                // Decrement old streak stat if it existed
                if (oldStreakCount > 0) {
                    const oldStatRef = doc(firestore, `figures/${figureId}/streakStats`, String(oldStreakCount));
                    transaction.set(oldStatRef, {
                        [userCountry]: {
                            total: increment(-1),
                            [userGender]: increment(-1)
                        }
                    }, { merge: true });
                }

                // Increment new streak stat
                const newStatRef = doc(firestore, `figures/${figureId}/streakStats`, String(finalStreakCount));
                transaction.set(newStatRef, {
                    [userCountry]: {
                        total: increment(1),
                        [userGender]: increment(1)
                    }
                }, { merge: true });
            }

            // Prepare the data payload for both streak documents.
            const streakPayload: Omit<Streak, 'id'> = {
                userId,
                figureId,
                currentStreak: finalStreakCount,
                lastCommentDate: Timestamp.now(),
                attitude: attitudeVote,
                userDisplayName: userDisplayName,
                userPhotoURL: userPhotoURL,
                userCountry: userCountry,
                userGender: userGender,
                figureName: figureName,
                figureImageUrl: figureImageUrl,
            };

            transaction.set(privateStreakRef, streakPayload, { merge: true });
            transaction.set(publicStreakRef, streakPayload, { merge: true });
            
            return { streakGained, newStreakCount: finalStreakCount };
        });

        return result;
        
    } catch (error) {
        console.error("Error updating streak:", error);
        return null;
    }
}
