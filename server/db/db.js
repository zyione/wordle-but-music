import { DatabaseSync, backup } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
const directory = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(directory, '../.env') });
const resolvedPath = path.resolve(directory, '..', process.env.DB_PATH || './data/songs.db');
fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });

// Backups are server-only. Never use browser/anonymous Supabase credentials.
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
export const supabase = process.env.DISABLE_CLOUD_BACKUP === '1' ? null : url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
export const backupState = { status: supabase ? 'starting' : 'disabled' };
let cloudReady = false;
if (supabase) {
  try {
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) throw new Error('Private database backup requires a Supabase service-role key');
  const existing = buckets.find(b => b.name === 'database');
  const result = existing ? await supabase.storage.updateBucket('database', { public: false }) : await supabase.storage.createBucket('database', { public: false });
  if (result.error) throw new Error('Unable to secure database backup bucket');
  if (!fs.existsSync(resolvedPath)) {
    const { data, error: downloadError } = await supabase.storage.from('database').download('songs.db');
    if (data) fs.writeFileSync(resolvedPath, Buffer.from(await data.arrayBuffer()));
    else if (downloadError && String(downloadError.statusCode) !== '404' && !/not found/i.test(downloadError.message)) throw new Error('Unable to restore database backup safely');
  }
  cloudReady = true;
  backupState.status = 'private';
  } catch (error) {
    // Keep local data available, but never upload a fresh database over a backup
    // that could not be restored or whose access policy was not verified.
    backupState.status = 'unavailable';
    console.error('Cloud backup unavailable; using local SQLite only:', error.message);
  }
}

const sqlite = new DatabaseSync(resolvedPath);
// Keep the legacy schema compatible; new game writes use explicit transactions.
sqlite.exec('PRAGMA journal_mode = WAL; PRAGMA synchronous = FULL; PRAGMA busy_timeout = 5000;');
let dirty = false;
let transactionDepth = 0;
let syncing = null;

export async function flushBackup() {
  if (!supabase || !cloudReady) return;
  if (syncing) { await syncing; if (!dirty) return; }
  if (!dirty) return;
  dirty = false;
  syncing = (async () => {
    const snapshot = `${resolvedPath}.backup`;
    try {
      await backup(sqlite, snapshot);
      const { error } = await supabase.storage.from('database').upload('songs.db', fs.readFileSync(snapshot), { upsert: true, contentType: 'application/x-sqlite3' });
      if (error) throw error;
    } catch (error) { dirty = true; console.error('Database backup failed:', error.message); }
    finally { if (fs.existsSync(snapshot)) fs.unlinkSync(snapshot); }
  })();
  try { await syncing; } finally { syncing = null; }
}
const timer = setInterval(() => { flushBackup(); }, 15000);
timer.unref();

const params = args => (args.length === 1 && Array.isArray(args[0]) ? args[0] : args).map(v => v === undefined ? null : v);
const db = {
  exec(sql) { sqlite.exec(sql); dirty = true; },
  prepare(sql) {
    const statement = sqlite.prepare(sql);
    return {
      run(...args) { const result = statement.run(...params(args)); dirty = true; return { changes: Number(result.changes), lastInsertRowid: Number(result.lastInsertRowid) }; },
      get(...args) { const result = statement.get(...params(args)); if (/^\s*(INSERT|UPDATE|DELETE)/i.test(sql)) dirty = true; return result; },
      all(...args) { return statement.all(...params(args)); },
    };
  },
  transaction(fn) {
    if (transactionDepth) return fn();
    sqlite.exec('BEGIN IMMEDIATE');
    transactionDepth++;
    try {
      const result = fn();
      if (result && typeof result.then === 'function') throw new Error('Database transactions must be synchronous');
      sqlite.exec('COMMIT'); dirty = true;
      return result;
    } catch (error) { sqlite.exec('ROLLBACK'); throw error; }
    finally { transactionDepth--; }
  },
  async close() { clearInterval(timer); await flushBackup(); sqlite.close(); },
};
let stopping = false;
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, async () => {
  if (stopping) return;
  stopping = true;
  await db.close();
  process.exit(0);
});
export default db;
