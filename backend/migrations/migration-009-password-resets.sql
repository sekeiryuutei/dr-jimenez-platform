-- Migración 009: recuperación de contraseña de pacientes
CREATE TABLE IF NOT EXISTS password_resets (
  id SERIAL PRIMARY KEY,
  patient_id INT REFERENCES patients(id),
  token VARCHAR(80) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP DEFAULT now()
);
