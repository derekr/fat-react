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
