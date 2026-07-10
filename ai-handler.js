// ai-handler.js
// Handles "GENERATE_NOTES" messages sent from content.js.
// Runs inside the service worker (imported via sw-entry.js).
// Does NOT touch or import background.js logic — fully separate.

// CHANGED: Redefined prompts into separate, dedicated concise and detailed blocks
const CONCISE_PROMPT = `You are a senior engineer writing study notes for yourself.
Read the code below and produce concise, well-structured markdown notes:
- What the code does (1-3 sentences)
- Key functions/classes and their purpose (bullet list)
- Any non-obvious logic worth remembering
Keep it short. No fluff, no restating the whole code.`;

const DETAILED_PROMPT = `You are a senior staff engineer creating a deep-dive reference document for this solution.
Read the code below and produce comprehensive, deeply technical markdown notes:
- Summary: High-level overview of the approach and algorithmic technique used.
- Complexity Analysis: Detailed breakdown of Time and Space complexity using Big O notation, explaining *why*.
- Component Deep Dive: Thorough explanation of critical functions, data structures, and edge-case handling.
- Key Insights: Tricky components, performance optimization nuances, or subtle bugs to watch out for.
Provide substantial depth while avoiding boilerplate filler text.`;

// CHANGED: Prompt builder now accepts noteStyle and resolves the correct prompt baseline
function buildFullPrompt(code, lang, noteStyle) {
  const selectedPrompt = noteStyle === 'detailed' ? DETAILED_PROMPT : CONCISE_PROMPT;
  return `${selectedPrompt}\n\nLanguage: ${lang}\n\nCode:\n\`\`\`\n${code}\n\`\`\``;
}

async function callGemini(fullPrompt) {
  const { geminiApiKey } = await chrome.storage.local.get(['geminiApiKey']);
  if (!geminiApiKey) throw new Error("No Gemini key saved in options page.");

  const modelName = "gemini-3.1-flash-lite";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-goog-api-key": geminiApiKey
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: fullPrompt }] }]
    })
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || "Gemini request failed");

  const notes = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!notes) throw new Error("Gemini returned no notes.");
  return notes;
}

async function callGroq(fullPrompt) {
  const { groqApiKey } = await chrome.storage.local.get(['groqApiKey']);
  if (!groqApiKey) throw new Error("No Groq key saved in options page.");

  const url = "https://api.groq.com/openai/v1/chat/completions";

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${groqApiKey}`
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: fullPrompt }]
    })
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || "Groq request failed");

  const notes = data.choices?.[0]?.message?.content;
  if (!notes) throw new Error("Groq returned no notes.");
  return notes;
}

// CHANGED: Main orchestrator now accepts and passes the noteStyle parameter down the chain
async function generateNotes(code, lang, noteStyle) {
  const fullPrompt = buildFullPrompt(code, lang, noteStyle);
  try {
    return await callGemini(fullPrompt);
  } catch (err) {
    console.warn("Gemini failed, falling back to Groq:", err.message);
    return await callGroq(fullPrompt);
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "GENERATE_NOTES") {
    // CHANGED: Destructured noteStyle cleanly from incoming message payload parameters
    const { code, lang, noteStyle } = message.payload;
    
    // CHANGED: Supplied noteStyle config directly into execution lifecycle
    generateNotes(code, lang, noteStyle)
      .then((notes) => sendResponse({ success: true, notes }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true; // keep the message channel open for the async response
  }
});