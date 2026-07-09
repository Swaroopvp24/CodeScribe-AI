// 1. Inject your UI layout frame safely
const modalRoot = document.createElement('div');
modalRoot.id = 'neetcode-gh-modal-root';
document.body.appendChild(modalRoot);

modalRoot.innerHTML = `
  <style>
    #neetcode-gh-modal-root .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.7);
      display: none; 
      justify-content: center;
      align-items: center;
      z-index: 9999999; 
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    }
    #neetcode-gh-modal-root .modal-box {
      width: 420px; background: #ffffff; padding: 28px; border-radius: 14px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3); border: 1px solid #e5e7eb;
    }
    #neetcode-gh-modal-root h2 { margin: 0 0 6px 0; font-size: 20px; color: #111827; font-weight: 700; }
    #neetcode-gh-modal-root .modal-subtitle { font-size: 13px; color: #6b7280; margin: 0 0 20px 0; }
    #neetcode-gh-modal-root .form-group { display: flex; flex-direction: column; margin-bottom: 18px; }
    #neetcode-gh-modal-root .form-group label { margin-bottom: 6px; font-weight: 600; font-size: 13px; color: #374151; }
    #neetcode-gh-modal-root .input-row { display: flex; gap: 10px; }
    #neetcode-gh-modal-root input, #neetcode-gh-modal-root select, #neetcode-gh-modal-root textarea {
      padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px;
    }
    #neetcode-gh-modal-root .modal-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px; }
    #neetcode-gh-modal-root button { padding: 10px 20px; font-size: 14px; font-weight: 600; border-radius: 8px; cursor: pointer; border: none; }
    #neetcode-gh-modal-root .btn-cancel { background: #f3f4f6; color: #4b5563; }
    #neetcode-gh-modal-root .btn-submit { background: #4f46e5; color: white; }
  </style>

  <div class="modal-overlay" id="gh-commit-modal">
    <div class="modal-box">
      <h2>🎉 Mission Accomplished!</h2>
      <p class="modal-subtitle">Document this victory before your brain forgets the trick.</p>
      <form id="gh-fileForm">
        <div class="form-group">
          <label for="gh-filename">File Path Target</label>
          <div class="input-row">
            <input type="text" id="gh-filename" style="flex: 2;" placeholder="e.g., attempt_1" required />
            <select id="gh-extension-select" style="flex: 1;" required>
              <option value="py">.py</option>
              <option value="cpp">.cpp</option>
              <option value="java">.java</option>
              <option value="js">.js</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label for="gh-notesinp">Key Takeaways / Notes</label>
          <textarea id="gh-notesinp" rows="4" placeholder="What caught you off guard?"></textarea>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn-cancel" id="gh-cancelBtn">Skip Sync</button>
          <button type="submit" class="btn-submit" id="gh-submitBtn">Commit & Push</button>
        </div>
      </form>
    </div>
  </div>
`;

let scrapedProblemData = null;
const modalElement = document.getElementById('gh-commit-modal');
const formElement = document.getElementById('gh-fileForm');

// Handle closing the popup
document.getElementById('gh-cancelBtn').onclick = () => {
  modalElement.style.display = 'none';
};

// 2. Listen for the secure message coming from background.js (LEETCODE ONLY)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "OPEN_SYNC_MODAL") {
    const data = message.payload;
    console.log("Data package delivered safely via LeetCode background:", data);
    
    scrapedProblemData = data;

    let mappedExtension = data.lang.toLowerCase();
    if (mappedExtension.startsWith('python')) mappedExtension = 'py';
    if (mappedExtension.startsWith('c++')) mappedExtension = 'cpp';

    const paddedId = String(data.questionId).padStart(4, '0');

    document.getElementById("gh-filename").value = `attempt_1`;
    document.getElementById("gh-extension-select").value = mappedExtension;
    document.querySelector("#neetcode-gh-modal-root h2").innerText = `🎉 Solved: ${paddedId}_${data.titleSlug}`;

    modalElement.style.display = 'flex';
  }
});

// 3. NEETCODE INJECTION INTERCEPTOR (Triggers inside NeetCode page execution sandbox)
// if (window.location.hostname.includes("neetcode.io")) {
//   const scriptCode = `
//     (function() {
//       const originalFetch = window.fetch;
//       window.fetch = async function(...args) {
//         const response = await originalFetch(...args);
//         const url = args[0];
        
//         if (typeof url === 'string' && url.includes('executeCodeFunctionHttp')) {
//           try {
//             // Clone response so we don't disrupt NeetCode's client runner
//             const resClone = response.clone();
//             const resData = await resClone.json();
            
//             // Check if the response matches "Accepted" status
//             if (resData?.data?.status?.description === "Accepted") {
//               const reqBody = JSON.parse(args[1].body);
              
//               // Send data packet cleanly into content.js via DOM event hooks
//               window.dispatchEvent(new CustomEvent("NEETCODE_SYNC_ACCEPTED", {
//                 detail: {
//                   code: reqBody.data.rawCode,
//                   lang: reqBody.data.lang,
//                   titleSlug: reqBody.data.problemId
//                 }
//               }));
//             }
//           } catch (e) {
//             console.error("Sync Interceptor Error:", e);
//           }
//         }
//         return response;
//       };
//     })();
//   `;

//   const script = document.createElement('script');
//   script.textContent = scriptCode;
//   (document.head || document.documentElement).appendChild(script);
//   script.remove();
// }

// 4. Handle Incoming Event Packet Captured from the NeetCode Injector
window.addEventListener("NEETCODE_SYNC_ACCEPTED", (event) => {
  const data = event.detail;
  console.log("Data package delivered safely via NeetCode Page Interceptor:", data);

  scrapedProblemData = {
    code: data.code,
    lang: data.lang,
    questionId: "NC", // Marker for NeetCode tracking
    titleSlug: data.titleSlug
  };

  let mappedExtension = data.lang.toLowerCase();
  if (mappedExtension.startsWith('python')) mappedExtension = 'py';
  if (mappedExtension.startsWith('c++')) mappedExtension = 'cpp';

  document.getElementById("gh-filename").value = `attempt_1`;
  document.getElementById("gh-extension-select").value = mappedExtension;
  document.querySelector("#neetcode-gh-modal-root h2").innerText = `🎉 Solved (NeetCode): ${data.titleSlug}`;

  modalElement.style.display = 'flex';
});

// 5. Handle data collection when "Commit & Push" is clicked (Handles both platforms)
formElement.onsubmit = (e) => {
  e.preventDefault();
  
  const filename = document.getElementById('gh-filename').value;
  const ext = document.getElementById('gh-extension-select').value;
  const notes = document.getElementById('gh-notesinp').value.trim();

  let repoPath = "";
  if (scrapedProblemData.questionId === "NC") {
    repoPath = `Neetcode/${scrapedProblemData.titleSlug}/${filename}.${ext}`;
  } else {
    const paddedId = String(scrapedProblemData.questionId).padStart(4, '0');
    repoPath = `Leetcode/${paddedId}_${scrapedProblemData.titleSlug}/${filename}.${ext}`;
  }

  console.log("=========================================");
  console.log(`READY FOR GITHUB SYNC (${scrapedProblemData.questionId === "NC" ? "NEETCODE" : "LEETCODE"}):`);
  console.log("Target Path ->", repoPath);
  console.log("Notes ->", notes || "None");
  console.log("Code Length ->", scrapedProblemData.code.length, "chars");
  console.log("Code Content ->\n", scrapedProblemData.code);
  console.log("=========================================");

  document.getElementById('gh-notesinp').value = "";
  modalElement.style.display = 'none';
};