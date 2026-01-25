'use client';

import { getMessaging, getToken } from "firebase/messaging";
import { FirebaseApp } from "firebase/app"; 

const VAPID_KEY = "gA8xWOEtVxV8gmkNrRW8AWa2s61bc_yFmJCPLBHhMNo";

// Aceptamos 'app' como parámetro para no depender de index.ts
export const requestNotificationPermissionAndGetToken = async (app: FirebaseApp) => {
  
  if (!app || typeof window === 'undefined' || !('Notification' in window)) {
    console.error("Firebase app not initialized or notifications not supported.");
    return null;
  }

  try {
    const messaging = getMessaging(app);
    console.log("Requesting notification permission...");
    const permission = await Notification.requestPermission();

    if (permission === "granted") {
      const currentToken = await getToken(messaging, { vapidKey: VAPID_KEY });
      if (currentToken) {
        console.log("FCM Token:", currentToken);
        return currentToken;
      } else {
        console.log('No registration token available. Request permission to generate one.');
        return null;
      }
    } else {
        console.log('Unable to get permission to notify.');
        return null;
    }
  } catch (error) {
    console.error("Error retrieving token:", error);
    return null;
  }
};

