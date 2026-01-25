// This service worker is for Firebase Cloud Messaging.

// Using compat scripts for broader browser support in service workers.
importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker.
// This config is safe to be public.
firebase.initializeApp({
    apiKey: "AIzaSyBy0a6uH3AyezH47bXHJd33fFopBmAiV1E",
    authDomain: "wikistars5-nuevo.firebaseapp.com",
    projectId: "wikistars5-nuevo",
    storageBucket: "wikistars5-nuevo.appspot.com",
    messagingSenderId: "480215928523",
    appId: "1:480215928523:web:a5de1569959fadc56fd54e",
    measurementId: "G-NWYPQGSDMP"
});

// Retrieve an instance of Firebase Messaging to handle background messages.
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[sw.js] Received background message: ', payload);

  const notificationTitle = payload.notification?.title || 'Nueva Notificación';
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: payload.notification?.image || '/icon.png', // A fallback icon
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
