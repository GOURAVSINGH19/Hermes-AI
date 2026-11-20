const Anthropic = require("@anthropic-ai/sdk");
const { claude } = require("./config");
const { LESSON_INSTRUCTIONS, QUESTION_INSTRUCTIONS, lessonPrompt, questionPrompt } = require("./prompts");

async function askClaude({ instructions, prompt }) {
  const client = new Anthropic();

  const response = await client.beta.messages.create({
    model: claude.model,
    max_tokens: claude.maxTokens,
    output_config: { effort: claude.effort },
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: instructions,
    messages: [{ role: "user", content: prompt }],
  });

  if (response.stop_reason === "refusal") throw new Error("Claude declined this request");
  if (response.stop_reason === "max_tokens") console.warn("Claude's reply hit max_tokens and may be cut off");

  const text = response.content
    .filter(block => block.type === "text")
    .map(block => block.text)
    .join("")
    .trim();
  if (!text) throw new Error(`Claude returned an empty reply (stop_reason: ${response.stop_reason})`);

  console.log(`Claude tokens: ${response.usage.input_tokens} in, ${response.usage.output_tokens} out`);
  return text;
}

function writeLesson(details) {
  return askClaude({ instructions: LESSON_INSTRUCTIONS, prompt: lessonPrompt(details) });
}

function answerQuestion(details) {
  return askClaude({ instructions: QUESTION_INSTRUCTIONS, prompt: questionPrompt(details) });
}

module.exports = { writeLesson, answerQuestion };
