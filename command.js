const { send, esc } = require("./lib/telegram");
const { runNews, runLesson, resendLesson, runCustomTopic, runAsk } = require("./news");

const command = (process.env.CMD || "").trim().toLowerCase();
const text = (process.env.CMD_TEXT || "").trim().slice(0, 500);

const handlers = {
  news: () => runNews({ fresh: true }),
  lesson: () => resendLesson(),
  next: () => runLesson({ force: true }),
  topic: () => runCustomTopic(text),
  ask: () => runAsk(text),
};

async function main() {
  const handler = handlers[command];
  if (!handler) throw new Error(`Unknown command: ${command}`);
  if ((command === "topic" || command === "ask") && !text) throw new Error(`/${command} needs some text after it`);
  console.log(`Running /${command}${text ? `: ${text}` : ""}`);
  await handler();
}

main().catch(async e => {
  console.error(e);
  await send(`⚠️ /${esc(command)} failed: ${esc(String(e.message || e)).slice(0, 300)}`).catch(() => {});
  process.exit(1);
});
