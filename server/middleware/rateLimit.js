export function rateLimit({ limit = 30, windowMs = 15 * 60 * 1000, key = req => req.ip } = {}) {
  const entries = new Map();
  return (req, res, next) => {
    const now = Date.now();
    const id = String(key(req));
    let entry = entries.get(id);
    if (!entry || entry.until <= now) { entry = { count: 0, until: now + windowMs }; entries.set(id, entry); }
    if (++entry.count > limit) return res.status(429).set('Retry-After', String(Math.ceil((entry.until - now) / 1000))).json({ error: 'Too many attempts. Please try again later.' });
    if (entries.size > 10000) for (const [id, value] of entries) if (value.until <= now) entries.delete(id);
    next();
  };
}
