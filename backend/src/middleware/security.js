const rateLimit = require('express-rate-limit');
const path = require('path');

// Login: frena fuerza bruta (20 intentos por IP cada 15 min).
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Demasiados intentos, espera 15 minutos e intenta de nuevo' },
});

// Agendamiento publico: frena spam/bots que crean citas y disparan correos/WhatsApp.
const bookingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Demasiadas reservas desde esta conexion, intenta mas tarde' },
});

// Trafico general de la API.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes, intenta mas tarde' },
});

// Solo formatos de foto reales. Se rechaza SVG/HTML/etc: un SVG subido se
// ejecutaria como JavaScript en el origen del sitio (XSS almacenado) y podria
// robar las sesiones guardadas en el navegador.
const ALLOWED_IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
function imageFileFilter(req, file, cb) {
  const ext = path.extname(file.originalname || '').toLowerCase();
  if (!file.mimetype.startsWith('image/') || !ALLOWED_IMAGE_EXT.has(ext)) {
    return cb(new Error('Solo se permiten fotos JPG, PNG, WEBP o GIF'));
  }
  cb(null, true);
}

module.exports = { authLimiter, bookingLimiter, apiLimiter, imageFileFilter };
