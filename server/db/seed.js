import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './db.js';
import { migrate } from './migrate.js';
import { scheduleToday } from './scheduleToday.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function seed() {
  migrate();

  console.log('Seeding songs database with pre-populated track metadata...');
  const seedListPath = path.resolve(__dirname, 'seedList.json');
  const seedList = JSON.parse(fs.readFileSync(seedListPath, 'utf-8'));

  const insertStmt = db.prepare(`
    INSERT INTO songs (title, artist, album, artwork_url, preview_url, source, source_track_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(source_track_id) DO UPDATE SET
      title = excluded.title,
      artist = excluded.artist,
      album = excluded.album,
      artwork_url = excluded.artwork_url,
      preview_url = excluded.preview_url
  `);

  let addedCount = 0;

  for (let i = 0; i < seedList.length; i++) {
    const item = seedList[i];
    if (item.preview_url && item.title && item.artist) {
      try {
        insertStmt.run(
          item.title,
          item.artist,
          item.album || 'Hit Track',
          item.artwork_url || '',
          item.preview_url,
          item.source || 'deezer',
          item.source_track_id || `seed_${i}_${item.title}`
        );
        addedCount++;
      } catch (err) {
        console.warn(`Error inserting ${item.title}:`, err.message);
      }
    }
  }

  console.log(`\nSeeding completed! Successfully added/updated ${addedCount} songs instantly.`);

  // Auto schedule today's puzzle
  scheduleToday();
}

export async function seedIfEmpty() {
  migrate();
  try {
    const row = db.prepare('SELECT COUNT(*) as count FROM songs').get();
    if (!row || row.count === 0) {
      console.log('Database empty! Auto-seeding initial songs instantly on boot...');
      await seed();
    } else {
      scheduleToday();
    }
  } catch (err) {
    console.error('Error checking song count:', err.message);
    scheduleToday();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  seed();
}
