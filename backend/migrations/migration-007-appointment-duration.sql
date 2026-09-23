-- Migración 007: duración real de la cita (para bloquear bien el calendario)
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS duration_minutes INT NOT NULL DEFAULT 20;
