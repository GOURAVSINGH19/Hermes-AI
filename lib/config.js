const env = process.env;

const DEFAULTS = {
  AI_MODELS: "nvidia/nemotron-3-ultra-550b-a55b:free,google/gemma-4-31b-it:free,openrouter/free",
  AI_LESSON_MAX_TOKENS: "6000",
  AI_ANSWER_MAX_TOKENS: "2500",
  NEWS_QUERY: '"artificial intelligence" OR "generative AI" OR LLM OR OpenAI OR Anthropic OR "Google Gemini" OR "AI model"',
  NEWS_COUNT: "10",
  TOPICS_SOURCE_URL: "https://raw.githubusercontent.com/donnemartin/system-design-primer/master/README.md",
  COURSE_START_DATE: "2026-11-20",
};

function setting(name) {
  return (env[name] || "").trim() || DEFAULTS[name];
}

function listSetting(name) {
  return setting(name).split(",").map(item => item.trim()).filter(Boolean);
}

module.exports = {
  ai: {
    models: listSetting("AI_MODELS"),
    lessonMaxTokens: Number(setting("AI_LESSON_MAX_TOKENS")),
    answerMaxTokens: Number(setting("AI_ANSWER_MAX_TOKENS")),
  },

  news: {
    searchQuery: setting("NEWS_QUERY"),
    headlinesPerMessage: Number(setting("NEWS_COUNT")),
  },

  course: {
    topicsSourceUrl: setting("TOPICS_SOURCE_URL"),
    startDate: setting("COURSE_START_DATE"),
  },

  telegram: {
    maxMessageLength: 3800,
  },

  isDryRun: Boolean(env.DRY_RUN),
};
