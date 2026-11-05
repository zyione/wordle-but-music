import express from 'express';
import db from '../db/db.js';
import { isTrustedAudioUrl } from '../services/audioPreview.js';
import { previewStore } from '../services/previewStore.js';
const router = express.Router();
router.get('/audio/proxy', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const songId = Number(req.query.songId);
    let song = Number.isSafeInteger(songId) && songId > 0 ? db.prepare('SELECT * FROM songs WHERE id = ?').get(songId) : null;
    const suppliedUrl = typeof req.query.url === 'string' ? req.query.url : null;
    if (suppliedUrl && !isTrustedAudioUrl(suppliedUrl)) return res.status(400).json({ error: 'Unsupported audio source' });
    if (!song && suppliedUrl) song = db.prepare('SELECT * FROM songs WHERE preview_url = ?').get(suppliedUrl);
    if (!song) return res.status(404).json({ error: 'Audio preview not found' });
    const clip = await previewStore.resolve(song.id, { refresh: req.query.refresh === '1' });
    if (!clip) return res.status(503).json({ error: 'No playable preview is currently available for this song.' });
    const { buffer, contentType } = clip;
    res.setHeader('Content-Type', contentType);
    res.setHeader('Accept-Ranges', 'bytes');
    const range = req.headers.range;
    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range);
      const start = match?.[1] ? Number(match[1]) : match?.[2] ? Math.max(0, buffer.length - Number(match[2])) : 0;
      const end = match?.[1] && match?.[2] ? Math.min(Number(match[2]), buffer.length - 1) : buffer.length - 1;
      if (!match || start > end || start >= buffer.length) return res.status(416).set('Content-Range', `bytes */${buffer.length}`).end();
      return res.status(206).set('Content-Range', `bytes ${start}-${end}/${buffer.length}`).send(buffer.subarray(start, end + 1));
    }
    res.send(buffer);
  } catch (error) {
    console.error('Audio proxy failed:', error.message);
    res.status(502).json({ error: 'Audio temporarily unavailable. Please retry.' });
  }
});
export default router;
