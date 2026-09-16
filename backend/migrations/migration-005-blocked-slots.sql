-- Migración 005: horarios bloqueados por el doctor (vacaciones, almuerzo, etc)
-- Ejecutar en el SQL Editor de Supabase cuando vuelvas a conectar producción.

CREATE TABLE IF NOT EXISTS blocked_slots (
  id SERIAL PRIMARY KEY,
  block_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  reason VARCHAR(160),
  created_at TIMESTAMP DEFAULT now()
);
