const { sendNews } = require("./lib/news");
const lessons = require("./lib/lessons");
const { COMMANDS, parseCommand } = require("./lib/commands");
const { sendErrorMessage } = require("./lib/telegram");

const HANDLERS = {
  news: () => sendNews(),
  lesson: () => lessons.sendTodaysLesson(),
  next: () => lessons.sendTomorrowsLesson(),
  topic: text => lessons.sendCustomLesson(text),
  ask: text => lessons.answerQuestion(text),
  list: () => lessons.sendCourseProgress(),
};

function readCommandFromEnvironment() {
  const typed = (process.env.CMD || "").trim();
  const parsed = parseCommand(typed) || { name: typed, text: "" };
  const text = ((process.env.CMD_TEXT || "").trim() || parsed.text).slice(0, 500);
  return { name: parsed.name, text };
}

async function main() {
  const { name, text } = readCommandFromEnvironment();

  try {
    const handler = HANDLERS[name];
    if (!handler) {
      throw new Error(`Unknown command "${name}". Use one of: ${Object.keys(HANDLERS).join(", ")}`);
    }
    if (COMMANDS[name].argument && !text) {
      throw new Error(`/${name} needs a ${COMMANDS[name].argument}, e.g. ${COMMANDS[name].example}`);
    }

    console.log(`Running /${name}${text ? `: ${text}` : ""}`);
    await handler(text);
  } catch (error) {
    console.error(error);
    await sendErrorMessage(`/${name} failed`, error);
    process.exitCode = 1;
  }
}

main();
