require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
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
app.set('trust proxy', 1); // cloudflare / proxy reverso: respeta X-Forwarded-*
// HSTS apagado a proposito: en red local se sirve por http y el navegador
// dejaria de entrar si le ordenaramos https. CORP apagado: las imagenes de
// /uploads se consumen entre origenes (GitHub Pages -> backend).
app.use(helmet({ hsts: false, crossOriginResourcePolicy: false }));
app.use(cors());
app.use(express.json());
app.use('/api/', apiLimiter);

// Archivos subidos desde el panel del doctor (imágenes de servicios y galería)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/services', servicesRouter);
app.use('/api/availability', availabilityRouter);
app.use('/api/appointments', appointmentsRouter);
app.use('/api', paymentsRouter);
app.use('/api/auth', authRouter);
app.use('/api', mediaRouter);
app.use('/api', patientPortalRouter);
app.use('/api', scheduleRouter);
app.use('/api', blogRouter);

// Errores de subida (tipo/tamano de archivo) como JSON 400, no HTML 500.
app.use((err, req, res, next) => {
  if (!err) return next();
  if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'La imagen supera los 5 MB' });
  return res.status(400).json({ error: err.message || 'Solicitud invalida' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`API corriendo en http://localhost:${PORT}`));
