const cron = require("node-cron");

const { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID } = process.env;

async function sendTelegram(text) {
  const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text }),
  });
  if (!res.ok) console.error("Telegram error:", await res.text());
}

cron.schedule("0 9 * * *", async () => {
  await sendTelegram("Daily job ran at " + new Date().toLocaleString());
}, { timezone: "Asia/Kolkata" });
