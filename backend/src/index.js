require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { apiLimiter } = require('./middleware/security');
const path = require('path');

const servicesRouter = require('./routes/services');
const availabilityRouter = require('./routes/availability');
const appointmentsRouter = require('./routes/appointments');
const paymentsRouter = require('./routes/payments');
const authRouter = require('./routes/auth');
const mediaRouter = require('./routes/media');
const patientPortalRouter = require('./routes/patientPortal');
const scheduleRouter = require('./routes/schedule');
const blogRouter = require('./routes/blog');

const app = express();
app.set('trust proxy', 1); // cloudflare / proxy: respeta X-Forwarded-*

// 1. Headers de seguridad con Helmet (permite visualización cruzada de uploads/imágenes)
app.use(
  helmet({
    hsts: false, // la red local se sirve por http; con HSTS el navegador dejaria de entrar
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// 2. Control de CORS dinámico (permite frontend local y frontend en producción)
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      // Permite peticiones sin origin (como apps móviles, Postman o curl) o que estén en la lista permitida
      if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.github.io')) {
        callback(null, true);
      } else {
        callback(null, true); // En desarrollo o previews es flexible
      }
    },
    credentials: true,
  })
);

app.use(express.json());
app.use('/api/', apiLimiter);

// (login: el rate limiting vive en cada ruta con authLimiter de middleware/security,
// que ademas cubre restablecimiento de contrasena)

// Rate limiting general contra abusos/DDoS ligero
const generalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 120, // 120 peticiones por minuto por IP
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', generalLimiter);

// 4. Archivos subidos desde el panel del doctor (imágenes de servicios, galería, blog)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/health', (req, res) => res.json({ status: 'ok' }));

// 5. Rutas de la API
app.use('/api/services', servicesRouter);
app.use('/api/availability', availabilityRouter);
app.use('/api/appointments', appointmentsRouter);
app.use('/api', paymentsRouter);
app.use('/api/auth', authRouter);
app.use('/api', mediaRouter);
app.use('/api', patientPortalRouter);
app.use('/api', scheduleRouter);
app.use('/api', blogRouter);

// 6. Manejo global de rutas no encontradas (404 JSON)
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint no encontrado' });
});

// Errores de subida (tipo/tamano de archivo) como JSON 400, no HTML 500.
app.use((err, req, res, next) => {
  if (!err) return next();
  if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'La imagen supera los 5 MB' });
  if (err.message && /fotos|imagen/i.test(err.message)) return res.status(400).json({ error: err.message });
  next(err);
});

// 7. Manejo global de errores (500 JSON)
app.use((err, req, res, next) => {
  console.error('Error no capturado:', err);
  const status = err.status || 500;
  res.status(status).json({ error: status < 500 && err.message ? err.message : 'Error interno del servidor' });
});

const PORT = process.env.PORT || 4000;
if (require.main === module) {
  app.listen(PORT, () => console.log(`API corriendo en http://localhost:${PORT}`));
}

module.exports = app; // para las pruebas (supertest) sin levantar puerto
