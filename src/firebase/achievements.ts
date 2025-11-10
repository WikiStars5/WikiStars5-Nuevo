
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
    
    const privateAchievementRef = doc(firestore, `users/${userId}/user_achievements`, `${figureId}_${PIONEER_ACHIEVEMENT_ID}`);
    const publicAchievementsCollectionRef = collection(firestore, `figures/${figureId}/achievements`);
    const publicAchievementDocRef = doc(publicAchievementsCollectionRef, userId);

    let achievementWasGranted = false;
    
    try {
        await runTransaction(firestore, async (transaction) => {
            const [privateDoc, publicAchievementsSnapshot] = await Promise.all([
                transaction.get(privateAchievementRef),
                transaction.get(query(publicAchievementsCollectionRef, limit(PIONEER_LIMIT))) // Read collection within transaction
            ]);

            // 1. Check if user already has this achievement for this figure
            if (privateDoc.exists()) {
                return;
            }

            // 2. Check if the pioneer limit for this figure has been reached
            if (publicAchievementsSnapshot.size >= PIONEER_LIMIT) {
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
            transaction.set(publicAchievementDocRef, achievementPayload);
            
            // Set flag to indicate success
            achievementWasGranted = true;
        });

        return achievementWasGranted;

    } catch (error) {
        console.error("Error granting Pioneer achievement:", error);
        return false;
    }
}
