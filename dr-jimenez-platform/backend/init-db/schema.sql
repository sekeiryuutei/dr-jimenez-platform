-- Esquema inicial: Dr. Jorge Jiménez — Estética Dental y Facial

CREATE TABLE IF NOT EXISTS services (
  id SERIAL PRIMARY KEY,
  name_es VARCHAR(120) NOT NULL,
  name_en VARCHAR(120) NOT NULL,
  description_es TEXT,
  description_en TEXT,
  duration_minutes INT NOT NULL DEFAULT 60,
  image_url TEXT,
  active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS clients (
  id SERIAL PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  email VARCHAR(160) UNIQUE NOT NULL,
  phone VARCHAR(40),
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS appointments (
  id SERIAL PRIMARY KEY,
  client_id INT REFERENCES clients(id),
  service_id INT REFERENCES services(id),
  appointment_date DATE NOT NULL,
  start_time TIME NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',      -- pending, confirmed, completed, cancelled
  amount_paid NUMERIC(12,2) DEFAULT 0,
  payment_status VARCHAR(20) DEFAULT 'unpaid',        -- unpaid, deposit_paid, paid
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  appointment_id INT REFERENCES appointments(id),
  amount NUMERIC(12,2) NOT NULL,
  provider VARCHAR(40) NOT NULL DEFAULT 'wompi',
  provider_reference VARCHAR(120),
  status VARCHAR(20) NOT NULL DEFAULT 'pending',      -- pending, approved, declined
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS availability_blocks (
  id SERIAL PRIMARY KEY,
  weekday INT NOT NULL,        -- 0=domingo ... 6=sábado
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true
);

-- Servicios semilla (sin precios, según lo pedido)
INSERT INTO services (name_es, name_en, description_es, description_en, duration_minutes, image_url) VALUES
('Operatoria dental', 'Restorative dentistry', 'Tratamiento de caries y restauración de piezas dentales con materiales estéticos.', 'Cavity treatment and tooth restoration with aesthetic materials.', 45, '/images/services/operatoria-dental.jpg'),
('Aclaramiento dental', 'Teeth whitening', 'Procedimientos profesionales para un tono natural y luminoso.', 'Professional procedures for a natural, luminous tone.', 45, '/images/services/aclaramiento-dental.jpg'),
('Fase higiénica', 'Hygiene phase', 'Limpieza profesional y control preventivo de tu salud oral.', 'Professional cleaning and preventive oral health care.', 30, '/images/services/fase-higienica.jpg'),
('Implantología', 'Implantology', 'Reemplazo funcional y estético con tecnología de precisión.', 'Functional and aesthetic replacement with precision technology.', 90, '/images/services/implantologia.jpg'),
('Diseño de sonrisa', 'Smile design', 'Planeación digital estética para transformar la armonía de tu sonrisa.', 'Digital aesthetic planning to transform your smile''s harmony.', 60, '/images/services/diseno-sonrisa.jpg'),
('Armonización facial', 'Facial harmonization', 'Equilibrio y proporción facial con técnicas mínimamente invasivas.', 'Facial balance and proportion with minimally invasive techniques.', 60, '/images/services/armonizacion-facial.jpg'),
('Rehabilitación oral', 'Oral rehabilitation', 'Recuperación integral de la función y estética de tu boca.', 'Comprehensive recovery of your mouth''s function and aesthetics.', 90, '/images/services/rehabilitacion-oral.jpg'),
('Cirugía oral', 'Oral surgery', 'Procedimientos quirúrgicos especializados con máxima precisión.', 'Specialized surgical procedures with maximum precision.', 60, '/images/services/cirugia-oral.jpg')
ON CONFLICT DO NOTHING;

-- Disponibilidad base: Lunes a viernes 9am-6pm, sábado 9am-1pm
INSERT INTO availability_blocks (weekday, start_time, end_time) VALUES
(1,'09:00','18:00'), (2,'09:00','18:00'), (3,'09:00','18:00'),
(4,'09:00','18:00'), (5,'09:00','18:00'), (6,'09:00','13:00')
ON CONFLICT DO NOTHING;
