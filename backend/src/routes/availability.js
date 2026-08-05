const express = require('express');
const pool = require('../db/pool');

const router = express.Router();

// GET /api/availability?date=2026-08-12 -> horarios libres/ocupados ese día
router.get('/', async (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ error: 'Parámetro date requerido (YYYY-MM-DD)' });

  try {
    const weekday = new Date(date + 'T00:00:00').getDay();

    const { rows: blocks } = await pool.query(
      `SELECT start_time, end_time FROM availability_blocks WHERE weekday = $1 AND active = true`,
      [weekday]
    );
    if (blocks.length === 0) return res.json({ date, slots: [] });

    const { rows: booked } = await pool.query(
      `SELECT start_time FROM appointments WHERE appointment_date = $1 AND status != 'cancelled'`,
      [date]
    );
    const bookedTimes = new Set(booked.map(b => b.start_time.slice(0, 5)));

    const slots = [];
    blocks.forEach(({ start_time, end_time }) => {
      let [h, m] = start_time.slice(0, 5).split(':').map(Number);
      const [endH, endM] = end_time.slice(0, 5).split(':').map(Number);
      while (h < endH || (h === endH && m < endM)) {
        const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        slots.push({ time, available: !bookedTimes.has(time) });
        m += 30;
        if (m >= 60) { m = 0; h += 1; }
      }
    });

    res.json({ date, slots });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al consultar disponibilidad' });
  }
});

module.exports = router;
