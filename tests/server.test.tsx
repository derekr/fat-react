import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { z } from 'zod';
import { defineRedaction, redactionExpression, Redact, Recast, Repipe, Rewire } from '../src';
import { eventAttribute, intersectAttribute } from '../src/directives';
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

test('a GET redaction reads signals from the query string and validates action input', async () => {
  const search = defineRedaction({ path: '/api/search', method: 'get', schema: z.object({ category: z.literal('contacts') }) });
  const read = createRedactionHandler(search, 'results', ({ signals }) => {
    const { query } = z.object({ query: z.string().max(80) }).parse(signals);
    return <p>{query}</p>;
  });
  const url = 'https://example.test/api/search?redactionInput=%7B%22category%22%3A%22contacts%22%7D&datastar=%7B%22query%22%3A%22%3Ctest%3E%22%7D';
  const response = await read(new Request(url));
  assert.equal(response.status, 200);
  assert.match(await response.text(), /data: elements <p>&lt;test&gt;<\/p>/);
  assert.equal((await read(new Request('https://example.test/api/search?redactionInput=%7B%7D'))).status, 400);
  assert.equal((await read(new Request(url, { method: 'POST' }))).status, 404);
});

test('a server handler can append a validated page of rows to a Redact host', async () => {
  const load = defineRedaction({ path: '/api/more', method: 'get', schema: z.object({ page: z.number().int().min(1).max(3) }) });
  const handler = createRedactionHandler(load, 'load-items', ({ input }) => <article>Page {input.page}</article>, 'append');
  const response = await handler(new Request('https://example.test/api/more?redactionInput=%7B%22page%22%3A2%7D'));
  assert.match(await response.text(), /data: selector #load-items\ndata: mode append\ndata: elements <article>Page 2<\/article>/);
  assert.equal((await handler(new Request('https://example.test/api/more?redactionInput=%7B%22page%22%3A9%7D'))).status, 400);
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

test('Rewire renders a debounced GET with a bound input and typed request options', () => {
  const search = defineRedaction({ path: '/api/search', method: 'get', schema: z.object({}) });
  const html = renderToStaticMarkup(<Rewire asChild event="input" action={search} input={{}} bind="search" debounce={200} filterSignals={{ include: /^search$/ }}>
    <input type="search" />
  </Rewire>);
  assert.match(html, /data-bind="search"/);
  assert.match(html, /data-on:input__debounce\.200ms="@get/);
  assert.match(html, /&quot;include&quot;:\/\^search\$\//);
  assert.throws(() => eventAttribute('input', { debounceLeading: true }), /require debounce/);
});

test('Recast preserves core directives and refuses conflicting event attributes', () => {
  const html = renderToStaticMarkup(<Recast asChild signals={{ count: 0 }} events={[{ event: 'click', expression: '$count++' }]}>
    <button type="button">Count</button>
  </Recast>);
  assert.match(html, /data-signals="\{&quot;count&quot;:0\}"/);
  assert.match(html, /data-on:click="\$count\+\+"/);
  assert.throws(() => renderToStaticMarkup(<Recast asChild events={[{ event: 'click', expression: '$count++' }]}>
    <button data-on:click="old">Count</button>
  </Recast>), /already defines/);
});

test('Recast attaches typed intersection modifiers to a safely quoted action', () => {
  const more = defineRedaction({ path: '/api/more', method: 'get', schema: z.object({ page: z.number().int() }) });
  const html = renderToStaticMarkup(<Recast asChild onIntersect={{
    expression: redactionExpression(more, { page: 2 }, { filterSignals: { include: /^scrollPage$/ } }),
    half: true, throttle: 200,
  }}><div>More</div></Recast>);
  assert.match(html, /data-on-intersect__half__throttle\.200ms="@get/);
  assert.match(html, /redactionInput=%7B%22page%22%3A2%7D/);
  assert.match(html, /&quot;include&quot;:\/\^scrollPage\$\//);
  assert.equal(intersectAttribute({ threshold: 25, once: true }), 'data-on-intersect__once__threshold.25');
  assert.throws(() => intersectAttribute({ half: true, full: true }), /one intersection visibility threshold/);
  assert.throws(() => intersectAttribute({ threshold: 101 }), /integer percentage/);
});
