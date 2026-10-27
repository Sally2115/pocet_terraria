const express = require('express');
const app = express();
const TOKEN = process.env.BOT_TOKEN;
const SECRET = process.env.WEBHOOK_SECRET || 'pt-secret';
const BASE = process.env.WEBAPP_URL || process.env.RENDER_EXTERNAL_URL;
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(__dirname));
app.get('/health', (_, r) => r.send('ok'));

const api = (method, body) =>
  fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }).then((r) => r.json());

app.post('/webhook', async (req, res) => {
  if (req.get('x-telegram-bot-api-secret-token') !== SECRET) return res.sendStatus(403);
  res.sendStatus(200);
  const m = req.body.message;
  if (!m || !m.text) return;
  if (/^\/(start|play)/.test(m.text)) {
    await api('sendMessage', {
      chat_id: m.chat.id,
      text: '⛏ Pocket Terraria\nКопай, строй, крафти и выживай ночью!',
      reply_markup: { inline_keyboard: [[{ text: '🎮 Играть', web_app: { url: BASE } }]] },
    });
  }
});

app.listen(PORT, async () => {
  console.log('Server on', PORT);
  if (!TOKEN || !BASE) return console.log('Set BOT_TOKEN and WEBAPP_URL');
  console.log(await api('setWebhook', { url: BASE + '/webhook', secret_token: SECRET }));
  await api('setChatMenuButton', { menu_button: { type: 'web_app', text: 'Играть', web_app: { url: BASE } } });
});
