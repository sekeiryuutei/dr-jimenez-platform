-- Esquema inicial: Dr. Jorge Jiménez — Estética Dental y Facial

CREATE TABLE IF NOT EXISTS services (
  id SERIAL PRIMARY KEY,
  name_es VARCHAR(120) NOT NULL,
  name_en VARCHAR(120) NOT NULL,
  description_es TEXT,
  description_en TEXT,
  duration_minutes INT NOT NULL DEFAULT 60,
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
INSERT INTO services (name_es, name_en, description_es, description_en, duration_minutes) VALUES
('Diseño de sonrisa', 'Smile design', 'Planeación digital estética para transformar la armonía de tu sonrisa.', 'Digital aesthetic planning to transform your smile''s harmony.', 60),
('Blanqueamiento dental', 'Teeth whitening', 'Procedimientos profesionales para un tono natural y luminoso.', 'Professional procedures for a natural, luminous tone.', 45),
('Ortodoncia invisible', 'Invisible orthodontics', 'Alineadores transparentes para resultados discretos y precisos.', 'Clear aligners for discreet, precise results.', 45),
('Implantes dentales', 'Dental implants', 'Reemplazo funcional y estético con tecnología de precisión.', 'Functional and aesthetic replacement with precision technology.', 90),
('Rejuvenecimiento facial', 'Facial rejuvenation', 'Tratamientos no invasivos que realzan tus rasgos naturales.', 'Non-invasive treatments that enhance your natural features.', 60),
('Armonización facial', 'Facial harmonization', 'Equilibrio y proporción facial con técnicas mínimamente invasivas.', 'Facial balance and proportion with minimally invasive techniques.', 60)
ON CONFLICT DO NOTHING;

-- Disponibilidad base: Lunes a viernes 9am-6pm, sábado 9am-1pm
INSERT INTO availability_blocks (weekday, start_time, end_time) VALUES
(1,'09:00','18:00'), (2,'09:00','18:00'), (3,'09:00','18:00'),
(4,'09:00','18:00'), (5,'09:00','18:00'), (6,'09:00','13:00')
ON CONFLICT DO NOTHING;
