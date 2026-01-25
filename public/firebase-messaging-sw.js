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
 * The function is given a payload object, which contains the details of the
 * received message.
 */
messaging.onBackgroundMessage((payload) => {
  console.log(
    "[firebase-messaging-sw.js] Received background message ",
    payload
  );
  
  // Customize notification here
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: "/icon-192x192.png", // Ensure you have this icon in your /public folder
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
