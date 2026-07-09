// (function() {
//   'use strict';
//   const originalFetch = window.fetch;

//   window.fetch = async function(...args) {
//     const response = await originalFetch.apply(this, args);
    
//     // Check if the network call is heading toward LeetCode's GraphQL router
//     if (args[0] && args[0].includes('/graphql')) {
//       // Clone it immediately so we don't hold up LeetCode's execution thread
//       response.clone().json().then(data => {
//         if (data?.data?.submissionDetails) {
//           const details = data.data.submissionDetails;
          
//           // Verify if it is status code 10 ("Accepted")
//           if (details.statusCode === 10) {
//             // Post message out of the page context to content.js
//             window.postMessage({
//               source: 'leetcode-git-sync-spy',
//               type: 'LEETCODE_ACCEPTED',
//               code: details.code,
//               lang: details.lang.name,
//               questionId: details.question.questionId,
//               titleSlug: details.question.titleSlug
//             }, '*');
//           }
//         }
//       }).catch(() => { /* Absorb non-JSON GraphQL endpoints safely */ });
//     }

//     return response;
//   };
// })();
// No use