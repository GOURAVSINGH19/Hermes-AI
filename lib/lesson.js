// Writes the daily system design lesson with Claude.
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

async function writeLesson({ topic, number, total, previousTopic }) {
  const client = new Anthropic(); // reads ANTHROPIC_API_KEY from the environment

  const prompt = [
    `Today's topic (lesson ${number} of ${total}): ${topic}`,
    previousTopic ? `Yesterday's lesson was "${previousTopic}". Connect to it briefly if it's relevant.` : "",
    "Write today's lesson.",
  ].filter(Boolean).join("\n");

  const response = await client.beta.messages.create({
    model: "claude-opus-5-5",
    max_tokens: 16000,
    output_config: { effort: "medium" },
    // If the model declines, the API retries the request on a fallback model automatically
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: SYSTEM,
    messages: [{ role: "user", content: prompt }],
  });

  if (response.stop_reason === "refusal") throw new Error("Lesson request was refused");
  const text = response.content.filter(b => b.type === "text").map(b => b.text).join("").trim();
  if (!text) throw new Error(`Empty lesson (stop_reason: ${response.stop_reason})`);
  if (response.stop_reason === "max_tokens") console.warn("Lesson hit max_tokens and may be cut off");
  console.log(`Lesson tokens: in ${response.usage.input_tokens}, out ${response.usage.output_tokens}`);
  return text;
}

module.exports = { writeLesson };
