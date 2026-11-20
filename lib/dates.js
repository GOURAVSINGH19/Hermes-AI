const INDIA_UTC_OFFSET_MS = 5.5 * 60 * 60 * 1000;

function todayInIndia() {
  return new Date(Date.now() + INDIA_UTC_OFFSET_MS).toISOString().slice(0, 10);
}

module.exports = { todayInIndia };
