const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/index');

describe('infraestructura', () => {
  it('GET /health responde ok', async () => {
    const res = await request(app).get('/health');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { status: 'ok' });
  });

  it('cabeceras de seguridad presentes y sin HSTS (red local es http)', async () => {
    const res = await request(app).get('/health');
    assert.equal(res.headers['x-content-type-options'], 'nosniff');
    assert.ok(!res.headers['strict-transport-security']);
  });

  it('ruta inexistente devuelve 404 JSON', async () => {
    const res = await request(app).get('/api/no-existe-xyz');
    assert.equal(res.status, 404);
    assert.ok(res.body.error);
  });
});
