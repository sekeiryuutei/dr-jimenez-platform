const express = require('express');
const crypto = require('crypto');
const QRCode = require('qrcode');
const pool = require('../db/pool');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

function buildWompiUrl({ reference, amountInCents }) {
  const publicKey = process.env.WOMPI_PUBLIC_KEY;
  const integritySecret = process.env.WOMPI_INTEGRITY_SECRET;
  const currency = 'COP';

  const params = new URLSearchParams({
    'public-key': publicKey,
    currency,
    'amount-in-cents': String(amountInCents),
    reference,
  });

  // Wompi exige esta firma para que el checkout confíe en el monto/referencia (evita manipulación).
  if (integritySecret) {
    const signature = crypto
      .createHash('sha256')
      .update(`${reference}${amountInCents}${currency}${integritySecret}`)
      .digest('hex');
    params.set('signature:integrity', signature);
  }

  return `https://checkout.wompi.co/p/?${params.toString()}`;
}

// POST /api/admin/payments/charge -> genera el cobro (QR + link) para un paciente atendido (protegido)
router.post('/admin/payments/charge', requireAuth, async (req, res) => {
  const { appointment_id, amount } = req.body;
  if (!appointment_id || !amount) {
    return res.status(400).json({ error: 'appointment_id y amount son requeridos' });
  }

  try {
    const reference = `APPT-${appointment_id}-${Date.now()}`;
    const amountInCents = Math.round(Number(amount) * 100);
    const wompiReady = Boolean(process.env.WOMPI_PUBLIC_KEY);

    await pool.query(
      `INSERT INTO payments (appointment_id, amount, provider, provider_reference, status)
       VALUES ($1, $2, 'wompi', $3, 'pending')`,
      [appointment_id, amount, reference]
    );

    const checkoutUrl = wompiReady
      ? buildWompiUrl({ reference, amountInCents })
      : `${FRONTEND_URL}/pagar?ref=${reference}`;

    const qrDataUrl = await QRCode.toDataURL(checkoutUrl, { margin: 1, width: 320 });

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

// POST /api/mock-payment/:reference/approve -> simula la aprobación (solo mientras no haya Wompi real)
router.post('/mock-payment/:reference/approve', async (req, res) => {
  if (process.env.WOMPI_PUBLIC_KEY) {
    return res.status(403).json({ error: 'El pago simulado está desactivado: Wompi ya está configurado' });
  }
  try {
    await pool.query(`UPDATE payments SET status = 'approved' WHERE provider_reference = $1`, [req.params.reference]);
    await pool.query(
      `UPDATE appointments SET payment_status = 'paid', status = 'confirmed'
       WHERE id = (SELECT appointment_id FROM payments WHERE provider_reference = $1)`,
      [req.params.reference]
    );
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
    const reference = event?.data?.transaction?.reference;
    const status = event?.data?.transaction?.status; // APPROVED, DECLINED, etc.

    if (reference) {
      await pool.query(
        `UPDATE payments SET status = $1 WHERE provider_reference = $2`,
        [status?.toLowerCase() || 'unknown', reference]
      );

      if (status === 'APPROVED') {
        await pool.query(
          `UPDATE appointments SET payment_status = 'paid', status = 'confirmed'
           WHERE id = (SELECT appointment_id FROM payments WHERE provider_reference = $1)`,
          [reference]
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
