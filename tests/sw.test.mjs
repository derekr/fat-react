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
