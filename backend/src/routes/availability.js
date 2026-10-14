const express = require('express');
const pool = require('../db/pool');
const { isPastInColombia, getColombiaWeekday, timeToMinutes } = require('../utils/time');

const router = express.Router();

// La web pública solo agenda la valoración inicial: bloques de 20 minutos.
const SLOT_MINUTES = 20;

// GET /api/availability?date=2026-08-12 -> horarios libres/ocupados ese día
router.get('/', async (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ error: 'Parámetro date requerido (YYYY-MM-DD)' });

  try {
    const weekday = getColombiaWeekday(date);

    const { rows: blocks } = await pool.query(
      `SELECT start_time, end_time FROM availability_blocks WHERE weekday = $1 AND active = true`,
      [weekday]
    );
    if (blocks.length === 0) return res.json({ date, slots: [] });

    const { rows: booked } = await pool.query(
      `SELECT start_time, duration_minutes FROM appointments WHERE appointment_date = $1 AND status != 'cancelled'`,
      [date]
    );

    function isOccupied(slotStartMinutes) {
      const slotEnd = slotStartMinutes + SLOT_MINUTES;
      return booked.some(({ start_time, duration_minutes }) => {
        const apptStart = timeToMinutes(start_time);
        const apptEnd = apptStart + (duration_minutes || SLOT_MINUTES);
        // Se solapan si uno empieza antes de que el otro termine, en ambos sentidos.
        return slotStartMinutes < apptEnd && apptStart < slotEnd;
      });
    }

    const { rows: blocked } = await pool.query(
      `SELECT start_time, end_time FROM blocked_slots WHERE block_date = $1`,
      [date]
    );

    function isBlocked(time) {
      const minutes = timeToMinutes(time);
      return blocked.some(({ start_time, end_time }) => {
        const sm = timeToMinutes(start_time);
        const em = timeToMinutes(end_time);
        return minutes >= sm && minutes < em;
      });
    }

    const slots = [];
    blocks.forEach(({ start_time, end_time }) => {
      let [h, m] = start_time.slice(0, 5).split(':').map(Number);
      const [endH, endM] = end_time.slice(0, 5).split(':').map(Number);
      while (h < endH || (h === endH && m < endM)) {
        const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        const slotMinutes = h * 60 + m;
        // Si el horario ya pasó en Colombia para el día de hoy, marcarlo disponible: false
        const isPast = isPastInColombia(date, time);
        const isAvail = !isPast && !isOccupied(slotMinutes) && !isBlocked(time);
        slots.push({ time, available: isAvail });
        m += SLOT_MINUTES;
        while (m >= 60) { m -= 60; h += 1; }
      }
    });

    res.json({ date, slots });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al consultar disponibilidad' });
  }
});

module.exports = router;
