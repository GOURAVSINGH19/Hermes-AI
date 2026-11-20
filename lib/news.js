const { news } = require("./config");
const { todayInIndia } = require("./dates");
const { escapeHtml, decodeHtmlEntities } = require("./html");
const { sendMessage } = require("./telegram");

const FEED_URL =
  "https://news.google.com/rss/search" +
  `?q=${encodeURIComponent(`${news.searchQuery} when:1d`)}` +
  "&hl=en-IN&gl=IN&ceid=IN:en";

async function sendNews() {
  const headlines = (await fetchAiHeadlines()).slice(0, news.headlinesPerMessage);

  if (!headlines.length) {
    await sendMessage("🤖 No AI news found in the last 24 hours.");
    return;
  }

  await sendMessage(formatHeadlines(headlines));
  console.log(`Sent ${headlines.length} AI news headlines`);
}

async function fetchAiHeadlines() {
  const response = await fetch(FEED_URL, { headers: { "User-Agent": "Mozilla/5.0 (hermes-bot)" } });
  if (!response.ok) throw new Error(`News feed error ${response.status}`);

  const xml = await response.text();
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)]
    .map(([, item]) => ({ title: readXmlTag(item, "title"), link: readXmlTag(item, "link") }))
    .filter(headline => headline.title && headline.link);
}

function readXmlTag(xml, tag) {
  const pattern = new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${tag}>`);
  const match = xml.match(pattern);
  return match ? decodeHtmlEntities(match[1].trim()) : undefined;
}

function formatHeadlines(headlines) {
  const list = headlines
    .map((headline, i) => `${i + 1}. <a href="${escapeHtml(headline.link)}">${escapeHtml(headline.title)}</a>`)
    .join("\n\n");
  return `🤖 <b>AI News · ${todayInIndia()}</b>\n\n${list}`;
}

module.exports = { sendNews };
