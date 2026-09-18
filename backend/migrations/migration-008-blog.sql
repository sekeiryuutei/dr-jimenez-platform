-- Migración 008: sección de blog
CREATE TABLE IF NOT EXISTS blog_posts (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(180) UNIQUE NOT NULL,
  title_es VARCHAR(200) NOT NULL,
  title_en VARCHAR(200) NOT NULL,
  excerpt_es TEXT,
  excerpt_en TEXT,
  content_es TEXT NOT NULL,
  content_en TEXT NOT NULL,
  image_url TEXT,
  published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT now()
);
