// Import the Firebase app and messaging packages
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBy0a6uH3AyezH47bXHJd33fFopBmAiV1E",
  authDomain: "wikistars5-nuevo.firebaseapp.com",
  projectId: "wikistars5-nuevo",
  storageBucket: "wikistars5-nuevo.appspot.com",
  messagingSenderId: "480215928523",
  appId: "1:480215928523:web:a5de1569959fadc56fd54e",
  measurementId: "G-NWYPQGSDMP"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging(app);

/**
 * Handles messages received when the app is in the background.
 */
messaging.onBackgroundMessage((payload) => {
  console.log("[firebase-messaging-sw.js] Received background message ", payload);
  
  const defaultIcon = "https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/logo%2Flogodia%20(3)%20(1).png?alt=media&token=59ebd53d-9095-4d1e-a0a8-256ba3959b00";

  const notificationTitle = payload.notification?.title || "WikiStars5";
  const notificationOptions = {
    body: payload.notification?.body || "Tienes una nueva actualización.",
    icon: payload.notification?.image || defaultIcon, 
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
}); // <--- Aquí faltaba cerrar la función

/**
 * Controla el clic en la notificación
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/')
  );
});
