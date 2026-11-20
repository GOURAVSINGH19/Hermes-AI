const { claude } = require("./config");
const { LESSON_INSTRUCTIONS, QUESTION_INSTRUCTIONS, lessonPrompt, questionPrompt } = require("./prompts");

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

async function askClaude({ instructions, prompt }) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("Missing OPENROUTER_API_KEY");

  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "X-Title": "Hermes AI",
    },
    body: JSON.stringify({
      model: claude.model,
      max_tokens: claude.maxTokens,
      reasoning: { effort: claude.effort, exclude: true },
      messages: [
        { role: "system", content: instructions },
        { role: "user", content: prompt },
      ],
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.error) {
    const reason = data.error?.message || `HTTP ${response.status}`;
    throw new Error(`OpenRouter error: ${reason}`);
  }

  const choice = data.choices?.[0];
  const text = (choice?.message?.content || "").trim();
  if (!text) throw new Error(`Claude returned an empty reply (finish_reason: ${choice?.finish_reason})`);
  if (choice.finish_reason === "length") console.warn("Claude's reply hit max_tokens and may be cut off");

  console.log(`Claude tokens: ${data.usage?.prompt_tokens} in, ${data.usage?.completion_tokens} out`);
  return text;
}

function writeLesson(details) {
  return askClaude({ instructions: LESSON_INSTRUCTIONS, prompt: lessonPrompt(details) });
}

function answerQuestion(details) {
  return askClaude({ instructions: QUESTION_INSTRUCTIONS, prompt: questionPrompt(details) });
}

module.exports = { writeLesson, answerQuestion };
