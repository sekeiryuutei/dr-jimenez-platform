// Uso: node scripts/generate-hash.js "laContraseñaQueQuieras"
// Copia el resultado y pégalo como DOCTOR_PASSWORD_HASH en tus variables de entorno.
const bcrypt = require('bcryptjs');

const password = process.argv[2];
if (!password) {
  console.log('Uso: node scripts/generate-hash.js "laContraseñaQueQuieras"');
  process.exit(1);
}

console.log(bcrypt.hashSync(password, 10));
