'use client';

import { getMessaging, getToken } from "firebase/messaging";
import { initializeFirebase } from "@/firebase/index";

// VAPID key from your Firebase project settings
const VAPID_KEY = "gA8xWOEtVxV8gmkNrRW8AWa2s61bc_yFmJCPLBHhMNo";

/**
 * Requests permission for notifications and retrieves the FCM token.
 */
export const requestNotificationPermissionAndGetToken = async () => {
  const { firebaseApp } = initializeFirebase();

  if (!firebaseApp || typeof window === 'undefined' || !('Notification' in window)) {
    console.error("Firebase app not initialized or notifications not supported.");
    return null;
  }

  try {
    const messaging = getMessaging(firebaseApp);
    
    console.log("Requesting notification permission...");
    const permission = await Notification.requestPermission();

    if (permission === "granted") {
      console.log("Notification permission granted.");
      
      const currentToken = await getToken(messaging, {
        vapidKey: VAPID_KEY,
      });

      if (currentToken) {
        console.log("FCM Token:", currentToken);
        // This is where you would typically send the token to your server
        // to store it against the user's profile.
        // e.g., await sendTokenToServer(currentToken);
        return currentToken;
      } else {
        console.log("No registration token available. Request permission to generate one.");
        return null;
      }
    } else {
      console.log("Unable to get permission to notify.");
      return null;
    }
  } catch (error) {
    console.error("An error occurred while retrieving token. ", error);
    return null;
  }
};
