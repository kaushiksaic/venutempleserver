require('dotenv').config();
const { sendTodaysFestivalPushes } = require('../utils/push');

sendTodaysFestivalPushes()
  .then((result) => {
    console.log('Today festival push result:', result);
    process.exit(0);
  })
  .catch((err) => {
    console.error('Today festival push failed:', err);
    process.exit(1);
  });
