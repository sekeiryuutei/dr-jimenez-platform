-- Migración 006: transformaciones antes/después ("Real Smile Transformations")
-- Ejecutar en el SQL Editor de Supabase cuando vuelvas a conectar producción.

CREATE TABLE IF NOT EXISTS transformations (
  id SERIAL PRIMARY KEY,
  before_url TEXT NOT NULL,
  after_url TEXT NOT NULL,
  title_es VARCHAR(160),
  title_en VARCHAR(160),
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT now()
);
