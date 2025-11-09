
// This file must be in the public folder.

import { initializeApp } from 'firebase/app';
import { getMessaging, onBackgroundMessage } from 'firebase/messaging/sw';

// Your web app's Firebase configuration
const firebaseConfig = {
  "projectId": "wikistars5-nuevo",
  "appId": "1:480215928523:web:a5de1569959fadc56fd54e",
  "apiKey": "AIzaSyBy0a6uH3AyezH47bXHJd33fFopBmAiV1E",
  "authDomain": "wikistars5-nuevo.firebaseapp.com",
  "storageBucket": "wikistars5-nuevo.appspot.com",
  "messagingSenderId": "480215928523",
  "measurementId": "G-NWYPQGSDMP"
};


const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

onBackgroundMessage(messaging, (payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification?.title || 'New Message';
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: payload.notification?.icon || '/logo-192.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

    