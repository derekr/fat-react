// Demo-only mock backend. State is transient and may reset when the browser restarts the worker.
const store = { quantity: 2, note: '', revision: 0 };
const scope = new URL(self.registration.scope);
const prefix = `${scope.pathname}__fat/`;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== scope.origin || !url.pathname.startsWith(prefix)) return;
  event.respondWith(handle(event.request, url));
});

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]);
}

function patch(html) {
  const lines = html.replaceAll('\r', '').split('\n');
  return [
    'event: datastar-patch-elements',
    'data: selector #fat-basket',
    'data: mode inner',
    ...lines.map((line) => `data: elements ${line}`),
    '', '',
  ].join('\n');
}

function patchSignals(signals) {
  return `event: datastar-patch-signals\ndata: signals ${JSON.stringify(signals)}\n\n`;
}

function render(status = '') {
  const count = store.quantity;
  return `<div class="basket-card">
    <div class="basket-top"><div class="fruit" aria-hidden="true">🍑</div><div class="basket-tag">FRESH FROM THE SERVER</div></div>
    <div class="basket-main"><div><span class="basket-caption">Peaches in your basket</span><div class="basket-number" data-count="${count}">${count.toString().padStart(2, '0')}</div></div><span class="basket-unit">× PEACHES</span></div>
    <div class="basket-rule"></div>
    <div class="basket-note"><span>YOUR NOTE</span><p>${store.note ? escapeHtml(store.note) : '<em>Nothing written yet.</em>'}</p></div>
    <div class="basket-bottom"><span>${status ? escapeHtml(status) : 'Ready for your next action.'}</span><span>REV ${String(store.revision).padStart(2, '0')}</span></div>
  </div>`;
}

async function handle(request, url) {
  const route = url.pathname.slice(prefix.length);
  if (route === 'state' && request.method === 'GET') return eventStream(patch(render()));
  if (!['add', 'remove', 'save'].includes(route) || request.method !== 'POST') {
    return new Response('Not found', { status: 404 });
  }

  let input;
  try { input = JSON.parse(url.searchParams.get('fatInput') || 'null'); }
  catch { return new Response('Invalid input', { status: 400 }); }
  if (!input || typeof input !== 'object') return new Response('Invalid input', { status: 400 });

  let status;
  if (route === 'add' || route === 'remove') {
    if (input.item !== 'peach') return new Response('Invalid item', { status: 400 });
    store.quantity = Math.max(0, store.quantity + (route === 'add' ? 1 : -1));
    status = route === 'add' ? 'A peach was added.' : 'Basket updated.';
  } else {
    if (input.section !== 'note') return new Response('Invalid section', { status: 400 });
    let signals;
    try { signals = await request.json(); }
    catch { return new Response('Invalid signals', { status: 400 }); }
    const note = signals?.note;
    if (typeof note !== 'string' || !note.trim() || note.length > 80) {
      return eventStream(patch(render('Please write a note up to 80 characters.')));
    }
    store.note = note.trim();
    status = 'Your note was saved.';
  }
  store.revision++;
  return eventStream(patch(render(status)) + (route === 'save' ? patchSignals({ note: '' }) : ''));
}

function eventStream(content) {
  return new Response(content, { headers: {
    'content-type': 'text/event-stream; charset=utf-8',
    'cache-control': 'no-cache, no-transform',
  } });
}
