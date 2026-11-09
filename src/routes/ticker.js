const express = require('express');
const db = require('../db');
const { requireAdmin } = require('../middleware/auth');
const { formatTickerText } = require('../utils/dateHelpers');

const router = express.Router();

const TICKER_ORDER = 'event_date ASC NULLS LAST, id ASC';

function buildTickerText({ event_date, title, text }) {
  if (event_date && title) {
    return formatTickerText(event_date, title);
  }
  return text || title || '';
}

// Public: active ticker items for homepage marquee
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, text, event_date, title
       FROM ticker_items
       WHERE is_active = TRUE
       ORDER BY ${TICKER_ORDER}`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch ticker items' });
  }
});

router.get('/admin', requireAdmin, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, text, event_date, title, is_active, created_at, updated_at
       FROM ticker_items
       ORDER BY ${TICKER_ORDER}`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch ticker items' });
  }
});

router.post('/', requireAdmin, async (req, res) => {
  try {
    const { event_date = null, title = null, text = null, is_active = true, is_note = false } =
      req.body;

    const displayText = is_note ? text : buildTickerText({ event_date, title, text });

    if (!displayText) {
      return res.status(400).json({ error: 'Event title or note text is required' });
    }

    if (!is_note && !event_date) {
      return res.status(400).json({ error: 'Date is required for ticker events' });
    }

    const result = await db.query(
      `INSERT INTO ticker_items (text, event_date, title, is_active)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [displayText, is_note ? null : event_date, is_note ? null : title, is_active]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create ticker item' });
  }
});

router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { event_date, title, text, is_active, is_note = false } = req.body;

    const existing = await db.query('SELECT * FROM ticker_items WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Ticker item not found' });
    }

    const current = existing.rows[0];
    const nextDate = is_note ? null : event_date ?? current.event_date;
    const nextTitle = is_note ? null : title ?? current.title;
    const displayText = is_note
      ? text ?? current.text
      : buildTickerText({
          event_date: nextDate,
          title: nextTitle,
          text: text ?? current.text,
        });

    const result = await db.query(
      `UPDATE ticker_items
       SET text = $1,
           event_date = $2,
           title = $3,
           is_active = COALESCE($4, is_active),
           updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [displayText, nextDate, nextTitle, is_active, req.params.id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update ticker item' });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const result = await db.query(
      'DELETE FROM ticker_items WHERE id = $1 RETURNING id',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ticker item not found' });
    }
    res.json({ message: 'Deleted', id: result.rows[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete ticker item' });
  }
});

module.exports = router;
