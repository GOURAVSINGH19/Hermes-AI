const { escapeHtml, stripHtml } = require("./html");
const { markdownToTelegramMessages, splitHtmlIntoMessages } = require("./markdown");
const { isDryRun, telegram } = require("./config");

async function sendMessage(html) {
  if (stripHtml(html).length > telegram.maxMessageLength) {
    for (const part of splitHtmlIntoMessages(html)) await sendMessage(part);
    return;
  }

  if (isDryRun) {
    console.log(`[DRY_RUN] Telegram message (${html.length} chars):\n${html}\n---`);
    return;
  }

  const response = await callSendMessage({ text: html, parse_mode: "HTML" });
  if (response.ok) return;

  const error = await response.text();
  if (error.includes("can't parse entities")) {
    await sendPlainText(stripHtml(html));
    return;
  }
  throw new Error(`Telegram error: ${error}`);
}

async function sendPlainText(text) {
  const response = await callSendMessage({ text });
  if (!response.ok) throw new Error(`Telegram error: ${await response.text()}`);
}

async function sendMarkdown(markdown) {
  for (const message of markdownToTelegramMessages(markdown)) {
    await sendMessage(message);
  }
}

async function sendErrorMessage(title, error) {
  const reason = escapeHtml(String(error?.message || error)).slice(0, 300);
  try {
    await sendMessage(`⚠️ ${escapeHtml(title)}: ${reason}`);
  } catch (sendError) {
    console.error("Could not send the error to Telegram:", sendError);
  }
}

function callSendMessage(payload) {
  const { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID } = process.env;
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    throw new Error("Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID");
  }

  return fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, disable_web_page_preview: true, ...payload }),
  });
}

module.exports = { sendMessage, sendMarkdown, sendErrorMessage };
