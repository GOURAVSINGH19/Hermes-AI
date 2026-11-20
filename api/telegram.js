const { COMMANDS, parseCommand, helpMessage } = require("../lib/commands");
const { startCommandWorkflow, readSavedState } = require("../lib/github");
const { formatCourseProgress } = require("../lib/progress");
const { sendMessage, sendErrorMessage } = require("../lib/telegram");
const { escapeHtml } = require("../lib/html");

const REQUIRED_SETTINGS = [
  "TELEGRAM_BOT_TOKEN",
  "TELEGRAM_CHAT_ID",
  "TELEGRAM_WEBHOOK_SECRET",
  "GITHUB_TOKEN",
  "GITHUB_REPO",
];

module.exports = async function handler(req, res) {
  const missingSettings = REQUIRED_SETTINGS.filter(name => !process.env[name]);

  if (req.method !== "POST") {
    const status = missingSettings.length
      ? `Missing Vercel env vars: ${missingSettings.join(", ")}`
      : "Hermes bot is running";
    return res.status(200).send(status);
  }

  if (!isFromTelegram(req)) return res.status(401).end();

  try {
    if (missingSettings.length) {
      throw new Error(`Missing Vercel env vars: ${missingSettings.join(", ")}. Add them and redeploy.`);
    }
    await handleUpdate(readBody(req));
  } catch (error) {
    console.error(error);
    await sendErrorMessage("Something went wrong", error);
  }

  res.status(200).end();
};

function isFromTelegram(req) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  return Boolean(secret) && req.headers["x-telegram-bot-api-secret-token"] === secret;
}

function readBody(req) {
  return typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
}

async function handleUpdate(update) {
  const message = update.message;
  if (!message?.text) return;
  if (String(message.chat.id) !== String(process.env.TELEGRAM_CHAT_ID)) return;

  if (!message.text.trim().startsWith("/")) return sendMessage(helpMessage());

  const { name, text } = parseCommand(message.text);
  const command = COMMANDS[name];

  if (!command) return sendMessage(`Unknown command /${escapeHtml(name)}\n\n${helpMessage()}`);
  if (name === "help") return sendMessage(helpMessage());
  if (name === "list") return sendMessage(formatCourseProgress((await readSavedState()).nextTopicIndex));
  if (command.argument && !text) return sendMessage(`Usage: ${command.example}`);

  await startCommandWorkflow(name, text);
  await sendMessage(command.workingReply);
}
