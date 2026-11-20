const { send, esc } = require("../lib/telegram");
const topics = require("../lib/topics");

const {
  TELEGRAM_CHAT_ID,
  TELEGRAM_WEBHOOK_SECRET,
  GITHUB_TOKEN,
  GITHUB_REPO,
  GITHUB_BRANCH = "main",
} = process.env;

const HELP = [
  "🤖 <b>Hermes commands</b>",
  "",
  "/news – latest AI news now",
  "/lesson – today's system design lesson again",
  "/next – the next lesson in the course",
  "/topic &lt;name&gt; – a lesson on any topic",
  "/ask &lt;question&gt; – ask a system design question",
  "/list – all topics and where you are",
].join("\n");

const WORKING = {
  news: "🔎 Getting the latest AI news…",
  lesson: "📚 Sending today's lesson…",
  next: "✍️ Writing your next lesson… (about 1–2 minutes)",
  topic: "✍️ Writing a lesson on that topic… (about 1–2 minutes)",
  ask: "🤔 Thinking about your question… (about 1 minute)",
};

const github = (url, options = {}) =>
  fetch(`https://api.github.com/repos/${GITHUB_REPO}${url}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: options.accept || "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "hermes-bot",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
    },
  });

async function dispatch(command, text) {
  const res = await github("/actions/workflows/command.yml/dispatches", {
    method: "POST",
    body: JSON.stringify({ ref: GITHUB_BRANCH, inputs: { command, text } }),
  });
  if (res.status !== 204) throw new Error(`GitHub dispatch failed (${res.status}): ${await res.text()}`);
}

async function listTopics() {
  let next = 0;
  const res = await github(`/contents/data/state.json?ref=${GITHUB_BRANCH}`, { accept: "application/vnd.github.raw+json" });
  if (res.ok) next = JSON.parse(await res.text()).next || 0;
  const done = next % topics.length;
  const lines = topics.map((t, i) => `${i < done ? "✅" : i === done ? "👉" : "▫️"} ${i + 1}. ${esc(t)}`);
  await send(`🏗️ <b>System design course</b> (${done}/${topics.length} done)\n\n${lines.join("\n")}`);
}

async function handle(update) {
  const msg = update.message || update.edited_message;
  if (!msg || !msg.text) return;
  if (String(msg.chat.id) !== String(TELEGRAM_CHAT_ID)) return;

  const m = msg.text.trim().match(/^\/(\w+)(?:@\S+)?\s*([\s\S]*)$/);
  if (!m) return send(HELP);
  const command = m[1].toLowerCase();
  const text = m[2].trim();

  if (command === "start" || command === "help") return send(HELP);
  if (command === "list") return listTopics();
  if (!WORKING[command]) return send(`Unknown command /${esc(command)}\n\n${HELP}`);
  if ((command === "topic" || command === "ask") && !text) {
    return send(command === "topic" ? "Usage: /topic Kafka consumer groups" : "Usage: /ask How does Kafka keep message order?");
  }

  await dispatch(command, text);
  await send(WORKING[command]);
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(200).send("Hermes bot is running");
  if (req.headers["x-telegram-bot-api-secret-token"] !== TELEGRAM_WEBHOOK_SECRET) return res.status(401).end();

  try {
    await handle(req.body || {});
  } catch (e) {
    console.error(e);
    await send(`⚠️ ${esc(String(e.message || e)).slice(0, 300)}`).catch(() => {});
  }
  res.status(200).end();
};
