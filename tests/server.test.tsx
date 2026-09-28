import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import { z } from 'zod';
import { defineFatAction } from '../src';
import { createFatHandler } from '../src/server';

const action = defineFatAction({ path: '/api/note', schema: z.object({ section: z.literal('basket') }) });
const handler = createFatHandler(action, 'basket', ({ signals }) => {
  const { note } = z.object({ note: z.string().max(80) }).parse(signals);
  return <p>{note}</p>;
});

test('the server handler rejects invalid input before rendering', async () => {
  const response = await handler(new Request('https://example.test/api/note?fatInput=%7B%7D', {
    method: 'POST', body: JSON.stringify({ note: 'hi' }),
  }));
  assert.equal(response.status, 400);
});

test('server-rendered JSX is escaped and delivered as a targeted SSE morph', async () => {
  const response = await handler(new Request('https://example.test/api/note?fatInput=%7B%22section%22%3A%22basket%22%7D', {
    method: 'POST', body: JSON.stringify({ note: '<script>alert(1)</script>' }),
  }));
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type') ?? '', /text\/event-stream/);
  const body = await response.text();
  assert.match(body, /data: selector #basket/);
  assert.match(body, /data: elements <p>&lt;script&gt;alert\(1\)&lt;\/script&gt;<\/p>/);
});
