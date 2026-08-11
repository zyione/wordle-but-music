import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const dbPath = process.env.DB_PATH || './data/songs.db';
const resolvedPath = path.resolve(__dirname, '..', dbPath);

const dbDir = path.dirname(resolvedPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Supabase client instance setup
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

export const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

// Download remote persistent database from Supabase Cloud on boot if configured
if (supabase) {
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    if (!buckets?.some(b => b.name === 'database')) {
      await supabase.storage.createBucket('database', { public: true });
    }

    const { data, error } = await supabase.storage.from('database').download('songs.db');
    if (data && !error) {
      const arrayBuffer = await data.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      fs.writeFileSync(resolvedPath, buffer);
      console.log('☁️ Successfully restored persistent database from Supabase Cloud!');
    } else {
      console.log('☁️ No remote database found in Supabase Cloud yet. Starting fresh instance.');
    }
  } catch (err) {
    console.warn('☁️ Supabase Cloud boot download warning:', err.message);
  }
}

const SQL = await initSqlJs();

let dbInstance;
if (fs.existsSync(resolvedPath)) {
  const filebuffer = fs.readFileSync(resolvedPath);
  dbInstance = new SQL.Database(filebuffer);
} else {
  dbInstance = new SQL.Database();
}

let syncTimer = null;
function syncToSupabase() {
  if (!supabase) return;
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(async () => {
    try {
      if (!fs.existsSync(resolvedPath)) return;
      const fileBuffer = fs.readFileSync(resolvedPath);
      const { error } = await supabase.storage.from('database').upload('songs.db', fileBuffer, {
        upsert: true,
        contentType: 'application/x-sqlite3'
      });
      if (error) {
        console.warn('☁️ Supabase sync warning:', error.message);
      } else {
        console.log('☁️ Database synced to Supabase Cloud Storage.');
      }
    } catch (err) {
      console.warn('☁️ Supabase sync error:', err.message);
    }
  }, 1500);
}

function saveDb() {
  try {
    const data = dbInstance.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(resolvedPath, buffer);
    syncToSupabase();
  } catch (err) {
    console.error('Error saving SQLite database file:', err);
  }
}

// Clean wrapper mimicking better-sqlite3 API for local & test environments
const db = {
  exec: (sql) => {
    dbInstance.exec(sql);
    saveDb();
  },
  prepare: (sql) => {
    return {
      run: (...args) => {
        let params = args;
        if (args.length === 1 && Array.isArray(args[0])) params = args[0];
        dbInstance.run(sql, params);
        saveDb();
        const res = dbInstance.exec('SELECT last_insert_rowid() as id');
        const lastInsertRowid = res[0] && res[0].values && res[0].values[0] ? res[0].values[0][0] : 0;
        return { lastInsertRowid };
      },
      get: (...args) => {
        let params = args;
        if (args.length === 1 && Array.isArray(args[0])) params = args[0];
        const stmt = dbInstance.prepare(sql);
        stmt.bind(params);
        if (stmt.step()) {
          const row = stmt.getAsObject();
          stmt.free();
          return row;
        }
        stmt.free();
        return undefined;
      },
      all: (...args) => {
        let params = args;
        if (args.length === 1 && Array.isArray(args[0])) params = args[0];
        const stmt = dbInstance.prepare(sql);
        stmt.bind(params);
        const rows = [];
        while (stmt.step()) {
          rows.push(stmt.getAsObject());
        }
        stmt.free();
        return rows;
      }
    };
  }
};

// Sync on process termination (e.g., Render container shutdown)
process.on('SIGINT', () => {
  saveDb();
  process.exit(0);
});
process.on('SIGTERM', () => {
  saveDb();
  process.exit(0);
});

export default db;
