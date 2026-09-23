// Envío de WhatsApp vía la Cloud API de Meta.
// IMPORTANTE (limitación real de WhatsApp, no de este código): fuera de una ventana de
// 24 horas desde el último mensaje que el paciente le escribió al número del consultorio,
// Meta NO permite mandar texto libre -- solo "plantillas" pre-aprobadas. Mientras tanto,
// en modo de pruebas (sandbox) esto puede fallar con el paciente real si nunca le escribió
// primero al número. Por eso cada envío queda en un try/catch que solo registra el error
// en consola, sin romper el flujo principal (agendar, cobrar, etc).
function formatPhone(phone) {
  if (!phone) return null;
  const digits = phone.replace(/[^0-9]/g, '');
  // Si ya trae indicativo de país (57 = Colombia) lo dejamos, si no, se lo agregamos.
  if (digits.startsWith('57') && digits.length >= 12) return digits;
  if (digits.length === 10) return `57${digits}`;
  return digits;
}

async function sendWhatsApp(phone, text) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  const to = formatPhone(phone);

  if (!token || !phoneId || !to) {
    console.log('\n===== WHATSAPP (no enviado: falta configuración o número) =====');
    console.log('Para:', phone);
    console.log('Mensaje:', text);
    console.log('================================================================\n');
    return { simulated: true };
  }

  try {
    const res = await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: text },
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error('Error al enviar WhatsApp:', JSON.stringify(data));
      return { error: data };
    }
    return data;
  } catch (err) {
    console.error('Error de red al enviar WhatsApp:', err.message);
    return { error: err.message };
  }
}

module.exports = { sendWhatsApp };
