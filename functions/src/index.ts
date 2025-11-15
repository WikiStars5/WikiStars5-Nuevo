
/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import {onDocumentCreated, onDocumentWritten} from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";

// Initialize Firebase Admin SDK
admin.initializeApp();
const db = admin.firestore();


/**
 * Cloud Function that triggers when a user's attitude vote is written (created, updated, or deleted).
 * It securely updates the aggregated vote counts on the corresponding public figure document.
 */
export const onAttitudeVoteChange = onDocumentWritten("figures/{figureId}/attitudeVotes/{userId}", async (event) => {
    const { figureId, userId } = event.params;
    const figureRef = db.collection("figures").doc(figureId);

    const voteBefore = event.data?.before.data()?.vote;
    const voteAfter = event.data?.after.data()?.vote;
    
    // If the vote is the same, do nothing.
    if (voteBefore === voteAfter) {
        logger.info(`Vote for user ${userId} on figure ${figureId} did not change. No action taken.`);
        return;
    }

    const updates: { [key: string]: admin.firestore.FieldValue } = {};

    // Decrement the old vote count if it existed
    if (voteBefore) {
        updates[`attitude.${voteBefore}`] = admin.firestore.FieldValue.increment(-1);
    }

    // Increment the new vote count if it exists
    if (voteAfter) {
        updates[`attitude.${voteAfter}`] = admin.firestore.FieldValue.increment(1);
    }
    
    if (Object.keys(updates).length > 0) {
        logger.info(`Updating attitude counts for figure ${figureId}. Changes: ${JSON.stringify(updates)}`);
        try {
            await figureRef.update(updates);
            logger.info(`Successfully updated attitude counts for figure ${figureId}.`);
        } catch (error) {
            logger.error(`Failed to update attitude counts for figure ${figureId}:`, error);
        }
    }
});


/**
 * Cloud Function that triggers when a user's emotion vote is written (created, updated, or deleted).
 * It securely updates the aggregated vote counts on the corresponding public figure document.
 */
export const onEmotionVoteChange = onDocumentWritten("figures/{figureId}/emotionVotes/{userId}", async (event) => {
    const { figureId, userId } = event.params;
    const figureRef = db.collection("figures").doc(figureId);

    const voteBefore = event.data?.before.data()?.vote;
    const voteAfter = event.data?.after.data()?.vote;

    if (voteBefore === voteAfter) {
        logger.info(`Emotion vote for user ${userId} on figure ${figureId} did not change.`);
        return;
    }

    const updates: { [key: string]: admin.firestore.FieldValue } = {};

    if (voteBefore) {
        updates[`emotion.${voteBefore}`] = admin.firestore.FieldValue.increment(-1);
    }
    if (voteAfter) {
        updates[`emotion.${voteAfter}`] = admin.firestore.FieldValue.increment(1);
    }

    if (Object.keys(updates).length > 0) {
        logger.info(`Updating emotion counts for figure ${figureId}. Changes: ${JSON.stringify(updates)}`);
        try {
            await figureRef.update(updates);
            logger.info(`Successfully updated emotion counts for figure ${figureId}.`);
        } catch (error) {
            logger.error(`Failed to update emotion counts for figure ${figureId}:`, error);
        }
    }
});


/**
 * Cloud Function that triggers when a new user is referred.
 * It updates the referrer's referral count and grants achievements based on thresholds.
 */
export const onNewReferral = onDocumentCreated("users/{userId}/referrals/{referredUserId}", async (event) => {
  const {userId, referredUserId} = event.params;
  const referrerRef = db.collection("users").doc(userId);

  logger.info(`New referral detected: User ${userId} referred ${referredUserId}`);

  try {
    // Use a transaction to safely increment the referral count
    const newReferralCount = await db.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(referrerRef);
      if (!userDoc.exists) {
        logger.warn(`Referrer user document not found for ID: ${userId}`);
        return null;
      }

      const currentCount = userDoc.data()?.referralCount || 0;
      const newCount = currentCount + 1;

      transaction.update(referrerRef, {referralCount: newCount});
      logger.info(`User ${userId} referral count updated to ${newCount}.`);
      return newCount;
    });

    if (newReferralCount === null) {
      return; // Exit if user doc wasn't found
    }

    // Define achievement thresholds
    const achievementsToGrant = [];
    if (newReferralCount >= 2) achievementsToGrant.push({id: "recruiter_bronze", level: "bronze"});
    if (newReferralCount >= 5) achievementsToGrant.push({id: "recruiter_silver", level: "silver"});
    if (newReferralCount >= 10) achievementsToGrant.push({id: "recruiter_gold", level: "gold"});

    if (achievementsToGrant.length > 0) {
      const batch = db.batch();
      const userAchievementsRef = db.collection("users").doc(userId).collection("user_achievements");

      for (const ach of achievementsToGrant) {
        const achDocRef = userAchievementsRef.doc(ach.id);
        // Check if the achievement has already been granted to prevent duplicates
        const achDoc = await achDocRef.get();
        if (!achDoc.exists) {
          batch.set(achDocRef, {
            userId: userId,
            achievementId: ach.id,
            level: ach.level,
            unlockedAt: admin.firestore.FieldValue.serverTimestamp(),
            // FigureId is not relevant for this global achievement
            figureId: "global",
          });
          logger.info(`Granting '${ach.level}' recruiter achievement to user ${userId}`);
        }
      }
      await batch.commit();
    }
  } catch (error) {
    logger.error(`Error processing referral for user ${userId}:`, error);
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
