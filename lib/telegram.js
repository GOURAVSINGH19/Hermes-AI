// Telegram helpers: send messages and convert Markdown to Telegram's HTML subset.
const { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, DRY_RUN } = process.env;

const MAX_CHUNK = 3800; // Telegram limit is 4096 characters per message

const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const stripHtml = s =>
  s.replace(/<[^>]+>/g, "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&amp;/g, "&");

async function send(text, html = true) {
  if (DRY_RUN) return console.log(`[DRY_RUN] Telegram message (${text.length} chars):\n${text}\n---`);
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) throw new Error("Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID");
  const body = { chat_id: TELEGRAM_CHAT_ID, text, disable_web_page_preview: true };
  if (html) body.parse_mode = "HTML";
  const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (res.ok) return;
  const err = await res.text();
  // If Telegram can't parse the HTML, resend the same text as plain text
  if (html && err.includes("can't parse entities")) return send(stripHtml(text), false);
  throw new Error("Telegram error: " + err);
}

// Inline Markdown -> HTML for one line (already outside code blocks)
function inline(line) {
  return line
    .split(/(`[^`]+`)/)
    .map(part => {
      if (/^`[^`]+`$/.test(part)) return `<code>${esc(part.slice(1, -1))}</code>`;
      return esc(part)
        .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2">$1</a>')
        .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>");
    })
    .join("");
}

// Convert Markdown into Telegram HTML "units" (a line, or a whole code block)
function markdownToUnits(md) {
  const units = [];
  let code = null;
  for (const line of md.replace(/\r/g, "").split("\n")) {
    if (line.trim().startsWith("```")) {
      if (code) {
        // Split very long code blocks so a single unit never exceeds the limit
        let buf = [];
        const flush = () => buf.length && units.push(`<pre>${esc(buf.join("\n"))}</pre>`) && (buf = []);
        for (const c of code) {
          if (buf.join("\n").length + c.length > MAX_CHUNK - 100) flush();
          buf.push(c);
        }
        flush();
        code = null;
      } else code = [];
      continue;
    }
    if (code) { code.push(line); continue; }

    const h = line.match(/^#{1,6}\s+(.*)$/);
    const li = line.match(/^(\s*)[-*]\s+(.*)$/);
    if (h) units.push(`\n<b>${inline(h[1])}</b>`);
    else if (li) units.push(`${li[1]}• ${inline(li[2])}`);
    else if (/^\s*(---|\*\*\*)\s*$/.test(line)) units.push("");
    else units.push(inline(line));
  }
  if (code) units.push(`<pre>${esc(code.join("\n"))}</pre>`); // unclosed fence
  return units;
}

// Pack units into messages under the Telegram limit
function chunkUnits(units) {
  const chunks = [];
  let cur = "";
  for (const u of units) {
    const piece = u.length > MAX_CHUNK ? u.slice(0, MAX_CHUNK) : u;
    if (cur.length + piece.length + 1 > MAX_CHUNK) {
      if (cur.trim()) chunks.push(cur.trim());
      cur = "";
    }
    cur += piece + "\n";
  }
  if (cur.trim()) chunks.push(cur.trim());
  return chunks.map(c => c.replace(/\n{3,}/g, "\n\n"));
}

async function sendMarkdown(md) {
  for (const chunk of chunkUnits(markdownToUnits(md))) await send(chunk);
}

module.exports = { send, sendMarkdown, esc, markdownToUnits, chunkUnits };
