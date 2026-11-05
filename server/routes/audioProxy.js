import express from 'express';
import db from '../db/db.js';
import { fetchAudio, freshPreviewCandidates, fallbackPreviewCandidates, isExpiredPreview, isTrustedAudioUrl } from '../services/audioPreview.js';
const router = express.Router();
router.get('/audio/proxy', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const songId = Number(req.query.songId);
    let song = Number.isSafeInteger(songId) && songId > 0 ? db.prepare('SELECT * FROM songs WHERE id = ?').get(songId) : null;
    const suppliedUrl = typeof req.query.url === 'string' ? req.query.url : null;
    if (suppliedUrl && !isTrustedAudioUrl(suppliedUrl)) return res.status(400).json({ error: 'Unsupported audio source' });
    if (!song && suppliedUrl) song = db.prepare('SELECT * FROM songs WHERE preview_url = ?').get(suppliedUrl);
    let audioUrl = suppliedUrl || song?.preview_url;
    if (!audioUrl) return res.status(404).json({ error: 'Audio preview not found' });
    let response = req.query.refresh !== '1' && !isExpiredPreview(audioUrl) ? await fetchAudio(audioUrl) : null;
    if (!response && song) {
      for (const candidates of [freshPreviewCandidates, fallbackPreviewCandidates]) {
        for (const candidate of await candidates(song)) {
          response = await fetchAudio(candidate);
          if (response) { audioUrl = candidate; break; }
        }
        if (response) break;
      }
      if (response && audioUrl !== song.preview_url) db.prepare('UPDATE songs SET preview_url = ? WHERE id = ?').run(audioUrl, song.id);
    }
    if (!response) return res.status(502).json({ error: 'Preview temporarily unavailable. Please try again.' });
    const reader = response.body.getReader();
    const chunks = [];
    let length = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > 2 * 1024 * 1024) { await reader.cancel(); return res.status(502).json({ error: 'Invalid preview size' }); }
      chunks.push(Buffer.from(value));
    }
    const buffer = Buffer.concat(chunks);
    res.setHeader('Content-Type', response.headers.get('content-type') || 'audio/mpeg');
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
