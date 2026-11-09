require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const tickerRoutes = require('./routes/ticker');
const eventRoutes = require('./routes/events');
const galleryRoutes = require('./routes/gallery');
const deviceRoutes = require('./routes/devices');
const announcementRoutes = require('./routes/announcements');
const notificationRoutes = require('./routes/notifications');
const appInfoRoutes = require('./routes/appInfo');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(
  '/uploads',
  express.static(path.join(__dirname, '..', process.env.UPLOAD_DIR || 'uploads'))
);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'venutemple-server' });
});

app.use('/api/auth', authRoutes);
app.use('/api/ticker', tickerRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/app', appInfoRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Server error' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Venutemple API running on http://localhost:${PORT}`);
});
