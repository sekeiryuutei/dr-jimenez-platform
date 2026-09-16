const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');
const requirePatientAuth = require('../middleware/requirePatientAuth');

const router = express.Router();

// POST /api/patient-auth/login -> login del paciente (con email o cédula)
router.post('/patient-auth/login', async (req, res) => {
  const { identifier, password } = req.body;
  if (!identifier || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
  }

  try {
    const { rows } = await pool.query(
      `SELECT id, name, email, cedula, password_hash FROM patients WHERE email = $1 OR cedula = $1`,
      [identifier.trim()]
    );
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const patient = rows[0];
    const match = await bcrypt.compare(password, patient.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
      { patientId: patient.id, email: patient.email, role: 'patient' },
      process.env.JWT_SECRET,
      { expiresIn: '12h' }
    );
    res.json({ token, name: patient.name });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

// GET /api/patient/me -> datos del paciente logueado
router.get('/patient/me', requirePatientAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, email, cedula, phone FROM patients WHERE id = $1`,
      [req.patient.patientId]
    );
    res.json(rows[0] || null);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al consultar el perfil' });
  }
});

// GET /api/patient/appointments -> historial y citas del paciente logueado
router.get('/patient/appointments', requirePatientAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT a.id, a.appointment_date, a.start_time, a.status, a.amount_paid, a.payment_status,
              s.name_es AS service_name
       FROM appointments a
       JOIN services s ON s.id = a.service_id
       WHERE a.patient_id = $1
       ORDER BY a.appointment_date DESC, a.start_time DESC`,
      [req.patient.patientId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al consultar tus citas' });
  }
});

// PATCH /api/patient/appointments/:id/cancel -> el paciente cancela su propia cita pendiente
router.patch('/patient/appointments/:id/cancel', requirePatientAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, status FROM appointments WHERE id = $1 AND patient_id = $2`,
      [req.params.id, req.patient.patientId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Cita no encontrada' });
    if (rows[0].status === 'completed') {
      return res.status(400).json({ error: 'No puedes cancelar una cita ya completada' });
    }

    await pool.query(`UPDATE appointments SET status = 'cancelled' WHERE id = $1`, [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al cancelar la cita' });
  }
});

module.exports = router;
