const DAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function parseDateParts(dateStr) {
  if (!dateStr) return null;
  const [year, month, day] = String(dateStr).slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return null;
  return { year, month, day };
}

function getDayLabel(dateStr) {
  const parts = parseDateParts(dateStr);
  if (!parts) return '';
  return DAYS[new Date(parts.year, parts.month - 1, parts.day).getDay()];
}

function formatTickerText(dateStr, title) {
  const parts = parseDateParts(dateStr);
  if (!parts || !title) return title || '';
  return `${MONTHS[parts.month - 1]} ${parts.day} - ${title}`;
}

module.exports = {
  getDayLabel,
  formatTickerText,
};
