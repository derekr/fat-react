import assert from 'node:assert/strict';
import { test } from 'node:test';
import { actionExpression, actionUrl, fatPatch } from '../src/protocol.ts';

test('a multi-line HTML fragment stays in one targeted SSE event', () => {
  const event = fatPatch('basket', '<p>first</p>\n<p>second</p>');
  assert.match(event, /data: selector #basket\n/);
  assert.match(event, /data: mode inner\n/);
  assert.match(event, /data: elements <p>first<\/p>\ndata: elements <p>second<\/p>\n\n$/);
  assert.throws(() => fatPatch('basket] *', 'hi'));
});

test('untrusted input cannot escape the action URL or expression string', () => {
  const value = `'); alert(1); ('`;
  const url = actionUrl('/api/add?source=demo', { item: value });
  assert.equal(new URL(url, 'https://example.test').searchParams.get('fatInput'), JSON.stringify({ item: value }));
  assert.equal(actionExpression('post', url), `@post(${JSON.stringify(url)})`);
  assert.throws(() => actionUrl('//example.test/steal', {}));
});
