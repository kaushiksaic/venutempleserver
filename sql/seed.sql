-- Sample CMS content matching current homepage (April 2026)

INSERT INTO ticker_items (text, sort_order) VALUES
  ('April 1 - Panguni Uthiram', 1),
  ('April 4 - Swathi', 2),
  ('April 12 - Shravana Vratam', 3),
  ('April 13 - Ekadasi', 4),
  ('April 14 - Dwadasi + Varsha Pirappu', 5),
  ('April 15 - Pradosham / Sri Vaishnava Mounavratam (4:30–7:30pm)', 6),
  ('April 17 - Amavasya + Prakrutham Sri Parakala Swami Thirunakshatram', 7),
  ('April 20 - Rohini + Akshaya Tritiya', 8),
  ('April 22 - Sri Ramanuja Jayanti', 9),
  ('April 27 - Ekadasi', 10),
  ('April 28 - Dwadasi', 11),
  ('April 29 - Sri Varadaraja Perumal Avataram + Pradosham / Sri Vaishnava Mounavratam (4:30–7:30pm)', 12),
  ('April 30 - Sri Nrusimha Jayanti', 13),
  ('Note : SRIMAD VALMIKI RAMAYANAM LECTURES (Every Ekadasi 8.30 pm to 9.30 pm )', 14);

INSERT INTO event_sections (type, title, month, year, sort_order) VALUES
  ('monthly', 'Events for the Month of April-2026', 4, 2026, 1),
  ('yearly', 'Event Calendar for the Year 2026', NULL, 2026, 2),
  ('note', 'Important notes', NULL, 2026, 3);

INSERT INTO events (section_id, event_date, day_label, title, sort_order)
SELECT s.id, d.event_date::date, d.day_label, d.title, d.sort_order
FROM event_sections s
CROSS JOIN (
  VALUES
    ('2026-04-01', 'Wednesday', 'Panguni Uthiram', 1),
    ('2026-04-04', 'Saturday', 'Swathi', 2),
    ('2026-04-12', 'Sunday', 'Shravana Vratam', 3),
    ('2026-04-13', 'Monday', 'Ekadasi', 4),
    ('2026-04-14', 'Tuesday', 'Dwadasi + Varsha Pirappu', 5),
    ('2026-04-15', 'Wednesday', 'Pradosham / Sri Vaishnava Mounavratam (4:30–7:30pm)', 6),
    ('2026-04-17', 'Friday', 'Amavasya + Prakrutham Sri Parakala Swami Thirunakshatram', 7),
    ('2026-04-20', 'Monday', 'Rohini + Akshaya Tritiya', 8),
    ('2026-04-22', 'Wednesday', 'Sri Ramanuja Jayanti', 9),
    ('2026-04-27', 'Monday', 'Ekadasi', 10),
    ('2026-04-28', 'Tuesday', 'Dwadasi', 11),
    ('2026-04-29', 'Wednesday', 'Sri Varadaraja Perumal Avataram + Pradosham / Sri Vaishnava Mounavratam (4:30-7.30pm)', 12),
    ('2026-04-30', 'Thursday', 'Sri Nrusimha Jayanti', 13)
) AS d(event_date, day_label, title, sort_order)
WHERE s.type = 'monthly' AND s.year = 2026 AND s.month = 4;

INSERT INTO events (section_id, event_date, day_label, title, sort_order)
SELECT s.id, d.event_date::date, NULL, d.title, d.sort_order
FROM event_sections s
CROSS JOIN (
  VALUES
    ('2026-01-14', 'Pongal (Andal Kalyanam)', 1),
    ('2026-03-19', 'Ugadi', 2),
    ('2026-03-27', 'Sri Rama Navami', 3),
    ('2026-04-14', 'Tamil Putthaandu', 4),
    ('2026-04-19', 'Akshaya Tritiya', 5),
    ('2026-04-22', 'Sri Ramanuja Jayanthi', 6),
    ('2026-04-30', 'Sri Nrusimha Jayanthi', 7),
    ('2026-07-25', 'Tholi Ekadasi', 8),
    ('2026-08-14', 'Sri Andal Thiruvaadipooram', 9),
    ('2026-09-04', 'Sri Krishna Janmashtami + Sri Jayanthi', 10),
    ('2026-09-23', 'Sri Vedanta Desikan', 11),
    ('2026-10-20', 'Vijaya Dashami', 12),
    ('2026-11-06', 'Dhana Trayodashi', 13),
    ('2026-11-08', 'Deepavali', 14),
    ('2026-11-24', 'Kartika Pournami + Pancharatra Deepam', 15),
    ('2026-12-16', 'Margazhi Begins', 16),
    ('2026-12-20', 'Vaikunta Ekadasi', 17)
) AS d(event_date, title, sort_order)
WHERE s.type = 'yearly' AND s.year = 2026;

INSERT INTO events (section_id, event_date, day_label, title, sort_order)
SELECT s.id, NULL, NULL,
  'SRIMAD VALMIKI RAMAYANAM LECTURES (Every Ekadasi 8.30 pm to 9.30 pm)', 1
FROM event_sections s
WHERE s.type = 'note' AND s.year = 2026;

INSERT INTO gallery_albums (year, name, slug, sort_order) VALUES
  ('2026', 'Dhanurmasam', 'dhanurmasam', 1),
  ('2026', 'Visit by Veda Vidyaarthis studying at Srirangam Srimad Andavan Ashramam at Vrindavan, UP', 'VedaVidyaarthisVisit', 2),
  ('2025', 'Dhanurmasam', 'dhanurmasam', 1),
  ('2024', 'Dhanurmasam', 'dhanurmasam', 1);
