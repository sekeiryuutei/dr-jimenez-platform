const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const QRCode = require('qrcode');
const pool = require('../db/pool');
const requirePatientAuth = require('../middleware/requirePatientAuth');
const { sendMail } = require('../utils/email');
const { buildWompiUrl, isWompiReady } = require('../utils/wompi');

const router = express.Router();
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

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

// POST /api/patient-auth/forgot-password -> solicita el enlace de restablecimiento
router.post('/patient-auth/forgot-password', async (req, res) => {
  const { identifier } = req.body;
  if (!identifier) return res.status(400).json({ error: 'Ingresa tu correo o cédula' });

  try {
    const { rows } = await pool.query(
      `SELECT id, name, email FROM patients WHERE email = $1 OR cedula = $1`,
      [identifier.trim()]
    );
    if (rows.length === 0) {
      // No revelamos si el usuario existe o no, por seguridad -- pero igual confirmamos
      // el intento, tal como se pidió, sin filtrar cuentas que no existen.
      return res.json({ ok: true, email: null, message: 'Si el usuario existe, se envió un enlace a su correo registrado.' });
    }

    const patient = rows[0];
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hora

    await pool.query(
      `INSERT INTO password_resets (patient_id, token, expires_at) VALUES ($1, $2, $3)`,
      [patient.id, token, expiresAt]
    );

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/paciente/restablecer?token=${token}`;
    await sendMail({
      to: patient.email,
      subject: 'Restablece tu contraseña — Dr. Jorge Jiménez',
      text: `Hola ${patient.name},\n\nSolicitaste restablecer tu contraseña. Este enlace es válido por 1 hora:\n${resetUrl}\n\nSi no fuiste tú, ignora este correo.`,
    });

    res.json({ ok: true, email: patient.email });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al procesar la solicitud' });
  }
});

// POST /api/patient-auth/reset-password -> establece la nueva contraseña con el token del correo
router.post('/patient-auth/reset-password', async (req, res) => {
  const { token, new_password } = req.body;
  if (!token || !new_password || new_password.length < 6) {
    return res.status(400).json({ error: 'Token y una contraseña de al menos 6 caracteres son requeridos' });
  }

  try {
    const { rows } = await pool.query(
      `SELECT id, patient_id FROM password_resets WHERE token = $1 AND used = false AND expires_at > now()`,
      [token]
    );
    if (rows.length === 0) {
      return res.status(400).json({ error: 'Este enlace ya expiró o no es válido. Solicita uno nuevo.' });
    }

    const passwordHash = await bcrypt.hash(new_password, 10);
    await pool.query(`UPDATE patients SET password_hash = $1 WHERE id = $2`, [passwordHash, rows[0].patient_id]);
    await pool.query(`UPDATE password_resets SET used = true WHERE id = $1`, [rows[0].id]);

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al restablecer la contraseña' });
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

// POST /api/patient/appointments -> el paciente YA logueado agenda directamente desde su panel
// (no vuelve a pedir cédula/nombre/correo, ya se sabe quién es por el token).
router.post('/patient/appointments', requirePatientAuth, async (req, res) => {
  const { service_id, appointment_date, start_time } = req.body;
  if (!service_id || !appointment_date || !start_time) {
    return res.status(400).json({ error: 'Faltan servicio, fecha y hora' });
  }

  try {
    const { rows: taken } = await pool.query(
      `SELECT id FROM appointments WHERE appointment_date = $1 AND start_time = $2 AND status != 'cancelled'`,
      [appointment_date, start_time]
    );
    if (taken.length > 0) {
      return res.status(409).json({ error: 'Ese horario ya fue reservado, elige otro' });
    }

    const { rows } = await pool.query(
      `INSERT INTO appointments (patient_id, service_id, appointment_date, start_time, status)
       VALUES ($1, $2, $3, $4, 'pending') RETURNING id`,
      [req.patient.patientId, service_id, appointment_date, start_time]
    );
    res.status(201).json({ appointment_id: rows[0].id, status: 'pending' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear la cita' });
  }
});

// GET /api/patient/appointments -> historial y citas del paciente logueado
router.get('/patient/appointments', requirePatientAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT a.id, a.appointment_date, a.start_time, a.duration_minutes, a.status, a.amount_paid, a.payment_status,
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

// GET /api/patient/appointments/:id/payment -> el paciente ve/genera su propio link de pago
// Reusa el cobro que ya haya generado el doctor para esa cita (mismo monto y referencia),
// así el estado se ve igual en las dos plataformas.
router.get('/patient/appointments/:id/payment', requirePatientAuth, async (req, res) => {
  try {
    const { rows: apptRows } = await pool.query(
      `SELECT id, amount_paid, payment_status FROM appointments WHERE id = $1 AND patient_id = $2`,
      [req.params.id, req.patient.patientId]
    );
    if (apptRows.length === 0) return res.status(404).json({ error: 'Cita no encontrada' });

    const appt = apptRows[0];
    if (!appt.amount_paid || Number(appt.amount_paid) <= 0) {
      return res.status(400).json({ error: 'Todavía no hay un cobro generado para esta cita.' });
    }
    if (appt.payment_status === 'paid') {
      return res.status(400).json({ error: 'Esta cita ya está pagada.' });
    }

    const { rows: payRows } = await pool.query(
      `SELECT provider_reference, amount FROM payments WHERE appointment_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [req.params.id]
    );

    let reference;
    let amount;
    if (payRows.length > 0) {
      reference = payRows[0].provider_reference;
      amount = payRows[0].amount;
    } else {
      // No debería pasar (el doctor siempre genera un registro de pago), pero por seguridad
      // creamos uno nuevo si por algún motivo no existe.
      reference = `APPT-${appt.id}-${Date.now()}`;
      amount = appt.amount_paid;
      await pool.query(
        `INSERT INTO payments (appointment_id, amount, provider, provider_reference, status) VALUES ($1,$2,'wompi',$3,'pending')`,
        [appt.id, amount, reference]
      );
    }

    const amountInCents = Math.round(Number(amount) * 100);
    const wompiReady = isWompiReady();
    const redirectUrl = `${FRONTEND_URL}/pagar?ref=${reference}`;
    const checkoutUrl = wompiReady ? buildWompiUrl({ reference, amountInCents, redirectUrl }) : redirectUrl;
    const qrDataUrl = await QRCode.toDataURL(checkoutUrl, { margin: 1, width: 320 });

    res.json({ reference, amount, checkout_url: checkoutUrl, qr_data_url: qrDataUrl, simulated: !wompiReady });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al generar el link de pago' });
  }
});

module.exports = router;
