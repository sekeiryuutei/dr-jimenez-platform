const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const router = express.Router();

// POST /api/auth/login -> el doctor inicia sesión
// Por ahora es un único usuario (el doctor), definido por variables de entorno.
// No hay tabla de usuarios en la base de datos todavía -> más simple y suficiente para el demo.
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña requeridos' });
  }

  const validEmail = process.env.DOCTOR_EMAIL;
  const validHash = process.env.DOCTOR_PASSWORD_HASH;
  const jwtSecret = process.env.JWT_SECRET;

  if (!validEmail || !validHash || !jwtSecret) {
    console.error('Faltan variables de entorno de auth: DOCTOR_EMAIL, DOCTOR_PASSWORD_HASH o JWT_SECRET');
    return res.status(500).json({ error: 'El login no está configurado en el servidor todavía' });
  }

  if (email.trim().toLowerCase() !== validEmail.trim().toLowerCase()) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  const match = await bcrypt.compare(password, validHash);
  if (!match) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  const token = jwt.sign({ email }, jwtSecret, { expiresIn: '12h' });
  res.json({ token, expiresIn: '12h' });
});

module.exports = router;
