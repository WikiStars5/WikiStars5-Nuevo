
/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/hhttps";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import {onDocumentCreated} from "firebase-functions/v2/firestore";
import * as functions from "firebase-functions/v2";
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


/**
 * Cloud Function that triggers when a new Firebase user is created.
 * It fetches the user's country based on their IP address and saves it to their Firestore profile.
 */
export const onUserCreate = functions.auth.user().onCreate(async (user) => {
    // IP address is available in the request context for auth functions
    // We need to cast the event to `any` to access the `ipAddress` as it's not in the default types.
    const eventContext = user.metadata as any;
    const ipAddress = eventContext.ipAddress;
    
    if (!ipAddress) {
        logger.warn(`No IP address found for user ${user.uid}. Cannot determine country.`);
        return;
    }
    
    // Use a free IP geolocation service (e.g., ip-api.com)
    // For production apps, consider a more robust service with an API key.
    const geoApiUrl = `http://ip-api.com/json/${ipAddress}?fields=country`;

    try {
        const response = await fetch(geoApiUrl);
        if (!response.ok) {
            throw new Error(`Geolocation API responded with status: ${response.status}`);
        }
        
        const data = await response.json();
        const country = data.country;

        if (country) {
            const userRef = db.collection('users').doc(user.uid);
            await userRef.set({ country: country }, { merge: true });
            logger.info(`Successfully set country '${country}' for user ${user.uid}.`);
        } else {
            logger.warn(`Could not determine country for IP: ${ipAddress}`);
        }
    } catch (error) {
        logger.error(`Error fetching geolocation for user ${user.uid}:`, error);
    }
});
