// Demo-only mock backend. State is transient and may reset when the browser restarts the worker.
const store = { quantity: 2, note: '', revision: 0 };
const scope = new URL(self.registration.scope);
const prefix = `${scope.pathname}__redact/`;
const subscribers = new Map();
const loadProgress = new Map();
const scrollProgress = new Map();
const encoder = new TextEncoder();
const initialContact = { firstName: 'Juniper', lastName: 'Comet', role: 'Cartographer' };
let contact = { ...initialContact };
const reservedCodes = new Set(['MAPS-04', 'SKYB-09']);
const bulkEntries = [
  { id: 'note01', name: 'Field notes', active: false },
  { id: 'note02', name: 'Sketchbook', active: true },
  { id: 'note03', name: 'Seed catalog', active: false },
  { id: 'note04', name: 'Paper map', active: true },
];
const initialDeletableRows = [
  { id: 'card01', title: 'Copperleaf sketch', category: 'Drawing' },
  { id: 'card02', title: 'Quiet trail map', category: 'Map' },
  { id: 'card03', title: 'Garden log', category: 'Journal' },
  { id: 'card04', title: 'Cloud study', category: 'Drawing' },
];
let deletableRows = [...initialDeletableRows];
const regions = {
  ridge: { label: 'Amber Ridge', habitats: {
    lookout: ['Sunlit lookout', 'A bright shelf above the invented valley.'],
    meadow: ['High meadow', 'A quiet patch of grasses near the ridge.'],
  } },
  marsh: { label: 'Silver Marsh', habitats: {
    reeds: ['Reed beds', 'Tall stems line a shallow sample pool.'],
    island: ['Small island', 'A tiny dry landing among the reeds.'],
  } },
  grove: { label: 'Moss Grove', habitats: {
    clearing: ['Fern clearing', 'A soft open space between invented trees.'],
    canopy: ['Green canopy', 'A shaded path under broad leaves.'],
  } },
};
const contacts = [
  ['Juniper', 'Comet'], ['Clover', 'Sparrow'], ['Aster', 'Moon'],
  ['Maple', 'Finch'], ['Indigo', 'Wren'], ['Willow', 'Cloud'],
  ['Cedar', 'Vale'], ['Poppy', 'Starling'], ['Briar', 'River'],
  ['Sage', 'Hollow'],
];
const loadItems = [
  ['Field notes', 'Short observations from the garden.'],
  ['Sketchbook', 'A pocket-sized collection of shapes.'],
  ['Seed catalog', 'Ideas for the next planting season.'],
  ['Paper map', 'A route through the foothills.'],
  ['Weather log', 'Cloud patterns and quiet mornings.'],
  ['Recipe card', 'A simple supper with garden herbs.'],
  ['Postcard', 'A drawing of a bright little harbor.'],
  ['Trail guide', 'Turns, landmarks, and a scenic overlook.'],
  ['Color study', 'Shades collected from autumn leaves.'],
  ['Reading list', 'A few stories for a rainy afternoon.'],
  ['Plant journal', 'Notes on the first spring shoots.'],
  ['Star chart', 'An evening guide to the constellations.'],
];
const loadBatchSize = 4;

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

function patch(html, target = 'redact-basket', mode = 'inner') {
  const lines = html.replaceAll('\r', '').split('\n');
  return [
    'event: datastar-patch-elements',
    `data: selector #${target}`,
    `data: mode ${mode}`,
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

function renderLoadItems(page) {
  return loadItems.slice(page * loadBatchSize, (page + 1) * loadBatchSize)
    .map(([title, description], index) => `<article class="load-card">
      <span class="load-index">${String(page * loadBatchSize + index + 1).padStart(2, '0')}</span>
      <div><h3>${escapeHtml(title)}</h3><p>${escapeHtml(description)}</p></div>
    </article>`).join('');
}

function renderBulkEntries(message = 'Select entries, then choose an action.') {
  const rows = bulkEntries.map(({ id, name, active }) => `<tr>
    <td><input type="checkbox" aria-label="Select ${escapeHtml(name)}" data-bind:bulk-selection.${id} data-attr:disabled="$_bulkSaving"></td>
    <th scope="row">${escapeHtml(name)}</th><td><span class="bulk-badge ${active ? 'active' : 'inactive'}">${active ? 'Active' : 'Inactive'}</span></td>
  </tr>`).join('');
  return `<div class="bulk-table"><table><thead><tr><th scope="col">Select</th><th scope="col">Entry</th><th scope="col">Status</th></tr></thead><tbody>${rows}</tbody></table>
    <p class="bulk-message" role="status">${escapeHtml(message)}</p></div>`;
}

function renderProgress(value, label) {
  return `<div class="progress-card">
    <div class="progress-head"><span>Sample archive</span><strong>${value}%</strong></div>
    <progress max="100" value="${value}" aria-label="Sample archive progress">${value}%</progress>
    <p class="progress-caption">${escapeHtml(label)}</p>
    ${value === 100 ? '<p class="progress-finished">Archive ready. This was a simulated job.</p>' : ''}
  </div>`;
}

const tabPanels = {
  overview: {
    label: 'Overview', title: 'The small field guide',
    description: 'A pocket-sized tour of an invented landscape. Pick a section to ask the server for its panel.',
    items: ['Three short sections', 'Invented sample observations', 'One shared HTML host'],
  },
  specimens: {
    label: 'Specimens', title: 'Collected in the garden',
    description: 'A few imaginary finds from the sample archive, rendered only when this tab is requested.',
    items: ['Copperleaf fern', 'Glasswing beetle', 'Cloudberry moss'],
  },
  notes: {
    label: 'Notes', title: 'Notes from the path',
    description: 'The server prepares this panel on demand and sends the active-tab signal with its HTML.',
    items: ['Morning light along the ridge', 'A quiet bend in the trail', 'A sketch for the next visit'],
  },
};

function renderTab(tab) {
  const { label, title, description, items } = tabPanels[tab];
  return `<article class="tabs-content">
    <span class="tabs-kicker">${escapeHtml(label)} / SERVER VIEW</span>
    <h3>${escapeHtml(title)}</h3><p>${escapeHtml(description)}</p>
    <ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
  </article>`;
}

function renderDeletableRows(message = 'Choose a row to remove.') {
  const rows = deletableRows.map(({ id, title, category }) => {
    const url = `${scope.pathname}__redact/rows/delete?redactionInput=${encodeURIComponent(JSON.stringify({ id }))}`;
    return `<tr><th scope="row">${escapeHtml(title)}</th><td>${escapeHtml(category)}</td>
      <td><button type="button" data-on:click="${escapeHtml(`@delete(${JSON.stringify(url)})`)}" aria-label="Delete ${escapeHtml(title)}">Delete</button></td></tr>`;
  }).join('');
  return `<div class="delete-table">
    ${deletableRows.length ? `<table><thead><tr><th scope="col">Entry</th><th scope="col">Kind</th><th scope="col">Action</th></tr></thead><tbody>${rows}</tbody></table>` : '<p class="delete-empty">The archive is empty. Restore the sample rows to try again.</p>'}
    <p class="delete-message" role="status">${escapeHtml(message)}</p>
  </div>`;
}

function handleDeleteRows(request, url, route) {
  const expected = route === 'rows' ? 'GET' : route === 'rows/reset' ? 'POST' : 'DELETE';
  if (request.method !== expected) return new Response('Not found', { status: 404 });
  let input;
  try { input = JSON.parse(url.searchParams.get('redactionInput') || (route === 'rows' ? '{}' : 'null')); }
  catch { return new Response('Invalid row request', { status: 400 }); }
  if (!input || typeof input !== 'object' || Array.isArray(input)) return new Response('Invalid row request', { status: 400 });
  if (route === 'rows') {
    if (Object.keys(input).length) return new Response('Invalid row request', { status: 400 });
    return eventStream(patch(renderDeletableRows(), 'delete-rows'));
  }
  if (route === 'rows/reset') {
    if (Object.keys(input).length) return new Response('Invalid row request', { status: 400 });
    deletableRows = [...initialDeletableRows];
    return eventStream(patch(renderDeletableRows('Sample rows restored.'), 'delete-rows'));
  }
  if (Object.keys(input).length !== 1 || typeof input.id !== 'string' ||
      !initialDeletableRows.some((row) => row.id === input.id)) return new Response('Invalid row ID', { status: 400 });
  if (!deletableRows.some((row) => row.id === input.id)) return new Response('Row already removed', { status: 409 });
  deletableRows = deletableRows.filter((row) => row.id !== input.id);
  return eventStream(patch(renderDeletableRows('Row removed from the sample archive.'), 'delete-rows'));
}

function handleHabitats(request, url, route) {
  if (request.method !== 'GET') return new Response('Not found', { status: 404 });
  let input;
  let signals;
  try {
    input = JSON.parse(url.searchParams.get('redactionInput') || 'null');
    signals = JSON.parse(url.searchParams.get('datastar') || 'null');
  } catch { return new Response('Invalid habitat request', { status: 400 }); }
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).length ||
      !signals || typeof signals !== 'object' || Array.isArray(signals) ||
      typeof signals.region !== 'string' || signals.region.length > 16) {
    return new Response('Invalid habitat request', { status: 400 });
  }
  const region = regions[signals.region];
  if (route === 'habitats/options') {
    if (signals.region && !Object.hasOwn(regions, signals.region)) return new Response('Unknown region', { status: 400 });
    const select = region ? `<label for="habitat-choice">Habitat</label>
      <select id="habitat-choice" name="habitat" data-bind:habitat data-on:change="${escapeHtml(`@get(${JSON.stringify(`${scope.pathname}__redact/habitats/describe?redactionInput=%7B%7D`)})`)}">
        <option value="">Choose a habitat…</option>
        ${Object.entries(region.habitats).map(([id, [name]]) => `<option value="${escapeHtml(id)}">${escapeHtml(name)}</option>`).join('')}
      </select>` : '<p>Choose a region to load its habitats.</p>';
    return eventStream(patchSignals({ habitat: '' }) + patch(select, 'habitat-options') +
      patch('<p>Choose a habitat to see its field note.</p>', 'habitat-description'));
  }
  if (!region || !Object.hasOwn(regions, signals.region) ||
      typeof signals.habitat !== 'string' || !Object.hasOwn(region.habitats, signals.habitat)) {
    return new Response('Invalid region and habitat pair', { status: 400 });
  }
  const [name, note] = region.habitats[signals.habitat];
  return eventStream(patch(`<article class="habitat-note"><span>${escapeHtml(region.label)} / FIELD NOTE</span>
    <h3>${escapeHtml(name)}</h3><p>${escapeHtml(note)}</p></article>`, 'habitat-description'));
}

async function handleUpload(request, url) {
  if (request.method !== 'POST') return new Response('Not found', { status: 404 });
  let input;
  try { input = JSON.parse(url.searchParams.get('redactionInput') || 'null'); }
  catch { return new Response('Invalid upload action', { status: 400 }); }
  if (!input || typeof input !== 'object' || Array.isArray(input) ||
      Object.keys(input).length !== 1 || input.kind !== 'field-note') {
    return new Response('Invalid upload action', { status: 400 });
  }
  if (!request.headers.get('content-type')?.startsWith('multipart/form-data;')) {
    return new Response('Expected multipart form data', { status: 400 });
  }
  let form;
  try { form = await request.formData(); }
  catch { return new Response('Invalid form data', { status: 400 }); }
  const file = form.get('fieldNote');
  let message;
  let success = false;
  if ([...form.keys()].some((key) => key !== 'fieldNote') || form.getAll('fieldNote').length !== 1 ||
      !(file instanceof File) || file.size === 0 || file.size > 4096 ||
      file.name.length > 100 || !file.name.toLowerCase().endsWith('.txt') ||
      !['', 'text/plain'].includes(file.type)) {
    message = 'Choose a nonempty .txt file up to 4 KB.';
  } else {
    const content = await file.text();
    if (!content.trim() || content.includes('\0') || content.includes('\uFFFD')) {
      message = 'The file must contain readable text.';
    } else {
      const lines = content.trimEnd().split(/\r\n|\n|\r/).length;
      message = `Text file checked locally: ${lines} ${lines === 1 ? 'line' : 'lines'}, ${file.size} bytes. Nothing was stored.`;
      success = true;
    }
  }
  return eventStream(patch(`<p class="upload-feedback ${success ? 'success' : 'error'}" role="status">${escapeHtml(message)}</p>`, 'upload-result'));
}

function handleTabs(request, url, route) {
  if (request.method !== 'GET') return new Response('Not found', { status: 404 });
  let tab = 'overview';
  if (route === 'tabs/show') {
    let input;
    try { input = JSON.parse(url.searchParams.get('redactionInput') || 'null'); }
    catch { return new Response('Invalid tab', { status: 400 }); }
    if (!input || typeof input !== 'object' || Array.isArray(input) ||
        Object.keys(input).length !== 1 || !Object.hasOwn(tabPanels, input.tab)) {
      return new Response('Invalid tab', { status: 400 });
    }
    tab = input.tab;
  } else if (url.searchParams.has('redactionInput')) {
    return new Response('Invalid tab', { status: 400 });
  }
  return eventStream(patchSignals({ activeTab: tab }) + patch(renderTab(tab), 'tabs-panel'));
}

async function handleProgress(request, url) {
  if (request.method !== 'POST') return new Response('Not found', { status: 404 });
  let input;
  let signals;
  try {
    input = JSON.parse(url.searchParams.get('redactionInput') || 'null');
    signals = await request.json();
  } catch { return new Response('Invalid job request', { status: 400 }); }
  if (!input || typeof input !== 'object' || Array.isArray(input) ||
      Object.keys(input).length !== 1 || input.archive !== 'sample' ||
      !signals || typeof signals !== 'object' || Array.isArray(signals) || Object.keys(signals).length) {
    return new Response('Invalid job request', { status: 400 });
  }

  const stages = [
    [20, 'Collecting sample entries…'],
    [40, 'Checking the index…'],
    [60, 'Organizing the pages…'],
    [80, 'Preparing the summary…'],
    [100, 'Processing complete.'],
  ];
  let timer;
  const body = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(patch(renderProgress(0, 'Starting the sample job…'), 'progress-result')));
      let step = 0;
      timer = setInterval(() => {
        const [value, label] = stages[step++];
        controller.enqueue(encoder.encode(patch(renderProgress(value, label), 'progress-result')));
        if (step === stages.length) {
          clearInterval(timer);
          controller.close();
        }
      }, 450);
    },
    cancel() { clearInterval(timer); },
  });
  return eventStream(body);
}

async function handleBulk(request, url, route) {
  if (route === 'bulk' ? request.method !== 'GET' : request.method !== 'PUT') {
    return new Response('Not found', { status: 404 });
  }
  let input;
  try { input = JSON.parse(url.searchParams.get('redactionInput') || (route === 'bulk' ? '{}' : 'null')); }
  catch { return new Response('Invalid action input', { status: 400 }); }
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).length) {
    return new Response('Invalid action input', { status: 400 });
  }
  if (route === 'bulk') return eventStream(patch(renderBulkEntries(), 'bulk-entries'));
  if (route !== 'bulk/activate' && route !== 'bulk/deactivate') return new Response('Not found', { status: 404 });

  let signals;
  try { signals = await request.json(); }
  catch { return new Response('Invalid selection', { status: 400 }); }
  const selection = signals?.bulkSelection;
  if (!signals || typeof signals !== 'object' || Array.isArray(signals) ||
      !selection || typeof selection !== 'object' || Array.isArray(selection) ||
      Object.keys(selection).length !== bulkEntries.length ||
      bulkEntries.some(({ id }) => typeof selection[id] !== 'boolean') ||
      Object.keys(selection).some((id) => !bulkEntries.some((entry) => entry.id === id))) {
    return new Response('Invalid selection', { status: 400 });
  }
  const selected = bulkEntries.filter(({ id }) => selection[id]);
  if (!selected.length) return new Response('Select at least one entry', { status: 400 });
  const active = route === 'bulk/activate';
  for (const entry of selected) entry.active = active;
  const reset = Object.fromEntries(bulkEntries.map(({ id }) => [id, false]));
  return eventStream(patch(renderBulkEntries(`${selected.length} ${selected.length === 1 ? 'entry' : 'entries'} ${active ? 'activated' : 'deactivated'}.`), 'bulk-entries') +
    patchSignals({ bulkSelection: reset }));
}

function handlePages(request, url, route, clientId, kind) {
  const scrolling = kind === 'scroll';
  const progress = scrolling ? scrollProgress : loadProgress;
  const target = scrolling ? 'scroll-items' : 'load-items';
  const pageSignal = scrolling ? 'scrollPage' : 'loadPage';
  const hasMoreSignal = scrolling ? 'scrollHasMore' : 'loadHasMore';
  if (request.method !== 'GET') return new Response('Not found', { status: 404 });
  let input;
  let signals;
  try {
    input = JSON.parse(url.searchParams.get('redactionInput') || '{}');
    signals = JSON.parse(url.searchParams.get('datastar') || '{}');
  } catch { return new Response('Invalid load request', { status: 400 }); }
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).length ||
      !signals || typeof signals !== 'object' || Array.isArray(signals)) {
    return new Response('Invalid load request', { status: 400 });
  }

  if (route === kind) {
    progress.set(clientId, 1);
    return eventStream(patch(renderLoadItems(0), target) + patchSignals({
      [pageSignal]: 1, [hasMoreSignal]: true, ...(scrolling ? { scrollReady: true } : {}),
    }));
  }
  const page = signals[pageSignal];
  if (!Number.isInteger(page) || page < 1 || page >= Math.ceil(loadItems.length / loadBatchSize)) {
    return new Response('Invalid page', { status: 400 });
  }
  if (progress.get(clientId) !== page) return new Response('Page out of sequence', { status: 409 });
  progress.set(clientId, page + 1);
  return eventStream(patch(renderLoadItems(page), target, 'append') +
    patchSignals({ [pageSignal]: page + 1, [hasMoreSignal]: (page + 1) * loadBatchSize < loadItems.length }));
}

async function handleCatalog(request, url) {
  if (request.method !== 'QUERY' && request.method !== 'POST') return new Response('Not found', { status: 404 });
  let input;
  let signals;
  try {
    input = JSON.parse(url.searchParams.get('redactionInput') || 'null');
    signals = await request.json();
  } catch { return new Response('Invalid validation request', { status: 400 }); }
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).length ||
      !signals || typeof signals !== 'object' || Array.isArray(signals) ||
      typeof signals.catalogCode !== 'string' || signals.catalogCode.length > 16) {
    return new Response('Invalid validation request', { status: 400 });
  }

  const code = signals.catalogCode.trim().toUpperCase();
  let kind;
  let message;
  if (!code) {
    kind = 'neutral';
    message = 'Enter a catalog code to check it.';
  } else if (!/^[A-Z]{4}-[0-9]{2}$/.test(code)) {
    kind = 'error';
    message = 'Use four letters, a hyphen, and two digits (for example, FERN-27).';
  } else if (reservedCodes.has(code)) {
    kind = 'error';
    message = `${code} is already reserved. Try another code.`;
  } else if (request.method === 'POST') {
    reservedCodes.add(code);
    kind = 'success';
    message = `${code} was reserved in this demo.`;
  } else {
    kind = 'success';
    message = `${code} is available.`;
  }
  const html = `<p class="validation-message ${kind}" role="status">${escapeHtml(message)}</p>`;
  return eventStream(patchSignals({ catalogInvalid: kind === 'error' }) + patch(html, 'catalog-feedback'));
}

function contactSignals(editing) {
  return {
    contactEditing: editing,
    contactFirstName: contact.firstName,
    contactLastName: contact.lastName,
    contactRole: contact.role,
  };
}

function contactView() {
  return `<div class="editor-view"><dl>
    <dt>First name</dt><dd>${escapeHtml(contact.firstName)}</dd>
    <dt>Last name</dt><dd>${escapeHtml(contact.lastName)}</dd>
    <dt>Role</dt><dd>${escapeHtml(contact.role)}</dd>
  </dl></div>`;
}

function contactEditor(values = contact, error = '') {
  return `<div class="editor-fields">
    <label>First name<input type="text" name="firstName" data-bind:contact-first-name value="${escapeHtml(values.firstName)}" maxlength="40" autocomplete="off"></label>
    <label>Last name<input type="text" name="lastName" data-bind:contact-last-name value="${escapeHtml(values.lastName)}" maxlength="40" autocomplete="off"></label>
    <label>Role<input type="text" name="role" data-bind:contact-role value="${escapeHtml(values.role)}" maxlength="60" autocomplete="off"></label>
    ${error ? `<p class="editor-error" role="alert">${escapeHtml(error)}</p>` : ''}
  </div>`;
}

function contactResponse(html, editing, signals = contactSignals(editing)) {
  return eventStream(patchSignals(signals) + patch(html, 'contact-detail'));
}

async function handleContact(request, url, route) {
  let input;
  try { input = JSON.parse(url.searchParams.get('redactionInput') || '{}'); }
  catch { return new Response('Invalid action input', { status: 400 }); }
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).length) {
    return new Response('Invalid action input', { status: 400 });
  }

  if (route === 'contact' && request.method === 'GET') return contactResponse(contactView(), false);
  if (route === 'contact/edit' && request.method === 'GET') return contactResponse(contactEditor(), true);
  if (route === 'contact/reset' && request.method === 'PATCH') {
    contact = { ...initialContact };
    return contactResponse(contactView(), false);
  }
  if (route === 'contact' && request.method === 'PUT') {
    let signals;
    try { signals = await request.json(); }
    catch { return new Response('Invalid signals', { status: 400 }); }
    if (!signals || typeof signals !== 'object' || Array.isArray(signals)) return new Response('Invalid signals', { status: 400 });
    const values = {
      firstName: signals.contactFirstName,
      lastName: signals.contactLastName,
      role: signals.contactRole,
    };
    if (typeof values.firstName !== 'string' || typeof values.lastName !== 'string' || typeof values.role !== 'string' ||
        values.firstName.length > 40 || values.lastName.length > 40 || values.role.length > 60) {
      return new Response('Invalid contact', { status: 400 });
    }
    const trimmed = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value.trim()]));
    if (Object.values(trimmed).some((value) => !value)) {
      return contactResponse(contactEditor(values, 'All three fields are required.'), true, {
        contactEditing: true,
        contactFirstName: values.firstName,
        contactLastName: values.lastName,
        contactRole: values.role,
      });
    }
    contact = trimmed;
    return contactResponse(contactView(), false);
  }
  return new Response('Not found', { status: 404 });
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
  if (route === 'upload/check') return handleUpload(request, url);
  if (route === 'habitats/options' || route === 'habitats/describe') return handleHabitats(request, url, route);
  if (route === 'rows' || route === 'rows/reset' || route === 'rows/delete') return handleDeleteRows(request, url, route);
  if (route === 'tabs' || route === 'tabs/show') return handleTabs(request, url, route);
  if (route === 'progress/run') return handleProgress(request, url);
  if (route === 'bulk' || route === 'bulk/activate' || route === 'bulk/deactivate') return handleBulk(request, url, route);
  if (route === 'catalog/check') return handleCatalog(request, url);
  if (route === 'scroll' || route === 'scroll/more') return handlePages(request, url, route, clientId, 'scroll');
  if (route === 'load' || route === 'load/more') return handlePages(request, url, route, clientId, 'load');
  if (route === 'contact' || route === 'contact/edit' || route === 'contact/reset') {
    return handleContact(request, url, route);
  }
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
