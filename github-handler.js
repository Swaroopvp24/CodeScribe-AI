// github-handler.js
// Handles "PUSH_TO_GITHUB" messages sent from content.js.
// Runs inside the service worker (imported via sw-entry.js).
// Does NOT touch or import background.js or ai-handler.js — fully separate.

const GITHUB_API_VERSION = "2026-03-10";

// ---- UTF-8 safe base64 helpers (plain btoa/atob break on non-ASCII chars) ----
function encodeBase64Utf8(str) {
  return btoa(unescape(encodeURIComponent(str)));
}
function decodeBase64Utf8(b64) {
  return decodeURIComponent(escape(atob(b64)));
}

async function getGithubSettings() {
  const { ghToken, ghRepo, ghBranch } = await chrome.storage.local.get(['ghToken', 'ghRepo', 'ghBranch']);
  if (!ghToken) throw new Error("No GitHub token saved in options page.");
  if (!ghRepo) throw new Error("No GitHub repo saved in options page.");
  return { ghToken, ghRepo, ghBranch: ghBranch || 'main' };
}

function githubHeaders(token) {
  return {
    "Authorization": `Bearer ${token}`,
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": GITHUB_API_VERSION
  };
}

// Returns { sha, content } if file exists, or null if it doesn't (404).
async function getExistingFile(path, { ghToken, ghRepo, ghBranch }) {
  const url = `https://api.github.com/repos/${ghRepo}/contents/${path}?ref=${ghBranch}`;
  const response = await fetch(url, {
    headers: githubHeaders(ghToken),
    cache: "no-store" // never serve a stale sha from the browser's HTTP cache
  });

  if (response.status === 404) return null;

  const data = await response.json();
  if (!response.ok) throw new Error(data?.message || `Failed to check ${path}`);

  return {
    sha: data.sha,
    content: decodeBase64Utf8(data.content)
  };
}

// Creates or updates a file. Pass sha only when updating an existing file.
async function putFile(path, contentText, commitMessage, sha, { ghToken, ghRepo, ghBranch }) {
  const url = `https://api.github.com/repos/${ghRepo}/contents/${path}`;

  const body = {
    message: commitMessage,
    content: encodeBase64Utf8(contentText),
    branch: ghBranch
  };
  if (sha) body.sha = sha;

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      ...githubHeaders(ghToken),
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data?.message || `Failed to push ${path}`);
  return data;
}

// Builds the merged markdown: appends a new section per attempt instead of overwriting.
function buildMergedMarkdown(existingContent, titleSlug, fullFilename, noteStyle, notes) {
  const section = `## ${fullFilename}\n*Style: ${noteStyle}*\n\n${notes}\n\n---\n`;

  if (!existingContent) {
    return `# ${titleSlug}\n\n${section}`;
  }
  return `${existingContent.trim()}\n\n${section}`;
}

function isShaConflict(err) {
  const msg = err.message || "";
  return /sha/i.test(msg) || /expected/i.test(msg) || /does not match/i.test(msg);
}

// Wraps a push with a couple of automatic retries if GitHub rejects it for a
// stale sha (e.g. the file changed between our GET and PUT).
async function putFileWithRetry(path, buildContent, buildMessage, existing, settings, attempt = 1) {
  try {
    const content = buildContent(existing?.content);
    const message = buildMessage(!!existing);
    return await putFile(path, content, message, existing?.sha, settings);
  } catch (err) {
    if (!isShaConflict(err) || attempt >= 3) throw err;

    console.warn(`Sha conflict on ${path} (attempt ${attempt}), re-fetching latest and retrying...`);
    const fresh = await getExistingFile(path, settings);
    return putFileWithRetry(path, buildContent, buildMessage, fresh, settings, attempt + 1);
  }
}

// ---- Step A + Step B, run in parallel ----
async function pushNotesFile({ folderPath, titleSlug, fullFilename, noteStyle, notes }, settings) {
  const mdPath = `${folderPath}/${titleSlug}.md`;
  const existing = await getExistingFile(mdPath, settings);

  await putFileWithRetry(
    mdPath,
    (existingContent) => buildMergedMarkdown(existingContent, titleSlug, fullFilename, noteStyle, notes),
    (isUpdate) => isUpdate
      ? `Update notes for ${titleSlug} (${fullFilename})`
      : `Add notes for ${titleSlug} (${fullFilename})`,
    existing,
    settings
  );
  return mdPath;
}

async function pushCodeFile({ codePath, titleSlug, fullFilename, code }, settings) {
  const existing = await getExistingFile(codePath, settings);

  await putFileWithRetry(
    codePath,
    () => code,
    (isUpdate) => isUpdate
      ? `Update solution for ${titleSlug} (${fullFilename})`
      : `Add solution for ${titleSlug} (${fullFilename})`,
    existing,
    settings
  );
  return codePath;
}

async function pushToGithub(payload) {
  const settings = await getGithubSettings();

  const [mdPath, codePath] = await Promise.all([
    pushNotesFile(payload, settings),
    pushCodeFile(payload, settings)
  ]);

  return { mdPath, codePath };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "PUSH_TO_GITHUB") {
    pushToGithub(message.payload)
      .then((result) => sendResponse({ success: true, ...result }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true; // keep the message channel open for the async response
  }
});