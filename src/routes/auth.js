const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { requireAuth, signToken } = require('../middleware/auth');

const router = express.Router();

function publicUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    notify_festivals: row.notify_festivals,
    notify_timings: row.notify_timings,
    role: 'devotee',
  };
}

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const result = await db.query(
      'SELECT id, username, password_hash FROM admins WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const admin = result.rows[0];
    const valid = await bcrypt.compare(password, admin.password_hash);

    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = signToken(
      { id: admin.id, username: admin.username, role: 'admin' },
      '7d'
    );

    res.json({
      token,
      role: 'admin',
      admin: { id: admin.id, username: admin.username, role: 'admin' },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const trimmedEmail = String(email || '').trim().toLowerCase();
    const trimmedName = String(name || '').trim();

    if (!trimmedName || !trimmedEmail || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existing = await db.query('SELECT id FROM users WHERE email = $1', [trimmedEmail]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await db.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, notify_festivals, notify_timings`,
      [trimmedName, trimmedEmail, passwordHash]
    );

    const user = publicUser(result.rows[0]);
    const token = signToken({ id: user.id, email: user.email, role: 'devotee' });

    res.status(201).json({ token, role: 'devotee', user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/user-login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const trimmedEmail = String(email || '').trim().toLowerCase();

    if (!trimmedEmail || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await db.query(
      `SELECT id, name, email, password_hash, notify_festivals, notify_timings
       FROM users WHERE email = $1`,
      [trimmedEmail]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const row = result.rows[0];
    const valid = await bcrypt.compare(password, row.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = publicUser(row);
    const token = signToken({ id: user.id, email: user.email, role: 'devotee' });

    res.json({ token, role: 'devotee', user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      return res.json({
        role: 'admin',
        admin: { id: req.user.id, username: req.user.username, role: 'admin' },
      });
    }

    const result = await db.query(
      `SELECT id, name, email, notify_festivals, notify_timings
       FROM users WHERE id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ role: 'devotee', user: publicUser(result.rows[0]) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load profile' });
  }
});

router.put('/preferences', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'devotee') {
      return res.status(400).json({ error: 'Only devotee accounts have notification preferences' });
    }

    const { notify_festivals, notify_timings } = req.body;
    const result = await db.query(
      `UPDATE users
       SET notify_festivals = COALESCE($1, notify_festivals),
           notify_timings = COALESCE($2, notify_timings)
       WHERE id = $3
       RETURNING id, name, email, notify_festivals, notify_timings`,
      [notify_festivals, notify_timings, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    await db.query(
      `UPDATE devices
       SET notify_festivals = COALESCE($1, notify_festivals),
           notify_timings = COALESCE($2, notify_timings),
           last_seen_at = NOW()
       WHERE user_id = $3`,
      [notify_festivals, notify_timings, req.user.id]
    );

    res.json({ user: publicUser(result.rows[0]) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

module.exports = router;
