import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fadeLevel} from './fade.ts';

test('opening and closing fades reach silence/black without affecting the middle', () => {
  assert.equal(fadeLevel(0,300,24,36),0);
  assert.equal(fadeLevel(12,300,24,36),0.5);
  assert.equal(fadeLevel(24,300,24,36),1);
  assert.equal(fadeLevel(150,300,24,36),1);
  assert.equal(fadeLevel(281,300,24,36),0.5);
  assert.equal(fadeLevel(299,300,24,36),0);
});
test('seeking is independent of playback history; unset fades preserve existing timelines', () => {
  for (const frame of [299,0,150,12,281,24]) {
    assert.equal(fadeLevel(frame,300),1);
    assert.ok(fadeLevel(frame,300,500,500) >= 0);
    assert.ok(fadeLevel(frame,300,500,500) <= 1);
  }
});
