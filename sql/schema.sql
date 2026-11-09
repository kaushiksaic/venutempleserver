-- Sri Venugopala Swamy Temple CMS schema

CREATE TABLE IF NOT EXISTS admins (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Marquee ticker on homepage
CREATE TABLE IF NOT EXISTS ticker_items (
  id SERIAL PRIMARY KEY,
  text TEXT NOT NULL,
  event_date DATE,
  title VARCHAR(255),
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sections: monthly events, yearly calendar, notes
-- type: 'monthly' | 'yearly' | 'note'
CREATE TABLE IF NOT EXISTS event_sections (
  id SERIAL PRIMARY KEY,
  type VARCHAR(20) NOT NULL CHECK (type IN ('monthly', 'yearly', 'note')),
  title VARCHAR(255) NOT NULL,
  month INT CHECK (month IS NULL OR (month >= 1 AND month <= 12)),
  year INT,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  section_id INT NOT NULL REFERENCES event_sections(id) ON DELETE CASCADE,
  event_date DATE,
  day_label VARCHAR(100),
  title TEXT NOT NULL,
  description TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gallery_albums (
  id SERIAL PRIMARY KEY,
  year VARCHAR(10) NOT NULL,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (year, slug)
);

CREATE TABLE IF NOT EXISTS gallery_images (
  id SERIAL PRIMARY KEY,
  album_id INT NOT NULL REFERENCES gallery_albums(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  source_url VARCHAR(512),
  caption VARCHAR(255),
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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

CREATE INDEX IF NOT EXISTS idx_ticker_active_order ON ticker_items (is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_sections_type ON event_sections (type, is_active);
CREATE INDEX IF NOT EXISTS idx_events_section ON events (section_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_gallery_albums_year ON gallery_albums (year, sort_order);
CREATE INDEX IF NOT EXISTS idx_gallery_images_album ON gallery_images (album_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_events_date ON events (event_date);
CREATE INDEX IF NOT EXISTS idx_devices_user ON devices (user_id);
CREATE INDEX IF NOT EXISTS idx_announcements_created ON announcements (created_at DESC);
