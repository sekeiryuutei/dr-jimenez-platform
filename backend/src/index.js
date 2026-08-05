require('dotenv').config();
const express = require('express');
const cors = require('cors');

const servicesRouter = require('./routes/services');
const availabilityRouter = require('./routes/availability');
const appointmentsRouter = require('./routes/appointments');
const paymentsRouter = require('./routes/payments');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/services', servicesRouter);
app.use('/api/availability', availabilityRouter);
app.use('/api/appointments', appointmentsRouter);
app.use('/api/payments', paymentsRouter);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`API corriendo en http://localhost:${PORT}`));
