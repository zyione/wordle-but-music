import db from '../db/db.js';
import { createPreviewStore } from './previewPlayback.js';
export const previewStore = createPreviewStore({
  lookupSong: id => db.prepare('SELECT * FROM songs WHERE id = ?').get(id),
  saveUrl: (id, url) => db.prepare('UPDATE songs SET preview_url = ? WHERE id = ?').run(url, id),
});
