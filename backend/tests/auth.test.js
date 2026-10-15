const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/index');

const EMAIL = process.env.DOCTOR_EMAIL;
const PASSWORD = process.env.DOCTOR_TEST_PASSWORD; // solo en .env del servidor, nunca en git
const hasCreds = Boolean(EMAIL && PASSWORD);

describe('login del doctor', () => {
  it('400 sin email o clave', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: '' });
    assert.equal(res.status, 400);
  });

  it('401 con clave incorrecta', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'nadie@x.com', password: 'mala' });
    assert.equal(res.status, 401);
  });

  it('200 con credenciales correctas y devuelve token', { skip: !hasCreds }, async () => {
    const res = await request(app).post('/api/auth/login').send({ email: EMAIL, password: PASSWORD });
    assert.equal(res.status, 200);
    assert.ok(res.body.token);
    assert.equal(res.body.expiresIn, '12h');
  });
});
