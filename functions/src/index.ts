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
    const { userId } = context.params;
    const notificationData = snapshot.data();

    if (!notificationData) {
      console.log("No hay datos en la notificación.");
      return null;
    }

    console.log(`Nueva notificación para el usuario: ${userId}`);

    // 1. Obtener los tokens de notificación del usuario
    const userRef = db.doc(`users/${userId}`);
    let userDoc;
    try {
      userDoc = await userRef.get();
    } catch (error) {
      console.error("Error al obtener el documento del usuario:", error);
      return null;
    }


    if (!userDoc.exists) {
      console.log(`No se encontró al usuario con ID: ${userId}`);
      return null;
    }

    const userData = userDoc.data();
    const tokens = userData?.fcmTokens;

    if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
      console.log(`El usuario ${userId} no tiene tokens de notificación.`);
      return null;
    }

    // 2. Construir el payload de la notificación
    const payload: admin.messaging.MessagingPayload = {
      notification: {
        title: "¡Nueva Notificación en WikiStars5!",
        body: notificationData.message,
        icon: "https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/logo%2Flogodia.png?alt=media&token=fb7367da-8db6-4f1d-a1f0-d03f57e6b9f6",
        click_action: notificationData.link || "https://wikistars5.co",
      },
    };

    // 3. Enviar la notificación a todos los tokens del usuario
    console.log(`Enviando notificación a ${tokens.length} tokens.`);

    const response = await messaging.sendToDevice(tokens, payload);
    const tokensToRemove: string[] = [];

    response.results.forEach((result, index) => {
      const error = result.error;
      if (error) {
        console.error(
          "Fallo al enviar la notificación a",
          tokens[index],
          error
        );
        // Si el token ya no es válido, lo marcamos para eliminar.
        if (
          error.code === "messaging/invalid-registration-token" ||
          error.code === "messaging/registration-token-not-registered"
        ) {
          tokensToRemove.push(tokens[index]);
        }
      }
    });

    // 4. Limpiar los tokens inválidos de la base de datos
    if (tokensToRemove.length > 0) {
      console.log("Eliminando tokens inválidos:", tokensToRemove);
      return userRef.update({
        fcmTokens: admin.firestore.FieldValue.arrayRemove(...tokensToRemove),
      });
    }

    return null;
  });
