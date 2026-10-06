require('dotenv').config();
const express = require('express');
const Database = require('better-sqlite3');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const PORT = process.env.PORT || 3000;
const SIZES = (process.env.GROUP_SIZES || '5,5,5,6').split(',').map(n => parseInt(n, 10));
const TOTAL = SIZES.reduce((a, b) => a + b, 0);
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'app.db');
if (!process.env.ADMIN_PASSWORD) console.warn('DIQQAT: ADMIN_PASSWORD o\'rnatilmagan, standart "admin123" ishlatilmoqda!');

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.exec(`CREATE TABLE IF NOT EXISTS participants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  name_key TEXT NOT NULL UNIQUE,
  token TEXT NOT NULL UNIQUE,
  grp INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
)`);

const count = () => db.prepare('SELECT COUNT(*) c FROM participants').get().c;

// Adolatli aralashtirish: kriptografik random + Fisher-Yates (faqat serverda)
function assignGroupsSafe() {
  const ids = db.prepare('SELECT id FROM participants').all().map(r => r.id);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  const upd = db.prepare('UPDATE participants SET grp = ? WHERE id = ?');
  let pos = 0;
  SIZES.forEach((size, g) => {
    ids.slice(pos, pos + size).forEach(id => upd.run(g + 1, id));
    pos += size;
  });
}

const joinTx = db.transaction((name, token) => {
  if (token) {
    const me = db.prepare('SELECT id, name FROM participants WHERE token = ?').get(token);
    if (me) return { me, token };
  }
  const n = count();
  if (n >= TOTAL) return { full: true };
  const key = name.toLowerCase().replace(/\s+/g, ' ');
  if (db.prepare('SELECT 1 FROM participants WHERE name_key = ?').get(key)) return { dup: true };
  const newToken = crypto.randomUUID();
  const info = db.prepare('INSERT INTO participants (name, name_key, token) VALUES (?, ?, ?)').run(name, key, newToken);
  if (n + 1 === TOTAL) assignGroupsSafe();
  return { me: { id: Number(info.lastInsertRowid), name }, token: newToken };
});

const resetTx = db.transaction(() => {
  db.prepare('DELETE FROM participants').run();
  db.prepare("DELETE FROM sqlite_sequence WHERE name = 'participants'").run();
});

function publicState(token) {
  const c = count();
  const done = c >= TOTAL;
  const out = { total: TOTAL, groupCount: SIZES.length, count: c, done, me: null };
  if (token) out.me = db.prepare('SELECT id, name, grp FROM participants WHERE token = ?').get(String(token)) || null;
  if (done) {
    const rows = db.prepare('SELECT id, name, grp FROM participants ORDER BY id').all();
    out.groups = SIZES.map((_, i) => ({ no: i + 1, members: rows.filter(r => r.grp === i + 1).map(r => ({ id: r.id, name: r.name })) }));
    if (out.me) out.me = { id: out.me.id, name: out.me.name, group: out.me.grp };
  } else if (out.me) {
    out.me = { id: out.me.id, name: out.me.name }; // guruh ma'lumoti hech qachon oldindan chiqmaydi
  }
  return out;
}

const isAdmin = (req) => {
  const a = Buffer.from(String(req.get('x-admin-password') || ''));
  const b = Buffer.from(ADMIN_PASSWORD);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

const app = express();
app.use(express.json({ limit: '5kb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.get('/admin', (_, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/healthz', (_, res) => res.send('ok'));

app.get('/api/status', (req, res) => res.json(publicState(req.query.token)));

app.post('/api/join', (req, res) => {
  const name = String((req.body && req.body.name) || '').replace(/\s+/g, ' ').trim();
  const token = req.body && req.body.token ? String(req.body.token) : null;
  if (!token && (name.length < 3 || name.length > 60 || !name.includes(' ')))
    return res.status(400).json({ error: 'Iltimos, ism va familiyangizni to\'liq kiriting.' });
  const r = joinTx(name, token);
  if (r.full) return res.status(403).json({ error: 'Joylar to\'ldi. Siz ushbu randomga qo\'shila olmaysiz.' });
  if (r.dup) return res.status(409).json({ error: 'Bu ism-familiya allaqachon ro\'yxatda. Agar bu siz bo\'lsangiz, o\'qituvchiga murojaat qiling.' });
  res.json({ token: r.token, ...publicState(r.token) });
});

app.get('/api/admin/state', (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Parol noto\'g\'ri' });
  const participants = db.prepare('SELECT id, name, grp, created_at FROM participants ORDER BY id').all();
  res.json({ total: TOTAL, count: participants.length, done: participants.length >= TOTAL, sizes: SIZES, participants });
});

app.post('/api/admin/reset', (req, res) => {
  if (!isAdmin(req)) return res.status(401).json({ error: 'Parol noto\'g\'ri' });
  resetTx();
  res.json({ ok: true });
});

app.listen(PORT, () => console.log(`Server ishga tushdi: http://localhost:${PORT}  (admin: /admin)`));
