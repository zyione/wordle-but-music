import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './db.js';
import { migrate } from './migrate.js';
import { fetchTrackMetadata } from '../services/deezerClient.js';
import { scheduleToday } from './scheduleToday.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function seed() {
  migrate();

  console.log('Seeding songs database via Deezer API...');
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
  for (const item of seedList) {
    try {
      console.log(`Fetching metadata for: ${item.title} - ${item.artist}`);
      const meta = await fetchTrackMetadata(item.title, item.artist);
      if (meta) {
        insertStmt.run(
          meta.title,
          meta.artist,
          meta.album,
          meta.artwork_url,
          meta.preview_url,
          meta.source,
          meta.source_track_id
        );
        addedCount++;
        console.log(` Saved: ${meta.title} by ${meta.artist}`);
      } else {
        console.warn(` Could not find preview for: ${item.title} - ${item.artist}`);
      }
    } catch (err) {
      console.error(` Error processing ${item.title}:`, err.message);
    }
    await delay(200); // Respect Deezer rate limits
  }

  console.log(`\nSeeding completed! Successfully added/updated ${addedCount} songs.`);

  // Auto schedule today's puzzle
  scheduleToday();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  seed();
}
