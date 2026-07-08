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

document.getElementById('gh-cancelBtn').onclick = () => {
  modalElement.style.display = 'none';
};

// 2. Listen for the secure message coming from background.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "OPEN_SYNC_MODAL") {
    const data = message.payload;
    console.log("Data package delivered safely to Content script:", data);
    
    scrapedProblemData = data;

    // Normalizing file formats
    let mappedExtension = data.lang;
    if (mappedExtension.startsWith('python')) mappedExtension = 'py';

    const paddedId = String(data.questionId).padStart(4, '0');

    document.getElementById("gh-filename").value = `attempt_1`;
    document.getElementById("gh-extension-select").value = mappedExtension;
    document.querySelector("#neetcode-gh-modal-root h2").innerText = `🎉 Solved: ${paddedId}_${data.titleSlug}`;

    modalElement.style.display = 'flex';
  }
});

formElement.onsubmit = (e) => {
  e.preventDefault();
  const filename = document.getElementById('gh-filename').value;
  const ext = document.getElementById('gh-extension-select').value;
  const notes = document.getElementById('gh-notesinp').value.trim();

  const paddedId = String(scrapedProblemData.questionId).padStart(4, '0');
  const repoPath = `Leetcode/${paddedId}_${scrapedProblemData.titleSlug}/${filename}.${ext}`;

  console.log("FINAL INTEGRATION METADATA PACKAGE GENERATED:");
  console.log("Path Destination ->", repoPath);
  console.log("Notes ->", notes || "None");

  modalElement.style.display = 'none';
};