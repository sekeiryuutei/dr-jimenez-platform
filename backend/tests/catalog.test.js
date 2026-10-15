const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/index');

describe('catalogo publico', () => {
  it('GET /api/services lista servicios', async () => {
    const res = await request(app).get('/api/services');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body));
    assert.ok(res.body.length >= 8);
  });

  it('GET /api/gallery responde arreglo', async () => {
    const res = await request(app).get('/api/gallery');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body));
  });

  it('GET /api/blog responde arreglo', async () => {
    const res = await request(app).get('/api/blog');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body));
  });

  it('GET /api/transformations responde arreglo', async () => {
    const res = await request(app).get('/api/transformations');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body));
  });
});
