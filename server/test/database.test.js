import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
const directory = mkdtempSync(path.join(tmpdir(), 'song-guesser-db-test-'));
process.env.DISABLE_CLOUD_BACKUP = '1';
process.env.DB_PATH = path.join(directory, 'test.db');
const { default: db } = await import('../db/db.js');

test('native database preserves insert IDs and rolls back partial writes', async () => {
  try {
    db.exec('CREATE TABLE example (id INTEGER PRIMARY KEY, value TEXT UNIQUE)');
    assert.equal(db.prepare('INSERT INTO example (value) VALUES (?)').run('first').lastInsertRowid, 1);
    assert.throws(() => db.transaction(() => {
      db.prepare('INSERT INTO example (value) VALUES (?)').run('second');
      db.prepare('INSERT INTO example (value) VALUES (?)').run('first');
    }));
    assert.equal(db.prepare('SELECT COUNT(*) AS count FROM example').get().count, 1);
    db.transaction(() => db.prepare('INSERT INTO example (value) VALUES (?)').run('third'));
    assert.equal(db.prepare('SELECT COUNT(*) AS count FROM example').get().count, 2);
  } finally { await db.close(); rmSync(directory, { recursive: true }); }
});
