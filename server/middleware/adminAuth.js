import { createHash, timingSafeEqual } from 'node:crypto';
const digest = value => createHash('sha256').update(value).digest();
export function requireAdmin(req, res, next) {
  const expected = process.env.ADMIN_TOKEN;
  const supplied = String(req.headers.authorization || '').replace(/^Bearer /, '');
  if (!expected || !supplied || !timingSafeEqual(digest(expected), digest(supplied))) return res.status(401).json({ error: 'Administrator authentication required' });
  next();
}
