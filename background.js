// // // Listen for completed background network requests on LeetCode
// // chrome.webRequest.onCompleted.addListener(
// //   async function(details) {
// //     // We target LeetCode's specific submission check endpoint
// //     if (details.url.includes('/check/')) {
// //       try {
// //         // Fetch the result payload straight from LeetCode's API
// //         const response = await fetch(details.url);
// //         const data = await response.json();

// //         // status_msg "Accepted" maps to successful submission
// //         if (data.status_msg === "Accepted") {
// //           console.log("Background caught successful submission!", data);

// //           // Broadcast this bundle straight to the open content script tab
// //           chrome.tabs.sendMessage(details.tabId, {
// //             action: "OPEN_SYNC_MODAL",
// //             payload: {
// //               code: data.code,
// //               lang: data.lang,
// //               questionId: data.question_id,
// //               titleSlug: data.title_slug || "problem"
// //             }
// //           });
// //         }
// //       } catch (err) {
// //         console.error("Error reading submission stream:", err);
// //       }
// //     }
// //   },
// //   { urls: ["https://*.leetcode.com/submissions/detail/*/check/"] }
// // );

// // Listen for completed background network requests on LeetCode
// chrome.webRequest.onCompleted.addListener(
//   async function(details) {
//     // Target LeetCode's specific submission check endpoint
//     // Example URL: https://leetcode.com/submissions/detail/2060875590/check/
//     if (details.url.includes('/check/')) {
//       try {
//         // Extract the unique submission ID straight out of the URL path structure
//         const urlParts = details.url.split('/');
//         const detailIndex = urlParts.indexOf('detail');
//         if (detailIndex === -1) return;
//         const submissionId = urlParts[detailIndex + 1];

//         // Fetch the check result status package
//         const response = await fetch(details.url);
//         const data = await response.json();

//         // status_msg "Accepted" means it passed all test cases perfectly!
//         if (data.status_msg === "Accepted") {
//           console.log(`Success verified for Submission #${submissionId}. Fetching raw code asset...`);

//           // Execute a clean background fetch to get the raw code payload safely 
//           // away from LeetCode's frontend UI layout rules
//           const shareUrl = `https://leetcode.com/submissions/detail/${submissionId}/share/`;
//           const shareResponse = await fetch(shareUrl);
//           const shareData = await shareResponse.json();
          
//           const rawCode = shareData.submission_code;

//           if (rawCode) {
//             console.log("Raw code successfully retrieved via API backend!");
            
//             // Broadcast the complete metadata + source code package straight to content.js
//             chrome.tabs.sendMessage(details.tabId, {
//               action: "OPEN_SYNC_MODAL",
//               payload: {
//                 code: rawCode,
//                 lang: data.lang,
//                 questionId: data.question_id,
//                 titleSlug: data.title_slug || "problem"
//               }
//             });
//           }
//         }
//       } catch (err) {
//         console.error("Option B robust network intercept failed:", err);
//       }
//     }
//   },
//   { urls: ["https://*.leetcode.com/submissions/detail/*/check/"] }
// );

// Function to request submission details straight from LeetCode's official GraphQL API
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

        // Verify the verification response state matches "Accepted"
        const response = await fetch(details.url);
        const data = await response.json();

        if (data.status_msg === "Accepted") {
          console.log(`Submission #${submissionId} accepted! Querying GraphQL for raw assets...`);

          // Execute official GraphQL call directly using your browser's session
          const detailsData = await fetchSubmissionDetails(submissionId);

          if (detailsData && detailsData.statusCode === 10) {
            console.log("Raw source code recovered from GraphQL safely!");

            // Send full package straight over to content.js
            chrome.tabs.sendMessage(details.tabId, {
              action: "OPEN_SYNC_MODAL",
              payload: {
                code: detailsData.code,
                lang: detailsData.lang.name,
                questionId: detailsData.question.questionId,
                titleSlug: detailsData.question.titleSlug
              }
            });
          }
        }
      } catch (err) {
        console.error("GraphQL direct retrieval fallback failed:", err);
      }
    }
  },
  { urls: ["https://*.leetcode.com/submissions/detail/*/check/"] }
);