// Demo-only mock backend. State is transient and may reset when the browser restarts the worker.
const store = { quantity: 2, note: '', revision: 0 };
const scope = new URL(self.registration.scope);
const prefix = `${scope.pathname}__redact/`;
const subscribers = new Map();
const encoder = new TextEncoder();
const contacts = [
  ['Juniper', 'Comet'], ['Clover', 'Sparrow'], ['Aster', 'Moon'],
  ['Maple', 'Finch'], ['Indigo', 'Wren'], ['Willow', 'Cloud'],
  ['Cedar', 'Vale'], ['Poppy', 'Starling'], ['Briar', 'River'],
  ['Sage', 'Hollow'],
];

self.addEventListener('install', (event) => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') void self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== scope.origin || !url.pathname.startsWith(prefix)) return;
  event.respondWith(handle(event.request, url, event.clientId));
});

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]);
}

function patch(html, target = 'redact-basket') {
  const lines = html.replaceAll('\r', '').split('\n');
  return [
    'event: datastar-patch-elements',
    `data: selector #${target}`,
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

function renderContacts(query) {
  const results = contacts.filter(([first, last]) => `${first} ${last}`.toLowerCase().includes(query));
  const rows = results.map(([first, last]) => `<tr><td>${escapeHtml(first)}</td><td>${escapeHtml(last)}</td></tr>`).join('');
  return `<div class="search-results" aria-live="polite">
    <p class="search-count">${results.length} ${results.length === 1 ? 'contact' : 'contacts'} found</p>
    ${results.length ? `<table><thead><tr><th scope="col">First name</th><th scope="col">Last name</th></tr></thead><tbody>${rows}</tbody></table>` : '<p class="search-empty">No matches. Try another name.</p>'}
  </div>`;
}

function sendTo(clientId, content) {
  const controller = subscribers.get(clientId);
  if (!controller) return;
  try { controller.enqueue(encoder.encode(content)); }
  catch { subscribers.delete(clientId); }
}

function broadcast(content) {
  for (const clientId of subscribers.keys()) sendTo(clientId, content);
}

function openPipe(clientId) {
  let streamController;
  const body = new ReadableStream({
    start(controller) {
      streamController = controller;
      try { subscribers.get(clientId)?.close(); } catch { /* Already closed. */ }
      subscribers.set(clientId, controller);
      controller.enqueue(encoder.encode(patch(render())));
    },
    cancel() {
      if (subscribers.get(clientId) === streamController) subscribers.delete(clientId);
    },
  });
  return eventStream(body);
}

async function handle(request, url, clientId) {
  const route = url.pathname.slice(prefix.length);
  if (route === 'search' && request.method === 'GET') {
    let input;
    let signals;
    try {
      input = JSON.parse(url.searchParams.get('redactionInput') || '{}');
      signals = JSON.parse(url.searchParams.get('datastar') || '{}');
    } catch { return new Response('Invalid search request', { status: 400 }); }
    if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).length !== 0 ||
        !signals || typeof signals !== 'object' || Array.isArray(signals)) {
      return new Response('Invalid search request', { status: 400 });
    }
    const value = signals?.contactSearch;
    if (value !== undefined && (typeof value !== 'string' || value.length > 80)) return new Response('Invalid search', { status: 400 });
    return eventStream(patch(renderContacts((value || '').trim().toLowerCase()), 'contact-results'));
  }
  if (route === 'state' && request.method === 'GET') return eventStream(patch(render()));
  if (route === 'stream' && request.method === 'GET') return openPipe(clientId);
  if (!['add', 'remove', 'save'].includes(route) || request.method !== 'POST') {
    return new Response('Not found', { status: 404 });
  }

  let input;
  try { input = JSON.parse(url.searchParams.get('redactionInput') || 'null'); }
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
      sendTo(clientId, patch(render('Please write a note up to 80 characters.')));
      return eventStream('');
    }
    store.note = note.trim();
    status = 'Your note was saved.';
  }
  store.revision++;
  broadcast(patch(render(status)));
  if (route === 'save') sendTo(clientId, patchSignals({ note: '' }));
  return eventStream('');
}

function eventStream(content) {
  return new Response(content, { headers: {
    'content-type': 'text/event-stream; charset=utf-8',
    'cache-control': 'no-cache, no-transform',
  } });
}
