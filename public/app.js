const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const KEY = 'rg_token';
let busy = false;

async function api(url, opts) {
  const r = await fetch(url, opts);
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(j.error || 'Xatolik'), { status: r.status });
  return j;
}

function progress(s) {
  return `<div class="bar"><i style="width:${s.count / s.total * 100}%"></i></div>
  <div class="center cnt">Talabalar: ${s.count} / ${s.total}</div>`;
}

function render(s, error) {
  $('sub').textContent = `${s.total} TALABA — ${s.groupCount} GURUH`;
  const err = error ? `<div class="err">${esc(error)}</div>` : '';
  let html = '';
  $('groups').innerHTML = '';
  if (s.me) {
    html = `<div class="center"><p class="idlabel">Sizning ID raqamingiz:</p><div class="bigid">${s.me.id}</div><div class="name">${esc(s.me.name)}</div></div>`;
    if (!s.done) html += progress(s) + `<p class="center wait">${s.total} ta talaba to‘lishi kutilmoqda...</p>`;
    else {
      html = `<div class="center"><h1 style="font-size:26px">🎉 GURUHLAR TAYYOR!</h1></div>`;
      $('groups').innerHTML = `<div class="mine">Sizning guruhingiz: <b>${s.me.group}-guruh</b> · ID ${s.me.id}</div>` +
        s.groups.map(g => `<div class="card grp"><h3>${g.no}-guruh · ${g.members.length} kishi</h3><ul>${g.members.map(m =>
          `<li class="${m.id === s.me.id ? 'me' : ''}"><span>ID ${m.id}</span>${esc(m.name)}</li>`).join('')}</ul></div>`).join('');
    }
  } else if (s.done) {
    html = err + `<div class="err">Joylar to‘ldi. Siz ushbu randomga qo‘shila olmaysiz.</div>`;
  } else {
    html = err + `<form id="f"><input id="name" placeholder="Ism Familiyangizni kiriting" autocomplete="name" maxlength="60" required>
      <button id="btn">🎯 RANDOMDA QATNASHISH</button></form>` + progress(s);
  }
  // formani qayta chizib yozilayotgan matnni o'chirib yubormaslik uchun
  const typing = document.activeElement && document.activeElement.id === 'name';
  if (!(typing && !s.me && !s.done && !error)) {
    const val = $('name') ? $('name').value : '';
    $('view').innerHTML = html;
    if ($('name')) $('name').value = val;
  } else {
    const bar = $('view').querySelector('.bar > i'); if (bar) bar.style.width = s.count / s.total * 100 + '%';
    const c = $('view').querySelector('.cnt'); if (c) c.textContent = `Talabalar: ${s.count} / ${s.total}`;
  }
  const f = $('f');
  if (f) f.onsubmit = join;
}

async function join(e) {
  e.preventDefault();
  if (busy) return; busy = true; $('btn').disabled = true;
  try {
    const r = await api('/api/join', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: $('name').value, token: localStorage.getItem(KEY) }) });
    localStorage.setItem(KEY, r.token);
    render(r);
  } catch (err) {
    const s = await api('/api/status').catch(() => null);
    if (s) render(s, err.message); else alert(err.message);
  }
  busy = false;
}

async function refresh() {
  try {
    const t = localStorage.getItem(KEY);
    const s = await api('/api/status' + (t ? '?token=' + encodeURIComponent(t) : ''));
    if (t && !s.me) localStorage.removeItem(KEY); // eski sessiya (admin reset qilgan)
    if (!busy) render(s);
  } catch (_) {}
}
refresh();
setInterval(refresh, 3000);
