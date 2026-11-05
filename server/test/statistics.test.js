import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeDaily } from '../services/statistics.js';
const row = (day, won = true) => ({ puzzleDate: `2026-11-${day}`, isSolved: won });
test('missed days break daily streaks and duplicate days count once', () => {
  assert.deepEqual(summarizeDaily([row('01'), row('02'), row('04'), row('04')], '2026-11-04'), { played: 3, won: 3, currentStreak: 1, maxStreak: 2 });
});
test('yesterday preserves a streak; an older last win or a loss ends it', () => {
  assert.equal(summarizeDaily([row('01'), row('02')], '2026-11-03').currentStreak, 2);
  assert.equal(summarizeDaily([row('01'), row('02')], '2026-11-04').currentStreak, 0);
  assert.equal(summarizeDaily([row('01'), row('02', false)], '2026-11-02').currentStreak, 0);
});
