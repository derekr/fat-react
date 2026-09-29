import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { z } from 'zod';
import { defineRedaction, Redact, Repipe } from '../src';
import { createRedactionHandler } from '../src/server';

const action = defineRedaction({ path: '/api/note', schema: z.object({ section: z.literal('basket') }) });
const handler = createRedactionHandler(action, 'basket', ({ signals }) => {
  const { note } = z.object({ note: z.string().max(80) }).parse(signals);
  return <p>{note}</p>;
});

test('the server handler rejects invalid input before rendering', async () => {
  const response = await handler(new Request('https://example.test/api/note?redactionInput=%7B%7D', {
    method: 'POST', body: JSON.stringify({ note: 'hi' }),
  }));
  assert.equal(response.status, 400);
});

test('server-rendered JSX is escaped and delivered as a targeted SSE morph', async () => {
  const response = await handler(new Request('https://example.test/api/note?redactionInput=%7B%22section%22%3A%22basket%22%7D', {
    method: 'POST', body: JSON.stringify({ note: '<script>alert(1)</script>' }),
  }));
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type') ?? '', /text\/event-stream/);
  const body = await response.text();
  assert.match(body, /data: selector #basket/);
  assert.match(body, /data: elements <p>&lt;script&gt;alert\(1\)&lt;\/script&gt;<\/p>/);
});

test('a page-level read stream does not make the host issue a second request', () => {
  const html = renderToStaticMarkup(<><Repipe src="/api/stream" /><Redact id="basket" /></>);
  assert.match(html, /data-repipe="" data-init="@get/);
  assert.match(html, /data-redact-host=""/);
  assert.equal((html.match(/data-init=/g) ?? []).length, 1);
});
