const express = require('express');
const db = require('../db');
const { requireAdmin } = require('../middleware/auth');
const { getDayLabel } = require('../utils/dateHelpers');
const { collectTodaysFestivals } = require('../utils/push');

const router = express.Router();

const EVENT_ORDER = 'event_date ASC NULLS LAST, id ASC';
const SECTION_ORDER = 'year DESC NULLS LAST, month DESC NULLS LAST, id ASC';

function withDayLabel(event_date, day_label) {
  if (event_date && !day_label) {
    return getDayLabel(event_date);
  }
  return day_label || null;
}

router.get('/', async (req, res) => {
  try {
    const { type } = req.query;
    const params = [];
    let sectionSql = `
      SELECT id, type, title, month, year
      FROM event_sections
      WHERE is_active = TRUE
    `;

    if (type) {
      params.push(type);
      sectionSql += ` AND type = $${params.length}`;
    }

    sectionSql += ` ORDER BY ${SECTION_ORDER}`;

    const sections = await db.query(sectionSql, params);
    const sectionIds = sections.rows.map((s) => s.id);

    let eventsBySection = {};
    if (sectionIds.length > 0) {
      const events = await db.query(
        `SELECT id, section_id, event_date, day_label, title, description
         FROM events
         WHERE is_active = TRUE AND section_id = ANY($1::int[])
         ORDER BY ${EVENT_ORDER}`,
        [sectionIds]
      );

      eventsBySection = events.rows.reduce((acc, event) => {
        if (!acc[event.section_id]) acc[event.section_id] = [];
        acc[event.section_id].push(event);
        return acc;
      }, {});
    }

    res.json(
      sections.rows.map((section) => ({
        ...section,
        events: eventsBySection[section.id] || [],
      }))
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

router.get('/today', async (req, res) => {
  try {
    const items = await collectTodaysFestivals();
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch today's events" });
  }
});

router.get('/admin/sections', requireAdmin, async (req, res) => {
  try {
    const sections = await db.query(`SELECT * FROM event_sections ORDER BY ${SECTION_ORDER}`);
    const events = await db.query(`SELECT * FROM events ORDER BY ${EVENT_ORDER}`);

    const eventsBySection = events.rows.reduce((acc, event) => {
      if (!acc[event.section_id]) acc[event.section_id] = [];
      acc[event.section_id].push(event);
      return acc;
    }, {});

    res.json(
      sections.rows.map((section) => ({
        ...section,
        events: eventsBySection[section.id] || [],
      }))
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch sections' });
  }
});

router.post('/sections', requireAdmin, async (req, res) => {
  try {
    const { type, title, month = null, year = null, is_active = true } = req.body;

    if (!type || !title) {
      return res.status(400).json({ error: 'type and title are required' });
    }

    const result = await db.query(
      `INSERT INTO event_sections (type, title, month, year, is_active)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [type, title, month, year, is_active]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create section' });
  }
});

router.put('/sections/:id', requireAdmin, async (req, res) => {
  try {
    const { type, title, month, year, is_active } = req.body;
    const result = await db.query(
      `UPDATE event_sections
       SET type = COALESCE($1, type),
           title = COALESCE($2, title),
           month = COALESCE($3, month),
           year = COALESCE($4, year),
           is_active = COALESCE($5, is_active),
           updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [type, title, month, year, is_active, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Section not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update section' });
  }
});

router.delete('/sections/:id', requireAdmin, async (req, res) => {
  try {
    const result = await db.query(
      'DELETE FROM event_sections WHERE id = $1 RETURNING id',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Section not found' });
    }
    res.json({ message: 'Deleted', id: result.rows[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete section' });
  }
});

router.post('/items', requireAdmin, async (req, res) => {
  try {
    const {
      section_id,
      event_date = null,
      day_label = null,
      title,
      description = null,
      is_active = true,
    } = req.body;

    if (!section_id || !title) {
      return res.status(400).json({ error: 'section_id and title are required' });
    }

    const resolvedDay = withDayLabel(event_date, day_label);

    const result = await db.query(
      `INSERT INTO events
         (section_id, event_date, day_label, title, description, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [section_id, event_date, resolvedDay, title, description, is_active]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

router.put('/items/:id', requireAdmin, async (req, res) => {
  try {
    const { section_id, event_date, day_label, title, description, is_active } = req.body;

    const existing = await db.query('SELECT * FROM events WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const current = existing.rows[0];
    const nextDate = event_date !== undefined ? event_date : current.event_date;
    const resolvedDay =
      event_date !== undefined
        ? withDayLabel(event_date, day_label)
        : day_label !== undefined
          ? day_label
          : current.day_label;

    const result = await db.query(
      `UPDATE events
       SET section_id = COALESCE($1, section_id),
           event_date = COALESCE($2, event_date),
           day_label = $3,
           title = COALESCE($4, title),
           description = COALESCE($5, description),
           is_active = COALESCE($6, is_active),
           updated_at = NOW()
       WHERE id = $7
       RETURNING *`,
      [section_id, nextDate, resolvedDay, title, description, is_active, req.params.id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

router.delete('/items/:id', requireAdmin, async (req, res) => {
  try {
    const result = await db.query('DELETE FROM events WHERE id = $1 RETURNING id', [
      req.params.id,
    ]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.json({ message: 'Deleted', id: result.rows[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

module.exports = router;
