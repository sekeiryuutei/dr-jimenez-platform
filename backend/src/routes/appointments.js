const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const pool = require('../db/pool');
const requireAuth = require('../middleware/requireAuth');
const { sendMail } = require('../utils/email');
const { sendWhatsApp } = require('../utils/whatsapp');
const { findOrValidatePatient } = require('../utils/patients');
const { bookingLimiter } = require('../middleware/security');
const { isPastInColombia } = require('../utils/time');

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
router.post('/', bookingLimiter, async (req, res) => {
  const { cedula, client_name, client_email, client_phone, service_id, appointment_date, start_time } = req.body;

  if (!cedula || !client_name || !client_email || !service_id || !appointment_date || !start_time) {
    return res.status(400).json({ error: 'Faltan campos requeridos (cédula, nombre, email, servicio, fecha, hora)' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(client_email)) {
    return res.status(400).json({ error: 'El correo no tiene un formato válido' });
  }
  const todayStr = new Date().toISOString().slice(0, 10);
  if (appointment_date < todayStr) {
    return res.status(400).json({ error: 'No se puede agendar en una fecha pasada' });
  }

  if (isPastInColombia(appointment_date, start_time)) {
    return res.status(400).json({ error: 'No es posible agendar citas en fechas u horarios pasados.' });
  }

  const db = await pool.connect();
  try {
    await db.query('BEGIN');

    const { existing, conflict } = await findOrValidatePatient(db, cedula, client_email);
    if (conflict) {
      await db.query('ROLLBACK');
      return res.status(409).json({ error: conflict });
    }

    let patientId;
    let newAccountCreated = false;
    let tempPassword = null;

    if (existing) {
      patientId = existing.id;
      await db.query(`UPDATE patients SET name = $1, phone = $2 WHERE id = $3`, [client_name, client_phone, patientId]);
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

    const portalUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/paciente`;

    if (newAccountCreated) {
      // Fuera de la transacción a propósito: si el correo falla, la cita ya quedó guardada.
      sendMail({
        to: client_email,
        subject: 'Tu cuenta en Dr. Jorge Jiménez — Estética Dental y Facial',
        text: `Hola ${client_name},\n\nCreamos tu cuenta para que puedas ver tus citas y tratamientos.\n\nUsuario: ${client_email}\nContraseña temporal: ${tempPassword}\n\nPuedes cambiarla luego de iniciar sesión.\n\nIngresa aquí para ver tus citas y pagos:\n${portalUrl}\n\nTu cita quedó registrada, te confirmaremos pronto.`,
      }).catch((err) => console.error('No se pudo enviar el correo de bienvenida:', err));
    }

    if (client_phone) {
      const whatsappText = newAccountCreated
        ? `Hola ${client_name}, tu cita quedó agendada para el ${appointment_date} a las ${start_time}. Creamos tu cuenta -- revisa tu correo (${client_email}) para la contraseña, o ingresa aquí: ${portalUrl}`
        : `Hola ${client_name}, tu cita quedó agendada para el ${appointment_date} a las ${start_time}. Puedes ver los detalles en ${portalUrl}`;
      sendWhatsApp(client_phone, whatsappText).catch((err) => console.error('No se pudo enviar el WhatsApp de confirmación:', err));
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
      SELECT a.id, a.appointment_date, a.start_time, a.duration_minutes, a.status, a.amount_paid, a.payment_status,
             p.id AS patient_id, p.name AS client_name, p.email AS client_email, p.phone AS client_phone, p.cedula,
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
// Al completar, el precio (amount_paid) es OBLIGATORIO, pero NO marca la cita como pagada
// automáticamente -- queda "pendiente de pago" hasta que se pague de verdad, ya sea por
// Wompi (webhook real) o manualmente en efectivo (endpoint /mark-paid de abajo).
router.patch('/:id', requireAuth, async (req, res) => {
  const { status, duration_minutes, amount_paid } = req.body;
  const allowed = ['pending', 'confirmed', 'completed', 'cancelled'];
  if (!allowed.includes(status)) return res.status(400).json({ error: 'Status inválido' });

  if (duration_minutes !== undefined) {
    const minutes = Number(duration_minutes);
    if (!Number.isInteger(minutes) || minutes < 5 || minutes > 480) {
      return res.status(400).json({ error: 'La duración debe ser un número de minutos válido (5 a 480)' });
    }
  }

  try {
    if (status === 'completed') {
      const { rows: current } = await pool.query(`SELECT payment_status FROM appointments WHERE id = $1`, [req.params.id]);
      const alreadyPaid = current[0]?.payment_status === 'paid';
      if (!alreadyPaid && (amount_paid === undefined || amount_paid === null || Number(amount_paid) <= 0)) {
        return res.status(400).json({ error: 'Debes indicar cuánto se le cobró al paciente antes de marcar la cita como completada.' });
      }
    }

    const sets = ['status = $1'];
    const values = [status];
    let i = 2;

    if (duration_minutes !== undefined) {
      sets.push(`duration_minutes = $${i++}`);
      values.push(Number(duration_minutes));
    }
    if (status === 'completed' && amount_paid !== undefined && Number(amount_paid) > 0) {
      sets.push(`amount_paid = $${i++}`);
      values.push(Number(amount_paid));
      // OJO: aquí NO se toca payment_status -- se queda en 'unpaid' (el valor por defecto)
      // hasta que Wompi confirme el pago real, o el doctor lo marque manual en efectivo.
    }

    values.push(req.params.id);
    await pool.query(`UPDATE appointments SET ${sets.join(', ')} WHERE id = $${i}`, values);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar la cita' });
  }
});

// PATCH /api/appointments/:id/mark-paid -> el doctor registra un pago manual (efectivo, presencial)
// que NO pasa por Wompi. Es la única otra forma (junto al webhook real) de marcar "paid".
router.patch('/:id/mark-paid', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE appointments SET payment_status = 'paid' WHERE id = $1 RETURNING amount_paid, patient_id`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Cita no encontrada' });
    if (!rows[0].amount_paid || Number(rows[0].amount_paid) <= 0) {
      return res.status(400).json({ error: 'Esta cita no tiene un valor asignado todavía.' });
    }

    const { rows: patientRows } = await pool.query(`SELECT name, phone FROM patients WHERE id = $1`, [rows[0].patient_id]);
    if (patientRows.length > 0 && patientRows[0].phone) {
      sendWhatsApp(
        patientRows[0].phone,
        `Hola ${patientRows[0].name}, registramos tu pago de $${Number(rows[0].amount_paid).toLocaleString('es-CO')} COP en el consultorio. ¡Gracias!`
      ).catch((err) => console.error('No se pudo enviar el WhatsApp de pago manual:', err));
    }

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al registrar el pago' });
  }
});

// PATCH /api/appointments/:id/duration -> editar SOLO la duración, en cualquier momento
// (antes solo se podía fijar al confirmar; esto permite corregirla después también).
router.patch('/:id/duration', requireAuth, async (req, res) => {
  const minutes = Number(req.body.duration_minutes);
  if (!Number.isInteger(minutes) || minutes < 5 || minutes > 480) {
    return res.status(400).json({ error: 'La duración debe ser un número de minutos válido (5 a 480)' });
  }
  try {
    await pool.query(`UPDATE appointments SET duration_minutes = $1 WHERE id = $2`, [minutes, req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar la duración' });
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

// GET /api/appointments/admin/history -> Historial paginado con filtros
router.get('/admin/history', requireAuth, async (req, res) => {
  const { status, search, start_date, end_date, page = 1, limit = 15 } = req.query;
  const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);

  const conditions = [];
  const params = [];
  let pIdx = 1;

  if (status && status !== 'all') {
    conditions.push(`a.status = $${pIdx++}`);
    params.push(status);
  }
  if (start_date) {
    conditions.push(`a.appointment_date >= $${pIdx++}`);
    params.push(start_date);
  }
  if (end_date) {
    conditions.push(`a.appointment_date <= $${pIdx++}`);
    params.push(end_date);
  }
  if (search && search.trim()) {
    conditions.push(`(p.name ILIKE $${pIdx} OR p.cedula ILIKE $${pIdx} OR p.email ILIKE $${pIdx} OR s.name_es ILIKE $${pIdx})`);
    params.push(`%${search.trim()}%`);
    pIdx++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM appointments a
      JOIN patients p ON p.id = a.patient_id
      JOIN services s ON s.id = a.service_id
      ${whereClause}
    `;
    const { rows: countRows } = await pool.query(countQuery, params);
    const total = parseInt(countRows[0]?.total || 0, 10);

    const listQuery = `
      SELECT a.id, a.appointment_date, a.start_time, a.duration_minutes, a.status,
             a.amount_paid, a.payment_status,
             p.id AS patient_id, p.name AS client_name, p.cedula, p.email AS client_email, p.phone AS client_phone,
             s.id AS service_id, s.name_es AS service_name
      FROM appointments a
      JOIN patients p ON p.id = a.patient_id
      JOIN services s ON s.id = a.service_id
      ${whereClause}
      ORDER BY a.appointment_date DESC, a.start_time DESC
      LIMIT $${pIdx++} OFFSET $${pIdx++}
    `;
    const { rows: items } = await pool.query(listQuery, [...params, parseInt(limit, 10), offset]);

    res.json({
      total,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      pages: Math.ceil(total / parseInt(limit, 10)) || 1,
      items,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al consultar el historial de citas' });
  }
});

// GET /api/appointments/admin/analytics -> Métricas consolidadas (servicios, ingresos, asistencia, días)
router.get('/admin/analytics', requireAuth, async (req, res) => {
  try {
    // 1. Citas por servicio
    const { rows: byService } = await pool.query(`
      SELECT s.name_es AS name, COUNT(a.id) AS count
      FROM appointments a
      JOIN services s ON s.id = a.service_id
      GROUP BY s.name_es
      ORDER BY count DESC
    `);

    // 2. Ingresos: Online (Wompi) vs Efectivo (Cash)
    const { rows: revenueSplit } = await pool.query(`
      SELECT 
        COALESCE(SUM(CASE WHEN pay.provider = 'wompi' AND pay.status = 'approved' THEN pay.amount ELSE 0 END), 0) AS online,
        COALESCE(SUM(CASE WHEN a.payment_status = 'paid' AND (pay.id IS NULL OR pay.provider = 'cash') THEN a.amount_paid ELSE 0 END), 0) AS cash
      FROM appointments a
      LEFT JOIN payments pay ON pay.appointment_id = a.id
      WHERE a.payment_status = 'paid'
    `);

    // 3. Asistencia vs Cancelación
    const { rows: attendance } = await pool.query(`
      SELECT 
        COUNT(CASE WHEN status = 'completed' THEN 1 END) AS completed,
        COUNT(CASE WHEN status = 'confirmed' THEN 1 END) AS confirmed,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) AS pending,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) AS cancelled
      FROM appointments
    `);

    // 4. Citas por día (últimos 30 días)
    const { rows: byDay } = await pool.query(`
      SELECT appointment_date::text AS date, COUNT(id) AS count
      FROM appointments
      WHERE appointment_date >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY appointment_date
      ORDER BY appointment_date ASC
    `);

    // 5. Total de días bloqueados
    const { rows: blockedCount } = await pool.query(`SELECT COUNT(*) AS count FROM blocked_slots`);

    res.json({
      byService,
      revenue: revenueSplit[0] || { online: 0, cash: 0 },
      attendance: attendance[0] || { completed: 0, confirmed: 0, pending: 0, cancelled: 0 },
      byDay,
      totalBlockedSlots: parseInt(blockedCount[0]?.count || 0, 10),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al calcular las métricas' });
  }
});

module.exports = router;
