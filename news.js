const fs = require("fs");
const path = require("path");
const { send, sendMarkdown, esc } = require("./lib/telegram");
const { writeLesson, answerQuestion } = require("./lib/lesson");
const topics = require("./lib/topics");

const { DRY_RUN, SKIP_LESSON } = process.env;
const DATA = path.join(__dirname, "data");
const NEWS_DIR = path.join(DATA, "news");
const LESSON_DIR = path.join(DATA, "lessons");
const STATE_FILE = path.join(DATA, "state.json");
const KEEP_NEWS_DAYS = 2;
const MAX_ITEMS = 10;

const QUERY = '"artificial intelligence" OR "generative AI" OR LLM OR OpenAI OR Anthropic OR "Google Gemini" OR "AI model"';
const FEED = `https://news.google.com/rss/search?q=${encodeURIComponent(QUERY + " when:1d")}&hl=en-IN&gl=IN&ceid=IN:en`;

const today = new Date(Date.now() + 5.5 * 36e5).toISOString().slice(0, 10);

const decode = s => s
  .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'");

function pick(block, tag) {
  const m = block.match(new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${tag}>`));
  return m ? decode(m[1].trim()) : undefined;
}

const newsFiles = () => fs.readdirSync(NEWS_DIR).filter(f => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort();

async function runNews({ fresh = false } = {}) {
  fs.mkdirSync(NEWS_DIR, { recursive: true });

  const seen = new Set();
  for (const f of fresh ? [] : newsFiles()) {
    if (f === `${today}.json`) continue;
    for (const n of JSON.parse(fs.readFileSync(path.join(NEWS_DIR, f), "utf8"))) seen.add(n.link);
  }

  const res = await fetch(FEED, { headers: { "User-Agent": "Mozilla/5.0 (news-bot)" } });
  if (!res.ok) throw new Error(`Feed error ${res.status}`);
  const xml = await res.text();

  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)]
    .map(m => ({ title: pick(m[1], "title"), link: pick(m[1], "link") }))
    .filter(n => n.title && n.link && !seen.has(n.link))
    .slice(0, MAX_ITEMS);

  if (!items.length) {
    console.log("No new AI news today");
    if (fresh) await send("🤖 No AI news found in the last 24 hours.");
  } else {
    if (!fresh) fs.writeFileSync(path.join(NEWS_DIR, `${today}.json`), JSON.stringify(items, null, 2) + "\n");
    const text = `🤖 <b>AI News · ${today}</b>\n\n` +
      items.map((n, i) => `${i + 1}. <a href="${esc(n.link)}">${esc(n.title)}</a>`).join("\n\n");
    await send(text);
    console.log(`Sent ${items.length} AI news items`);
  }

  const files = newsFiles();
  for (const f of files.slice(0, Math.max(0, files.length - KEEP_NEWS_DAYS))) {
    fs.unlinkSync(path.join(NEWS_DIR, f));
    console.log("Deleted old news file", f);
  }
}

const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);

const readState = () => fs.existsSync(STATE_FILE)
  ? JSON.parse(fs.readFileSync(STATE_FILE, "utf8"))
  : { next: 0 };

async function runLesson({ force = false } = {}) {
  fs.mkdirSync(LESSON_DIR, { recursive: true });
  const state = readState();

  if (!force && state.lastDate === today && state.lastFile && fs.existsSync(path.join(LESSON_DIR, state.lastFile))) {
    console.log("Lesson already created today, re-sending", state.lastFile);
    await sendMarkdown(fs.readFileSync(path.join(LESSON_DIR, state.lastFile), "utf8"));
    return;
  }

  const index = state.next % topics.length;
  const topic = topics[index];
  const number = index + 1;
  console.log(`Writing lesson ${number}/${topics.length}: ${topic}`);

  const body = await writeLesson({ topic, number, total: topics.length, previousTopic: state.lastTopic });
  const lesson = `# 🏗️ System Design · Day ${number}/${topics.length}\n## ${topic}\n\n${body}\n`;

  const file = `${String(number).padStart(2, "0")}-${slug(topic)}.md`;
  fs.writeFileSync(path.join(LESSON_DIR, file), lesson);
  await sendMarkdown(lesson);

  if (DRY_RUN) return console.log("[DRY_RUN] state not advanced");
  fs.writeFileSync(STATE_FILE, JSON.stringify({ next: state.next + 1, lastDate: today, lastTopic: topic, lastFile: file }, null, 2) + "\n");
}

async function resendLesson() {
  const state = readState();
  const file = state.lastFile && path.join(LESSON_DIR, state.lastFile);
  if (file && fs.existsSync(file)) return sendMarkdown(fs.readFileSync(file, "utf8"));
  return runLesson();
}

async function runCustomTopic(topic) {
  fs.mkdirSync(LESSON_DIR, { recursive: true });
  const body = await writeLesson({ topic, previousTopic: readState().lastTopic });
  const lesson = `# 🏗️ System Design · Custom topic\n## ${topic}\n\n${body}\n`;
  fs.writeFileSync(path.join(LESSON_DIR, `custom-${today}-${slug(topic)}.md`), lesson);
  await sendMarkdown(lesson);
}

async function runAsk(question) {
  const answer = await answerQuestion({ question, lastTopic: readState().lastTopic });
  await sendMarkdown(`## 💬 ${question}\n\n${answer}`);
}

async function main() {
  let failed = false;

  try { await runNews(); }
  catch (e) { failed = true; console.error("News failed:", e); }

  if (!SKIP_LESSON) {
    try { await runLesson(); }
    catch (e) {
      failed = true;
      console.error("Lesson failed:", e);
      await send(`⚠️ Today's system design lesson failed: ${esc(String(e.message || e)).slice(0, 300)}`).catch(() => {});
    }
  }

  if (failed) process.exit(1);
}

if (require.main === module) main();

module.exports = { runNews, runLesson, resendLesson, runCustomTopic, runAsk };
