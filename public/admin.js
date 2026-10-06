const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let timer;
const pw = () => sessionStorage.getItem('rg_admin') || '';

function login(msg) {
  clearInterval(timer);
  $('view').innerHTML = `${msg ? `<div class="err">${esc(msg)}</div>` : ''}<form id="f"><input id="p" type="password" placeholder="Admin paroli" required><button>Kirish</button></form>`;
  $('f').onsubmit = (e) => { e.preventDefault(); sessionStorage.setItem('rg_admin', $('p').value); load(); };
}

async function load() {
  const r = await fetch('/api/admin/state', { headers: { 'x-admin-password': pw() } });
  if (r.status === 401) return login(pw() ? 'Parol noto‘g‘ri' : '');
  const s = await r.json();
  const by = {};
  s.participants.forEach(p => (by[p.grp] = by[p.grp] || []).push(p));
  let groups = '';
  if (s.done) groups = '<h3>Random natija</h3>' + s.sizes.map((_, i) =>
    `<p><b>${i + 1}-guruh (${(by[i + 1] || []).length}):</b> ${(by[i + 1] || []).map(p => 'ID ' + p.id + ' ' + esc(p.name)).join(' · ')}</p>`).join('');
  $('view').innerHTML = `<div class="cnt center">Kirgan talabalar: ${s.count} / ${s.total}</div>
    <div class="bar"><i style="width:${s.count / s.total * 100}%"></i></div>
    <p class="center wait">${s.done ? '✅ Guruhlar aniqlangan' : '⏳ Kutilmoqda — guruhlar hali aniqlanmagan'}</p>
    <div class="tablewrap"><table><tr><th>ID</th><th>Ism-familiya</th><th>Guruh</th></tr>
    ${s.participants.map(p => `<tr><td><b>${p.id}</b></td><td>${esc(p.name)}</td><td>${p.grp ? p.grp + '-guruh' : '—'}</td></tr>`).join('') || '<tr><td colspan="3" class="wait">Hali hech kim kirmagan</td></tr>'}</table></div>
    ${groups}<br><button class="danger" id="reset">🔄 YANGI RANDOM BOSHLASH</button>`;
  $('reset').onclick = async () => {
    if (!confirm('Barcha ishtirokchilar o‘chiriladi. Davom etasizmi?')) return;
    await fetch('/api/admin/reset', { method: 'POST', headers: { 'x-admin-password': pw() } });
    load();
  };
  clearInterval(timer); timer = setInterval(load, 4000);
}
pw() ? load() : login();
