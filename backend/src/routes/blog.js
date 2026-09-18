const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('../db/pool');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();
const UPLOADS_DIR = path.join(__dirname, '../../uploads/blog');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
  },
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => (file.mimetype.startsWith('image/') ? cb(null, true) : cb(new Error('Solo se permiten imágenes'))),
  limits: { fileSize: 5 * 1024 * 1024 },
});

function slugify(text) {
  return text
    .toString()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // quita tildes
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

// GET /api/blog -> listado público (solo publicados)
router.get('/blog', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, slug, title_es, title_en, excerpt_es, excerpt_en, image_url, created_at
       FROM blog_posts WHERE published = true ORDER BY created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al listar el blog' });
  }
});

// GET /api/blog/:slug -> un artículo completo (público)
router.get('/blog/:slug', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, slug, title_es, title_en, content_es, content_en, image_url, created_at
       FROM blog_posts WHERE slug = $1 AND published = true`,
      [req.params.slug]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Artículo no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al consultar el artículo' });
  }
});

// GET /api/admin/blog -> listado completo, incluidos borradores (protegido)
router.get('/admin/blog', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(`SELECT * FROM blog_posts ORDER BY created_at DESC`);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al listar el blog' });
  }
});

// POST /api/admin/blog -> crear artículo (protegido)
router.post('/admin/blog', requireAuth, upload.single('image'), async (req, res) => {
  const { title_es, title_en, excerpt_es, excerpt_en, content_es, content_en, published } = req.body;
  if (!title_es || !title_en || !content_es || !content_en) {
    return res.status(400).json({ error: 'Título y contenido en ambos idiomas son requeridos' });
  }
  const baseSlug = slugify(title_es);
  const imageUrl = req.file ? `/uploads/blog/${req.file.filename}` : null;

  try {
    let slug = baseSlug;
    let attempt = 1;
    // Evita choques de slug si ya existe un artículo con el mismo título
    while (true) {
      const { rows: existing } = await pool.query(`SELECT id FROM blog_posts WHERE slug = $1`, [slug]);
      if (existing.length === 0) break;
      attempt += 1;
      slug = `${baseSlug}-${attempt}`;
    }

    const { rows } = await pool.query(
      `INSERT INTO blog_posts (slug, title_es, title_en, excerpt_es, excerpt_en, content_es, content_en, image_url, published)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [slug, title_es, title_en, excerpt_es || null, excerpt_en || null, content_es, content_en, imageUrl, published !== 'false']
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear el artículo' });
  }
});

// PUT /api/admin/blog/:id -> editar artículo (protegido)
router.put('/admin/blog/:id', requireAuth, upload.single('image'), async (req, res) => {
  const { title_es, title_en, excerpt_es, excerpt_en, content_es, content_en, published } = req.body;
  try {
    const sets = [
      'title_es = $1', 'title_en = $2', 'excerpt_es = $3', 'excerpt_en = $4',
      'content_es = $5', 'content_en = $6', 'published = $7',
    ];
    const values = [title_es, title_en, excerpt_es || null, excerpt_en || null, content_es, content_en, published !== 'false'];
    let i = 8;

    if (req.file) {
      sets.push(`image_url = $${i++}`);
      values.push(`/uploads/blog/${req.file.filename}`);
    }
    values.push(req.params.id);

    await pool.query(`UPDATE blog_posts SET ${sets.join(', ')} WHERE id = $${i}`, values);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar el artículo' });
  }
});

// DELETE /api/admin/blog/:id -> borrar artículo (protegido)
router.delete('/admin/blog/:id', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(`SELECT image_url FROM blog_posts WHERE id = $1`, [req.params.id]);
    if (rows.length && rows[0].image_url) {
      fs.unlink(path.join(UPLOADS_DIR, '..', rows[0].image_url.replace('/uploads/', '')), () => {});
    }
    await pool.query(`DELETE FROM blog_posts WHERE id = $1`, [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar el artículo' });
  }
});

module.exports = router;
