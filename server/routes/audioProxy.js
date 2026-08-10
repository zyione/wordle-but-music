import express from 'express';

const router = express.Router();

// Proxy endpoint to bypass CORS & browser media streaming blocks in Firefox/Zen/Chrome
router.get('/audio/proxy', async (req, res) => {
  try {
    const audioUrl = req.query.url;
    if (!audioUrl) {
      return res.status(400).send('Missing url query parameter');
    }

    const response = await fetch(audioUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Referer': 'https://www.deezer.com/',
        'Origin': 'https://www.deezer.com',
        'Accept': '*/*'
      }
    });

    if (!response.ok) {
      console.warn(`Upstream Deezer return ${response.status} for audio proxy`);
      return res.status(response.status).send('Failed to fetch audio stream from upstream');
    }

    const contentType = response.headers.get('content-type') || 'audio/mpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=86400');

    const buffer = await response.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (error) {
    console.error('Audio proxy error:', error.message);
    res.status(500).send('Audio proxy error');
  }
});

export default router;
