// // Listen for completed background network requests on LeetCode
// chrome.webRequest.onCompleted.addListener(
//   async function(details) {
//     // We target LeetCode's specific submission check endpoint
//     if (details.url.includes('/check/')) {
//       try {
//         // Fetch the result payload straight from LeetCode's API
//         const response = await fetch(details.url);
//         const data = await response.json();

//         // status_msg "Accepted" maps to successful submission
//         if (data.status_msg === "Accepted") {
//           console.log("Background caught successful submission!", data);

//           // Broadcast this bundle straight to the open content script tab
//           chrome.tabs.sendMessage(details.tabId, {
//             action: "OPEN_SYNC_MODAL",
//             payload: {
//               code: data.code,
//               lang: data.lang,
//               questionId: data.question_id,
//               titleSlug: data.title_slug || "problem"
//             }
//           });
//         }
//       } catch (err) {
//         console.error("Error reading submission stream:", err);
//       }
//     }
//   },
//   { urls: ["https://*.leetcode.com/submissions/detail/*/check/"] }
// );

// Listen for completed background network requests on LeetCode
chrome.webRequest.onCompleted.addListener(
  async function(details) {
    // Target LeetCode's specific submission check endpoint
    // Example URL: https://leetcode.com/submissions/detail/2060875590/check/
    if (details.url.includes('/check/')) {
      try {
        // Extract the unique submission ID straight out of the URL path structure
        const urlParts = details.url.split('/');
        const detailIndex = urlParts.indexOf('detail');
        if (detailIndex === -1) return;
        const submissionId = urlParts[detailIndex + 1];

        // Fetch the check result status package
        const response = await fetch(details.url);
        const data = await response.json();

        // status_msg "Accepted" means it passed all test cases perfectly!
        if (data.status_msg === "Accepted") {
          console.log(`Success verified for Submission #${submissionId}. Fetching raw code asset...`);

          // Execute a clean background fetch to get the raw code payload safely 
          // away from LeetCode's frontend UI layout rules
          const shareUrl = `https://leetcode.com/submissions/detail/${submissionId}/share/`;
          const shareResponse = await fetch(shareUrl);
          const shareData = await shareResponse.json();
          
          const rawCode = shareData.submission_code;

          if (rawCode) {
            console.log("Raw code successfully retrieved via API backend!");
            
            // Broadcast the complete metadata + source code package straight to content.js
            chrome.tabs.sendMessage(details.tabId, {
              action: "OPEN_SYNC_MODAL",
              payload: {
                code: rawCode,
                lang: data.lang,
                questionId: data.question_id,
                titleSlug: data.title_slug || "problem"
              }
            });
          }
        }
      } catch (err) {
        console.error("Option B robust network intercept failed:", err);
      }
    }
  },
  { urls: ["https://*.leetcode.com/submissions/detail/*/check/"] }
);