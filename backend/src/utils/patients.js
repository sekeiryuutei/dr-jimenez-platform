// Busca si ya existe un paciente con esa cédula o ese correo, y valida que
// si existe, ambos datos coincidan con la MISMA cuenta -- si no, es un choque
// de datos (alguien escribió mal la cédula o el correo) y no debe fusionarse en silencio.
async function findOrValidatePatient(db, cedula, email) {
  const { rows } = await db.query(
    `SELECT id, cedula, email FROM patients WHERE cedula = $1 OR email = $2`,
    [cedula, email]
  );
  if (rows.length === 0) return { existing: null, conflict: null };

  const match = rows.find((r) => r.cedula === cedula && r.email === email);
  if (match) return { existing: match, conflict: null };

  const byCedula = rows.find((r) => r.cedula === cedula);
  const byEmail = rows.find((r) => r.email === email);
  if (byCedula) {
    return {
      existing: null,
      conflict: `Ya existe una cuenta registrada con la cédula ${cedula}, pero con un correo distinto. Si ya tienes cuenta, usa el correo con el que te registraste, o contacta al consultorio.`,
    };
  }
  if (byEmail) {
    return {
      existing: null,
      conflict: `Ya existe una cuenta registrada con el correo ${email}, pero con una cédula distinta. Verifica tus datos o contacta al consultorio.`,
    };
  }
  return { existing: null, conflict: null };
}

module.exports = { findOrValidatePatient };
