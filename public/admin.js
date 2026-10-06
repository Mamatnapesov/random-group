const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let timer, built = false;
const pw = () => sessionStorage.getItem('rg_admin') || '';
const H = () => ({ 'x-admin-password': pw(), 'Content-Type': 'application/json' });

function login(msg) {
  clearInterval(timer); built = false;
  $('view').innerHTML = `${msg ? `<div class="err">${esc(msg)}</div>` : ''}<form id="f"><input id="p" type="password" placeholder="Admin paroli" required><button>Kirish</button></form>`;
  $('f').onsubmit = (e) => { e.preventDefault(); sessionStorage.setItem('rg_admin', $('p').value); load(); };
}

const dist = (t, g) => { const b = Math.floor(t / g), r = t % g; return Array.from({ length: g }, (_, i) => b + (i >= g - r ? 1 : 0)); };
const readSizes = () => [...document.querySelectorAll('.gsz')].map(i => parseInt(i.value, 10));

function setGroups(arr) {
  $('gs').innerHTML = arr.map((n, i) => `<div><small class="wait">${i + 1}-guruh</small><input class="gsz" type="number" min="1" max="100" value="${n}"></div>`).join('');
  document.querySelectorAll('.gsz').forEach(i => i.oninput = sync);
  sync(true);
}
function sync(fromAuto) {
  const a = readSizes(), sum = a.reduce((x, y) => x + (y || 0), 0);
  if (fromAuto !== true) $('tot').value = sum;
  $('gc').value = a.length;
  $('sum').textContent = `Jami: ${sum} talaba, ${a.length} guruh`;
}

function buildSettings(s) {
  $('settings').innerHTML = `<hr style="border:0;border-top:1px solid #e5e7eb;margin:20px 0">
    <h3 style="margin:0 0 10px">⚙️ Sozlamalar</h3>
    <small class="wait">Talabalar soni</small><input id="tot" type="number" min="1" max="500">
    <small class="wait">Guruhlar soni</small><input id="gc" type="number" min="1" max="50">
    <small class="wait">Har bir guruhda nechtadan (o‘zgartirsa bo‘ladi)</small>
    <div id="gs" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(90px,1fr));gap:8px;margin-top:6px"></div>
    <p class="wait" id="sum"></p>
    <button id="save">💾 SAQLASH VA YANGI RANDOM BOSHLASH</button>`;
  $('tot').value = s.total; $('gc').value = s.sizes.length; setGroups(s.sizes);
  const auto = () => { const t = parseInt($('tot').value, 10), g = parseInt($('gc').value, 10);
    if (t >= 1 && g >= 1 && g <= 50 && t >= g) setGroups(dist(t, g)); };
  $('tot').oninput = auto; $('gc').oninput = auto;
  $('save').onclick = async () => {
    const sizes = readSizes();
    if (!sizes.length || sizes.some(n => !Number.isInteger(n) || n < 1)) return alert('Har bir guruh uchun to‘g‘ri son kiriting.');
    if (!confirm(`${sizes.reduce((a, b) => a + b, 0)} talaba, ${sizes.length} guruh (${sizes.join(' + ')}). Hozirgi ishtirokchilar o‘chiriladi. Davom etasizmi?`)) return;
    const r = await fetch('/api/admin/config', { method: 'POST', headers: H(), body: JSON.stringify({ sizes }) });
    if (!r.ok) return alert((await r.json()).error || 'Xatolik');
    load();
  };
  built = true;
}

async function load() {
  const r = await fetch('/api/admin/state', { headers: H() });
  if (r.status === 401) return login(pw() ? 'Parol noto‘g‘ri' : '');
  const s = await r.json();
  if (!$('live')) $('view').innerHTML = '<div id="live"></div><div id="settings"></div>';
  const by = {};
  s.participants.forEach(p => (by[p.grp] = by[p.grp] || []).push(p));
  let groups = '';
  if (s.done) groups = '<h3>Random natija</h3>' + s.sizes.map((_, i) =>
    `<p><b>${i + 1}-guruh (${(by[i + 1] || []).length}):</b> ${(by[i + 1] || []).map(p => 'ID ' + p.id + ' ' + esc(p.name)).join(' · ')}</p>`).join('');
  $('live').innerHTML = `<div class="cnt center">Kirgan talabalar: ${s.count} / ${s.total}</div>
    <div class="bar"><i style="width:${s.count / s.total * 100}%"></i></div>
    <p class="center wait">${s.sizes.length} guruh: ${s.sizes.join(' + ')} · ${s.done ? '✅ Guruhlar aniqlangan' : '⏳ Kutilmoqda, guruhlar hali aniqlanmagan'}</p>
    <div class="tablewrap"><table><tr><th>ID</th><th>Ism-familiya</th><th>Guruh</th></tr>
    ${s.participants.map(p => `<tr><td><b>${p.id}</b></td><td>${esc(p.name)}</td><td>${p.grp ? p.grp + '-guruh' : '—'}</td></tr>`).join('') || '<tr><td colspan="3" class="wait">Hali hech kim kirmagan</td></tr>'}</table></div>
    ${groups}<br><button class="danger" id="reset">🔄 YANGI RANDOM BOSHLASH</button>`;
  $('reset').onclick = async () => {
    if (!confirm('Barcha ishtirokchilar o‘chiriladi. Davom etasizmi?')) return;
    await fetch('/api/admin/reset', { method: 'POST', headers: H() });
    load();
  };
  if (!built) buildSettings(s);
  clearInterval(timer); timer = setInterval(load, 4000);
}
pw() ? load() : login();
