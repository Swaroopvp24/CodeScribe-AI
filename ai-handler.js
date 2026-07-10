// ai-handler.js
// Handles "GENERATE_NOTES" messages sent from content.js.
// Runs inside the service worker (imported via sw-entry.js).
// Does NOT touch or import background.js logic — fully separate.

const NOTES_PROMPT = `You are a senior engineer writing study notes for yourself.
Read the code below and produce concise, well-structured markdown notes:
- What the code does (1-3 sentences)
- Key functions/classes and their purpose (bullet list)
- Any non-obvious logic worth remembering
Keep it short. No fluff, no restating the whole code.`;

function buildFullPrompt(code, lang) {
  return `${NOTES_PROMPT}\n\nLanguage: ${lang}\n\nCode:\n\`\`\`\n${code}\n\`\`\``;
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

async function generateNotes(code, lang) {
  const fullPrompt = buildFullPrompt(code, lang);
  try {
    return await callGemini(fullPrompt);
  } catch (err) {
    console.warn("Gemini failed, falling back to Groq:", err.message);
    return await callGroq(fullPrompt);
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "GENERATE_NOTES") {
    const { code, lang } = message.payload;
    generateNotes(code, lang)
      .then((notes) => sendResponse({ success: true, notes }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true; // keep the message channel open for the async response
  }
});