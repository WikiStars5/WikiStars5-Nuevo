'use client';

import { 
    doc, 
    runTransaction, 
    serverTimestamp, 
    increment,
    Firestore,
    Timestamp,
} from 'firebase/firestore';
import type { Streak, User, AttitudeVote } from '@/lib/types';
import { isDateActive } from '@/lib/streaks';

interface UpdateStreakParams {
    firestore: Firestore;
    figureId: string;
    figureName: string;
    userId: string;
    isAnonymous: boolean;
    userPhotoURL?: string | null;
}

interface StreakUpdateResult {
    streakGained: boolean;
    newStreakCount: number;
    livesChanged: number; 
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
    userPhotoURL,
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
            let livesChange = 0; 
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
            const userDisplayName = userData.username || (isAnonymous ? `Invitado_${userId.substring(0, 4)}` : 'Invitado');
            
            const finalPhotoURL = userPhotoURL || userData.profilePhotoUrl || null;
            const figureImageUrl = figureDoc.data()?.imageUrl || null;

            const attitude = attitudeVoteDoc.exists() ? (attitudeVoteDoc.data() as AttitudeVote).vote : null;

            const now = new Date();
            
            // Determinar si el usuario ya contaba como "activo" en el sistema
            const oldStreakData = privateStreakDoc.exists() ? privateStreakDoc.data() as Streak : null;
            const wasActive = oldStreakData ? isDateActive(oldStreakData.lastCommentDate) : false;

            if (!oldStreakData) {
                finalStreakCount = 1;
                streakGained = true;
                finalLivesCount = 0;
            } else {
                finalLivesCount = oldStreakData.lives || 0;
                const lastCommentDate = oldStreakData.lastCommentDate.toDate();

                if (isSameDay(lastCommentDate, now)) {
                    finalStreakCount = oldStreakData.currentStreak;
                    streakGained = false;
                } else if (isYesterday(lastCommentDate, now)) {
                    finalStreakCount = (oldStreakData.currentStreak || 0) + 1;
                    streakGained = true;
                    if (finalStreakCount > 0 && finalStreakCount % 10 === 0) {
                        finalLivesCount += 1;
                        livesChange = 1;
                    }
                } else {
                    if (finalLivesCount > 0) {
                        finalLivesCount -= 1;
                        livesChange = -1;
                        finalStreakCount = oldStreakData.currentStreak; 
                        streakGained = false;
                    } else {
                        finalStreakCount = 1;
                        streakGained = true;
                    }
                }
            }
            
            // Si el usuario no estaba activo (es nuevo o su racha expiró), incrementamos el contador global
            if (!wasActive) {
                transaction.update(figureRef, { activeStreakCount: increment(1) });
            }

            const streakPayload: Streak = {
                id: figureId,
                userId,
                figureId,
                isActive: true,
                currentStreak: finalStreakCount,
                lives: finalLivesCount,
                lastCommentDate: Timestamp.now(),
                attitude: attitude,
                userDisplayName: userDisplayName,
                userPhotoURL: finalPhotoURL,
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
