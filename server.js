const express = require('express'), fs = require('fs'), path = require('path');
const app = express();
const TOKEN = process.env.BOT_TOKEN, SECRET = process.env.WEBHOOK_SECRET || 'pt-secret';
const BASE = process.env.WEBAPP_URL || process.env.RENDER_EXTERNAL_URL, PORT = process.env.PORT || 3000;
app.use(express.json());
const VER = Date.now(), url = () => BASE + '/?v=' + VER; // новая ссылка при каждом деплое, чтобы Telegram не брал кэш
app.use((_, r, n) => { r.set('Cache-Control', 'no-store'); n(); });
const dir = [__dirname, path.join(__dirname, 'public')].find(d => fs.existsSync(path.join(d, 'index.html')));
console.log('Папка с игрой:', dir);
// Отдаём только игру, а не исходники сервера
app.get('/', (_, r) => r.sendFile(path.join(dir || __dirname, 'index.html')));
app.get('/index.html', (_, r) => r.sendFile(path.join(dir || __dirname, 'index.html')));
app.get('/health', (_, r) => r.send('ok'));
const api = (m, b) => fetch(`https://api.telegram.org/bot${TOKEN}/${m}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) }).then(r => r.json());
app.post('/webhook', async (req, res) => {
  if (req.get('x-telegram-bot-api-secret-token') !== SECRET) return res.sendStatus(403);
  res.sendStatus(200);
  const m = req.body.message;
  if (m && m.text && /^\/(start|play)/.test(m.text))
    await api('sendMessage', {
      chat_id: m.chat.id,
      text: '📡 SECTOR-9: ЭХО\nПсихологический хоррор. 12 глав, 5 концовок.\nОператор, вы на связи?\n\nНе отвечайте на голос из коридора.',
      reply_markup: { inline_keyboard: [[{ text: '🎧 Выйти на связь', web_app: { url: url() } }]] }
    });
});
app.listen(PORT, async () => {
  console.log('Server on', PORT);
  if (!TOKEN || !BASE) return console.log('Set BOT_TOKEN and WEBAPP_URL');
  console.log(await api('setWebhook', { url: BASE + '/webhook', secret_token: SECRET }));
  await api('setChatMenuButton', { menu_button: { type: 'web_app', text: 'Играть', web_app: { url: url() } } });
});