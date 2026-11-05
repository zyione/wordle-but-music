import test from 'node:test';
import assert from 'node:assert/strict';
import { readNdjson } from '../src/lib/readNdjson.js';
test('stream parser preserves split messages, UTF-8, and the final line without a newline', async () => {
  const data = new TextEncoder().encode('{"type":"progress","name":"Beyoncé"}\n{"type":"complete"}');
  const stream = new ReadableStream({ start(controller) { for (let i = 0; i < data.length; i++) controller.enqueue(data.slice(i, i + 1)); controller.close(); } });
  const messages = [];
  await readNdjson(stream, message => messages.push(message));
  assert.equal(messages[0].name, 'Beyoncé');
  assert.equal(messages[1].type, 'complete');
});
test('stream parser rejects malformed responses instead of silently losing messages', async () => {
  const stream = new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode('invalid\n')); controller.close(); } });
  await assert.rejects(readNdjson(stream, () => {}), SyntaxError);
});
