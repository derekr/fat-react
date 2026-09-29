// Demo-only mock backend. State is transient and may reset when the browser restarts the worker.
const store = { quantity: 2, note: '', revision: 0 };
const scope = new URL(self.registration.scope);
const prefix = `${scope.pathname}__redact/`;
const subscribers = new Map();
const liveSubscribers = new Map();
const liveRecord = { message: 'The sample field note is ready.', revision: 1 };
const loadProgress = new Map();
const scrollProgress = new Map();
const wizardProgress = new Map();
const contextCards = {
  fern: { title: 'Copperleaf fern', collection: 'Field journal' },
  map: { title: 'Pocket trail map', collection: 'Map drawer' },
  sky: { title: 'Evening sky notes', collection: 'Field journal' },
};
const contextCollections = ['Field journal', 'Map drawer', 'Sketch shelf'];
const contextPinned = new Set();
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
const modalRecords = {
  fern: { name: 'Copperleaf fern', kind: 'Botanical sketch', note: 'A fictional study of curled copper-colored fronds.' },
  map: { name: 'Paper trail map', kind: 'Route note', note: 'An invented route past a hillside and a quiet stream.' },
  star: { name: 'Evening star chart', kind: 'Observation', note: 'A sample drawing of constellations over the valley.' },
};
const sortableCards = [
  { id: 'leaf', title: 'Leaf study', description: 'An imagined botanical drawing.' },
  { id: 'map', title: 'Pocket map', description: 'A small route through the foothills.' },
  { id: 'sky', title: 'Sky notes', description: 'Fictional observations after dusk.' },
  { id: 'stone', title: 'Stone shapes', description: 'A collection of smooth silhouettes.' },
];
let cardOrder = sortableCards.map(({ id }) => id);
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

function contextCommand(id, generation, operation, collection) {
  const input = { id, generation, operation, ...(collection ? { collection } : {}) };
  const url = `${scope.pathname}__redact/context/command?redactionInput=${encodeURIComponent(JSON.stringify(input))}`;
  return escapeHtml(`@post(${JSON.stringify(url)})`);
}

async function handleContext(request, url, route) {
  const command = route === 'context/command';
  if (request.method !== (command ? 'POST' : 'GET')) return new Response('Not found', { status: 404 });
  let input;
  try { input = JSON.parse(url.searchParams.get('redactionInput') || 'null'); }
  catch { return new Response('Invalid menu request', { status: 400 }); }
  if (!input || typeof input !== 'object' || Array.isArray(input) ||
      typeof input.id !== 'string' || !Object.hasOwn(contextCards, input.id) ||
      !Number.isSafeInteger(input.generation) || input.generation < 1 || input.generation > 999999 ||
      Object.keys(input).length !== (command ? (input.operation === 'move' ? 4 : 3) : 2)) {
    return new Response('Invalid menu request', { status: 400 });
  }
  const card = contextCards[input.id];
  if (command) {
    if (input.operation === 'pin' || input.operation === 'unpin') {
      if ((input.operation === 'pin') === contextPinned.has(input.id)) return new Response('Outdated action', { status: 409 });
      if (input.operation === 'pin') contextPinned.add(input.id);
      else contextPinned.delete(input.id);
    } else if (input.operation === 'move' && typeof input.collection === 'string' &&
               contextCollections.includes(input.collection) && input.collection !== card.collection) {
      card.collection = input.collection;
    } else return new Response('Invalid menu action', { status: 400 });
    const message = input.operation === 'move' ? `${card.title} moved to ${card.collection}.` :
      `${card.title} ${input.operation === 'pin' ? 'pinned' : 'unpinned'}.`;
    return eventStream(patch(`<p class="context-feedback" role="status">${escapeHtml(message)}</p>`, 'context-result'));
  }
  await new Promise((resolve) => setTimeout(resolve, route === 'context/collections' ? 650 : 500));
  if (route === 'context/items') {
    const operation = contextPinned.has(input.id) ? 'unpin' : 'pin';
    return eventStream(patch(`<button type="button" role="menuitem" class="context-row" data-context-command="" data-on:click="${contextCommand(input.id, input.generation, operation)}">${operation === 'pin' ? 'Pin' : 'Unpin'} ${escapeHtml(card.title)}</button>`,
      `context-items-${input.generation}`));
  }
  if (route === 'context/collections') {
    const choices = contextCollections.filter((collection) => collection !== card.collection).map((collection) =>
      `<button type="button" role="menuitem" class="context-row" data-context-command="" data-on:click="${contextCommand(input.id, input.generation, 'move', collection)}">${escapeHtml(collection)}</button>`).join('');
    return eventStream(patch(choices, `context-collections-${input.generation}`));
  }
  return new Response('Not found', { status: 404 });
}

function wizardAction(route, input) {
  const url = `${scope.pathname}__redact/wizard/${route}?redactionInput=${encodeURIComponent(JSON.stringify(input))}`;
  return escapeHtml(`@post(${JSON.stringify(url)}, {filterSignals: {include: /^wizard(Title|Category|Description)$/}})`);
}

function renderWizard(state, error = '', draft = state) {
  if (state.step === 'done') return `<div class="wizard-done" role="status"><span>FIELD CARD SAVED</span>
    <h3>${escapeHtml(state.title)}</h3><p>Added as a sample ${escapeHtml(state.category)}.</p>
    <p>${escapeHtml(state.description)}</p><small>This demo keeps the card only in the service worker.</small></div>`;
  const stages = { entry: 1, details: 2, review: 3 };
  const header = `<div class="wizard-progress"><span>STEP ${stages[state.step]} OF 3</span><progress value="${stages[state.step]}" max="3" aria-label="Form progress"></progress></div>`;
  const feedback = error ? `<p class="wizard-error" role="alert">${escapeHtml(error)}</p>` : '';
  if (state.step === 'entry') return `${header}<form class="wizard-form" data-on:submit__prevent="${wizardAction('next', { from: 'entry' })}">
    <h3>Name your field card.</h3><label for="wizard-title">Card title</label>
    <input id="wizard-title" name="title" data-bind:wizard-title maxlength="50" value="${escapeHtml(draft.title)}" placeholder="e.g. Painted fern" autocomplete="off">
    <p class="wizard-hint">Use 2–50 characters. The server checks this before advancing.</p>${feedback}
    <button type="submit">Continue →</button></form>`;
  if (state.step === 'details') return `${header}<form class="wizard-form" data-on:submit__prevent="${wizardAction('next', { from: 'details' })}">
    <h3>Add a little context.</h3><label for="wizard-category">Category</label>
    <select id="wizard-category" name="category" data-bind:wizard-category>
      <option value="">Choose a category…</option>
      ${['Drawing', 'Map', 'Journal'].map((category) => `<option value="${category.toLowerCase()}"${draft.category === category.toLowerCase() ? ' selected' : ''}>${category}</option>`).join('')}
    </select><label for="wizard-description">Short description</label>
    <textarea id="wizard-description" name="description" data-bind:wizard-description maxlength="120" rows="3" placeholder="A made-up observation from the field…">${escapeHtml(draft.description)}</textarea>
    <p class="wizard-hint">Choose a category and write 4–120 characters.</p>${feedback}
    <div class="wizard-actions"><button type="button" class="secondary" data-on:click="${wizardAction('back', { from: 'details' })}">← Back</button><button type="submit">Review →</button></div></form>`;
  return `${header}<div class="wizard-form"><h3>Review your card.</h3><dl class="wizard-review">
    <dt>Title</dt><dd>${escapeHtml(state.title)}</dd><dt>Category</dt><dd>${escapeHtml(state.category)}</dd>
    <dt>Description</dt><dd>${escapeHtml(state.description)}</dd></dl>
    <div class="wizard-actions"><button type="button" class="secondary" data-on:click="${wizardAction('back', { from: 'review' })}">← Back</button>
    <button type="button" data-on:click="${wizardAction('finish', { from: 'review' })}">Save sample card</button></div></div>`;
}

function wizardResponse(state, error = '', draft = state) {
  return eventStream(patchSignals({ wizardTitle: draft.title, wizardCategory: draft.category,
    wizardDescription: draft.description }) + patch(renderWizard(state, error, draft), 'wizard-panel'));
}

async function handleWizard(request, url, route, clientId) {
  const initial = route === 'wizard';
  if (request.method !== (initial ? 'GET' : 'POST')) return new Response('Not found', { status: 404 });
  let input;
  try { input = JSON.parse(url.searchParams.get('redactionInput') || (initial ? '{}' : 'null')); }
  catch { return new Response('Invalid step', { status: 400 }); }
  if (!input || typeof input !== 'object' || Array.isArray(input) ||
      Object.keys(input).length !== (initial || route === 'wizard/reset' ? 0 : 1)) {
    return new Response('Invalid step', { status: 400 });
  }
  if (initial || route === 'wizard/reset') {
    const state = { step: 'entry', title: '', category: '', description: '' };
    wizardProgress.set(clientId, state);
    return wizardResponse(state);
  }
  const state = wizardProgress.get(clientId);
  if (!state || input.from !== state.step || !['wizard/next', 'wizard/back', 'wizard/finish'].includes(route)) {
    return new Response('Step out of sequence', { status: 409 });
  }
  if (route === 'wizard/back') {
    if (state.step === 'details') state.step = 'entry';
    else if (state.step === 'review') state.step = 'details';
    else return new Response('Step out of sequence', { status: 409 });
    return wizardResponse(state);
  }
  if (route === 'wizard/finish') {
    if (state.step !== 'review') return new Response('Step out of sequence', { status: 409 });
    state.step = 'done';
    return wizardResponse(state);
  }
  if (state.step !== 'entry' && state.step !== 'details') return new Response('Step out of sequence', { status: 409 });
  let signals;
  try { signals = await request.json(); }
  catch { return new Response('Invalid fields', { status: 400 }); }
  if (!signals || typeof signals !== 'object' || Array.isArray(signals)) return new Response('Invalid fields', { status: 400 });
  if (state.step === 'entry') {
    if (typeof signals.wizardTitle !== 'string' || signals.wizardTitle.length > 50) return new Response('Invalid title', { status: 400 });
    const title = signals.wizardTitle.trim();
    if (title.length < 2) return wizardResponse(state, 'Use at least two characters for the title.',
      { ...state, title: signals.wizardTitle });
    state.title = title;
    state.step = 'details';
  } else {
    if (typeof signals.wizardCategory !== 'string' || typeof signals.wizardDescription !== 'string' ||
        signals.wizardCategory.length > 20 || signals.wizardDescription.length > 120) {
      return new Response('Invalid details', { status: 400 });
    }
    const description = signals.wizardDescription.trim();
    if (!['drawing', 'map', 'journal'].includes(signals.wizardCategory) || description.length < 4) {
      return wizardResponse(state, 'Choose a category and write at least four characters.',
        { ...state, category: signals.wizardCategory, description: signals.wizardDescription });
    }
    state.category = signals.wizardCategory;
    state.description = description;
    state.step = 'review';
  }
  return wizardResponse(state);
}

const feedEvents = [
  ['Sketch received', 'A copperleaf fern drawing joined the sample archive.'],
  ['Route checked', 'The little foothill map was reviewed.'],
  ['Note filed', 'A made-up observation was added to the journal.'],
  ['Index refreshed', 'The sample catalog is ready to browse.'],
];

function renderFeedEvent(index) {
  const [title, detail] = feedEvents[index];
  return `<article class="feed-entry"><span class="feed-index">${String(index + 1).padStart(2, '0')}</span>
    <div><h3>${escapeHtml(title)}</h3><p>${escapeHtml(detail)}</p></div></article>`;
}

function handleFeed(request, url) {
  if (request.method !== 'GET') return new Response('Not found', { status: 404 });
  let input;
  try { input = JSON.parse(url.searchParams.get('redactionInput') || '{}'); }
  catch { return new Response('Invalid feed request', { status: 400 }); }
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).length) {
    return new Response('Invalid feed request', { status: 400 });
  }
  let timer;
  const body = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(patch('<p class="feed-start">Listening for sample activity…</p>', 'feed-items') +
        patchSignals({ _feedRunning: true })));
      let index = 0;
      timer = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(patch(renderFeedEvent(index), 'feed-items', index === 0 ? 'inner' : 'append')));
          index++;
          if (index === feedEvents.length) {
            clearInterval(timer);
            controller.enqueue(encoder.encode(patchSignals({ _feedRunning: false }) +
              patch('<p class="feed-end">All sample events delivered. Replay to watch again.</p>', 'feed-items', 'append')));
            controller.close();
          }
        } catch { clearInterval(timer); }
      }, 950);
    },
    cancel() { clearInterval(timer); },
  });
  return eventStream(body);
}

async function handleModalDetails(request, url) {
  if (request.method !== 'GET') return new Response('Not found', { status: 404 });
  let input;
  try { input = JSON.parse(url.searchParams.get('redactionInput') || 'null'); }
  catch { return new Response('Invalid detail request', { status: 400 }); }
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).length !== 1 ||
      typeof input.id !== 'string' || !Object.hasOwn(modalRecords, input.id)) {
    return new Response('Invalid detail request', { status: 400 });
  }
  const record = modalRecords[input.id];
  await new Promise((resolve) => setTimeout(resolve, 800));
  return eventStream(patch(`<article class="modal-record"><span>${escapeHtml(record.kind)}</span>
    <h3>${escapeHtml(record.name)}</h3><p>${escapeHtml(record.note)}</p></article>`, 'modal-content'));
}

function sortExpression(id, direction) {
  const url = `${scope.pathname}__redact/sort/move?redactionInput=${encodeURIComponent(JSON.stringify({ id, direction }))}`;
  return `@post(${JSON.stringify(url)})`;
}

function renderSortableCards(message = 'Drag a card or use its arrow buttons.') {
  const cards = cardOrder.map((id, index) => {
    const card = sortableCards.find((item) => item.id === id);
    return `<li class="sort-card" draggable="true" data-on:dragstart="${escapeHtml(`$draggedCard = ${JSON.stringify(id)}; evt.dataTransfer.setData('text/plain', ${JSON.stringify(id)})`)}"
      data-on:dragover="evt.preventDefault()" data-on:drop="${escapeHtml(`evt.preventDefault(); ${sortExpression(id, 'drop')}`)}"
      data-on:dragend="$draggedCard = ''" aria-describedby="sort-instructions">
      <span class="sort-grip" aria-hidden="true">⠿</span><span class="sort-number">${String(index + 1).padStart(2, '0')}</span>
      <span class="sort-copy"><strong>${escapeHtml(card.title)}</strong><small>${escapeHtml(card.description)}</small></span>
      <span class="sort-controls"><button type="button" aria-label="Move ${escapeHtml(card.title)} up" data-on:click="${escapeHtml(sortExpression(id, 'up'))}">↑</button>
      <button type="button" aria-label="Move ${escapeHtml(card.title)} down" data-on:click="${escapeHtml(sortExpression(id, 'down'))}">↓</button></span>
    </li>`;
  }).join('');
  return `<div class="sort-view"><ol class="sort-list">${cards}</ol><p class="sort-message" role="status">${escapeHtml(message)}</p></div>`;
}

async function handleSort(request, url, route) {
  const method = route === 'sort' ? 'GET' : 'POST';
  if (request.method !== method) return new Response('Not found', { status: 404 });
  let input;
  try { input = JSON.parse(url.searchParams.get('redactionInput') || (route === 'sort' ? '{}' : 'null')); }
  catch { return new Response('Invalid sort input', { status: 400 }); }
  if (!input || typeof input !== 'object' || Array.isArray(input)) return new Response('Invalid sort input', { status: 400 });
  if (route !== 'sort/move') {
    if (Object.keys(input).length) return new Response('Invalid sort input', { status: 400 });
    if (route === 'sort/reset') cardOrder = sortableCards.map(({ id }) => id);
    return eventStream(patch(renderSortableCards(route === 'sort/reset' ? 'Original order restored.' : undefined), 'sort-items'));
  }
  if (Object.keys(input).length !== 2 || typeof input.id !== 'string' ||
      !sortableCards.some((card) => card.id === input.id) || !['up', 'down', 'drop'].includes(input.direction)) {
    return new Response('Invalid sort input', { status: 400 });
  }
  let from = cardOrder.indexOf(input.id);
  let to;
  if (input.direction === 'drop') {
    let signals;
    try { signals = await request.json(); }
    catch { return new Response('Invalid dragged card', { status: 400 }); }
    if (!signals || typeof signals !== 'object' || Array.isArray(signals) ||
        typeof signals.draggedCard !== 'string' || !sortableCards.some((card) => card.id === signals.draggedCard)) {
      return new Response('Invalid dragged card', { status: 400 });
    }
    from = cardOrder.indexOf(signals.draggedCard);
    to = cardOrder.indexOf(input.id);
  } else {
    to = Math.max(0, Math.min(cardOrder.length - 1, from + (input.direction === 'up' ? -1 : 1)));
  }
  if (from !== to) {
    const [moved] = cardOrder.splice(from, 1);
    cardOrder.splice(to, 0, moved);
  }
  return eventStream(patchSignals({ draggedCard: '' }) + patch(renderSortableCards('Order saved by the demo backend.'), 'sort-items'));
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

function renderLiveRecord() {
  return `<article class="live-record"><span>SHARED FIELD NOTE · REV ${liveRecord.revision}</span>
    <p>${escapeHtml(liveRecord.message)}</p><small>Server-owned HTML delivered to every open tab.</small></article>`;
}

function sendLive(clientId, content) {
  const controller = liveSubscribers.get(clientId);
  if (!controller) return;
  try { controller.enqueue(encoder.encode(content)); }
  catch { liveSubscribers.delete(clientId); }
}

function openLivePipe(clientId) {
  let streamController;
  const body = new ReadableStream({
    start(controller) {
      streamController = controller;
      try { liveSubscribers.get(clientId)?.close(); } catch { /* Already closed. */ }
      liveSubscribers.set(clientId, controller);
      controller.enqueue(encoder.encode(patch(renderLiveRecord(), 'live-record')));
    },
    cancel() {
      if (liveSubscribers.get(clientId) === streamController) liveSubscribers.delete(clientId);
    },
  });
  return eventStream(body);
}

async function handleLive(request, url, route, clientId) {
  if (route === 'live/stream') {
    if (request.method !== 'GET' || url.searchParams.has('redactionInput')) return new Response('Not found', { status: 404 });
    return openLivePipe(clientId);
  }
  if (request.method !== 'POST') return new Response('Not found', { status: 404 });
  let input;
  let signals;
  try {
    input = JSON.parse(url.searchParams.get('redactionInput') || 'null');
    signals = await request.json();
  } catch { return new Response('Invalid note request', { status: 400 }); }
  if (!input || typeof input !== 'object' || Array.isArray(input) ||
      Object.keys(input).length !== 1 || input.section !== 'note' ||
      !signals || typeof signals !== 'object' || Array.isArray(signals) ||
      typeof signals.liveDraft !== 'string' || !signals.liveDraft.trim() || signals.liveDraft.length > 80) {
    return new Response('Invalid note request', { status: 400 });
  }
  liveRecord.message = signals.liveDraft.trim();
  liveRecord.revision++;
  const update = patch(renderLiveRecord(), 'live-record');
  for (const id of liveSubscribers.keys()) sendLive(id, update);
  sendLive(clientId, patchSignals({ liveDraft: '' }));
  return eventStream('');
}

async function handle(request, url, clientId) {
  const route = url.pathname.slice(prefix.length);
  if (route.startsWith('context/')) return handleContext(request, url, route);
  if (route === 'wizard' || route.startsWith('wizard/')) return handleWizard(request, url, route, clientId);
  if (route === 'feed') return handleFeed(request, url);
  if (route === 'live/stream' || route === 'live/update') return handleLive(request, url, route, clientId);
  if (route === 'sort' || route === 'sort/move' || route === 'sort/reset') return handleSort(request, url, route);
  if (route === 'details/view') return handleModalDetails(request, url);
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
