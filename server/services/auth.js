import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import db from '../db/db.js';
export const tokenHash = token => createHash('sha256').update(token).digest('hex');
export function hashPin(pin) {
  const salt = randomBytes(16).toString('hex');
  return `scrypt$${salt}$${scryptSync(String(pin), salt, 32).toString('hex')}`;
}
export function verifyPin(pin, encoded) {
  if (!encoded?.startsWith('scrypt$')) return false;
  try {
    const [, salt, expected] = encoded.split('$');
    const actual = scryptSync(String(pin), salt, 32);
    const buffer = Buffer.from(expected, 'hex');
    return buffer.length === actual.length && timingSafeEqual(actual, buffer);
  } catch { return false; }
}
export function readSession(req) {
  const token = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(req.headers.authorization || '')?.[1];
  if (!token) return null;
  const session = db.prepare('SELECT * FROM auth_sessions WHERE token_hash = ? AND expires_at > ?').get(tokenHash(token), Date.now());
  return session ? { ...session, token } : null;
}
export function createSession() {
  const token = randomBytes(32).toString('base64url');
  const anonId = randomUUID();
  db.prepare('INSERT INTO auth_sessions (token_hash, anon_id, expires_at) VALUES (?, ?, ?)').run(tokenHash(token), anonId, Date.now() + 30 * 86400000);
  return { token, anonId };
}
export function requireSession(req, res, next) {
  const session = readSession(req);
  if (!session) return res.status(401).json({ error: 'Session expired. Please reload and sign in again.' });
  req.auth = session;
  req.identity = session.anon_id;
  req.query.anonId = req.identity;
  req.body = { ...req.body, anonId: req.identity, hostAnonId: req.identity };
  next();
}
