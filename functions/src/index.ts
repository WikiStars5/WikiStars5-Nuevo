
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
