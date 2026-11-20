const ai = require("./ai");
const { loadTopics } = require("./topics");
const { courseTopic, formatCourseProgress } = require("./course");
const { sendMessage, sendMarkdown } = require("./telegram");

async function sendTodaysLesson() {
  await sendCourseLesson({ dayOffset: 0 });
}

async function sendTomorrowsLesson() {
  await sendCourseLesson({ dayOffset: 1 });
}

async function sendCustomLesson(topic) {
  const body = await ai.writeLesson({ topic, previousTopic: await todaysTopicTitle() });
  await sendMarkdown(buildLesson({ heading: "Custom topic", topic, body }));
}

async function answerQuestion(question) {
  const answer = await ai.answerQuestion({ question, latestTopic: await todaysTopicTitle() });
  await sendMarkdown(`## 💬 ${question}\n\n${answer}`);
}

async function sendCourseProgress() {
  await sendMessage(formatCourseProgress(await loadTopics()));
}

async function sendCourseLesson({ dayOffset }) {
  const { topic, number, total, previousTopic } = courseTopic(await loadTopics(), dayOffset);
  console.log(`Writing lesson ${number}/${total}: ${topic.title}`);

  const body = await ai.writeLesson({
    topic: topic.title,
    lessonNumber: number,
    totalLessons: total,
    previousTopic: previousTopic?.title,
  });

  await sendMarkdown(buildLesson({ heading: `Day ${number}/${total}`, topic: topic.title, body, link: topic.link }));
}

async function todaysTopicTitle() {
  try {
    return courseTopic(await loadTopics()).topic.title;
  } catch {
    return null;
  }
}

function buildLesson({ heading, topic, body, link }) {
  const readMore = link ? `\n\n📚 Read more: [${topic}](${link})` : "";
  return `# 🏗️ System Design · ${heading}\n## ${topic}\n\n${body}${readMore}\n`;
}

module.exports = {
  sendTodaysLesson,
  sendTomorrowsLesson,
  sendCustomLesson,
  answerQuestion,
  sendCourseProgress,
};
