const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('../db/pool');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();
const UPLOADS_ROOT = path.join(__dirname, '../../uploads');

function makeStorage(subfolder) {
  const dir = path.join(UPLOADS_ROOT, subfolder);
  fs.mkdirSync(dir, { recursive: true });
  return multer.diskStorage({
    destination: (req, file, cb) => cb(null, dir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
    },
  });
}

const imageFilter = (req, file, cb) => {
  if (!file.mimetype.startsWith('image/')) return cb(new Error('Solo se permiten imágenes'));
  cb(null, true);
};

const uploadService = multer({ storage: makeStorage('services'), fileFilter: imageFilter, limits: { fileSize: 5 * 1024 * 1024 } });
const uploadGallery = multer({ storage: makeStorage('gallery'), fileFilter: imageFilter, limits: { fileSize: 5 * 1024 * 1024 } });
const uploadTransformation = multer({ storage: makeStorage('transformations'), fileFilter: imageFilter, limits: { fileSize: 5 * 1024 * 1024 } });

// POST /api/admin/services/:id/image -> reemplaza la foto de un servicio (protegido)
router.post('/admin/services/:id/image', requireAuth, uploadService.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se recibió ninguna imagen' });
  const imageUrl = `/uploads/services/${req.file.filename}`;
  try {
    await pool.query('UPDATE services SET image_url = $1 WHERE id = $2', [imageUrl, req.params.id]);
    res.json({ image_url: imageUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar la imagen del servicio' });
  }
});

// GET /api/gallery -> público, lo consume el sitio
router.get('/gallery', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, image_url FROM gallery_images ORDER BY sort_order ASC, id ASC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al listar la galería' });
  }
});

// POST /api/admin/gallery -> sube una foto nueva a la galería (protegido)
router.post('/admin/gallery', requireAuth, uploadGallery.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se recibió ninguna imagen' });
  const imageUrl = `/uploads/gallery/${req.file.filename}`;
  try {
    const { rows } = await pool.query(
      `INSERT INTO gallery_images (image_url, sort_order)
       VALUES ($1, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM gallery_images))
       RETURNING id, image_url`,
      [imageUrl]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al subir la imagen' });
  }
});

// DELETE /api/admin/gallery/:id -> quita una foto de la galería (protegido)
router.delete('/admin/gallery/:id', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT image_url FROM gallery_images WHERE id = $1', [req.params.id]);
    if (rows.length) {
      const filePath = path.join(UPLOADS_ROOT, '..', rows[0].image_url);
      fs.unlink(filePath, () => {});
    }
    await pool.query('DELETE FROM gallery_images WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar la imagen' });
  }
});

// GET /api/transformations -> público, "Real Smile Transformations"
router.get('/transformations', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, before_url, after_url, title_es, title_en FROM transformations ORDER BY sort_order ASC, id ASC'
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al listar las transformaciones' });
  }
});

// POST /api/admin/transformations -> sube un caso antes/después (protegido)
router.post(
  '/admin/transformations',
  requireAuth,
  uploadTransformation.fields([{ name: 'before', maxCount: 1 }, { name: 'after', maxCount: 1 }]),
  async (req, res) => {
    const beforeFile = req.files?.before?.[0];
    const afterFile = req.files?.after?.[0];
    if (!beforeFile || !afterFile) {
      return res.status(400).json({ error: 'Se necesitan las dos fotos: antes y después' });
    }
    const beforeUrl = `/uploads/transformations/${beforeFile.filename}`;
    const afterUrl = `/uploads/transformations/${afterFile.filename}`;
    const { title_es, title_en } = req.body;
    try {
      const { rows } = await pool.query(
        `INSERT INTO transformations (before_url, after_url, title_es, title_en, sort_order)
         VALUES ($1, $2, $3, $4, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM transformations))
         RETURNING *`,
        [beforeUrl, afterUrl, title_es || null, title_en || null]
      );
      res.status(201).json(rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error al guardar la transformación' });
    }
  }
);

// DELETE /api/admin/transformations/:id -> quita un caso (protegido)
router.delete('/admin/transformations/:id', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT before_url, after_url FROM transformations WHERE id = $1', [req.params.id]);
    if (rows.length) {
      fs.unlink(path.join(UPLOADS_ROOT, '..', rows[0].before_url), () => {});
      fs.unlink(path.join(UPLOADS_ROOT, '..', rows[0].after_url), () => {});
    }
    await pool.query('DELETE FROM transformations WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar la transformación' });
  }
});

module.exports = router;
