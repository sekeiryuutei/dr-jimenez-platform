const crypto = require('crypto');

function buildWompiUrl({ reference, amountInCents, redirectUrl }) {
  const publicKey = process.env.WOMPI_PUBLIC_KEY;
  const integritySecret = process.env.WOMPI_INTEGRITY_SECRET;
  const currency = 'COP';

  const params = new URLSearchParams({
    'public-key': publicKey,
    currency,
    'amount-in-cents': String(amountInCents),
    reference,
  });

  // El redirect-url solo tiene sentido si es una URL pública real -- si sigues en
  // local (localhost), lo omitimos para no arriesgarnos a que el checkout de Wompi
  // lo rechace por apuntar a una dirección no accesible desde internet.
  if (redirectUrl && !redirectUrl.includes('localhost') && !redirectUrl.includes('127.0.0.1')) {
    params.set('redirect-url', redirectUrl);
  }

  // Wompi exige esta firma para que el checkout confíe en el monto/referencia (evita manipulación).
  // Orden exacto según la documentación de Wompi: referencia + monto en centavos + moneda + secreto.
  // OJO: este secreto es el "Secreto de integridad" del dashboard de Wompi -- NO el
  // "Secreto de eventos" (ese es para verificar webhooks, ver verifyWompiWebhook más abajo).
  // Usar el secreto equivocado aquí genera una firma inválida y Wompi la rechaza (403).
  let url = `https://checkout.wompi.co/p/?${params.toString()}`;
  if (integritySecret) {
    const signature = crypto
      .createHash('sha256')
      .update(`${reference}${amountInCents}${currency}${integritySecret}`)
      .digest('hex');
    // A propósito NO se agrega con URLSearchParams: esa clase codifica los ":" del
    // nombre del parámetro como "%3A", y Wompi espera el nombre literal "signature:integrity"
    // sin codificar -- con "%3A" su WAF lo rechaza con un 403 antes de leer nada más.
    url += `&signature:integrity=${signature}`;
  }

  return url;
}

function isWompiReady() {
  return Boolean(process.env.WOMPI_PUBLIC_KEY);
}

// Verifica que un webhook realmente venga de Wompi, usando el "Secreto de eventos"
// (distinto del de integridad). Algoritmo oficial de Wompi:
// SHA256( valores de signature.properties en orden + timestamp + secreto de eventos )
function verifyWompiWebhook(body) {
  const eventsSecret = process.env.WOMPI_EVENTS_SECRET;
  if (!eventsSecret) return true; // Si no configuraste el secreto, no bloqueamos -- solo no verificamos.

  try {
    const { signature, timestamp, data } = body;
    if (!signature?.properties || !signature?.checksum || !timestamp) return false;

    const concatenated = signature.properties
      .map((path) => path.split('.').reduce((obj, key) => obj?.[key], data))
      .join('');

    const expected = crypto
      .createHash('sha256')
      .update(`${concatenated}${timestamp}${eventsSecret}`)
      .digest('hex');

    return expected === signature.checksum;
  } catch (err) {
    console.error('Error al verificar la firma del webhook de Wompi:', err);
    return false;
  }
}

module.exports = { buildWompiUrl, isWompiReady, verifyWompiWebhook };
