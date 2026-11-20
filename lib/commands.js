const COMMANDS = {
  news: {
    description: "latest AI news now",
    workingReply: "Getting the latest AI news…",
  },
  lesson: {
    description: "today's system design lesson again",
    workingReply: "Sending today's lesson…",
  },
  next: {
    description: "the next lesson in the course",
    workingReply: "Writing your next lesson… (about 1–2 minutes)",
  },
  topic: {
    description: "a lesson on any topic",
    argument: "name",
    example: "/topic Kafka consumer groups",
    workingReply: "Writing a lesson on that topic… (about 1–2 minutes)",
  },
  ask: {
    description: "ask a system design question",
    argument: "question",
    example: "/ask How does Kafka keep message order?",
    workingReply: "Thinking about your question… (about 1 minute)",
  },
  list: {
    description: "all topics and where you are",
    isInstant: true,
  },
  help: {
    description: "show this list",
    isInstant: true,
  },
};

const ALIASES = { start: "help" };

function parseCommand(message) {
  const match = message.trim().match(/^\/?(\w+)(?:@\S+)?\s*([\s\S]*)$/);
  if (!match) return null;

  const typedName = match[1].toLowerCase();
  return { name: ALIASES[typedName] || typedName, text: match[2].trim() };
}

function helpMessage() {
  const lines = Object.entries(COMMANDS).map(([name, command]) => {
    const argument = command.argument ? ` &lt;${command.argument}&gt;` : "";
    return `/${name}${argument} – ${command.description}`;
  });
  return `<b>Hermes commands</b>\n\n${lines.join("\n")}`;
}

module.exports = { COMMANDS, parseCommand, helpMessage };
