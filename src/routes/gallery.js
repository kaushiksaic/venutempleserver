const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const db = require('../db');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

const uploadRoot = path.join(
  __dirname,
  '..',
  '..',
  process.env.UPLOAD_DIR || 'uploads',
  'gallery'
);

if (!fs.existsSync(uploadRoot)) {
  fs.mkdirSync(uploadRoot, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const albumFolder = path.join(uploadRoot, String(req.params.albumId));
    fs.mkdirSync(albumFolder, { recursive: true });
    cb(null, albumFolder);
  },
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}-${safe}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image uploads are allowed'));
    }
    cb(null, true);
  },
});

function resolveImageUrl(albumId, image) {
  if (image.source_url) {
    return image.source_url;
  }
  return `/uploads/gallery/${albumId}/${image.filename}`;
}

// Public: albums with images (grouped like current galleryData)
router.get('/', async (req, res) => {
  try {
    const albums = await db.query(
      `SELECT id, year, name, slug
       FROM gallery_albums
       WHERE is_active = TRUE
       ORDER BY year DESC, name ASC, id ASC`
    );

    const albumIds = albums.rows.map((a) => a.id);
    let imagesByAlbum = {};

    if (albumIds.length > 0) {
      const images = await db.query(
        `SELECT id, album_id, filename, source_url, caption
         FROM gallery_images
         WHERE is_active = TRUE AND album_id = ANY($1::int[])
         ORDER BY created_at ASC, id ASC`,
        [albumIds]
      );

      imagesByAlbum = images.rows.reduce((acc, img) => {
        if (!acc[img.album_id]) acc[img.album_id] = [];
        acc[img.album_id].push({
          ...img,
          url: resolveImageUrl(img.album_id, img),
          is_static: Boolean(img.source_url),
        });
        return acc;
      }, {});
    }

    const byYear = {};
    for (const album of albums.rows) {
      if (!byYear[album.year]) {
        byYear[album.year] = { year: album.year, festivals: [] };
      }
      byYear[album.year].festivals.push({
        id: album.id,
        name: album.name,
        slug: album.slug,
        images: imagesByAlbum[album.id] || [],
      });
    }

    res.json(Object.values(byYear));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch gallery' });
  }
});

router.get('/admin/albums', requireAdmin, async (req, res) => {
  try {
    const albums = await db.query(
      `SELECT * FROM gallery_albums ORDER BY year DESC, name ASC, id ASC`
    );
    const images = await db.query(
      `SELECT * FROM gallery_images ORDER BY created_at ASC, id ASC`
    );

    const imagesByAlbum = images.rows.reduce((acc, img) => {
      if (!acc[img.album_id]) acc[img.album_id] = [];
      acc[img.album_id].push({
        ...img,
        url: resolveImageUrl(img.album_id, img),
        is_static: Boolean(img.source_url),
      });
      return acc;
    }, {});

    res.json(
      albums.rows.map((album) => ({
        ...album,
        images: imagesByAlbum[album.id] || [],
      }))
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch albums' });
  }
});

router.post('/albums', requireAdmin, async (req, res) => {
  try {
    const { year, name, slug, sort_order = 0, is_active = true } = req.body;
    if (!year || !name || !slug) {
      return res.status(400).json({ error: 'year, name, and slug are required' });
    }

    const result = await db.query(
      `INSERT INTO gallery_albums (year, name, slug, sort_order, is_active)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [year, name, slug, sort_order, is_active]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create album' });
  }
});

router.put('/albums/:id', requireAdmin, async (req, res) => {
  try {
    const { year, name, slug, sort_order, is_active } = req.body;
    const result = await db.query(
      `UPDATE gallery_albums
       SET year = COALESCE($1, year),
           name = COALESCE($2, name),
           slug = COALESCE($3, slug),
           sort_order = COALESCE($4, sort_order),
           is_active = COALESCE($5, is_active),
           updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [year, name, slug, sort_order, is_active, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Album not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update album' });
  }
});

router.delete('/albums/:id', requireAdmin, async (req, res) => {
  try {
    const result = await db.query(
      'DELETE FROM gallery_albums WHERE id = $1 RETURNING id',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Album not found' });
    }
    res.json({ message: 'Deleted', id: result.rows[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete album' });
  }
});

router.post(
  '/albums/:albumId/images',
  requireAdmin,
  upload.single('image'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'image file is required' });
      }

      const { caption = null, sort_order = 0, is_active = true } = req.body;
      const albumId = req.params.albumId;

      const album = await db.query('SELECT id FROM gallery_albums WHERE id = $1', [albumId]);
      if (album.rows.length === 0) {
        fs.unlinkSync(req.file.path);
        return res.status(404).json({ error: 'Album not found' });
      }

      const result = await db.query(
        `INSERT INTO gallery_images (album_id, filename, caption, sort_order, is_active)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [albumId, req.file.filename, caption, sort_order, is_active]
      );

      res.status(201).json({
        ...result.rows[0],
        url: resolveImageUrl(albumId, result.rows[0]),
        is_static: false,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to upload image' });
    }
  }
);

router.delete('/images/:id', requireAdmin, async (req, res) => {
  try {
    const existing = await db.query(
      'SELECT id, album_id, filename FROM gallery_images WHERE id = $1',
      [req.params.id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Image not found' });
    }

    const image = existing.rows[0];
    await db.query('DELETE FROM gallery_images WHERE id = $1', [image.id]);

    if (!image.source_url) {
      const filePath = path.join(uploadRoot, String(image.album_id), image.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    res.json({ message: 'Deleted', id: image.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete image' });
  }
});

module.exports = router;
