const fs = require("fs");
const path = require("path");
const { paths, news } = require("./config");
const { todayInIndia } = require("./dates");
const { escapeHtml, decodeHtmlEntities } = require("./html");
const { sendMessage } = require("./telegram");

const FEED_URL =
  "https://news.google.com/rss/search" +
  `?q=${encodeURIComponent(`${news.searchQuery} when:1d`)}` +
  "&hl=en-IN&gl=IN&ceid=IN:en";

async function sendDailyNews() {
  const alreadySent = readSentLinks();
  const headlines = (await fetchAiHeadlines())
    .filter(headline => !alreadySent.has(headline.link))
    .slice(0, news.headlinesPerMessage);

  if (headlines.length) {
    saveTodaysHeadlines(headlines);
    await sendMessage(formatHeadlines(headlines));
    console.log(`Sent ${headlines.length} AI news headlines`);
  } else {
    console.log("No new AI news today");
  }

  deleteOldNewsFiles();
}

async function sendLatestNews() {
  const headlines = (await fetchAiHeadlines()).slice(0, news.headlinesPerMessage);

  if (headlines.length) {
    await sendMessage(formatHeadlines(headlines));
  } else {
    await sendMessage("🤖 No AI news found in the last 24 hours.");
  }
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

function listNewsFiles() {
  if (!fs.existsSync(paths.newsDir)) return [];
  return fs.readdirSync(paths.newsDir).filter(name => /^\d{4}-\d{2}-\d{2}\.json$/.test(name)).sort();
}

function readSentLinks() {
  const todaysFile = `${todayInIndia()}.json`;
  const links = new Set();

  for (const file of listNewsFiles()) {
    if (file === todaysFile) continue;
    const headlines = JSON.parse(fs.readFileSync(path.join(paths.newsDir, file), "utf8"));
    headlines.forEach(headline => links.add(headline.link));
  }
  return links;
}

function saveTodaysHeadlines(headlines) {
  fs.mkdirSync(paths.newsDir, { recursive: true });
  const file = path.join(paths.newsDir, `${todayInIndia()}.json`);
  fs.writeFileSync(file, JSON.stringify(headlines, null, 2) + "\n");
}

function deleteOldNewsFiles() {
  const files = listNewsFiles();
  const oldFiles = files.slice(0, Math.max(0, files.length - news.daysToKeep));

  for (const file of oldFiles) {
    fs.unlinkSync(path.join(paths.newsDir, file));
    console.log("Deleted old news file", file);
  }
}

module.exports = { sendDailyNews, sendLatestNews };
