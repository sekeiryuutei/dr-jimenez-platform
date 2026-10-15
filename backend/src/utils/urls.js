// URL base del frontend segun la peticion que llega (LAN, tunel https, dominio...).
// Asi los QR, links de pago y correos de restablecimiento siempre apuntan a una
// direccion que el usuario realmente puede abrir, en vez de localhost:3000.
function getBaseUrl(req) {
  const proto = ((req.get('x-forwarded-proto') || req.protocol || 'http').split(',')[0] || 'http').trim();
  const host = req.get('host');
  if (host) return `${proto}://${host}`;
  return process.env.FRONTEND_URL || 'http://localhost:3000';
}

module.exports = { getBaseUrl };
