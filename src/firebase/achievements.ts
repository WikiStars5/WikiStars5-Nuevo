
'use client';

import { 
    doc, 
    runTransaction, 
    serverTimestamp, 
    collection,
    query,
    getDocs,
    limit,
    writeBatch,
    increment,
    Firestore
} from 'firebase/firestore';
import type { UserAchievement } from '@/lib/types';


interface GrantPioneerAchievementParams {
    firestore: Firestore;
    figureId: string;
    userId: string;
    userDisplayName: string | null;
    userPhotoURL: string | null;
}

const PIONEER_LIMIT = 10;
const PIONEER_ACHIEVEMENT_ID = 'pioneer_voter';

export async function grantPioneerAchievement({
    firestore,
    figureId,
    userId,
    userDisplayName,
    userPhotoURL
}: GrantPioneerAchievementParams): Promise<boolean> {
    
    // Path to the user's private record of this achievement
    const privateAchievementRef = doc(firestore, `users/${userId}/user_achievements`, `${figureId}_${PIONEER_ACHIEVEMENT_ID}`);
    
    // Path to the public record of this achievement for the figure's leaderboard
    const publicAchievementRef = doc(firestore, `figures/${figureId}/achievements`, userId);

    const figureRef = doc(firestore, 'figures', figureId);
    let achievementWasGranted = false;
    
    try {
        await runTransaction(firestore, async (transaction) => {
            const [privateDoc, figureDoc] = await Promise.all([
                transaction.get(privateAchievementRef),
                transaction.get(figureRef)
            ]);

            // 1. Check if user already has this achievement for this figure
            if (privateDoc.exists()) {
                return;
            }

            if (!figureDoc.exists()) {
                throw new Error("Figure does not exist.");
            }
            
            // 2. Check if the pioneer limit for this figure has been reached
            const currentPioneerCount = figureDoc.data()?.pioneerCount || 0;
            if (currentPioneerCount >= PIONEER_LIMIT) {
                return;
            }

            // 3. If checks pass, grant the achievement
            const achievementPayload: Omit<UserAchievement, 'id'> = {
                userId,
                achievementId: PIONEER_ACHIEVEMENT_ID,
                figureId,
                unlockedAt: serverTimestamp() as any,
                userDisplayName: userDisplayName || 'Usuario Anónimo',
                userPhotoURL: userPhotoURL,
            };

            // Write to both private and public collections
            transaction.set(privateAchievementRef, achievementPayload);
            transaction.set(publicAchievementRef, achievementPayload);
            
            // Increment the counter on the figure document
            transaction.update(figureRef, { pioneerCount: increment(1) });
            
            // Set flag to indicate success
            achievementWasGranted = true;
        });

        return achievementWasGranted;

    } catch (error) {
        console.error("Error granting Pioneer achievement:", error);
        return false;
    }
}
