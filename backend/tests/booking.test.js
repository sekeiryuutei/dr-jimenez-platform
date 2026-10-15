const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/index');

const base = {
  cedula: '123', client_name: 'Prueba', client_email: 'prueba@x.com',
  service_id: 1, appointment_date: '2030-06-15', start_time: '10:00',
};

describe('validacion de agendamiento (sin escribir en DB)', () => {
  it('400 si faltan campos', async () => {
    const res = await request(app).post('/api/appointments').send({});
    assert.equal(res.status, 400);
  });

  it('400 con email invalido', async () => {
    const res = await request(app).post('/api/appointments').send({ ...base, client_email: 'no-es-email' });
    assert.equal(res.status, 400);
    assert.match(res.body.error, /correo/i);
  });

  it('400 con fecha pasada', async () => {
    const res = await request(app).post('/api/appointments').send({ ...base, appointment_date: '2020-01-01' });
    assert.equal(res.status, 400);
    assert.match(res.body.error, /pasada/i);
  });
});
