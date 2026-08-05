const express = require('express');
const pool = require('../db/pool');

const router = express.Router();

// POST /api/appointments -> agendar cita (flujo público)
router.post('/', async (req, res) => {
  const { client_name, client_email, client_phone, service_id, appointment_date, start_time } = req.body;

  if (!client_name || !client_email || !service_id || !appointment_date || !start_time) {
    return res.status(400).json({ error: 'Faltan campos requeridos' });
  }

  const clientDb = await pool.connect();
  try {
    await clientDb.query('BEGIN');

    const { rows: clientRows } = await clientDb.query(
      `INSERT INTO clients (name, email, phone)
       VALUES ($1, $2, $3)
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, phone = EXCLUDED.phone
       RETURNING id`,
      [client_name, client_email, client_phone]
    );
    const clientId = clientRows[0].id;

    const { rows: takenRows } = await clientDb.query(
      `SELECT id FROM appointments WHERE appointment_date = $1 AND start_time = $2 AND status != 'cancelled'`,
      [appointment_date, start_time]
    );
    if (takenRows.length > 0) {
      await clientDb.query('ROLLBACK');
      return res.status(409).json({ error: 'Ese horario ya fue reservado, elige otro' });
    }

    const { rows: apptRows } = await clientDb.query(
      `INSERT INTO appointments (client_id, service_id, appointment_date, start_time, status)
       VALUES ($1, $2, $3, $4, 'pending')
       RETURNING id`,
      [clientId, service_id, appointment_date, start_time]
    );

    await clientDb.query('COMMIT');
    res.status(201).json({ appointment_id: apptRows[0].id, status: 'pending' });
  } catch (err) {
    await clientDb.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Error al crear la cita' });
  } finally {
    clientDb.release();
  }
});

// GET /api/appointments -> listado para el dashboard del doctor
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT a.id, a.appointment_date, a.start_time, a.status, a.amount_paid, a.payment_status,
             c.name AS client_name, c.email AS client_email, c.phone AS client_phone,
             s.name_es AS service_name
      FROM appointments a
      JOIN clients c ON c.id = a.client_id
      JOIN services s ON s.id = a.service_id
      ORDER BY a.appointment_date DESC, a.start_time DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al listar citas' });
  }
});

// PATCH /api/appointments/:id -> el doctor confirma, cancela o completa una cita
router.patch('/:id', async (req, res) => {
  const { status } = req.body;
  const allowed = ['pending', 'confirmed', 'completed', 'cancelled'];
  if (!allowed.includes(status)) return res.status(400).json({ error: 'Status inválido' });

  try {
    await pool.query(`UPDATE appointments SET status = $1 WHERE id = $2`, [status, req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar la cita' });
  }
});

// GET /api/appointments/stats/revenue -> ingresos para el dashboard
router.get('/stats/revenue', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT date_trunc('month', appointment_date) AS month,
             SUM(amount_paid) AS total,
             COUNT(*) AS appointments_count
      FROM appointments
      WHERE payment_status != 'unpaid'
      GROUP BY month
      ORDER BY month DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al calcular ingresos' });
  }
});

module.exports = router;
