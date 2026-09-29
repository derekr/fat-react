import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';

test('bulk update rejects malformed and unknown selections before changing rows', async () => {
  const listeners = new Map();
  const scope = 'https://example.test/redact/examples/bulk-update/';
  runInNewContext(readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8'), {
    self: {
      registration: { scope },
      addEventListener(name, callback) { listeners.set(name, callback); },
    },
    URL, Response, TextEncoder, ReadableStream,
  });
  async function send(route, method, selection, input = method === 'GET' ? null : '{}') {
    const url = `${scope}__redact/${route}${input === null ? '' : `?redactionInput=${encodeURIComponent(input)}`}`;
    let response;
    listeners.get('fetch')({ request: new Request(url, {
      method, ...(method === 'PUT' ? { body: JSON.stringify({ bulkSelection: selection }) } : {}),
    }), clientId: 'test-tab', respondWith(value) { response = value; } });
    return response;
  }

  const initial = await (await send('bulk', 'GET')).text();
  assert.match(initial, /Field notes/);
  const valid = { note01: true, note02: false, note03: true, note04: false };
  for (const selection of [
    { ...valid, note99: true },
    { ...valid, note01: 'true' },
    { note01: true },
    { note01: false, note02: false, note03: false, note04: false },
  ]) {
    assert.equal((await send('bulk/activate', 'PUT', selection)).status, 400);
  }
  assert.equal((await send('bulk/activate', 'PUT', valid, '{"unknown":true}')).status, 400);
  assert.equal(await (await send('bulk', 'GET')).text(), initial);

  const activated = await (await send('bulk/activate', 'PUT', valid)).text();
  assert.match(activated, /2 entries activated\./);
  assert.match(activated, /Select Field notes[^]*?<span class="bulk-badge active">Active<\/span>/);
  assert.match(activated, /Select Seed catalog[^]*?<span class="bulk-badge active">Active<\/span>/);
  assert.match(activated, /"bulkSelection":\{"note01":false,"note02":false,"note03":false,"note04":false\}/);
  const deactivated = await (await send('bulk/deactivate', 'PUT', valid)).text();
  assert.match(deactivated, /2 entries deactivated\./);
  assert.match(deactivated, /Select Field notes[^]*?<span class="bulk-badge inactive">Inactive<\/span>/);
  assert.equal((await send('bulk/activate', 'POST', valid)).status, 404);
});

test('progress job validates input and streams intermediate patches before completion', async () => {
  const listeners = new Map();
  const scope = 'https://example.test/redact/examples/progress-bar/';
  runInNewContext(readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8'), {
    self: {
      registration: { scope },
      addEventListener(name, callback) { listeners.set(name, callback); },
    },
    URL, Response, TextEncoder, ReadableStream, setInterval, clearInterval,
  });
  async function start(method, input, body = '{}') {
    const url = `${scope}__redact/progress/run?redactionInput=${encodeURIComponent(input)}`;
    let response;
    listeners.get('fetch')({ request: new Request(url, {
      method, ...(method === 'POST' ? { body } : {}),
    }), clientId: 'sample-tab', respondWith(value) { response = value; } });
    return response;
  }

  assert.equal((await start('GET', '{"archive":"sample"}')).status, 404);
  assert.equal((await start('POST', '{"archive":"unknown"}')).status, 400);
  assert.equal((await start('POST', '{"archive":"sample","extra":true}')).status, 400);
  assert.equal((await start('POST', '{"archive":"sample"}', '{"unexpected":true}')).status, 400);

  const response = await start('POST', '{"archive":"sample"}');
  assert.equal(response.headers.get('content-type'), 'text/event-stream; charset=utf-8');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const first = decoder.decode((await reader.read()).value);
  assert.match(first, /value="0"/);
  assert.match(first, /selector #progress-result/);
  const second = decoder.decode((await reader.read()).value);
  assert.match(second, /value="20"/);
  const rest = [];
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    rest.push(decoder.decode(value));
  }
  assert.deepEqual(rest.map((chunk) => Number(chunk.match(/value="(\d+)"/)?.[1])), [40, 60, 80, 100]);
  assert.match(rest.at(-1), /Archive ready\. This was a simulated job\./);
});

test('lazy tabs serve only known panels and patch the active tab alongside HTML', async () => {
  const listeners = new Map();
  const scope = 'https://example.test/redact/examples/lazy-tabs/';
  runInNewContext(readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8'), {
    self: {
      registration: { scope },
      addEventListener(name, callback) { listeners.set(name, callback); },
    },
    URL, Response, TextEncoder, ReadableStream,
  });
  async function request(route, input, method = 'GET') {
    const url = `${scope}__redact/${route}${input === undefined ? '' : `?redactionInput=${encodeURIComponent(input)}`}`;
    let response;
    listeners.get('fetch')({ request: new Request(url, { method }), clientId: 'sample-tab',
      respondWith(value) { response = value; } });
    return response;
  }

  assert.match(await (await request('tabs')).text(), /"activeTab":"overview"[^]*The small field guide/);
  const specimens = await (await request('tabs/show', '{"tab":"specimens"}')).text();
  assert.match(specimens, /"activeTab":"specimens"/);
  assert.match(specimens, /selector #tabs-panel/);
  assert.match(specimens, /Glasswing beetle/);
  assert.doesNotMatch(specimens, /Notes from the path/);
  for (const input of ['{"tab":"missing"}', '{"tab":"__proto__"}', '{"tab":"notes","extra":true}', '{}', 'not-json']) {
    assert.equal((await request('tabs/show', input)).status, 400);
  }
  assert.equal((await request('tabs', '{}')).status, 400);
  assert.equal((await request('tabs/show', '{"tab":"notes"}', 'POST')).status, 404);
});

test('delete row validates IDs, removes one record, and restores the sample', async () => {
  const listeners = new Map();
  const scope = 'https://example.test/redact/examples/delete-row/';
  runInNewContext(readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8'), {
    self: { registration: { scope }, addEventListener(name, callback) { listeners.set(name, callback); } },
    URL, Response, TextEncoder, ReadableStream,
  });
  async function send(route, method, input) {
    const url = `${scope}__redact/rows${route}${input === undefined ? '' : `?redactionInput=${encodeURIComponent(JSON.stringify(input))}`}`;
    let response;
    listeners.get('fetch')({ request: new Request(url, { method }), clientId: 'sample-tab',
      respondWith(value) { response = value; } });
    return response;
  }
  const first = await (await send('', 'GET')).text();
  assert.match(first, /Copperleaf sketch/);
  assert.match(first, /@delete\(/);
  for (const input of [{ id: 'card99' }, { id: 'card01', extra: true }, { id: 1 }]) {
    assert.equal((await send('/delete', 'DELETE', input)).status, 400);
  }
  assert.equal(await (await send('', 'GET')).text(), first);
  const after = await (await send('/delete', 'DELETE', { id: 'card01' })).text();
  assert.doesNotMatch(after, /Copperleaf sketch/);
  assert.match(after, /Quiet trail map/);
  assert.equal((await send('/delete', 'DELETE', { id: 'card01' })).status, 409);
  assert.equal((await send('/delete', 'POST', { id: 'card02' })).status, 404);
  const restored = await (await send('/reset', 'POST', {})).text();
  assert.match(restored, /Copperleaf sketch/);
});

test('dependent selects validate each region and habitat pair', async () => {
  const listeners = new Map();
  const scope = 'https://example.test/redact/examples/dependent-selects/';
  runInNewContext(readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8'), {
    self: { registration: { scope }, addEventListener(name, callback) { listeners.set(name, callback); } },
    URL, Response, TextEncoder, ReadableStream,
  });
  async function send(route, signals, input = {}) {
    const url = new URL(`${scope}__redact/habitats/${route}`);
    url.searchParams.set('redactionInput', JSON.stringify(input));
    url.searchParams.set('datastar', JSON.stringify(signals));
    let response;
    listeners.get('fetch')({ request: new Request(url), clientId: 'sample-tab',
      respondWith(value) { response = value; } });
    return response;
  }
  const options = await (await send('options', { region: 'ridge', habitat: 'stale' })).text();
  assert.match(options, /"habitat":""/);
  assert.match(options, /Sunlit lookout/);
  assert.doesNotMatch(options, /Reed beds/);
  const note = await (await send('describe', { region: 'ridge', habitat: 'lookout' })).text();
  assert.match(note, /bright shelf above the invented valley/);
  for (const [route, signals] of [
    ['options', { region: '__proto__' }],
    ['options', { region: 1 }],
    ['describe', { region: 'ridge', habitat: 'reeds' }],
    ['describe', { region: 'ridge', habitat: 'constructor' }],
    ['describe', { region: 'grove', habitat: '' }],
  ]) assert.equal((await send(route, signals)).status, 400);
  assert.equal((await send('options', { region: 'ridge' }, { unexpected: true })).status, 400);
});

test('multipart upload validates file contents and returns only a summary', async () => {
  const listeners = new Map();
  const scope = 'https://example.test/redact/examples/file-upload/';
  runInNewContext(readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8'), {
    self: { registration: { scope }, addEventListener(name, callback) { listeners.set(name, callback); } },
    URL, Response, TextEncoder, ReadableStream, File,
  });
  async function send(file, input = { kind: 'field-note' }, method = 'POST', extra = false) {
    const form = new FormData();
    if (file) form.append('fieldNote', file);
    if (extra) form.append('unexpected', 'value');
    const url = `${scope}__redact/upload/check?redactionInput=${encodeURIComponent(JSON.stringify(input))}`;
    let response;
    listeners.get('fetch')({ request: new Request(url, { method, ...(method === 'POST' ? { body: form } : {}) }),
      clientId: 'sample-tab', respondWith(value) { response = value; } });
    return response;
  }
  const file = new File(['invented fern\nquiet hill'], 'sample-note.txt', { type: 'text/plain' });
  assert.equal((await send(file, { kind: 'unknown' })).status, 400);
  assert.equal((await send(file, { kind: 'field-note' }, 'GET')).status, 404);
  for (const invalid of [
    new File([''], 'empty.txt', { type: 'text/plain' }),
    new File(['x'.repeat(4097)], 'large.txt', { type: 'text/plain' }),
    new File(['not a text file'], 'image.png', { type: 'image/png' }),
    new File(['\0'], 'binary.txt', { type: 'text/plain' }),
  ]) assert.match(await (await send(invalid)).text(), /upload-feedback error/);
  assert.match(await (await send(file, { kind: 'field-note' }, 'POST', true)).text(), /upload-feedback error/);
  const response = await send(file);
  assert.equal(response.headers.get('content-type'), 'text/event-stream; charset=utf-8');
  const result = await response.text();
  assert.match(result, /2 lines, 24 bytes/);
  assert.doesNotMatch(result, /invented fern|quiet hill|sample-note\.txt/);
});

test('modal detail input is validated before its delayed HTML response', async () => {
  const listeners = new Map();
  const scope = 'https://example.test/redact/examples/modal-details/';
  runInNewContext(readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8'), {
    self: { registration: { scope }, addEventListener(name, callback) { listeners.set(name, callback); } },
    URL, Response, TextEncoder, ReadableStream, setTimeout,
  });
  async function send(input, method = 'GET') {
    const url = `${scope}__redact/details/view?redactionInput=${encodeURIComponent(JSON.stringify(input))}`;
    let response;
    listeners.get('fetch')({ request: new Request(url, { method }), clientId: 'tab-a',
      respondWith(value) { response = value; } });
    return response;
  }
  assert.equal((await send({ id: 'unknown' })).status, 400);
  assert.equal((await send({ id: 'fern', extra: true })).status, 400);
  assert.equal((await send({ id: 'fern' }, 'POST')).status, 404);
  let completed = false;
  const pending = send({ id: 'fern' }).then((response) => { completed = true; return response; });
  await new Promise((resolve) => setTimeout(resolve, 100));
  assert.equal(completed, false);
  const html = await (await pending).text();
  assert.match(html, /selector #modal-content/);
  assert.match(html, /Copperleaf fern/);
});

test('sortable list rejects unknown moves and persists validated drag and arrow moves', async () => {
  const listeners = new Map();
  const scope = 'https://example.test/redact/examples/sortable-list/';
  runInNewContext(readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8'), {
    self: { registration: { scope }, addEventListener(name, callback) { listeners.set(name, callback); } },
    URL, Response, TextEncoder, ReadableStream,
  });
  async function send(route, method, input, signals = {}) {
    const url = `${scope}__redact/sort${route}${input === undefined ? '' : `?redactionInput=${encodeURIComponent(JSON.stringify(input))}`}`;
    let response;
    listeners.get('fetch')({ request: new Request(url, {
      method, ...(method === 'POST' ? { body: JSON.stringify(signals) } : {}),
    }), clientId: 'sort-tab', respondWith(value) { response = value; } });
    return response;
  }
  const order = (html) => [...html.matchAll(/<strong>([^<]+)<\/strong>/g)].map((match) => match[1]);
  const initial = await (await send('', 'GET')).text();
  assert.deepEqual(order(initial), ['Leaf study', 'Pocket map', 'Sky notes', 'Stone shapes']);
  for (const [input, signals] of [
    [{ id: 'unknown', direction: 'down' }, {}],
    [{ id: 'leaf', direction: 'diagonal' }, {}],
    [{ id: 'sky', direction: 'drop' }, { draggedCard: 'unknown' }],
  ]) assert.equal((await send('/move', 'POST', input, signals)).status, 400);
  assert.equal(await (await send('', 'GET')).text(), initial);
  const dragged = await (await send('/move', 'POST', { id: 'sky', direction: 'drop' }, { draggedCard: 'leaf' })).text();
  assert.deepEqual(order(dragged), ['Pocket map', 'Sky notes', 'Leaf study', 'Stone shapes']);
  const moved = await (await send('/move', 'POST', { id: 'stone', direction: 'up' })).text();
  assert.deepEqual(order(moved), ['Pocket map', 'Sky notes', 'Stone shapes', 'Leaf study']);
  assert.deepEqual(order(await (await send('/reset', 'POST', {})).text()), order(initial));
});

test('a validated note update broadcasts to two read streams and replays on reconnect', async () => {
  const listeners = new Map();
  const scope = 'https://example.test/redact/examples/cross-tab-updates/';
  runInNewContext(readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8'), {
    self: { registration: { scope }, addEventListener(name, callback) { listeners.set(name, callback); } },
    URL, Response, TextEncoder, ReadableStream,
  });
  async function send(route, method, clientId, input, signals) {
    const url = `${scope}__redact/live/${route}${input === undefined ? '' : `?redactionInput=${encodeURIComponent(JSON.stringify(input))}`}`;
    let response;
    listeners.get('fetch')({ request: new Request(url, {
      method, ...(method === 'POST' ? { body: JSON.stringify(signals) } : {}),
    }), clientId, respondWith(value) { response = value; } });
    return response;
  }
  const a = (await send('stream', 'GET', 'tab-a')).body.getReader();
  const b = (await send('stream', 'GET', 'tab-b')).body.getReader();
  const decode = (value) => new TextDecoder().decode(value);
  assert.match(decode((await a.read()).value), /REV 1/);
  assert.match(decode((await b.read()).value), /REV 1/);
  assert.equal((await send('update', 'POST', 'tab-a', { section: 'note' }, { liveDraft: '' })).status, 400);
  assert.equal((await send('update', 'POST', 'tab-a', { section: 'wrong' }, { liveDraft: 'A valid note' })).status, 400);
  const response = await send('update', 'POST', 'tab-a', { section: 'note' }, { liveDraft: '<Sample ridge>' });
  assert.equal(response.status, 200);
  assert.equal(await response.text(), '');
  assert.match(decode((await a.read()).value), /REV 2[^]*&lt;Sample ridge&gt;/);
  assert.match(decode((await b.read()).value), /REV 2[^]*&lt;Sample ridge&gt;/);
  assert.match(decode((await a.read()).value), /"liveDraft":""/);
  await a.cancel();
  await b.cancel();
  const reconnected = (await send('stream', 'GET', 'tab-b')).body.getReader();
  assert.match(decode((await reconnected.read()).value), /REV 2[^]*&lt;Sample ridge&gt;/);
  await reconnected.cancel();
});

test('multi-step form validates each transition and preserves an accepted draft on back', async () => {
  const listeners = new Map();
  const scope = 'https://example.test/redact/examples/multi-step-form/';
  runInNewContext(readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8'), {
    self: { registration: { scope }, addEventListener(name, callback) { listeners.set(name, callback); } },
    URL, Response, TextEncoder, ReadableStream,
  });
  async function send(route, method, input, signals = {}, clientId = 'wizard-tab') {
    const url = `${scope}__redact/wizard${route}${input === undefined ? '' : `?redactionInput=${encodeURIComponent(JSON.stringify(input))}`}`;
    let response;
    listeners.get('fetch')({ request: new Request(url, {
      method, ...(method === 'POST' ? { body: JSON.stringify(signals) } : {}),
    }), clientId, respondWith(value) { response = value; } });
    return response;
  }
  assert.match(await (await send('', 'GET')).text(), /STEP 1 OF 3/);
  assert.equal((await send('/finish', 'POST', { from: 'review' })).status, 409);
  assert.equal((await send('/next', 'POST', { from: 'entry' }, { wizardTitle: 42 })).status, 400);
  const error = await (await send('/next', 'POST', { from: 'entry' }, { wizardTitle: 'x' })).text();
  assert.match(error, /at least two characters/);
  assert.match(error, /value="x"/);
  assert.equal((await send('/next', 'POST', { from: 'entry' }, { wizardTitle: 'Missing session' }, 'other-tab')).status, 409);
  assert.match(await (await send('/next', 'POST', { from: 'entry' }, { wizardTitle: '<Fern card>' })).text(), /STEP 2 OF 3/);
  assert.equal((await send('/next', 'POST', { from: 'entry' }, { wizardTitle: 'Stale' })).status, 409);
  assert.match(await (await send('/next', 'POST', { from: 'details' }, {
    wizardCategory: 'unknown', wizardDescription: 'Sample entry',
  })).text(), /Choose a category/);
  assert.equal((await send('/next', 'POST', { from: 'details' }, { wizardCategory: 'map', wizardDescription: 23 })).status, 400);
  const review = await (await send('/next', 'POST', { from: 'details' }, {
    wizardCategory: 'map', wizardDescription: 'A & B route',
  })).text();
  assert.match(review, /STEP 3 OF 3/);
  assert.match(review, /&lt;Fern card&gt;/);
  assert.match(review, /A &amp; B route/);
  assert.match(await (await send('/back', 'POST', { from: 'review' })).text(), /value="map" selected/);
  assert.match(await (await send('/next', 'POST', { from: 'details' }, {
    wizardCategory: 'map', wizardDescription: 'A & B route',
  })).text(), /STEP 3 OF 3/);
  assert.match(await (await send('/finish', 'POST', { from: 'review' })).text(), /FIELD CARD SAVED/);
  assert.equal((await send('/finish', 'POST', { from: 'review' })).status, 409);
  assert.match(await (await send('/reset', 'POST', {})).text(), /STEP 1 OF 3/);
});

test('live activity feed delivers sequential append patches and ends its stream', async () => {
  const listeners = new Map();
  const scope = 'https://example.test/redact/examples/live-activity-feed/';
  runInNewContext(readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8'), {
    self: { registration: { scope }, addEventListener(name, callback) { listeners.set(name, callback); } },
    URL, Response, TextEncoder, ReadableStream, setInterval, clearInterval,
  });
  async function send(input, method = 'GET') {
    const url = `${scope}__redact/feed${input === undefined ? '' : `?redactionInput=${encodeURIComponent(JSON.stringify(input))}`}`;
    let response;
    listeners.get('fetch')({ request: new Request(url, { method }), clientId: 'feed-tab',
      respondWith(value) { response = value; } });
    return response;
  }
  assert.equal((await send({ unexpected: true })).status, 400);
  assert.equal((await send({}, 'POST')).status, 404);
  const reader = (await send()).body.getReader();
  const decoder = new TextDecoder();
  assert.match(decoder.decode((await reader.read()).value), /Listening for sample activity/);
  const chunks = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(decoder.decode(value));
  }
  const entries = chunks.filter((chunk) => chunk.includes('feed-index'));
  assert.equal(entries.length, 4);
  for (const [index, chunk] of entries.entries()) {
    assert.match(chunk, index === 0 ? /data: mode inner/ : /data: mode append/);
    assert.match(chunk, new RegExp(`feed-index[^]*?${String(index + 1).padStart(2, '0')}`));
  }
  assert.match(chunks.at(-1), /All sample events delivered/);
  assert.match(chunks.at(-1), /"_feedRunning":false/);
});

test('context menu resolves separate outlets and validates card commands', async () => {
  const listeners = new Map();
  const scope = 'https://example.test/redact/examples/context-menu/';
  runInNewContext(readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8'), {
    self: { registration: { scope }, addEventListener(name, callback) { listeners.set(name, callback); } },
    URL, Response, TextEncoder, ReadableStream, setTimeout,
  });
  async function send(route, input, method = 'GET') {
    const url = `${scope}__redact/context/${route}?redactionInput=${encodeURIComponent(JSON.stringify(input))}`;
    let response;
    listeners.get('fetch')({ request: new Request(url, { method }), clientId: 'menu-tab',
      respondWith(value) { response = value; } });
    return response;
  }
  const item = { id: 'fern', generation: 4 };
  for (const bad of [{ ...item, id: 'missing' }, { ...item, generation: '../x' }, { ...item, extra: true }]) {
    assert.equal((await send('items', bad)).status, 400);
  }
  assert.equal((await send('command', { ...item, operation: 'pin' })).status, 404);
  const initial = await (await send('items', item)).text();
  assert.match(initial, /selector #context-items-4/);
  assert.match(initial, /Pin Copperleaf fern/);
  const collections = await (await send('collections', item)).text();
  assert.match(collections, /selector #context-collections-4/);
  assert.match(collections, /Map drawer/);
  assert.doesNotMatch(collections, /data: elements .*Field journal/);
  assert.equal((await send('command', { ...item, operation: 'move', collection: 'No place' }, 'POST')).status, 400);
  assert.equal((await send('command', { ...item, operation: 'move', collection: 'Field journal' }, 'POST')).status, 400);
  assert.equal((await send('command', { ...item, operation: 'delete' }, 'POST')).status, 400);
  assert.match(await (await send('command', { ...item, operation: 'pin' }, 'POST')).text(), /Copperleaf fern pinned/);
  assert.equal((await send('command', { ...item, operation: 'pin' }, 'POST')).status, 409);
  assert.match(await (await send('items', { ...item, generation: 5 })).text(), /Unpin Copperleaf fern/);
  assert.match(await (await send('command', { ...item, operation: 'move', collection: 'Map drawer' }, 'POST')).text(), /moved to Map drawer/);
  assert.doesNotMatch(await (await send('collections', { ...item, generation: 5 })).text(), /data: elements .*Map drawer/);
});
