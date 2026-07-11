const processedSubmissionIds = new Set();

async function fetchSubmissionDetails(submissionId) {
  const graphqlUrl = "https://leetcode.com/graphql/";

  // This is the exact query LeetCode uses to fetch code details
  const query = {
    query: `
      query submissionDetails($submissionId: Int!) {
        submissionDetails(submissionId: $submissionId) {
          statusCode
          code
          lang {
            name
          }
          question {
            questionId
            titleSlug
          }
        }
      }
    `,
    variables: { submissionId: parseInt(submissionId, 10) }
  };

  const response = await fetch(graphqlUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(query)
  });

  const json = await response.json();
  return json?.data?.submissionDetails;
}

// NEW: resolves a valid tab to deliver the popup message to. Normally this
// is just details.tabId, but Chrome sets tabId to -1 when the request that
// triggered this listener wasn't tied to a normal tab (seen alongside
// LeetCode's collaboration/WebSocket feature). In that case, fall back to
// finding the active LeetCode tab directly.
async function resolveTargetTabId(details) {
  if (typeof details.tabId === 'number' && details.tabId >= 0) {
    return details.tabId;
  }

  const tabs = await chrome.tabs.query({
    active: true,
    lastFocusedWindow: true,
    url: "*://*.leetcode.com/*"
  });

  return tabs[0]?.id ?? null;
}

// Watch Chrome's network channel for the successful completion of a submission check
chrome.webRequest.onCompleted.addListener(
  async function(details) {
    if (details.url.includes('/check/')) {
      try {
        // Extract submission ID from URL path structure
        const urlParts = details.url.split('/');
        const detailIndex = urlParts.indexOf('detail');
        if (detailIndex === -1) return;
        const submissionId = urlParts[detailIndex + 1];

        // CHANGED: claim this submission ID immediately and synchronously,
        // before any await. LeetCode fires several polls in quick succession
        // right as a submission finishes; if we only marked "processed"
        // after the fetch below, multiple polls could all pass this check
        // before any of them finished awaiting, causing duplicate processing.
        if (processedSubmissionIds.has(submissionId)) return;
        processedSubmissionIds.add(submissionId);

        const response = await fetch(details.url, { cache: "no-store" });
        const data = await response.json();

        if (data.status_msg !== "Accepted") {
          // Not actually done yet (still Pending/etc) — release the claim
          // so a later poll that IS "Accepted" can still be processed.
          processedSubmissionIds.delete(submissionId);
          return;
        }

        console.log(`Submission #${submissionId} accepted! Querying GraphQL for raw assets...`);

        // Execute official GraphQL call directly using your browser's session
        const detailsData = await fetchSubmissionDetails(submissionId);

        if (detailsData && detailsData.statusCode === 10) {
          console.log("Raw source code recovered from GraphQL safely!");

          // CHANGED: resolve a valid tab instead of trusting details.tabId directly
          const targetTabId = await resolveTargetTabId(details);

          if (targetTabId === null) {
            console.warn(`Could not resolve a tab to deliver notes for submission ${submissionId}`);
            return;
          }

          // Send full package straight over to content.js
          chrome.tabs.sendMessage(
            targetTabId,
            {
              action: "OPEN_SYNC_MODAL",
              payload: {
                code: detailsData.code,
                lang: detailsData.lang.name,
                questionId: detailsData.question.questionId,
                titleSlug: detailsData.question.titleSlug
              }
            },
            () => {
              if (chrome.runtime.lastError) {
                console.warn("Could not reach content script:", chrome.runtime.lastError.message);
              }
            }
          );
        }
      } catch (err) {
        console.error("GraphQL direct retrieval fallback failed:", err);
      }
    }
  },
  { urls: ["https://*.leetcode.com/submissions/detail/*/check/"] }
);