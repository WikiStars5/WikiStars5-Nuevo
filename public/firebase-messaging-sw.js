// Import the Firebase app and messaging libraries.
// We need this because this file is a service worker and doesn't have access
// to the same module system as the rest of the Next.js app.
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

// Your web app's Firebase configuration
// This is replaced with the actual config from your project.
const firebaseConfig = {
  "projectId": "wikistars5-nuevo",
  "appId": "1:480215928523:web:a5de1569959fadc56fd54e",
  "apiKey": "AIzaSyBy0a6uH3AyezH47bXHJd33fFopBmAiV1E",
  "authDomain": "wikistars5-nuevo.firebaseapp.com",
  "storageBucket": "wikistars5-nuevo.appspot.com",
  "messagingSenderId": "480215928523",
  "measurementId": "G-NWYPQGSDMP"
};


// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Retrieve an instance of Firebase Messaging so that it can handle background messages.
const messaging = firebase.messaging();

/**
 * This handler is triggered when a push notification is received while the
 * service worker is in the background (i.e., the app tab is not active or is closed).
 */
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  // Extract notification data from the payload sent by the Cloud Function.
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: payload.notification.icon || '/logo.png',
    // The `data` property is where we store the URL to open on click.
    // The Cloud Function places the `link` into `click_action`.
    data: {
        url: payload.notification.click_action,
    }
  };

  // Display the notification to the user.
  self.registration.showNotification(notificationTitle, notificationOptions);
});

/**
 * This event listener is triggered when a user clicks on a notification
 * that was displayed by this service worker.
 */
self.addEventListener('notificationclick', (event) => {
    console.log('[firebase-messaging-sw.js] Notification click received.', event);

    event.notification.close(); // Close the notification

    const urlToOpen = event.notification.data.url;

    // This piece of code is to ensure that if a window for your app is already open,
    // it focuses that window instead of opening a new one.
    event.waitUntil(
        clients.matchAll({
            type: "window",
            includeUncontrolled: true
        }).then((clientList) => {
            for (let i = 0; i < clientList.length; i++) {
                const client = clientList[i];
                if (client.url === '/' && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});
