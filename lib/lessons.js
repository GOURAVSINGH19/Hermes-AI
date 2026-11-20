const fs = require("fs");
const path = require("path");
const topics = require("./topics");
const claude = require("./claude");
const { paths, isDryRun } = require("./config");
const { todayInIndia } = require("./dates");
const { readState, saveState } = require("./state");
const { sendMessage, sendMarkdown } = require("./telegram");
const { formatCourseProgress } = require("./progress");

async function sendDailyLesson() {
  const state = readState();

  if (state.dailyLessonDate === todayInIndia() && lessonExists(state.latestLessonFile)) {
    console.log("Today's lesson already exists, sending it again:", state.latestLessonFile);
    await sendMarkdown(readLesson(state.latestLessonFile));
    return;
  }

  await writeAndSendCourseLesson(state, { isDailyLesson: true });
}

async function sendNextLesson() {
  await writeAndSendCourseLesson(readState(), { isDailyLesson: false });
}

async function resendLatestLesson() {
  const state = readState();

  if (lessonExists(state.latestLessonFile)) {
    await sendMarkdown(readLesson(state.latestLessonFile));
  } else {
    await sendDailyLesson();
  }
}

async function sendCustomLesson(topic) {
  const body = await claude.writeLesson({ topic, previousTopic: readState().latestTopic });
  const lesson = buildLesson({ title: "Custom topic", topic, body });

  saveLesson(`custom-${todayInIndia()}-${slugify(topic)}.md`, lesson);
  await sendMarkdown(lesson);
}

async function answerQuestion(question) {
  const answer = await claude.answerQuestion({ question, latestTopic: readState().latestTopic });
  await sendMarkdown(`## 💬 ${question}\n\n${answer}`);
}

async function sendCourseProgress() {
  await sendMessage(formatCourseProgress(readState().nextTopicIndex));
}

async function writeAndSendCourseLesson(state, { isDailyLesson }) {
  const topicIndex = state.nextTopicIndex % topics.length;
  const topic = topics[topicIndex];
  const lessonNumber = topicIndex + 1;
  console.log(`Writing lesson ${lessonNumber}/${topics.length}: ${topic}`);

  const body = await claude.writeLesson({
    topic,
    lessonNumber,
    totalLessons: topics.length,
    previousTopic: state.latestTopic,
  });
  const lesson = buildLesson({ title: `Day ${lessonNumber}/${topics.length}`, topic, body });
  const file = `${String(lessonNumber).padStart(2, "0")}-${slugify(topic)}.md`;

  saveLesson(file, lesson);
  await sendMarkdown(lesson);

  if (isDryRun) {
    console.log("[DRY_RUN] Progress not saved");
    return;
  }
  saveState({
    nextTopicIndex: state.nextTopicIndex + 1,
    latestTopic: topic,
    latestLessonFile: file,
    dailyLessonDate: isDailyLesson ? todayInIndia() : state.dailyLessonDate,
  });
}

function buildLesson({ title, topic, body }) {
  return `# 🏗️ System Design · ${title}\n## ${topic}\n\n${body}\n`;
}

function lessonExists(file) {
  return Boolean(file) && fs.existsSync(path.join(paths.lessonsDir, file));
}

function readLesson(file) {
  return fs.readFileSync(path.join(paths.lessonsDir, file), "utf8");
}

function saveLesson(file, lesson) {
  fs.mkdirSync(paths.lessonsDir, { recursive: true });
  fs.writeFileSync(path.join(paths.lessonsDir, file), lesson);
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

module.exports = {
  sendDailyLesson,
  sendNextLesson,
  resendLatestLesson,
  sendCustomLesson,
  answerQuestion,
  sendCourseProgress,
};
