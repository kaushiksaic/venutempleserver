const express = require('express');
const { requireAdmin } = require('../middleware/auth');
const { sendTodaysFestivalPushes } = require('../utils/push');

const router = express.Router();

router.post('/send-today', requireAdmin, async (req, res) => {
  try {
    const result = await sendTodaysFestivalPushes();
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to send today's festival notifications" });
  }
});

module.exports = router;
