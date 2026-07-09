const geminiInput = document.getElementById('gemini-key');
const groqInput = document.getElementById('groq-key');
const saveBtn = document.getElementById('save-btn');
const statusEl = document.getElementById('status');

// Load any previously saved keys when the page opens
chrome.storage.local.get(['geminiApiKey', 'groqApiKey'], (result) => {
  if (result.geminiApiKey) geminiInput.value = result.geminiApiKey;
  if (result.groqApiKey) groqInput.value = result.groqApiKey;
});

saveBtn.addEventListener('click', () => {
  const geminiApiKey = geminiInput.value.trim();
  const groqApiKey = groqInput.value.trim();

  chrome.storage.local.set({ geminiApiKey, groqApiKey }, () => {
    statusEl.textContent = "Saved successfully.";
    statusEl.className = "success";
    setTimeout(() => { statusEl.className = ""; }, 2500);
  });
});