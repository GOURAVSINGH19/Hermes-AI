const { course } = require("./config");
const { todayInIndia, daysBetween } = require("./dates");
const { escapeHtml } = require("./html");

function courseIndex(topics, dayOffset = 0) {
  const day = daysBetween(course.startDate, todayInIndia()) + dayOffset;
  return ((day % topics.length) + topics.length) % topics.length;
}

function courseTopic(topics, dayOffset = 0) {
  const index = courseIndex(topics, dayOffset);
  return {
    topic: topics[index],
    number: index + 1,
    total: topics.length,
    previousTopic: index > 0 ? topics[index - 1] : null,
  };
}

function formatCourseProgress(topics) {
  const todayIndex = courseIndex(topics);

  const lines = topics.map((topic, i) => {
    const icon = i < todayIndex ? "✅" : i === todayIndex ? "👉" : "▫️";
    return `${icon} ${i + 1}. ${escapeHtml(topic.title)}`;
  });

  return `🏗️ <b>System design course</b> (day ${todayIndex + 1} of ${topics.length})\n\n${lines.join("\n")}`;
}

module.exports = { courseTopic, formatCourseProgress };
