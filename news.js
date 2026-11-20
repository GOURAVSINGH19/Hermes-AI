// Daily news -> Telegram. Runs on GitHub Actions (see .github/workflows/daily-news.yml).
// Stores each day's news in data/news/YYYY-MM-DD.json and keeps only the latest KEEP_FILES days.
const fs = require("fs");
const path = require("path");

const { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, DRY_RUN } = process.env;
const DIR = path.join(__dirname, "data", "news");
const KEEP_FILES = 2; // keep only the 2 most recent days
const MAX_ITEMS = 10;
const FEED = "https://news.google.com/rss?hl=en-IN&gl=IN&ceid=IN:en"; // any RSS feed works

// Date in IST so the file name matches your local day
const today = new Date(Date.now() + 5.5 * 36e5).toISOString().slice(0, 10);

const listFiles = () =>
  fs.readdirSync(DIR).filter(f => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort();

function decode(s) {
  return s
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

function pick(block, tag) {
  const m = block.match(new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${tag}>`));
  return m ? decode(m[1].trim()) : undefined;
}

async function sendTelegram(text) {
  if (DRY_RUN) return console.log("[DRY_RUN] Telegram message:\n" + text);
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) throw new Error("Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID");
  const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text, parse_mode: "HTML", disable_web_page_preview: true }),
  });
  if (!res.ok) throw new Error("Telegram error: " + (await res.text()));
}

async function main() {
  fs.mkdirSync(DIR, { recursive: true });

  // Links from stored days (excluding today) so we don't resend old news
  const seen = new Set();
  for (const f of listFiles()) {
    if (f === `${today}.json`) continue;
    for (const n of JSON.parse(fs.readFileSync(path.join(DIR, f), "utf8"))) seen.add(n.link);
  }

  const res = await fetch(FEED, { headers: { "User-Agent": "Mozilla/5.0 (news-bot)" } });
  if (!res.ok) throw new Error(`Feed error ${res.status}`);
  const xml = await res.text();

  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)]
    .map(m => ({ title: pick(m[1], "title"), link: pick(m[1], "link"), source: pick(m[1], "source") }))
    .filter(n => n.title && n.link && !seen.has(n.link))
    .slice(0, MAX_ITEMS);

  if (!items.length) {
    console.log("No new news today");
  } else {
    fs.writeFileSync(path.join(DIR, `${today}.json`), JSON.stringify(items, null, 2) + "\n");

    // Headlines are clickable links (HTML mode), so long URLs don't eat the 4096-char limit
    const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    const text = `📰 <b>News for ${today}</b>\n\n` +
      items.map((n, i) => `${i + 1}. <a href="${esc(n.link)}">${esc(n.title)}</a>`).join("\n\n");
    await sendTelegram(text);
    console.log(`Sent ${items.length} items`);
  }

  // Keep only the latest KEEP_FILES days, delete the rest
  const files = listFiles();
  for (const f of files.slice(0, Math.max(0, files.length - KEEP_FILES))) {
    fs.unlinkSync(path.join(DIR, f));
    console.log("Deleted old file", f);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
