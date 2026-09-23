-- Migración 004: cuentas de pacientes (cédula + contraseña)
-- Ejecutar en el SQL Editor de Supabase cuando vuelvas a conectar producción.
-- ADVERTENCIA: esto reemplaza la tabla "clients" vieja por "patients".
-- Si tienes citas reales que quieres conservar, exporta primero los datos de "clients".

CREATE TABLE IF NOT EXISTS patients (
  id SERIAL PRIMARY KEY,
  cedula VARCHAR(30) UNIQUE NOT NULL,
  name VARCHAR(160) NOT NULL,
  email VARCHAR(160) UNIQUE NOT NULL,
  phone VARCHAR(40),
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

-- Quita la referencia vieja a "clients" y apunta a "patients"
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_client_id_fkey;
ALTER TABLE appointments RENAME COLUMN client_id TO patient_id;
ALTER TABLE appointments ADD CONSTRAINT appointments_patient_id_fkey
  FOREIGN KEY (patient_id) REFERENCES patients(id);

-- Si ya no necesitas los datos viejos de "clients" (solo pruebas), puedes limpiarlos:
-- TRUNCATE appointments RESTART IDENTITY CASCADE;
-- DROP TABLE IF EXISTS clients;
