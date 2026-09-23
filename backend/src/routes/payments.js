const express = require('express');
const QRCode = require('qrcode');
const pool = require('../db/pool');
const requireAuth = require('../middleware/requireAuth');
const { buildWompiUrl, isWompiReady, verifyWompiWebhook } = require('../utils/wompi');
const { sendWhatsApp } = require('../utils/whatsapp');

const router = express.Router();

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

async function buildCheckout(appointmentId, amount, reference) {
  const amountInCents = Math.round(Number(amount) * 100);
  const wompiReady = isWompiReady();
  const redirectUrl = `${FRONTEND_URL}/pagar?ref=${reference}`;
  const checkoutUrl = wompiReady ? buildWompiUrl({ reference, amountInCents, redirectUrl }) : redirectUrl;
  const qrDataUrl = await QRCode.toDataURL(checkoutUrl, { margin: 1, width: 320 });
  return { checkoutUrl, qrDataUrl, wompiReady };
}

// POST /api/admin/payments/charge -> genera el cobro (QR + link) para un paciente atendido (protegido)
// El monto es OPCIONAL: si no se manda, usa el que el doctor ya asignó al completar la cita
// (amount_paid) -- así no se vuelve a pedir el valor dos veces.
router.post('/admin/payments/charge', requireAuth, async (req, res) => {
  const { appointment_id } = req.body;
  let { amount } = req.body;
  if (!appointment_id) {
    return res.status(400).json({ error: 'appointment_id es requerido' });
  }

  try {
    if (!amount) {
      const { rows } = await pool.query(`SELECT amount_paid FROM appointments WHERE id = $1`, [appointment_id]);
      if (rows.length === 0) return res.status(404).json({ error: 'Cita no encontrada' });
      amount = rows[0].amount_paid;
    }
    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ error: 'Esta cita todavía no tiene un valor asignado -- complétala con un precio primero.' });
    }

    const reference = `APPT-${appointment_id}-${Date.now()}`;

    await pool.query(
      `INSERT INTO payments (appointment_id, amount, provider, provider_reference, status)
       VALUES ($1, $2, 'wompi', $3, 'pending')`,
      [appointment_id, amount, reference]
    );

    await pool.query(
      `UPDATE appointments SET amount_paid = $1, payment_status = 'unpaid' WHERE id = $2`,
      [amount, appointment_id]
    );

    const { checkoutUrl, qrDataUrl, wompiReady } = await buildCheckout(appointment_id, amount, reference);

    // Le mandamos el link de pago por WhatsApp al paciente (no bloquea la respuesta si falla).
    const { rows: patientRows } = await pool.query(
      `SELECT p.name, p.phone, s.name_es AS service_name
       FROM appointments a JOIN patients p ON p.id = a.patient_id JOIN services s ON s.id = a.service_id
       WHERE a.id = $1`,
      [appointment_id]
    );
    if (patientRows.length > 0 && patientRows[0].phone) {
      const { name, phone, service_name } = patientRows[0];
      sendWhatsApp(
        phone,
        `Hola ${name}, tu cobro por "${service_name}" ya está listo.\n\nValor: $${Number(amount).toLocaleString('es-CO')} COP\n\nPaga aquí: ${checkoutUrl}`
      ).catch((err) => console.error('No se pudo enviar el WhatsApp del cobro:', err));
    }

    res.json({ reference, checkout_url: checkoutUrl, qr_data_url: qrDataUrl, simulated: !wompiReady });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al generar el cobro' });
  }
});

// GET /api/mock-payment/:reference -> datos para la pantalla de pago simulado (solo modo local)
router.get('/mock-payment/:reference', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT pay.reference AS reference, pay.amount, pay.status,
              s.name_es AS service_name, p.name AS patient_name
       FROM payments pay
       JOIN appointments a ON a.id = pay.appointment_id
       JOIN services s ON s.id = a.service_id
       JOIN patients p ON p.id = a.patient_id
       WHERE pay.provider_reference = $1`,
      [req.params.reference]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'No se encontró ese cobro' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al consultar el cobro' });
  }
});

// Marca un pago como aprobado y notifica por WhatsApp -- lo usan tanto el webhook real
// de Wompi como el botón de simulación en modo local.
async function markPaymentApproved(reference) {
  await pool.query(`UPDATE payments SET status = 'approved' WHERE provider_reference = $1`, [reference]);
  const { rows } = await pool.query(
    `UPDATE appointments SET payment_status = 'paid'
     WHERE id = (SELECT appointment_id FROM payments WHERE provider_reference = $1)
     RETURNING id, patient_id, amount_paid`,
    [reference]
  );
  if (rows.length === 0) return;

  const { rows: patientRows } = await pool.query(`SELECT name, phone FROM patients WHERE id = $1`, [rows[0].patient_id]);
  if (patientRows.length > 0 && patientRows[0].phone) {
    sendWhatsApp(
      patientRows[0].phone,
      `Hola ${patientRows[0].name}, confirmamos tu pago de $${Number(rows[0].amount_paid).toLocaleString('es-CO')} COP. ¡Gracias!`
    ).catch((err) => console.error('No se pudo enviar el WhatsApp de confirmación de pago:', err));
  }
}

// POST /api/mock-payment/:reference/approve -> simula la aprobación (solo mientras no haya Wompi real)
router.post('/mock-payment/:reference/approve', async (req, res) => {
  if (process.env.WOMPI_PUBLIC_KEY) {
    return res.status(403).json({ error: 'El pago simulado está desactivado: Wompi ya está configurado' });
  }
  try {
    await markPaymentApproved(req.params.reference);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al aprobar el pago simulado' });
  }
});

// POST /api/payments/webhook -> Wompi notifica aquí cuando el pago real se aprueba/rechaza
router.post('/payments/webhook', async (req, res) => {
  try {
    const event = req.body;

    if (!verifyWompiWebhook(event)) {
      console.warn('Webhook de Wompi con firma inválida -- ignorado (posible intento falso).');
      return res.sendStatus(400);
    }

    const reference = event?.data?.transaction?.reference;
    const status = event?.data?.transaction?.status; // APPROVED, DECLINED, etc.

    if (reference) {
      if (status === 'APPROVED') {
        await markPaymentApproved(reference);
      } else {
        await pool.query(
          `UPDATE payments SET status = $1 WHERE provider_reference = $2`,
          [status?.toLowerCase() || 'unknown', reference]
        );
      }
    }
    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

module.exports = router;
