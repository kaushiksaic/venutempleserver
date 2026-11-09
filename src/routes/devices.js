const express = require('express');
const db = require('../db');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/', optionalAuth, async (req, res) => {
  try {
    const { expo_push_token, platform, notify_festivals, notify_timings } = req.body;
    const token = String(expo_push_token || '').trim();

    if (!token) {
      return res.status(400).json({ error: 'expo_push_token is required' });
    }

    const userId = req.user?.role === 'devotee' ? req.user.id : null;

    const result = await db.query(
      `INSERT INTO devices (user_id, expo_push_token, platform, notify_festivals, notify_timings, last_seen_at)
       VALUES ($1, $2, $3, COALESCE($4, TRUE), COALESCE($5, TRUE), NOW())
       ON CONFLICT (expo_push_token) DO UPDATE SET
         user_id = COALESCE(EXCLUDED.user_id, devices.user_id),
         platform = COALESCE(EXCLUDED.platform, devices.platform),
         notify_festivals = COALESCE($4, devices.notify_festivals),
         notify_timings = COALESCE($5, devices.notify_timings),
         last_seen_at = NOW()
       RETURNING id, user_id, expo_push_token, platform, notify_festivals, notify_timings`,
      [userId, token, platform || null, notify_festivals, notify_timings]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to register device' });
  }
});

module.exports = router;
