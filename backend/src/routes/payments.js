const express = require('express');
const pool = require('../db/pool');

const router = express.Router();

// POST /api/payments/intent -> genera los datos que el frontend necesita para abrir el widget de Wompi
// NOTA: esto es un stub. Para producción se debe:
//  1. Crear cuenta comercial en Wompi con el RUT/cuenta bancaria del doctor.
//  2. Configurar WOMPI_PUBLIC_KEY y WOMPI_PRIVATE_KEY como variables de entorno.
//  3. Firmar la referencia con el integrity secret de Wompi antes de abrir el checkout.
router.post('/intent', async (req, res) => {
  const { appointment_id, amount } = req.body;
  if (!appointment_id || !amount) {
    return res.status(400).json({ error: 'appointment_id y amount son requeridos' });
  }

  try {
    const reference = `APPT-${appointment_id}-${Date.now()}`;
    await pool.query(
      `INSERT INTO payments (appointment_id, amount, provider, provider_reference, status)
       VALUES ($1, $2, 'wompi', $3, 'pending')`,
      [appointment_id, amount, reference]
    );

    res.json({
      reference,
      amount_in_cents: Math.round(amount * 100),
      currency: 'COP',
      public_key: process.env.WOMPI_PUBLIC_KEY || 'PENDIENTE_DE_CONFIGURAR',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al generar el intento de pago' });
  }
});

// POST /api/payments/webhook -> Wompi notifica aquí cuando el pago se aprueba/rechaza
router.post('/webhook', async (req, res) => {
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
