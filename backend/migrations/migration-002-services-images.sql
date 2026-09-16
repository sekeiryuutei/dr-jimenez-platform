-- Migración 002: servicios reales del doctor + columna de imagen
-- Ejecutar esto en el SQL Editor de Supabase (una sola vez).

-- 1) Agregar la columna de imagen si no existe
ALTER TABLE services ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 2) Limpiar datos de prueba (citas y clientes de las pruebas que hicimos).
--    Si ya tienes citas reales que quieres conservar, NO corras estas dos líneas
--    y en su lugar reasigna manualmente el service_id de esas citas antes de continuar.
TRUNCATE appointments RESTART IDENTITY CASCADE;
TRUNCATE clients RESTART IDENTITY CASCADE;

-- 3) Reemplazar el catálogo de servicios viejo por el real
TRUNCATE services RESTART IDENTITY CASCADE;

INSERT INTO services (name_es, name_en, description_es, description_en, duration_minutes, image_url) VALUES
('Operatoria dental', 'Restorative dentistry', 'Tratamiento de caries y restauración de piezas dentales con materiales estéticos.', 'Cavity treatment and tooth restoration with aesthetic materials.', 45, '/images/services/operatoria-dental.jpg'),
('Aclaramiento dental', 'Teeth whitening', 'Procedimientos profesionales para un tono natural y luminoso.', 'Professional procedures for a natural, luminous tone.', 45, '/images/services/aclaramiento-dental.jpg'),
('Fase higiénica', 'Hygiene phase', 'Limpieza profesional y control preventivo de tu salud oral.', 'Professional cleaning and preventive oral health care.', 30, '/images/services/fase-higienica.jpg'),
('Implantología', 'Implantology', 'Reemplazo funcional y estético con tecnología de precisión.', 'Functional and aesthetic replacement with precision technology.', 90, '/images/services/implantologia.jpg'),
('Diseño de sonrisa', 'Smile design', 'Planeación digital estética para transformar la armonía de tu sonrisa.', 'Digital aesthetic planning to transform your smile''s harmony.', 60, '/images/services/diseno-sonrisa.jpg'),
('Armonización facial', 'Facial harmonization', 'Equilibrio y proporción facial con técnicas mínimamente invasivas.', 'Facial balance and proportion with minimally invasive techniques.', 60, '/images/services/armonizacion-facial.jpg'),
('Rehabilitación oral', 'Oral rehabilitation', 'Recuperación integral de la función y estética de tu boca.', 'Comprehensive recovery of your mouth''s function and aesthetics.', 90, '/images/services/rehabilitacion-oral.jpg'),
('Cirugía oral', 'Oral surgery', 'Procedimientos quirúrgicos especializados con máxima precisión.', 'Specialized surgical procedures with maximum precision.', 60, '/images/services/cirugia-oral.jpg');
