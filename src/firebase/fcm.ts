'use client';

import { getMessaging, getToken } from "firebase/messaging";
import { FirebaseApp } from "firebase/app"; 

const VAPID_KEY = "BLSUGgPAINebr5_AwrOz236TXhpxXB0WyONE5Xb3-lRrBB7KK19j8ghaVqTjLGMKRDWOgj93kzvSj3AVBC_u830";

export const requestNotificationPermissionAndGetToken = async (app: FirebaseApp) => {
  if (!app || typeof window === 'undefined' || !('Notification' in window)) return null;

  try {
    const messaging = getMessaging(app);
    
    // Register the dedicated Firebase Service Worker
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: '/' 
    });
    
    console.log("Firebase Service Worker registered successfully");

    const permission = await Notification.requestPermission();

    if (permission === "granted") {
      const currentToken = await getToken(messaging, { 
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: registration 
      });
      
      if (currentToken) {
        console.log("FCM Token obtained:", currentToken);
        return currentToken;
      }
    }
    return null;
  } catch (error) {
    console.error("Detailed error while getting token:", error);
    return null;
  }
};