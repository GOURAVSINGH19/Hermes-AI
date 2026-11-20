const INDIA_UTC_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

function todayInIndia() {
  return new Date(Date.now() + INDIA_UTC_OFFSET_MS).toISOString().slice(0, 10);
}

function daysBetween(fromDate, toDate) {
  return Math.round((Date.parse(toDate) - Date.parse(fromDate)) / DAY_MS);
}

module.exports = { todayInIndia, daysBetween };
