// sw-entry.js
// This is now the manifest's service_worker entry point instead of background.js.
// It does nothing on its own — it just imports your existing background.js
// and the new ai-handler.js and github handler

import './background.js';
import './ai-handler.js';
import './github-handler.js';