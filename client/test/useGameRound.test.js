import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { create, act } from 'react-test-renderer';
import useGameRound from '../src/hooks/useGameRound.js';
const storage = () => { const data = new Map(); return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) }; };
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage() });
Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: storage() });
globalThis.window = {};
let hook;
function Harness({ mode }) { hook = useGameRound({ mode, anonId: 'owner', apiBaseUrl: 'http://localhost:4000' }); return null; }
const puzzle = id => ({ puzzleId: id, userAttempt: { guesses: [], isGameOver: false, isSolved: false, score: 0 } });

test('an older puzzle response cannot replace a newly selected mode', async () => {
  const pending = [];
  window.fetch = async url => url.endsWith('/session') ? Response.json({ token: 'test', anonId: 'owner' }) : new Promise(resolve => pending.push(resolve));
  let renderer;
  await act(async () => { renderer = create(React.createElement(Harness, { mode: 'daily' })); });
  await act(async () => { renderer.update(React.createElement(Harness, { mode: 'unlimited' })); });
  assert.equal(pending.length, 2);
  await act(async () => { pending[1](Response.json(puzzle('new'))); });
  await act(async () => { pending[0](Response.json(puzzle('old'))); });
  assert.equal(hook.puzzleData.puzzleId, 'new');
  await act(async () => renderer.unmount());
});

test('duplicate clicks send one guess and network retries reuse the request ID', async () => {
  const payloads = [];
  let resolveGuess;
  let fail = false;
  window.fetch = async (url, options) => {
    if (!url.endsWith('/guess')) return Response.json(puzzle('game'));
    payloads.push(JSON.parse(options.body));
    if (fail) throw new TypeError('Connection interrupted');
    return new Promise(resolve => { resolveGuess = resolve; });
  };
  let renderer, request;
  await act(async () => { renderer = create(React.createElement(Harness, { mode: 'daily' })); });
  await act(async () => { request = hook.handleSkip(); assert.equal(await hook.handleSkip(), false); });
  assert.equal(payloads.length, 1);
  assert.equal(hook.isSubmitting, true);
  await act(async () => { resolveGuess(Response.json({ guesses: [{ isSkip: true }], isGameOver: false, isSolved: false, score: 0 })); await request; });
  assert.equal(hook.guesses.length, 1);
  fail = true;
  await act(async () => { assert.equal(await hook.handleMakeGuess({ id: 2 }), false); });
  assert.match(hook.submissionError, /interrupted/);
  fail = false;
  await act(async () => { request = hook.handleMakeGuess({ id: 2 }); });
  assert.equal(payloads[1].requestId, payloads[2].requestId);
  await act(async () => { resolveGuess(Response.json({ guesses: [{ isSkip: true }, { isCorrect: true }], isGameOver: true, isSolved: true, score: 1000 })); await request; });
  assert.equal(hook.isGameOver, true);
  await act(async () => renderer.unmount());
});
