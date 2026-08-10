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

const SQL = await initSqlJs();

let dbInstance;
if (fs.existsSync(resolvedPath)) {
  const filebuffer = fs.readFileSync(resolvedPath);
  dbInstance = new SQL.Database(filebuffer);
} else {
  dbInstance = new SQL.Database();
}

function saveDb() {
  try {
    const data = dbInstance.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(resolvedPath, buffer);
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

// Supabase client instance (optional when SUPABASE_URL & SUPABASE_KEY are provided in production)
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

export const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

export default db;
