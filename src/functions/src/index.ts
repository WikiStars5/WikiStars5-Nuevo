
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
 * It updates the referrer's referral count.
 */
export const onNewReferral = onDocumentCreated("users/{userId}/referrals/{referredUserId}", async (event) => {
  const {userId, referredUserId} = event.params;
  const referrerRef = db.collection("users").doc(userId);

  logger.info(`New referral detected: User ${userId} referred ${referredUserId}`);

  try {
    // Use a transaction to safely increment the referral count
    await db.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(referrerRef);
      if (!userDoc.exists) {
        logger.warn(`Referrer user document not found for ID: ${userId}`);
        return;
      }

      const currentCount = userDoc.data()?.referralCount || 0;
      const newCount = currentCount + 1;

      transaction.update(referrerRef, {referralCount: newCount});
      logger.info(`User ${userId} referral count updated to ${newCount}.`);
    });

  } catch (error) {
    logger.error(`Error processing referral for user ${userId}:`, error);
  }
});
