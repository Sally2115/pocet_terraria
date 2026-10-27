const express = require('express'), fs = require('fs'), path = require('path'), http = require('http');
const { WebSocketServer } = require('ws');
const app = express(), server = http.createServer(app);
const TOKEN = process.env.BOT_TOKEN, SECRET = process.env.WEBHOOK_SECRET || 'pt-secret';
const BASE = process.env.WEBAPP_URL || process.env.RENDER_EXTERNAL_URL, PORT = process.env.PORT || 3000;
app.use(express.json());
const dir = [__dirname, path.join(__dirname, 'public')].find(d => fs.existsSync(path.join(d, 'index.html')));
console.log('Папка с игрой:', dir);
app.use(express.static(dir || __dirname));
app.get('/health', (_, r) => r.send('ok'));
const api = (m, b) => fetch(`https://api.telegram.org/bot${TOKEN}/${m}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) }).then(r => r.json());
app.post('/webhook', async (req, res) => {
  if (req.get('x-telegram-bot-api-secret-token') !== SECRET) return res.sendStatus(403);
  res.sendStatus(200);
  const m = req.body.message;
  if (m && m.text && /^\/(start|play)/.test(m.text))
    await api('sendMessage', { chat_id: m.chat.id, text: '⛏ Pocket Terraria\nОбщий мир для всех игроков. Копай, строй, побеждай Короля слизней!', reply_markup: { inline_keyboard: [[{ text: '🎮 Играть', web_app: { url: BASE } }]] } });
});
// ---- ONLINE ----
const W = 300, H = 130, WF = path.join(__dirname, 'world.json');
let world = null, dirty = false;
try { const o = JSON.parse(fs.readFileSync(WF)); world = { tiles: Buffer.from(o.w, 'base64'), surf: o.surf }; } catch (e) {}
const wmsg = () => JSON.stringify({ t: 'world', w: world.tiles.toString('base64'), surf: world.surf });
setInterval(() => { if (world && dirty) { dirty = false; fs.writeFile(WF, JSON.stringify({ w: world.tiles.toString('base64'), surf: world.surf }), () => {}); } }, 30000);
const wss = new WebSocketServer({ server });
let nid = 1; const pl = {};
const all = (f, skip) => wss.clients.forEach(c => { if (c !== skip && c.readyState === 1) f(c); });
wss.on('connection', ws => {
  const id = nid++;
  ws.send(JSON.stringify({ t: 'id', id }));
  ws.send(world ? wmsg() : JSON.stringify({ t: 'need' }));
  ws.on('message', d => {
    let m; try { m = JSON.parse(d); } catch (e) { return; }
    if (m.t === 'init') {
      if (!world && typeof m.w === 'string' && Array.isArray(m.surf)) {
        const b = Buffer.from(m.w, 'base64');
        if (b.length === W * H) { world = { tiles: b, surf: m.surf }; dirty = true; }
      }
      if (world) ws.send(wmsg());
    } else if (m.t === 's' && world && Number.isInteger(m.x) && Number.isInteger(m.y) && m.x >= 0 && m.x < W && m.y >= 0 && m.y < H - 1 && m.v >= 0 && m.v <= 12) {
      world.tiles[m.y * W + m.x] = m.v; dirty = true;
      const j = JSON.stringify({ t: 's', x: m.x, y: m.y, v: m.v });
      all(c => c.send(j), ws);
    } else if (m.t === 'p') {
      pl[id] = { x: +m.x || 0, y: +m.y || 0, f: m.f, n: String(m.n || '?').slice(0, 16) };
    }
  });
  ws.on('close', () => delete pl[id]);
});
setInterval(() => { if (wss.clients.size) { const j = JSON.stringify({ t: 'ps', p: pl }); all(c => c.send(j)); } }, 100);
server.listen(PORT, async () => {
  console.log('Server on', PORT);
  if (!TOKEN || !BASE) return console.log('Set BOT_TOKEN and WEBAPP_URL');
  console.log(await api('setWebhook', { url: BASE + '/webhook', secret_token: SECRET }));
  await api('setChatMenuButton', { menu_button: { type: 'web_app', text: 'Играть', web_app: { url: BASE } } });
});