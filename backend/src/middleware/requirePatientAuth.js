const jwt = require('jsonwebtoken');

function requirePatientAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.role !== 'patient') {
      return res.status(403).json({ error: 'Esta sección es solo para pacientes' });
    }
    req.patient = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Sesión inválida o expirada, vuelve a iniciar sesión' });
  }
}

module.exports = requirePatientAuth;
