const jwt = require('jsonwebtoken');

// Protege rutas que solo el doctor debe poder ver (dashboard, listado de citas, etc).
// El paciente agendando en el sitio público NUNCA pasa por aquí.
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.doctor = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Sesión inválida o expirada, vuelve a iniciar sesión' });
  }
}

module.exports = requireAuth;
