const express = require('express');
const db = require('../db');
const { requireAdmin } = require('../middleware/auth');
const { sendPush } = require('../utils/push');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, type, title, body, event_date, sent_at, created_at
       FROM announcements
       ORDER BY created_at DESC
       LIMIT 50`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
});

router.get('/admin', requireAdmin, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM announcements ORDER BY created_at DESC LIMIT 100`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
});

router.post('/', requireAdmin, async (req, res) => {
  try {
    const {
      type = 'general',
      title,
      body,
      event_date = null,
      send_push = true,
    } = req.body;

    if (!title || !body) {
      return res.status(400).json({ error: 'title and body are required' });
    }

    if (!['festival', 'timing', 'general'].includes(type)) {
      return res.status(400).json({ error: 'type must be festival, timing, or general' });
    }

    let sentAt = null;
    let pushResult = { sent: 0 };

    if (send_push) {
      pushResult = await sendPush({
        title,
        body,
        type,
        data: { type, screen: 'notices' },
      });
      sentAt = new Date();
    }

    const result = await db.query(
      `INSERT INTO announcements
         (type, title, body, event_date, send_push, sent_at, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [type, title, body, event_date, Boolean(send_push), sentAt, req.user.id]
    );

    res.status(201).json({ ...result.rows[0], push: pushResult });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create announcement' });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const result = await db.query(
      'DELETE FROM announcements WHERE id = $1 RETURNING id',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Announcement not found' });
    }
    res.json({ message: 'Deleted', id: result.rows[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete announcement' });
  }
});

module.exports = router;
