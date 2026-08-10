import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

router.get('/config', (req, res) => {
  try {
    const configPath = path.resolve(__dirname, '../config/snippetDurations.json');
    const rawData = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(rawData);
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load audio configuration' });
  }
});

export default router;
