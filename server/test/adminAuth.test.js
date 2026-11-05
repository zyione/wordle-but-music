import test from 'node:test';
import assert from 'node:assert/strict';
import { requireAdmin } from '../middleware/adminAuth.js';
test('admin API fails closed and accepts only the configured token', () => {
  const old = process.env.ADMIN_TOKEN;
  const check = token => { let status = 200; let allowed = false; requireAdmin({ headers: { authorization: token ? `Bearer ${token}` : '' } }, { status: value => { status = value; return { json() {} }; } }, () => { allowed = true; }); return {status,allowed}; };
  try {
    delete process.env.ADMIN_TOKEN;
    assert.equal(check('anything').allowed, false);
    process.env.ADMIN_TOKEN = 'test-admin-token';
    assert.equal(check('').status, 401);
    assert.equal(check('wrong').status, 401);
    assert.equal(check('test-admin-token').allowed, true);
  } finally { if (old === undefined) delete process.env.ADMIN_TOKEN; else process.env.ADMIN_TOKEN = old; }
});
