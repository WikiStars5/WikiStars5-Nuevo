
/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import {onDocumentCreated} from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";

// Initialize Firebase Admin SDK
admin.initializeApp();
const db = admin.firestore();


/**
 * Cloud Function that triggers when a new user is referred.
 * It updates the referrer's referral count, updates the public recruiter leaderboard,
 * and grants recruiter achievements.
 */
export const onNewReferral = onDocumentCreated("users/{userId}/referrals/{referredUserId}", async (event) => {
  const {userId} = event.params;
  const referrerRef = db.collection("users").doc(userId);
  const recruiterRef = db.collection("recruiters").doc(userId);

  logger.info(`Processing referral for referrer ID: ${userId}`);

  try {
    await db.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(referrerRef);
      if (!userDoc.exists) {
        logger.warn(`Referrer user document not found for ID: ${userId}.`);
        return;
      }

      const userData = userDoc.data()!;
      const currentCount = userData.referralCount || 0;
      const newCount = currentCount + 1;

      // 1. Update the private referral count on the user document
      transaction.update(referrerRef, {referralCount: newCount});
      logger.info(`User ${userId} referral count updated to ${newCount}.`);

      // 2. Create/update the public recruiter document for the leaderboard
      const recruiterData = {
          userId: userId,
          username: userData.username,
          photoURL: userData.photoURL || null,
          country: userData.country || null,
          gender: userData.gender || null,
          referralCount: newCount,
      };
      transaction.set(recruiterRef, recruiterData, { merge: true });
      logger.info(`Recruiter document for ${userId} updated.`);


      // 3. Check for and grant achievements based on the new count
      const achievementsToGrant = [];
      // Grant bronze if they reach 2 and don't have it yet.
      if (newCount >= 2 && (!userData.achievements || !userData.achievements.recruiter_bronze)) {
        achievementsToGrant.push({id: "recruiter_bronze", level: "bronze"});
      }
      if (newCount >= 5 && (!userData.achievements || !userData.achievements.recruiter_silver)) {
        achievementsToGrant.push({id: "recruiter_silver", level: "silver"});
      }
      if (newCount >= 10 && (!userData.achievements || !userData.achievements.recruiter_gold)) {
        achievementsToGrant.push({id: "recruiter_gold", level: "gold"});
      }

      // 4. Write achievement documents within the same transaction
      if (achievementsToGrant.length > 0) {
        const userAchievementsRef = db.collection("users").doc(userId).collection("user_achievements");
        for (const ach of achievementsToGrant) {
            const achDocRef = userAchievementsRef.doc(ach.id);
            transaction.set(achDocRef, {
                userId: userId,
                achievementId: ach.id,
                level: ach.level,
                unlockedAt: admin.firestore.FieldValue.serverTimestamp(),
                figureId: "global", // This is a global, not figure-specific achievement
            });
            logger.info(`Granting '${ach.level}' recruiter achievement to user ${userId}.`);
        }
      }
    });
  } catch (error) {
    logger.error(`Error in onNewReferral transaction for user ${userId}:`, error);
  }
});


/**
 * Cloud Function to send a notification when an achievement is unlocked.
 */
export const onAchievementUnlocked = onDocumentCreated("users/{userId}/user_achievements/{achievementId}", async (event) => {
    const {userId, achievementId} = event.params;
    const achievementData = event.data?.data();

    if (!achievementData) {
        logger.error(`No data for achievement ${achievementId} for user ${userId}`);
        return;
    }

    // Define achievement names
    const achievementNames: {[key: string]: string} = {
        'pioneer_voter': 'Pionero',
        'recruiter_bronze': 'Reclutador de Bronce',
        'recruiter_silver': 'Reclutador de Plata',
        'recruiter_gold': 'Reclutador de Oro',
    };

    const achievementName = achievementNames[achievementData.achievementId] || 'un logro';
    let message = `¡Felicidades! Has desbloqueado el logro '${achievementName}'.`;
    let link = `/profile`; // Default link to profile

    // If it's a figure-specific achievement (like Pioneer)
    if (achievementData.figureId && achievementData.figureId !== 'global') {
        const figureRef = db.collection('figures').doc(achievementData.figureId);
        const figureDoc = await figureRef.get();
        if (figureDoc.exists()) {
            const figureName = figureDoc.data()?.name || 'un perfil';
            message = `¡Felicidades! Has ganado el logro '${achievementName}' en el perfil de ${figureName}.`;
            link = `/figures/${achievementData.figureId}`;
        }
    }
    
    // Create the notification
    const notificationRef = db.collection("users").doc(userId).collection("notifications").doc();
    await notificationRef.set({
        userId: userId,
        type: 'achievement_unlocked',
        message: message,
        isRead: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        link: link,
    });

    logger.info(`Notification sent to user ${userId} for achievement ${achievementName}`);
});
