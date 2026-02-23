importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-messaging-compat.js');

const firebaseConfig = {
    apiKey: "AIzaSyCYH0ZSeLjH_T3HJ9hVQ84afB5KyAEZi2Y",
    authDomain: "my-sc-tools.firebaseapp.com",
    databaseURL: "https://my-sc-tools-default-rtdb.firebaseio.com",
    projectId: "my-sc-tools",
    storageBucket: "my-sc-tools.firebasestorage.app",
    messagingSenderId: "285986090017",
    appId: "1:285986090017:web:9d872b9bb5c472bcb74760"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Retrieve Firebase Messaging
const messaging = firebase.messaging();

// Handle background notifications
messaging.onBackgroundMessage(function (payload) {

    const notificationTitle = payload.notification.title;

    const notificationOptions = {
        body: payload.notification.body,
        icon: 'my-logo.jpg',

        // 🔑 VERY IMPORTANT: click target
        data: {
            url: 'https://nusratjahan-851.github.io/jahannusrat/'
        }
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

// 🔥 Handle notification click (THIS FIXES YOUR ISSUE)
self.addEventListener('notificationclick', function (event) {
    event.notification.close();

    const targetUrl =
        event.notification.data && event.notification.data.url
            ? event.notification.data.url
            : 'https://nusratjahan-851.github.io/jahannusrat/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then(clientList => {
                for (const client of clientList) {
                    if (client.url === targetUrl && 'focus' in client) {
                        return client.focus();
                    }
                }
                if (clients.openWindow) {
                    return clients.openWindow(targetUrl);
                }
            })
    );
});
