const fs = require("fs");
const path = require("path");
const { paths } = require("./config");

function normalizeState(saved = {}) {
  return {
    nextTopicIndex: saved.nextTopicIndex ?? saved.next ?? 0,
    latestTopic: saved.latestTopic ?? saved.lastTopic ?? null,
    latestLessonFile: saved.latestLessonFile ?? saved.lastFile ?? null,
    dailyLessonDate: saved.dailyLessonDate ?? saved.dailyDate ?? saved.lastDate ?? null,
  };
}

function readState() {
  if (!fs.existsSync(paths.stateFile)) return normalizeState();
  return normalizeState(JSON.parse(fs.readFileSync(paths.stateFile, "utf8")));
}

function saveState(state) {
  fs.mkdirSync(path.dirname(paths.stateFile), { recursive: true });
  fs.writeFileSync(paths.stateFile, JSON.stringify(state, null, 2) + "\n");
}

module.exports = { normalizeState, readState, saveState };
