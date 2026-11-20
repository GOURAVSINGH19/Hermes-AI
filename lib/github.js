const { normalizeState } = require("./state");

const DISPATCH_ERROR_HINTS = {
  401: "GITHUB_TOKEN in Vercel is wrong or expired.",
  403: "GITHUB_TOKEN needs Actions: Read and write permission on this repo.",
  404: "Check GITHUB_REPO in Vercel and that command.yml is pushed to the main branch.",
  422: "The command workflow on GitHub is outdated or the branch name is wrong; push the latest code.",
};

function branch() {
  return process.env.GITHUB_BRANCH || "main";
}

function githubRequest(path, { method = "GET", body, accept = "application/vnd.github+json" } = {}) {
  const { GITHUB_TOKEN, GITHUB_REPO } = process.env;

  return fetch(`https://api.github.com/repos/${GITHUB_REPO}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: accept,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "hermes-bot",
      ...(body && { "Content-Type": "application/json" }),
    },
    ...(body && { body: JSON.stringify(body) }),
  });
}

async function startCommandWorkflow(command, text) {
  const response = await githubRequest("/actions/workflows/command.yml/dispatches", {
    method: "POST",
    body: { ref: branch(), inputs: { command, text } },
  });
  if (response.status === 204) return;

  const hint = DISPATCH_ERROR_HINTS[response.status] || (await response.text());
  throw new Error(`GitHub could not start the command (${response.status}). ${hint}`);
}

async function readSavedState() {
  const response = await githubRequest(`/contents/data/state.json?ref=${branch()}`, {
    accept: "application/vnd.github.raw+json",
  });

  if (response.status === 404) return normalizeState();
  if (!response.ok) {
    throw new Error(`Could not read progress from GitHub (${response.status}). Check GITHUB_TOKEN and GITHUB_REPO in Vercel.`);
  }
  return normalizeState(JSON.parse(await response.text()));
}

module.exports = { startCommandWorkflow, readSavedState };
