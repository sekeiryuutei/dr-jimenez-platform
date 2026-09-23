const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) return null;

  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD, // Contraseña de aplicación, NO la contraseña normal de la cuenta.
    },
  });
  return transporter;
}

// Envío de correo. Si GMAIL_USER / GMAIL_APP_PASSWORD están configurados, envía de verdad
// desde esa cuenta de Gmail. Si no (como en tu entorno local por ahora), solo lo imprime
// en la consola del backend para que puedas seguir probando sin depender de una cuenta real.
async function sendMail({ to, subject, text }) {
  const t = getTransporter();

  if (!t) {
    console.log('\n===== EMAIL (modo local, no se envió de verdad) =====');
    console.log('Para:', to);
    console.log('Asunto:', subject);
    console.log('Contenido:\n' + text);
    console.log('=======================================================\n');
    return { simulated: true };
  }

  const fromName = process.env.EMAIL_FROM_NAME || 'Dr. Jorge Jiménez';
  return t.sendMail({
    from: `"${fromName}" <${process.env.GMAIL_USER}>`,
    to,
    subject,
    text,
  });
}

module.exports = { sendMail };
