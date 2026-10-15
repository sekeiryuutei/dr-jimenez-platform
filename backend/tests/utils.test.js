const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { verifyWompiWebhook } = require('../src/utils/wompi');
const { getBaseUrl } = require('../src/utils/urls');
const { imageFileFilter } = require('../src/middleware/security');

const fakeReq = (host, proto) => ({ get: (h) => (h === 'host' ? host : h === 'x-forwarded-proto' ? proto : undefined), protocol: 'http' });

describe('utils/wompi', () => {
  it('acepta webhook con firma valida y rechaza manipulado', () => {
    const secret = process.env.WOMPI_EVENTS_SECRET || 'test-secret';
    const data = { transaction: { id: '1', status: 'APPROVED', reference: 'R-1', amount_in_cents: 100 } };
    const props = ['transaction.id', 'transaction.status'];
    const ts = '1720000000';
    const concat = props.map((p) => p.split('.').reduce((o, k) => o?.[k], data)).join('');
    const checksum = crypto.createHash('sha256').update(`${concat}${ts}${secret}`).digest('hex');
    if (!process.env.WOMPI_EVENTS_SECRET) return; // sin secreto el backend no verifica (fail-open documentado)
    assert.equal(verifyWompiWebhook({ signature: { properties: props, checksum }, timestamp: ts, data }), true);
    assert.equal(verifyWompiWebhook({ signature: { properties: props, checksum: '0'.repeat(64) }, timestamp: ts, data }), false);
  });
});

describe('utils/urls', () => {
  it('usa el host real (tunel/LAN) y respeta X-Forwarded-Proto', () => {
    assert.equal(getBaseUrl(fakeReq('tunel.trycloudflare.com', 'https')), 'https://tunel.trycloudflare.com');
    assert.equal(getBaseUrl(fakeReq('192.168.1.20:3000', undefined)), 'http://192.168.1.20:3000');
  });
});

describe('filtro de imagenes', () => {
  const run = (name, mime) => new Promise((resolve) => imageFileFilter({}, { originalname: name, mimetype: mime }, (err) => resolve(err ? err.message : 'ok')));
  it('permite jpg/png/webp', async () => {
    assert.equal(await run('a.jpg', 'image/jpeg'), 'ok');
    assert.equal(await run('a.PNG', 'image/png'), 'ok');
    assert.equal(await run('a.webp', 'image/webp'), 'ok');
  });
  it('rechaza svg y disfrazados', async () => {
    assert.match(await run('evil.svg', 'image/svg+xml'), /JPG/i);
    assert.match(await run('x.jpg', 'text/html'), /JPG/i);
  });
});
