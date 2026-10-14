require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
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

// 1. Headers de seguridad con Helmet (permite visualización cruzada de uploads/imágenes)
app.use(
  helmet({
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

// 3. Rate limiting contra ataques de fuerza bruta en logins
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 20, // Máximo 20 intentos por IP cada 15 min
  message: { error: 'Demasiados intentos de acceso desde esta dirección. Por favor espera 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting general contra abusos/DDoS ligero
const generalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 120, // 120 peticiones por minuto por IP
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', generalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/patient-auth/login', authLimiter);
app.use('/api/patient-auth/forgot-password', authLimiter);

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

// 7. Manejo global de errores (500 JSON)
app.use((err, req, res, next) => {
  console.error('Error no capturado:', err);
  res.status(err.status || 500).json({ error: err.message || 'Error interno del servidor' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`API corriendo en http://localhost:${PORT}`));
