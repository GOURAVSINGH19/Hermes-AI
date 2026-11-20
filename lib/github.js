const DISPATCH_ERROR_HINTS = {
  401: "GITHUB_TOKEN in Vercel is wrong or expired.",
  403: "GITHUB_TOKEN needs Actions: Read and write permission on this repo.",
  404: "Check GITHUB_REPO in Vercel and that command.yml is pushed to the main branch.",
  422: "The command workflow on GitHub is outdated or the branch name is wrong; push the latest code.",
};

async function startCommandWorkflow(command, text) {
  const { GITHUB_TOKEN, GITHUB_REPO, GITHUB_BRANCH } = process.env;

  const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/actions/workflows/command.yml/dispatches`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "hermes-bot",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ref: GITHUB_BRANCH || "main", inputs: { command, text } }),
  });
  if (response.status === 204) return;

  const hint = DISPATCH_ERROR_HINTS[response.status] || (await response.text());
  throw new Error(`GitHub could not start the command (${response.status}). ${hint}`);
}

module.exports = { startCommandWorkflow };
