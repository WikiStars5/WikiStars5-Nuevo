'use client';

import { getMessaging, getToken } from "firebase/messaging";
import { FirebaseApp } from "firebase/app"; 

const VAPID_KEY = "BLSUGgPAINebr5_AwrOz236TXhpxXB0WyONE5Xb3-lRrBB7KK19j8ghaVqTjLGMKRDWOgj93kzvSj3AVBC_u830";

export const requestNotificationPermissionAndGetToken = async (app: FirebaseApp) => {
  if (!app || typeof window === 'undefined' || !('Notification' in window)) return null;

  try {
    const messaging = getMessaging(app);
    
    // 1. Forzamos el registro del service worker ANTES de pedir el token
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: '/' // Esto ayuda a que el navegador lo encuentre en la raíz
    });
    
    console.log("Service Worker registrado con éxito");

    const permission = await Notification.requestPermission();

    if (permission === "granted") {
      // 2. Le pasamos la registración explícitamente al getToken
      const currentToken = await getToken(messaging, { 
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: registration 
      });
      
      if (currentToken) {
        console.log("FCM Token obtenido:", currentToken);
        return currentToken;
      }
    }
    return null;
  } catch (error) {
    console.error("Error detallado al obtener token:", error);
    return null;
  }
};
