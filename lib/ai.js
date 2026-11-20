const { ai } = require("./config");
const { LESSON_INSTRUCTIONS, QUESTION_INSTRUCTIONS, lessonPrompt, questionPrompt } = require("./prompts");

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

async function askAi({ instructions, prompt, maxTokens }) {
  const failures = [];

  for (const model of ai.models) {
    try {
      const text = await callModel({ model, instructions, prompt, maxTokens });
      console.log(`Answered by ${model}`);
      return text;
    } catch (error) {
      console.warn(`${model} failed: ${error.message}`);
      failures.push(`${model}: ${error.message}`);
    }
  }

  throw new Error(`All AI models failed. ${failures.join(" | ")}`);
}

async function callModel({ model, instructions, prompt, maxTokens }) {
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
      model,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: instructions },
        { role: "user", content: prompt },
      ],
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.error) {
    throw new Error(data.error?.message || `HTTP ${response.status}`);
  }

  const choice = data.choices?.[0];
  const text = removeThinking(choice?.message?.content || "");
  if (!text) throw new Error(`empty reply (finish_reason: ${choice?.finish_reason})`);
  if (choice.finish_reason === "length") console.warn(`${model} hit max_tokens; the reply may be cut off`);

  console.log(`Tokens: ${data.usage?.prompt_tokens} in, ${data.usage?.completion_tokens} out`);
  return text;
}

function removeThinking(text) {
  return text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
}

function writeLesson(details) {
  return askAi({ instructions: LESSON_INSTRUCTIONS, prompt: lessonPrompt(details), maxTokens: ai.lessonMaxTokens });
}

function answerQuestion(details) {
  return askAi({ instructions: QUESTION_INSTRUCTIONS, prompt: questionPrompt(details), maxTokens: ai.answerMaxTokens });
}

module.exports = { writeLesson, answerQuestion };
