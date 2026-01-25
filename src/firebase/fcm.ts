'use client';

import { getMessaging, getToken } from "firebase/messaging";
import { FirebaseApp } from "firebase/app"; 

const VAPID_KEY = "BLSUGgPAINebr5_AwrOz236TXhpxXB0WyONE5Xb3-lRrBB7KK19j8ghaVqTjLGMKRDWOgj93kzvSj3AVBC_u830";

export const requestNotificationPermissionAndGetToken = async (app: FirebaseApp) => {
  if (!app || typeof window === 'undefined' || !('Notification' in window)) return null;

  try {
    const messaging = getMessaging(app);
    
    // 1. We register the service worker BEFORE requesting the token
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/' // This helps the browser find it at the root
    });
    
    console.log("Service Worker registered successfully");

    const permission = await Notification.requestPermission();

    if (permission === "granted") {
      // 2. We pass the registration explicitly to getToken
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
