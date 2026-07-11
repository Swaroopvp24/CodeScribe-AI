# 🚀 LeetCode & NeetCode Git Sync

An enterprise-grade, structurally resilient Chrome extension that automatically syncs your LeetCode and NeetCode solutions directly to GitHub, complete with AI-generated notes detailing time/space complexity and logic breakdown.

---

## 📖 The Story Behind the Architecture

### 🚨 The Situation

The current ecosystem of LeetCode/NeetCode synchronization extensions is structurally fragile. Over 90% of them rely heavily on DOM Scraping-using brittle CSS selectors to copy code directly from the browser window. The moment these platforms push a frontend update, rename a class, or tweak an element, the extensions break entirely. Furthermore, these extensions lack concurrency controls, causing race conditions (duplicate commits) when users rapidly interact with submission buttons and they cannot bypass Chrome's isolated sandbox to read runtime memory from alternative platforms like NeetCode.

### 🎯 The Task

The objective was to design and engineer a highly resilient, platform-agnostic automation tool that shifts the responsibility of data capture from the volatile UI Layer down to the absolute stability of the Network and Runtime Layers. The system needed to guarantee data integrity, eliminate duplicate Git payloads, handle cross-context JavaScript execution safely and introduce a zero-friction, multi-engine AI review pipeline.

### 🛠️ The Action

To achieve this, the architecture was split into an event-driven microservices framework inside the browser:

* **Network-Level Interception:** Utilized Chrome’s `webRequest` API to capture the raw server-side validation token (`/check/`) the exact millisecond a submission is accepted, completely bypassing the UI.
* **Main-World Context Hijacking:** Engineered a script injected directly into `world: "MAIN"` to override native browser primitives (`fetch`/`XHR`) to transparently snatch payload data directly out of active memory.
* **Distributed State Isolation:** Implemented a synchronous `Set` lock structure to throttle concurrent execution hooks and used an explicit window-level initialization toggle (`__ghSyncInitialized`) to prevent memory leaks during SPA client-side transitions.
* **Production Git Fault-Tolerance:** Wrote a highly concurrent Git orchestrator implementing `Promise.all` for parallel operations, paired with a deterministic 3-stage back-off macro to catch and automatically recover from stale Git SHA reference conflicts.

### 🏆 The Result

An enterprise-grade, event-driven browser utility that achieves absolute immunity to frontend design overhauls. The extension maintains 100% data transmission fidelity, guarantees zero duplicate commits under race conditions, handles third-party execution overrides flawlessly and enhances your learning path via fallback-protected AI code pipelines.

---

## 📋 Prerequisites

Before installing the extension, you will need a few free credentials to power the AI and GitHub integrations. You need at least one AI key (Gemini is recommended, Groq acts as a great backup).

### 1. Get an AI API Key

**Google Gemini (Primary)**

1. Go to [Google AI Studio](https://aistudio.google.com).
2. Sign in with your Google account.
3. Click **Get API key** and create a new key.
4. Copy it somewhere safe (treat this like a password).

**Groq (Fallback / Alternative)**

1. Go to the [Groq Console](https://console.groq.com) and sign up.
2. Navigate to **API Keys** and create one.
3. Copy it securely.

### 2. Configure Your GitHub Repository

If you haven't already made a dedicated repository for your code solutions, you need to create one.

1. Go to [GitHub](https://github.com) and log in.
2. In the top-right corner, click the **+** icon and select **New repository**.
3. **Repository name:** Enter something clean (e.g., `My-Coding-Journey`).
4. **Visibility:** Choose Public or Private (the extension works perfectly with private repos!).
5. **Initialize:** Check the box that says **Add a README file** (this initializes the repository structure so it's not empty).
6. Click **Create repository**.

> **📌 What you'll need later:**
> Look at your browser URL bar. If your URL is `[https://github.com/johndoe/My-Coding-Journey](https://github.com/johndoe/My-Coding-Journey)`, then your **Repository Target Path** is exactly: `johndoe/My-Coding-Journey`

### 3. Generate a GitHub Personal Access Token (PAT)

GitHub requires a Fine-Grained token (highly secure, acting like a specialized password) so the extension has permission to upload files to your specific repository.

1. In the top-right corner of GitHub, click your **Profile Picture** and select **Settings**.
2. Scroll all the way down the left sidebar and click **<> Developer settings**.
3. In the left sidebar under *Personal access tokens*, click **Fine-grained tokens**.
4. Click the **Generate new token** button on the right side.
5. **Token name:** Give it a memorable name, like `LeetCode-Sync-Extension`.
6. **Expiration:** Set it to 90 days, 180 days, or Custom.
7. **Repository access:** Change this from *All repositories* to **Only select repositories**.
8. Click the dropdown and search for/select your newly created repo (e.g., `My-Coding-Journey`).
9. **Permissions:**
* Click the **Repository permissions** dropdown to expand it.
* Scroll down to **Contents**.
* Change the access dropdown on the right from *No access* to **Read and Write**.


10. Scroll to the bottom and click **Generate token**.

> ⚠️ **CRITICAL:** Copy the green token string immediately (it starts with `github_pat_...`). GitHub will never show this code to you again once you refresh or leave the page.

### 4. Find Your Branch Name

1. Go to your repository page.
2. Look at the top-left area just above your file list. You will see a small dropdown button with a branch icon that says **`main`** or **`master`**. This is your branch name.

---

## ⚙️ Installation & Setup

Since this extension requires powerful network-level permissions, it is sideloaded via Chrome's Developer Mode.

1. **Download** this repository as a `.zip` file and extract/unzip the folder to your computer.
2. Open Google Chrome and navigate to your extensions page: `chrome://extensions/`.
3. Toggle **Developer mode** ON in the top-right corner.
4. Click the **Load unpacked** button in the top-left corner.
5. Select the extracted folder containing the extension files.
6. Once loaded, click on **Details** on the extension's card, scroll down and click on **Extension options**.
7. **Paste your configuration:** Enter your Gemini/Groq API keys, GitHub PAT, Repo Path and Branch Name, then click **Save**.
8. Jump onto [LeetCode](https://leetcode.com) or [NeetCode](https://neetcode.io) and start solving!

---

## 🤝 Contribute & Support

This is **Version 1.0** and more features and updates will be rolled out over time!

* **Found a bug?** If you spot any errors, edge cases, or UI quirks, feel free to open an Issue or submit a Pull Request. I am completely open to contributions and would love to hear your feedback.
* **Stay updated:** Click the **Watch** button at the top of the repository to get notified about new releases and features.
* **Show some love:** If this extension saves you time and helps you document your coding journey, I would be absolutely thrilled to get a ⭐ **Star** on this repository!