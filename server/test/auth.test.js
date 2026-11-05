import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
const directory = mkdtempSync(path.join(tmpdir(), 'song-guesser-auth-test-'));
process.env.DISABLE_CLOUD_BACKUP = '1';
process.env.DB_PATH = path.join(directory, 'test.db');
const { default: db } = await import('../db/db.js');
const { migrate } = await import('../db/migrate.js');
const { requireSession, verifyPin } = await import('../services/auth.js');
const { default: sessionRoutes } = await import('../routes/session.js');
const { default: userRoutes } = await import('../routes/users.js');
migrate();

test('profiles require a real session; PINs are hashed and login retains both devices', async () => {
  const app = express(); app.use(express.json()); app.use('/api', sessionRoutes); app.use('/api', requireSession); app.use('/api', userRoutes);
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const call = (url, token, body) => fetch(base + url, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  try {
    assert.equal((await call('/users/profile?anonId=forged')).status, 401);
    const first = await (await call('/session', null, {})).json();
    const second = await (await call('/session', null, {})).json();
    assert.notEqual(first.token, second.token);
    assert.equal((await call('/users/profile', first.token, { displayName: 'Player', pin: '1234' })).status, 200);
    const stored = db.prepare('SELECT * FROM users').get();
    assert.notEqual(stored.pin, '1234');
    assert.equal(verifyPin('1234', stored.pin), true);
    assert.equal((await (await call(`/users/profile?anonId=${first.anonId}`, second.token)).json()).profile, null);
    assert.equal((await call('/users/profile', second.token, { displayName: 'Player', pin: '9999' })).status, 401);
    assert.equal((await call('/users/profile', second.token, { displayName: 'Player', pin: '1234' })).status, 200);
    for (const token of [first.token, second.token]) assert.equal((await (await call('/users/profile', token)).json()).profile.anonId, first.anonId);
    assert.equal(db.prepare('SELECT token_hash FROM auth_sessions WHERE token_hash = ?').get(first.token), undefined);
  } finally { await new Promise(resolve => server.close(resolve)); await db.close(); rmSync(directory, { recursive: true }); }
});
