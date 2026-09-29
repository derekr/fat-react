import assert from 'node:assert/strict';
import { test } from 'node:test';
import { actionExpression, actionUrl, redactPatch, redactionAck } from '../src/protocol.ts';

test('a multi-line HTML fragment stays in one targeted SSE event', () => {
  const event = redactPatch('basket', '<p>first</p>\n<p>second</p>');
  assert.match(event, /data: selector #basket\n/);
  assert.match(event, /data: mode inner\n/);
  assert.match(event, /data: elements <p>first<\/p>\ndata: elements <p>second<\/p>\n\n$/);
  assert.throws(() => redactPatch('basket] *', 'hi'));
});

test('untrusted input cannot escape the action URL or expression string', () => {
  const value = `'); alert(1); ('`;
  const url = actionUrl('/api/add?source=demo', { item: value });
  assert.equal(new URL(url, 'https://example.test').searchParams.get('redactionInput'), JSON.stringify({ item: value }));
  assert.equal(actionExpression('post', url), `@post(${JSON.stringify(url)})`);
  assert.throws(() => actionUrl('//example.test/steal', {}));
});

test('a command can acknowledge without patching the DOM', async () => {
  const response = redactionAck();
  assert.match(response.headers.get('content-type') ?? '', /text\/event-stream/);
  assert.equal(await response.text(), '');
});
