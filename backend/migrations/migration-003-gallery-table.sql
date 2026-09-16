-- Migración 003: tabla de galería editable desde el panel del doctor
-- Ejecutar en el SQL Editor de Supabase cuando vuelvas a conectar producción.

CREATE TABLE IF NOT EXISTS gallery_images (
  id SERIAL PRIMARY KEY,
  image_url TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT now()
);
