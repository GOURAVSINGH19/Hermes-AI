const { escapeHtml } = require("./html");
const { telegram } = require("./config");

const MAX_LENGTH = telegram.maxMessageLength;

function markdownToTelegramMessages(markdown) {
  return packIntoMessages(markdownToBlocks(markdown));
}

function markdownToBlocks(markdown) {
  const lines = markdown.replace(/^﻿/, "").replace(/\r/g, "").split("\n");
  const blocks = [];
  let codeLines = null;

  for (const line of lines) {
    const isCodeFence = line.trim().startsWith("```");

    if (isCodeFence && codeLines) {
      blocks.push(...formatCodeBlock(codeLines));
      codeLines = null;
    } else if (isCodeFence) {
      codeLines = [];
    } else if (codeLines) {
      codeLines.push(line);
    } else {
      blocks.push(formatLine(line));
    }
  }

  if (codeLines) blocks.push(...formatCodeBlock(codeLines));
  return blocks;
}

function formatLine(line) {
  const heading = line.match(/^#{1,6}\s+(.*)$/);
  if (heading) return `\n<b>${formatInline(heading[1])}</b>`;

  const bullet = line.match(/^(\s*)[-*]\s+(.*)$/);
  if (bullet) return `${bullet[1]}• ${formatInline(bullet[2])}`;

  const isDivider = /^\s*(---|\*\*\*)\s*$/.test(line);
  if (isDivider) return "";

  return formatInline(line);
}

function formatInline(text) {
  return text
    .split(/(`[^`]+`)/)
    .map(part => (isInlineCode(part) ? formatInlineCode(part) : formatLinksAndBold(part)))
    .join("");
}

function isInlineCode(part) {
  return /^`[^`]+`$/.test(part);
}

function formatInlineCode(part) {
  return `<code>${escapeHtml(part.slice(1, -1))}</code>`;
}

function formatLinksAndBold(text) {
  return escapeHtml(text)
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>");
}

function formatCodeBlock(lines) {
  const pieces = [];
  let current = [];

  for (const line of lines) {
    const wouldBeTooLong = escapeHtml([...current, line].join("\n")).length > MAX_LENGTH - 20;
    if (current.length && wouldBeTooLong) {
      pieces.push(current);
      current = [];
    }
    current.push(line);
  }
  if (current.length) pieces.push(current);

  return pieces.map(piece => `<pre>${escapeHtml(piece.join("\n"))}</pre>`);
}

function packIntoMessages(blocks) {
  const messages = [];
  let current = "";

  for (const block of blocks) {
    const piece = block.slice(0, MAX_LENGTH);
    if (current.length + piece.length + 1 > MAX_LENGTH) {
      addMessage(messages, current);
      current = "";
    }
    current += piece + "\n";
  }
  addMessage(messages, current);

  return messages;
}

function addMessage(messages, text) {
  const tidy = text.trim().replace(/\n{3,}/g, "\n\n");
  if (tidy) messages.push(tidy);
}

function splitHtmlIntoMessages(html) {
  return packIntoMessages(html.split("\n"));
}

module.exports = { markdownToTelegramMessages, splitHtmlIntoMessages };
