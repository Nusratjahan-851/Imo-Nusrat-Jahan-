importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCYH0ZSeLjH_T3HJ9hVQ84afB5KyAEZi2Y",
  authDomain: "my-sc-tools.firebaseapp.com",
  projectId: "my-sc-tools",
  messagingSenderId: "285986090017",
  appId: "1:285986090017:web:9d872b9bb5c472bcb74760"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  console.log('Background Message:', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/my-logo.jpg',
    data: payload.data
  };
  return self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const urlToOpen = event.notification.data.link || "https://profile.imo.im/profileshare/shr.AAAAAAAAAAAAAAAAAAAAAFEY15og6iUe5Wjo1F2Suvfjisax_8ooeiwD4AVOrl4c";
  event.waitUntil(clients.openWindow(urlToOpen));
});
