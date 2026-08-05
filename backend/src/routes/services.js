const express = require('express');
const pool = require('../db/pool');

const router = express.Router();

// GET /api/services -> catálogo público (sin precios, según lo pedido)
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name_es, name_en, description_es, description_en, duration_minutes
       FROM services WHERE active = true ORDER BY id`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al consultar servicios' });
  }
});

module.exports = router;
