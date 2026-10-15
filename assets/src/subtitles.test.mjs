import {test} from 'node:test';
import assert from 'node:assert/strict';
import {subtitleChunks, subtitleAt} from './subtitles.ts';

test('sentences become chunks; long sentences split at clause breaks, never above the limit', () => {
  const chunks = subtitleChunks('On the evening of December 4, 1871, carriage after carriage pulled up in front of a rather inconspicuous red brick building in downtown Providence. Well-dressed theatre-goers entered.');
  assert.ok(chunks.length >= 3);
  assert.equal(chunks.at(-1), 'Well-dressed theatre-goers entered.');
  for (const chunk of chunks) assert.ok(chunk.split(' ').length <= 14, chunk);
  assert.equal(chunks.join(' '), 'On the evening of December 4, 1871, carriage after carriage pulled up in front of a rather inconspicuous red brick building in downtown Providence. Well-dressed theatre-goers entered.');
});
test('the shown chunk follows progress through the clip', () => {
  const chunks = ['First part here.', 'Second part.'];
  assert.equal(subtitleAt(chunks, 0), 'First part here.');
  assert.equal(subtitleAt(chunks, 0.99), 'Second part.');
  assert.equal(subtitleAt([], 0.5), '');
});
