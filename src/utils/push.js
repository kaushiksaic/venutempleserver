const { Expo } = require('expo-server-sdk');
const db = require('../db');

const expo = new Expo();

async function tokensForType(type) {
  const column =
    type === 'timing' ? 'notify_timings' : type === 'festival' ? 'notify_festivals' : null;

  const sql = column
    ? `SELECT expo_push_token FROM devices WHERE ${column} = TRUE`
    : 'SELECT expo_push_token FROM devices';

  const result = await db.query(sql);
  return result.rows.map((row) => row.expo_push_token);
}

async function sendPush({ title, body, data = {}, type = 'general' }) {
  const tokens = await tokensForType(type);
  const messages = tokens
    .filter((token) => Expo.isExpoPushToken(token))
    .map((to) => ({
      to,
      sound: 'default',
      title,
      body,
      data,
    }));

  if (messages.length === 0) {
    return { sent: 0 };
  }

  const chunks = expo.chunkPushNotifications(messages);
  let sent = 0;

  for (const chunk of chunks) {
    try {
      const tickets = await expo.sendPushNotificationsAsync(chunk);
      sent += tickets.filter((ticket) => ticket.status === 'ok').length;
    } catch (err) {
      console.error('Push send failed', err);
    }
  }

  return { sent, attempted: messages.length };
}

async function collectTodaysFestivals() {
  const [events, ticker] = await Promise.all([
    db.query(
      `SELECT id, event_date, day_label, title
       FROM events
       WHERE is_active = TRUE
         AND event_date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date
       ORDER BY id ASC`
    ),
    db.query(
      `SELECT id, event_date, title, text
       FROM ticker_items
       WHERE is_active = TRUE
         AND event_date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date
       ORDER BY id ASC`
    ),
  ]);

  const seen = new Set();
  const items = [];

  for (const row of [...events.rows, ...ticker.rows]) {
    const title = row.title || row.text;
    if (!title || seen.has(title.toLowerCase())) continue;
    seen.add(title.toLowerCase());
    items.push({
      id: row.id,
      title,
      event_date: row.event_date,
      day_label: row.day_label || null,
      source: row.text && !row.day_label ? 'ticker' : 'events',
    });
  }

  return items;
}

async function sendTodaysFestivalPushes() {
  const items = await collectTodaysFestivals();
  if (items.length === 0) {
    return { sent: 0, items: [] };
  }

  const names = items.map((item) => item.title).join(', ');
  const title = items.length === 1 ? `Today is ${items[0].title}` : 'Festivals at the temple today';
  const body =
    items.length === 1
      ? 'Darshan and rituals at Sri Venugopala Swamy Temple, Bolarum.'
      : names;

  const result = await sendPush({
    title,
    body,
    type: 'festival',
    data: { type: 'festival', screen: 'events' },
  });

  return { ...result, items };
}

module.exports = {
  sendPush,
  collectTodaysFestivals,
  sendTodaysFestivalPushes,
};
