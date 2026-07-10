const geminiInput = document.getElementById('gemini-key');
const groqInput = document.getElementById('groq-key');
const saveBtn = document.getElementById('save-btn');
const statusEl = document.getElementById('status');

// CHANGED: Document node hooks to listen to new GitHub parameters
const ghTokenInput = document.getElementById('gh-token');
const ghRepoInput = document.getElementById('gh-repo');
const ghBranchInput = document.getElementById('gh-branch');

// Load any previously saved keys when the page opens
// CHANGED: Expanded key list selection array inside storage block retrieval request
chrome.storage.local.get(['geminiApiKey', 'groqApiKey', 'ghToken', 'ghRepo', 'ghBranch'], (result) => {
  if (result.geminiApiKey) geminiInput.value = result.geminiApiKey;
  if (result.groqApiKey) groqInput.value = result.groqApiKey;
  
  // CHANGED: Restored saved configuration data back into target inputs automatically
  if (result.ghToken) ghTokenInput.value = result.ghToken;
  if (result.ghRepo) ghRepoInput.value = result.ghRepo;
  ghBranchInput.value = result.ghBranch || 'main'; // Smart defaults value setup
});

saveBtn.addEventListener('click', () => {
  const geminiApiKey = geminiInput.value.trim();
  const groqApiKey = groqInput.value.trim();
  
  // CHANGED: Read extracted strings safely out from the modern inputs
  const ghToken = ghTokenInput.value.trim();
  const ghRepo = ghRepoInput.value.trim();
  const ghBranch = ghBranchInput.value.trim() || 'main';

  // CHANGED: Added tracking properties configuration dictionary to storage save payload
  chrome.storage.local.set({ geminiApiKey, groqApiKey, ghToken, ghRepo, ghBranch }, () => {
    statusEl.textContent = "Saved successfully.";
    statusEl.className = "success";
    setTimeout(() => { statusEl.className = ""; }, 2500);
  });
});