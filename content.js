// NEW: Guard against duplicate injection. NeetCode is a single-page app and
// can re-inject content scripts on client-side navigation without a full
// page reload, causing this whole file to run more than once and fire
// duplicate submits (which was the root cause of the GitHub sha conflicts).
if (window.__ghSyncInitialized) {
  console.warn("Git Sync content script already running on this page — skipping duplicate init.");
} else {
  window.__ghSyncInitialized = true;

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

      #neetcode-gh-modal-root .style-toggle-container {
        display: flex;
        gap: 12px;
        margin-top: 4px;
      }
      #neetcode-gh-modal-root .style-option-label {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 12px;
        border: 2px solid #e5e7eb;
        border-radius: 10px;
        cursor: pointer;
        font-weight: 600;
        font-size: 14px;
        color: #4b5563;
        transition: all 0.2s ease-in-out;
      }
      #neetcode-gh-modal-root .style-option-label:hover {
        border-color: #cbd5e1;
        background: #f9fafb;
      }
      #neetcode-gh-modal-root .style-option-label input[type="radio"] {
        margin-right: 8px;
        accent-color: #4f46e5;
        cursor: pointer;
      }
      #neetcode-gh-modal-root .style-option-label:has(input:checked) {
        border-color: #4f46e5;
        background: #f5f3ff;
        color: #4f46e5;
      }

      /* NEW: Toast notification styles for push success/failure feedback */
      #neetcode-gh-modal-root .gh-toast {
        position: fixed;
        bottom: 24px;
        right: 24px;
        max-width: 360px;
        background: #1f2937;
        color: #f9fafb;
        padding: 14px 16px;
        border-radius: 10px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
        z-index: 9999999;
        font-size: 13px;
        line-height: 1.5;
        display: flex;
        flex-direction: column;
        gap: 8px;
        animation: gh-toast-in 0.2s ease-out;
      }
      #neetcode-gh-modal-root .gh-toast.success { border-left: 4px solid #22c55e; }
      #neetcode-gh-modal-root .gh-toast.error { border-left: 4px solid #ef4444; }
      #neetcode-gh-modal-root .gh-toast-title { font-weight: 700; font-size: 13px; }
      #neetcode-gh-modal-root .gh-toast-actions { display: flex; gap: 8px; margin-top: 2px; }
      #neetcode-gh-modal-root .gh-toast-actions button {
        padding: 6px 12px; font-size: 12px; font-weight: 600; border-radius: 6px;
        border: none; cursor: pointer;
      }
      #neetcode-gh-modal-root .gh-toast-retry { background: #4f46e5; color: white; }
      #neetcode-gh-modal-root .gh-toast-dismiss { background: #374151; color: #d1d5db; }
      @keyframes gh-toast-in {
        from { opacity: 0; transform: translateY(8px); }
        to { opacity: 1; transform: translateY(0); }
      }
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
            <label>AI Note Complexity</label>
            <div class="style-toggle-container">
              <label class="style-option-label">
                <input type="radio" name="gh-notestyle" value="concise" checked />
                ⚡ Concise
              </label>
              <label class="style-option-label">
                <input type="radio" name="gh-notestyle" value="detailed" />
                📚 Detailed
              </label>
            </div>
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

  document.getElementById('gh-cancelBtn').onclick = () => {
    modalElement.style.display = 'none';
  };

  // NEW: shows a bottom-right toast for push success/failure.
  // On error, includes a "Reload & Retry" button since most failures here
  // (stale sha, missed auth, transient network) are resolved by a fresh page load.
  function showToast(type, title, message, { showRetry = false } = {}) {
    const existing = document.querySelector('#neetcode-gh-modal-root .gh-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `gh-toast ${type}`;
    toast.innerHTML = `
      <div class="gh-toast-title">${title}</div>
      <div>${message}</div>
      <div class="gh-toast-actions">
        ${showRetry ? `<button class="gh-toast-retry">Reload & Retry</button>` : ``}
        <button class="gh-toast-dismiss">Dismiss</button>
      </div>
    `;
    modalRoot.appendChild(toast);

    toast.querySelector('.gh-toast-dismiss').onclick = () => toast.remove();
    if (showRetry) {
      toast.querySelector('.gh-toast-retry').onclick = () => window.location.reload();
    }

    if (type === 'success') {
      setTimeout(() => toast.remove(), 6000);
    }
  }

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

  window.addEventListener("NEETCODE_SYNC_ACCEPTED", (event) => {
    const data = event.detail;
    console.log("Data package delivered safely via NeetCode Page Interceptor:", data);

    scrapedProblemData = {
      code: data.code,
      lang: data.lang,
      questionId: "NC",
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

  formElement.onsubmit = (e) => {
    e.preventDefault();
    
    const filename = document.getElementById('gh-filename').value;
    const ext = document.getElementById('gh-extension-select').value;
    const noteStyle = document.querySelector('input[name="gh-notestyle"]:checked').value;

    let folderPath = "";
    if (scrapedProblemData.questionId === "NC") {
      folderPath = `Neetcode/${scrapedProblemData.titleSlug}`;
    } else {
      const paddedId = String(scrapedProblemData.questionId).padStart(4, '0');
      folderPath = `Leetcode/${paddedId}_${scrapedProblemData.titleSlug}`;
    }

    const fullFilename = `${filename}.${ext}`;
    const repoPath = `${folderPath}/${fullFilename}`;

    console.log("=========================================");
    console.log(`READY FOR GITHUB SYNC (${scrapedProblemData.questionId === "NC" ? "NEETCODE" : "LEETCODE"}):`);
    console.log("Target Path ->", repoPath);
    console.log("AI Note Style ->", noteStyle);
    console.log("Code Length ->", scrapedProblemData.code.length, "chars");
    console.log("Code Content ->\n", scrapedProblemData.code);
    console.log("=========================================");

    console.log(`Requesting AI notes for ${fullFilename}...`);

    chrome.runtime.sendMessage(
      {
        action: "GENERATE_NOTES",
        payload: {
          code: scrapedProblemData.code,
          lang: scrapedProblemData.lang,
          noteStyle: noteStyle
        }
      },
      (response) => {
        if (response?.success) {
          console.log(`=== AI NOTES (${fullFilename}) ===\n${response.notes}`);

          console.log(`Pushing ${fullFilename} and notes to GitHub...`);

          chrome.runtime.sendMessage(
            {
              action: "PUSH_TO_GITHUB",
              payload: {
                folderPath,
                codePath: repoPath,
                titleSlug: scrapedProblemData.titleSlug,
                fullFilename,
                noteStyle,
                notes: response.notes,
                code: scrapedProblemData.code
              }
            },
            (pushResponse) => {
              if (pushResponse?.success) {
                console.log("=== GITHUB PUSH SUCCESS ===");
                console.log("Notes file ->", pushResponse.mdPath);
                console.log("Code file  ->", pushResponse.codePath);

                showToast(
                  'success',
                  '✅ Pushed to GitHub',
                  `${fullFilename} has been committed and pushed to ${folderPath}`
                );
              } else {
                console.error("GitHub push failed:", pushResponse?.error);

                showToast(
                  'error',
                  '❌ GitHub push failed',
                  pushResponse?.error || 'Unknown error occurred while pushing.',
                  { showRetry: true }
                );
              }
            }
          );
        } else {
          console.error(`AI note generation failed for ${fullFilename}:`, response?.error);

          showToast(
            'error',
            '❌ Note generation failed',
            response?.error || 'Unknown error occurred while generating notes.',
            { showRetry: true }
          );
        }
      }
    );

    modalElement.style.display = 'none';
  };
}