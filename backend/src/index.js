require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const servicesRouter = require('./routes/services');
const availabilityRouter = require('./routes/availability');
const appointmentsRouter = require('./routes/appointments');
const paymentsRouter = require('./routes/payments');
const authRouter = require('./routes/auth');
const mediaRouter = require('./routes/media');
const patientPortalRouter = require('./routes/patientPortal');
const scheduleRouter = require('./routes/schedule');

const app = express();
app.use(cors());
app.use(express.json());

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

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`API corriendo en http://localhost:${PORT}`));
