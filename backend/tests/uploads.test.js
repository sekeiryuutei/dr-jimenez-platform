const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/index');

const EMAIL = process.env.DOCTOR_EMAIL;
const PASSWORD = process.env.DOCTOR_TEST_PASSWORD;
const hasCreds = Boolean(EMAIL && PASSWORD);

describe('subida de imagenes', () => {
  it('rechaza SVG con 400 (evita XSS almacenado)', { skip: !hasCreds }, async () => {
    const login = await request(app).post('/api/auth/login').send({ email: EMAIL, password: PASSWORD });
    assert.equal(login.status, 200);
    const res = await request(app)
      .post('/api/admin/gallery')
      .set('Authorization', `Bearer ${login.body.token}`)
      .attach('image', Buffer.from('<svg></svg>'), { filename: 'evil.svg', contentType: 'image/svg+xml' });
    assert.equal(res.status, 400);
    assert.match(res.body.error, /JPG/i);
  });

  it('401 sin token aunque el archivo sea valido', async () => {
    const res = await request(app)
      .post('/api/admin/gallery')
      .attach('image', Buffer.from('x'), { filename: 'a.jpg', contentType: 'image/jpeg' });
    assert.equal(res.status, 401);
  });
});
