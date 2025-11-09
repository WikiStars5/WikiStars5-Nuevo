'use client';
import { initializeApp } from 'firebase/app';
import { getMessaging, onBackgroundMessage } from 'firebase/messaging/sw';
import { firebaseConfig } from '../src/firebase/config';

// Initialize the Firebase app in the service worker
const firebaseApp = initializeApp(firebaseConfig);
const messaging = getMessaging(firebaseApp);

onBackgroundMessage(messaging, (payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  if (payload.notification) {
    const notificationTitle = payload.notification.title || 'Nueva Notificación';
    const notificationOptions = {
      body: payload.notification.body,
      icon: payload.notification.icon || '/icon-192x192.png'
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  }
});
