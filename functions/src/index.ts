
/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// Inicializa la app de Firebase Admin
admin.initializeApp();

const db = admin.firestore();
const messaging = admin.messaging();

/**
 * Cloud Function que se dispara cuando se crea un nuevo documento de notificación.
 * Envía una notificación push al usuario correspondiente.
 */
export const sendPushNotification = functions.firestore
  .document("users/{userId}/notifications/{notificationId}")
  .onCreate(async (snapshot, context) => {
    // This functionality is currently disabled.
    // The logic to handle FCM tokens and send push notifications has been removed.
    console.log("Push notification trigger fired, but functionality is disabled.");
    return null;
  });

/**
 * Cloud Function that triggers when a new user is referred.
 * It updates the referrer's referral count and grants achievements based on thresholds.
 */
export const onNewReferral = functions.firestore
  .document("users/{userId}/referrals/{referredUserId}")
  .onCreate(async (snapshot, context) => {
    const {userId} = context.params;
    const referrerRef = db.collection("users").doc(userId);

    try {
      // Use a transaction to safely increment the count
      const newReferralCount = await db.runTransaction(async (transaction) => {
        const userDoc = await transaction.get(referrerRef);
        if (!userDoc.exists) {
          console.log(`User ${userId} not found.`);
          return null;
        }

        const currentCount = userDoc.data()?.referralCount || 0;
        const newCount = currentCount + 1;

        transaction.update(referrerRef, {referralCount: newCount});
        return newCount;
      });

      if (newReferralCount === null) {
        return;
      }

      // Check and grant achievements
      const achievementsToGrant = [];
      if (newReferralCount >= 2) achievementsToGrant.push({id: "recruiter_bronze", level: "bronze"});
      if (newReferralCount >= 5) achievementsToGrant.push({id: "recruiter_silver", level: "silver"});
      if (newReferralCount >= 10) achievementsToGrant.push({id: "recruiter_gold", level: "gold"});

      if (achievementsToGrant.length > 0) {
        const batch = db.batch();
        const userAchievementsRef = db.collection("users").doc(userId).collection("user_achievements");

        for (const ach of achievementsToGrant) {
          const achDocRef = userAchievementsRef.doc(ach.id);
          const achDoc = await achDocRef.get();
          // Grant achievement only if it hasn't been granted before
          if (!achDoc.exists) {
            batch.set(achDocRef, {
              userId: userId,
              achievementId: ach.id,
              level: ach.level,
              unlockedAt: admin.firestore.FieldValue.serverTimestamp(),
              // FigureId is not relevant for this global achievement
              figureId: "global",
            });
            console.log(`Granting ${ach.level} recruiter achievement to user ${userId}`);
          }
        }
        await batch.commit();
      }
    } catch (error) {
      console.error(`Error processing referral for user ${userId}:`, error);
    }
  });
