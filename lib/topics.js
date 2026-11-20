const { course } = require("./config");

const FUNDAMENTALS_START = "performance vs scalability";
const FUNDAMENTALS_END = "appendix";
const CASE_STUDIES_SECTION = "system design interview questions with solutions";
const SKIPPED_HEADINGS = /^(source\(s\)|disadvantage|step \d|next steps|further reading)/i;

async function loadTopics() {
  const response = await fetch(course.topicsSourceUrl);
  if (!response.ok) throw new Error(`Could not download the topic list (${response.status})`);

  const topics = parseTopics(await response.text(), sectionLinkBase(course.topicsSourceUrl));
  if (!topics.length) throw new Error("No topics found at TOPICS_SOURCE_URL");
  return topics;
}

function parseTopics(markdown, linkBase) {
  const headings = readHeadings(markdown).filter(heading => !SKIPPED_HEADINGS.test(heading.title));
  const fundamentals = [];
  const caseStudies = [];
  let section = null;
  let parentTitle = null;

  for (const heading of headings) {
    const lowerTitle = heading.title.toLowerCase();

    if (heading.level === 2) {
      if (lowerTitle === FUNDAMENTALS_START) section = "fundamentals";
      else if (lowerTitle === FUNDAMENTALS_END) section = null;
      else if (lowerTitle === CASE_STUDIES_SECTION) section = "caseStudies";
      else if (section === "caseStudies") section = null;
      parentTitle = heading.title;
    }

    const link = linkBase ? `${linkBase}#${githubAnchor(heading.title)}` : null;

    if (section === "fundamentals") {
      const title = heading.level > 2 ? `${parentTitle}: ${heading.title}` : heading.title;
      fundamentals.push({ title, link });
    }
    if (section === "caseStudies" && heading.level === 3) {
      caseStudies.push({ title: heading.title, link });
    }
  }

  const course = [...fundamentals, ...caseStudies];
  return course.length ? course : headings.map(heading => ({ title: heading.title, link: null }));
}

function readHeadings(markdown) {
  return markdown
    .split("\n")
    .map(line => line.match(/^(#{2,4})\s+(.+?)\s*#*\s*$/))
    .filter(Boolean)
    .map(([, hashes, title]) => ({ level: hashes.length, title: title.replace(/\[|\]\([^)]*\)/g, "").trim() }));
}

function githubAnchor(title) {
  return title.toLowerCase().replace(/[^\w\- ]/g, "").replace(/ /g, "-");
}

function sectionLinkBase(sourceUrl) {
  const match = sourceUrl.match(/^https:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/[^/]+\/README\.md$/i);
  return match ? `https://github.com/${match[1]}/${match[2]}` : null;
}

module.exports = { loadTopics, parseTopics };
