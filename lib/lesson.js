const Anthropic = require("@anthropic-ai/sdk");

const SYSTEM = `You are a senior software engineer and an excellent teacher of system design.
You write one daily lesson for a developer who is moving from beginner to intermediate level.
The lesson is read on a phone in Telegram, so it must be clear, practical and well structured.

Write in Markdown using only: ## headings, short paragraphs, "- " bullet lists, **bold**, \`inline code\`
and fenced code blocks. Do not use tables, HTML or images.

Structure every lesson like this:
## 🎯 What it is and why it matters
The problem it solves, in plain words.
## 🧠 Simple analogy
A real-life analogy that makes the idea click.
## ⚙️ How it works (in depth)
Step by step, explaining what happens internally and why each step exists.
Include at least one ASCII diagram in a fenced code block, at most 40 characters wide so it fits a phone screen.
## 🌍 Real-world usage
How well-known companies or tools use it, with concrete numbers where helpful.
## ⚖️ Trade-offs
When to use it, when not to, and the alternatives.
## ⚠️ Common mistakes
## 🎤 Interview questions
3 questions, each followed by a short model answer.
## ✅ Key takeaways
3-5 bullets.

Aim for 1200-1800 words. Be accurate; never invent statistics. Start directly with the first heading.`;

const ASK_SYSTEM = `You are a senior software engineer who mentors a developer learning system design (beginner to intermediate).
Answer their question clearly and accurately, the way a good mentor would explain it in person.
The answer is read on a phone in Telegram. Write in Markdown using only: ## headings, short paragraphs,
"- " bullet lists, **bold**, \`inline code\` and fenced code blocks (no tables, no HTML).
Use a small ASCII diagram (max 40 characters wide) when it helps. Keep it under 600 words unless the question needs more.
Never invent statistics. Start directly with the answer.`;

async function callClaude(system, prompt) {
  const client = new Anthropic();
  const response = await client.beta.messages.create({
    model: "claude-opus-5-5",
    max_tokens: 16000,
    output_config: { effort: "medium" },
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system,
    messages: [{ role: "user", content: prompt }],
  });

  if (response.stop_reason === "refusal") throw new Error("Request was refused");
  const text = response.content.filter(b => b.type === "text").map(b => b.text).join("").trim();
  if (!text) throw new Error(`Empty response (stop_reason: ${response.stop_reason})`);
  if (response.stop_reason === "max_tokens") console.warn("Response hit max_tokens and may be cut off");
  console.log(`Claude tokens: in ${response.usage.input_tokens}, out ${response.usage.output_tokens}`);
  return text;
}

function writeLesson({ topic, number, total, previousTopic }) {
  const prompt = [
    number ? `Today's topic (lesson ${number} of ${total}): ${topic}` : `Topic requested by the learner: ${topic}`,
    previousTopic ? `Their most recent lesson was "${previousTopic}". Connect to it briefly if it's relevant.` : "",
    "Write the lesson.",
  ].filter(Boolean).join("\n");
  return callClaude(SYSTEM, prompt);
}

function answerQuestion({ question, lastTopic }) {
  const prompt = [
    lastTopic ? `Their most recent lesson was "${lastTopic}".` : "",
    `Question: ${question}`,
  ].filter(Boolean).join("\n");
  return callClaude(ASK_SYSTEM, prompt);
}

module.exports = { writeLesson, answerQuestion };
