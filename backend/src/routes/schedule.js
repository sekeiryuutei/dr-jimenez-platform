const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const pool = require('../db/pool');
const requireAuth = require('../middleware/requireAuth');
const { sendMail } = require('../utils/email');

const router = express.Router();

function generateTempPassword() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  return Array.from(crypto.randomFillSync(new Uint8Array(10)))
    .map((n) => chars[n % chars.length])
    .join('');
}

// POST /api/admin/appointments -> el doctor/asistente crea una cita directamente (protegido)
// A diferencia del flujo público, aquí se pueden agendar tratamientos de seguimiento,
// no solo la valoración inicial de 20 minutos.
router.post('/admin/appointments', requireAuth, async (req, res) => {
  const { cedula, client_name, client_email, client_phone, service_id, appointment_date, start_time, status } = req.body;

  if (!cedula || !client_name || !client_email || !service_id || !appointment_date || !start_time) {
    return res.status(400).json({ error: 'Faltan campos requeridos' });
  }

  const db = await pool.connect();
  try {
    await db.query('BEGIN');

    const { rows: existing } = await db.query(
      `SELECT id FROM patients WHERE cedula = $1 OR email = $2`,
      [cedula, client_email]
    );

    let patientId;
    let newAccountCreated = false;
    let tempPassword = null;

    if (existing.length > 0) {
      patientId = existing[0].id;
      await db.query(`UPDATE patients SET name = $1, phone = $2 WHERE id = $3`, [client_name, client_phone, patientId]);
    } else {
      tempPassword = generateTempPassword();
      const passwordHash = await bcrypt.hash(tempPassword, 10);
      const { rows: created } = await db.query(
        `INSERT INTO patients (cedula, name, email, phone, password_hash) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
        [cedula, client_name, client_email, client_phone, passwordHash]
      );
      patientId = created[0].id;
      newAccountCreated = true;
    }

    const { rows: taken } = await db.query(
      `SELECT id FROM appointments WHERE appointment_date = $1 AND start_time = $2 AND status != 'cancelled'`,
      [appointment_date, start_time]
    );
    if (taken.length > 0) {
      await db.query('ROLLBACK');
      return res.status(409).json({ error: 'Ese horario ya está ocupado' });
    }

    const { rows: appt } = await db.query(
      `INSERT INTO appointments (patient_id, service_id, appointment_date, start_time, status)
       VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [patientId, service_id, appointment_date, start_time, status || 'confirmed']
    );

    await db.query('COMMIT');

    if (newAccountCreated) {
      sendMail({
        to: client_email,
        subject: 'Tu cuenta en Dr. Jorge Jiménez — Estética Dental y Facial',
<<<<<<< HEAD
        text: `Hola ${client_name},\n\nCreamos tu cuenta para que puedas ver tus citas y tratamientos.\n\nUsuario: ${client_email}\nContraseña temporal: ${tempPassword}\n\nTu cita quedó registrada.`,
=======
        text: `Hola ${client_name},\n\nhttp://localhost:3000/paciente/login\n\n Creamos tu cuenta para que puedas ver tus citas y tratamientos.\n\nUsuario: ${client_email}\nContraseña temporal: ${tempPassword}\n\nTu cita quedó registrada.`,
>>>>>>> e21f803 (cambios, 90%)
      }).catch((err) => console.error('No se pudo enviar el correo:', err));
    }

    res.status(201).json({ appointment_id: appt[0].id, account_created: newAccountCreated });
  } catch (err) {
    await db.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Error al crear la cita' });
  } finally {
    db.release();
  }
});

// PATCH /api/admin/appointments/:id/reschedule -> mover una cita a otra fecha/hora (protegido)
router.patch('/admin/appointments/:id/reschedule', requireAuth, async (req, res) => {
  const { appointment_date, start_time } = req.body;
  if (!appointment_date || !start_time) {
    return res.status(400).json({ error: 'Faltan fecha y hora nuevas' });
  }
  try {
    const { rows: taken } = await pool.query(
      `SELECT id FROM appointments WHERE appointment_date = $1 AND start_time = $2 AND status != 'cancelled' AND id != $3`,
      [appointment_date, start_time, req.params.id]
    );
    if (taken.length > 0) {
      return res.status(409).json({ error: 'Ese horario ya está ocupado' });
    }
    await pool.query(
      `UPDATE appointments SET appointment_date = $1, start_time = $2, status = 'confirmed' WHERE id = $3`,
      [appointment_date, start_time, req.params.id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al reagendar la cita' });
  }
});

// GET /api/admin/blocked-slots -> lista de bloqueos (protegido)
router.get('/admin/blocked-slots', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, block_date, start_time, end_time, reason FROM blocked_slots ORDER BY block_date, start_time`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al listar bloqueos' });
  }
});

// POST /api/admin/blocked-slots -> bloquear un rango de horario (protegido)
router.post('/admin/blocked-slots', requireAuth, async (req, res) => {
  const { block_date, start_time, end_time, reason } = req.body;
  if (!block_date || !start_time || !end_time) {
    return res.status(400).json({ error: 'Faltan fecha y horas' });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO blocked_slots (block_date, start_time, end_time, reason) VALUES ($1,$2,$3,$4) RETURNING *`,
      [block_date, start_time, end_time, reason || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al bloquear el horario' });
  }
});

// DELETE /api/admin/blocked-slots/:id -> quitar un bloqueo (protegido)
router.delete('/admin/blocked-slots/:id', requireAuth, async (req, res) => {
  try {
    await pool.query(`DELETE FROM blocked_slots WHERE id = $1`, [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al quitar el bloqueo' });
  }
});

module.exports = router;
