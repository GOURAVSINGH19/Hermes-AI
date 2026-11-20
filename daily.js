const { sendDailyNews } = require("./lib/news");
const { sendDailyLesson } = require("./lib/lessons");
const { sendErrorMessage } = require("./lib/telegram");

async function runStep(name, step) {
  try {
    await step();
    return true;
  } catch (error) {
    console.error(`${name} failed:`, error);
    await sendErrorMessage(`${name} failed`, error);
    return false;
  }
}

async function main() {
  const newsSent = await runStep("AI news", sendDailyNews);
  const lessonSent = process.env.SKIP_LESSON || (await runStep("Today's system design lesson", sendDailyLesson));

  if (!newsSent || !lessonSent) process.exitCode = 1;
}

main();
