
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
    Firestore,
    getCountFromServer,
    getDoc
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
        // Step 1: Perform reads outside the transaction first.
        const [privateDocSnap, publicCountSnap] = await Promise.all([
            getDoc(privateAchievementRef),
            getCountFromServer(query(publicAchievementsCollectionRef, limit(PIONEER_LIMIT)))
        ]);
        
        // 1. Check if user already has this achievement for this figure
        if (privateDocSnap.exists()) {
            return false;
        }

        // 2. Check if the pioneer limit for this figure has been reached
        const currentPioneerCount = publicCountSnap.data().count;
        if (currentPioneerCount >= PIONEER_LIMIT) {
            return false;
        }

        // Step 2: Perform the write operations inside a transaction to ensure atomicity.
        await runTransaction(firestore, async (transaction) => {
            // We can re-read inside the transaction for consistency check if needed, but for an append-only
            // log like this, the initial check is often sufficient.
            
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
