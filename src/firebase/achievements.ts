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
    getDoc,
    where
} from 'firebase/firestore';
import type { UserAchievement, Referral } from '@/lib/types';


interface GrantPioneerAchievementParams {
    firestore: Firestore;
    figureId: string;
    userId: string;
    userDisplayName: string | null;
    userPhotoURL: string | null;
}

const PIONEER_LIMIT = 1000;
const PIONEER_ACHIEVEMENT_ID = 'pioneer_voter';
const RECRUITER_ACHIEVEMENT_ID = 'recruiter';

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
        const [privateDocSnap, publicCountSnap] = await Promise.all([
            getDoc(privateAchievementRef),
            getCountFromServer(query(publicAchievementsCollectionRef, where('achievementId', '==', PIONEER_ACHIEVEMENT_ID), limit(PIONEER_LIMIT)))
        ]);
        
        if (privateDocSnap.exists()) {
            return false;
        }

        const currentPioneerCount = publicCountSnap.data().count;
        if (currentPioneerCount >= PIONEER_LIMIT) {
            return false;
        }

        await runTransaction(firestore, async (transaction) => {
            const achievementPayload: Omit<UserAchievement, 'id'> = {
                userId,
                achievementId: PIONEER_ACHIEVEMENT_ID,
                figureId,
                unlockedAt: serverTimestamp() as any,
                userDisplayName: userDisplayName || 'Usuario Anónimo',
                userPhotoURL: userPhotoURL,
            };

            transaction.set(privateAchievementRef, achievementPayload);
            transaction.set(publicAchievementDocRef, achievementPayload);
            
            achievementWasGranted = true;
        });

        return achievementWasGranted;

    } catch (error) {
        console.error("Error granting Pioneer achievement:", error);
        return false;
    }
}


interface GrantRecruiterAchievementParams {
    firestore: Firestore;
    votingUserId: string;
}

export async function grantRecruiterAchievementIfApplicable({ firestore, votingUserId }: GrantRecruiterAchievementParams): Promise<boolean> {
    const userRef = doc(firestore, 'users', votingUserId);
    
    try {
        const userDoc = await getDoc(userRef);
        if (!userDoc.exists()) return false;
        
        // Find the referral record for this user
        const referralsQuery = query(
            collectionGroup(firestore, 'referrals'),
            where('referredUserId', '==', votingUserId),
            limit(1)
        );

        const referralsSnapshot = await getDocs(referralsQuery);
        if (referralsSnapshot.empty) {
            return false; // This user was not referred.
        }

        const referralDoc = referralsSnapshot.docs[0];
        const referralData = referralDoc.data() as Referral;
        
        // Check if the user has already triggered a recruiter achievement
        if (referralData.hasVoted) {
            return false;
        }

        const referrerId = referralDoc.ref.parent.parent!.id;
        const sourceFigureId = referralData.sourceFigureId;

        if (!referrerId || !sourceFigureId) {
            return false; // Not a valid referral for this type of achievement.
        }
        
        // Mark that this referral has now led to a vote
        await runTransaction(firestore, async (transaction) => {
            transaction.update(referralDoc.ref, { hasVoted: true });

            // Now, grant the achievement to the referrer on the specific figure's profile
            const referrerDataDoc = await transaction.get(doc(firestore, 'users', referrerId));
            const referrerData = referrerDataDoc.data();
            
            const achievementPayload: Omit<UserAchievement, 'id'> = {
                userId: referrerId,
                achievementId: RECRUITER_ACHIEVEMENT_ID,
                figureId: sourceFigureId,
                unlockedAt: serverTimestamp() as any,
                userDisplayName: referrerData?.username || 'Usuario',
                userPhotoURL: referrerData?.photoURL || null,
            };

            const privateAchievementRef = doc(firestore, `users/${referrerId}/user_achievements`, `${sourceFigureId}_${RECRUITER_ACHIEVEMENT_ID}`);
            const publicAchievementRef = doc(collection(firestore, `figures/${sourceFigureId}/achievements`), referrerId);

            transaction.set(privateAchievementRef, achievementPayload);
            transaction.set(publicAchievementRef, achievementPayload);
        });

        return true;

    } catch (error) {
        console.error("Error in grantRecruiterAchievementIfApplicable:", error);
        return false;
    }
}
