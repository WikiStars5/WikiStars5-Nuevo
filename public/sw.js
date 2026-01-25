
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyBy0a6uH3AyezH47bXHJd33fFopBmAiV1E",
  authDomain: "wikistars5-nuevo.firebaseapp.com",
  projectId: "wikistars5-nuevo",
  storageBucket: "wikistars5-nuevo.firebasestorage.app",
  messagingSenderId: "480215928523",
  appId: "1:480215928523:web:a5de1569959fadc56fd54e",
  measurementId: "G-NWYPQGSDMP"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  console.log('Mensaje en segundo plano:', payload);

  const notificationTitle = payload.notification?.title || "WikiStars5";
  const notificationOptions = {
    body: payload.notification?.body || "Nueva actualización disponible",
    icon: 'https://firebasestorage.googleapis.com/v0/b/wikistars5-nuevo.firebasestorage.app/o/logo%2Flogodia%20(2).png?alt=media&token=7cdac6ec-4db8-4bda-a104-fa636e201528'
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close(); // Cierra la notificación al hacer clic

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // Intenta encontrar una pestaña abierta que coincida exactamente con la URL absoluta
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url === 'https://wikistars5.co/' && 'focus' in client) {
          return client.focus(); // Si existe, la pone en primer plano
        }
      }
      // Si el navegador estaba cerrado, abre una nueva ventana con la URL completa
      if (clients.openWindow) {
        return clients.openWindow('https://wikistars5.co/');
      }
    })
  );
});
