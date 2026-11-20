const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");

module.exports = {
  paths: {
    newsDir: path.join(DATA_DIR, "news"),
    lessonsDir: path.join(DATA_DIR, "lessons"),
    stateFile: path.join(DATA_DIR, "state.json"),
  },

  news: {
    daysToKeep: 2,
    headlinesPerMessage: 10,
    searchQuery: '"artificial intelligence" OR "generative AI" OR LLM OR OpenAI OR Anthropic OR "Google Gemini" OR "AI model"',
  },

  claude: {
    model: "claude-opus-5-5",
    effort: "medium",
    maxTokens: 16000,
  },

  telegram: {
    maxMessageLength: 3800,
  },

  isDryRun: Boolean(process.env.DRY_RUN),
};
