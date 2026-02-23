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

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: 'my-logo.jpg'
    };
    self.registration.showNotification(notificationTitle, notificationOptions);
});
