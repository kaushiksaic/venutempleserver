-- Run on existing databases (safe to re-run)

ALTER TABLE ticker_items
  ADD COLUMN IF NOT EXISTS event_date DATE,
  ADD COLUMN IF NOT EXISTS title VARCHAR(255);

ALTER TABLE gallery_images
  ADD COLUMN IF NOT EXISTS source_url VARCHAR(512);

CREATE INDEX IF NOT EXISTS idx_ticker_event_date ON ticker_items (event_date ASC NULLS LAST);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  notify_festivals BOOLEAN NOT NULL DEFAULT TRUE,
  notify_timings BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS devices (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE SET NULL,
  expo_push_token VARCHAR(255) NOT NULL UNIQUE,
  platform VARCHAR(20),
  notify_festivals BOOLEAN NOT NULL DEFAULT TRUE,
  notify_timings BOOLEAN NOT NULL DEFAULT TRUE,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS announcements (
  id SERIAL PRIMARY KEY,
  type VARCHAR(30) NOT NULL CHECK (type IN ('festival', 'timing', 'general')),
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  event_date DATE,
  send_push BOOLEAN NOT NULL DEFAULT TRUE,
  sent_at TIMESTAMPTZ,
  created_by INT REFERENCES admins(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_date ON events (event_date);
CREATE INDEX IF NOT EXISTS idx_devices_user ON devices (user_id);
CREATE INDEX IF NOT EXISTS idx_announcements_created ON announcements (created_at DESC);
