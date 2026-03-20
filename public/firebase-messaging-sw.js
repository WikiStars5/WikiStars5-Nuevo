importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Los valores coinciden con la configuración del proyecto en src/firebase/config.ts
firebase.initializeApp({
  apiKey: "AIzaSyBy0a6uH3AyezH47bXHJd33fFopBmAiV1E",
  authDomain: "wikistars5-nuevo.firebaseapp.com",
  projectId: "wikistars5-nuevo",
  storageBucket: "wikistars5-nuevo.appspot.com",
  messagingSenderId: "480215928523",
  appId: "1:480215928523:web:a5de1569959fadc56fd54e"
});

const messaging = firebase.messaging();

// Manejo de mensajes en segundo plano para asegurar que el icono sea el correcto
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Mensaje recibido en segundo plano:', payload);
  
  const notificationTitle = payload.notification?.title || 'Starryz5';
  const notificationOptions = {
    body: payload.notification?.body || 'Nueva notificación',
    // Usar el nuevo logo proporcionado por el usuario
    icon: 'https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/logo%2Festrellados%20(3).jpg?alt=media&token=4c5ff945-b737-4bd6-bb41-98b609c654c9',
    badge: 'https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/logo%2Festrellados%20(3).jpg?alt=media&token=4c5ff945-b737-4bd6-bb41-98b609c654c9',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});