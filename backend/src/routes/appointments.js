const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const pool = require('../db/pool');
const requireAuth = require('../middleware/requireAuth');
const { sendMail } = require('../utils/email');

const router = express.Router();

function generateTempPassword() {
  // 10 caracteres, fácil de leer (sin caracteres ambiguos tipo 0/O, 1/l)
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  return Array.from(crypto.randomFillSync(new Uint8Array(10)))
    .map((n) => chars[n % chars.length])
    .join('');
}

// POST /api/appointments -> agendar la valoración inicial (flujo público)
// Si la cédula/email no existen todavía, crea la cuenta del paciente y le envía la clave.
router.post('/', async (req, res) => {
  const { cedula, client_name, client_email, client_phone, service_id, appointment_date, start_time } = req.body;

  if (!cedula || !client_name || !client_email || !service_id || !appointment_date || !start_time) {
    return res.status(400).json({ error: 'Faltan campos requeridos (cédula, nombre, email, servicio, fecha, hora)' });
  }

  const db = await pool.connect();
  try {
    await db.query('BEGIN');

    const { rows: existing } = await db.query(
      `SELECT id, cedula, email FROM patients WHERE cedula = $1 OR email = $2`,
      [cedula, client_email]
    );

    let patientId;
    let newAccountCreated = false;
    let tempPassword = null;

    if (existing.length > 0) {
      patientId = existing[0].id;
      await db.query(
        `UPDATE patients SET name = $1, phone = $2 WHERE id = $3`,
        [client_name, client_phone, patientId]
      );
    } else {
      tempPassword = generateTempPassword();
      const passwordHash = await bcrypt.hash(tempPassword, 10);
      const { rows: created } = await db.query(
        `INSERT INTO patients (cedula, name, email, phone, password_hash)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [cedula, client_name, client_email, client_phone, passwordHash]
      );
      patientId = created[0].id;
      newAccountCreated = true;
    }

    const { rows: takenRows } = await db.query(
      `SELECT id FROM appointments WHERE appointment_date = $1 AND start_time = $2 AND status != 'cancelled'`,
      [appointment_date, start_time]
    );
    if (takenRows.length > 0) {
      await db.query('ROLLBACK');
      return res.status(409).json({ error: 'Ese horario ya fue reservado, elige otro' });
    }

    const { rows: apptRows } = await db.query(
      `INSERT INTO appointments (patient_id, service_id, appointment_date, start_time, status)
       VALUES ($1, $2, $3, $4, 'pending')
       RETURNING id`,
      [patientId, service_id, appointment_date, start_time]
    );

    await db.query('COMMIT');

    if (newAccountCreated) {
      // Fuera de la transacción a propósito: si el correo falla, la cita ya quedó guardada.
      sendMail({
        to: client_email,
        subject: 'Tu cuenta en Dr. Jorge Jiménez — Estética Dental y Facial',
        text: `Hola ${client_name},\n\nCreamos tu cuenta para que puedas ver tus citas y tratamientos.\n\nUsuario: ${client_email}\nContraseña temporal: ${tempPassword}\n\nPuedes cambiarla luego de iniciar sesión.\n\nTu cita quedó registrada, te confirmaremos pronto.`,
      }).catch((err) => console.error('No se pudo enviar el correo de bienvenida:', err));
    }

    res.status(201).json({ appointment_id: apptRows[0].id, status: 'pending', account_created: newAccountCreated });
  } catch (err) {
    await db.query('ROLLBACK');
    console.error(err);
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Ya existe una cuenta con esa cédula o correo pero con otro dato — verifica tus datos.' });
    }
    res.status(500).json({ error: 'Error al crear la cita' });
  } finally {
    db.release();
  }
});

// GET /api/appointments -> listado para el dashboard del doctor (protegido)
router.get('/', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT a.id, a.appointment_date, a.start_time, a.status, a.amount_paid, a.payment_status,
             p.name AS client_name, p.email AS client_email, p.phone AS client_phone, p.cedula,
             s.name_es AS service_name
      FROM appointments a
      JOIN patients p ON p.id = a.patient_id
      JOIN services s ON s.id = a.service_id
      ORDER BY a.appointment_date DESC, a.start_time DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al listar citas' });
  }
});

// PATCH /api/appointments/:id -> el doctor confirma, cancela o completa una cita (protegido)
router.patch('/:id', requireAuth, async (req, res) => {
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

// GET /api/appointments/stats/revenue -> ingresos para el dashboard (protegido)
router.get('/stats/revenue', requireAuth, async (req, res) => {
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
