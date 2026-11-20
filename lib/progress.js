const topics = require("./topics");
const { escapeHtml } = require("./html");

function formatCourseProgress(nextTopicIndex) {
  const doneCount = nextTopicIndex % topics.length;

  const lines = topics.map((topic, i) => {
    const icon = i < doneCount ? "✅" : i === doneCount ? "👉" : "▫️";
    return `${icon} ${i + 1}. ${escapeHtml(topic)}`;
  });

  return `🏗️ <b>System design course</b> (${doneCount}/${topics.length} done)\n\n${lines.join("\n")}`;
}

module.exports = { formatCourseProgress };
