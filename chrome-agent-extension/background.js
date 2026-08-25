const ALLOWED_ACTIONS = new Set(["navigate", "click", "type", "scroll"]);
const HIGH_IMPACT_PATTERNS = /\b(delete|remove|destroy|terminate|cancel|unsubscribe|purchase|buy|checkout|pay|place order|submit order|send|transfer|wire|withdraw|sell|trade|invest|sign|agree|accept terms|publish|post|share|invite|grant access|revoke)\b/i;
const SENSITIVE_INPUT_PATTERNS = /\b(password|passcode|one[- ]?time|otp|verification|security code|cvv|cvc|card number|social security|ssn|tax id|private key|seed phrase|recovery phrase)\b/i;

function asErrorMessage(error) {
  return error instanceof Error ? error.message : String(error || "Unknown error");
}

function sanitizeString(value, maxLength = 1000) {
  return typeof value === "string" ? value.slice(0, maxLength).trim() : "";
}

function validateAction(action) {
  if (!action || typeof action !== "object" || !ALLOWED_ACTIONS.has(action.type)) {
    throw new Error("Unsupported action type.");
  }

  const target = sanitizeString(action.target, 240);
  const text = sanitizeString(action.text, 5000);
  const url = sanitizeString(action.url, 2048);

  if (action.type === "navigate") {
    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      throw new Error("Navigation requires a valid http or https URL.");
    }
    if (!/^https?:$/.test(parsed.protocol)) {
      throw new Error("Only http and https destinations are allowed.");
    }
  }

  if (["click", "type"].includes(action.type) && !target) {
    throw new Error(`${action.type} actions require a target label.`);
  }

  if (action.type === "type" && !text) {
    throw new Error("Type actions require text.");
  }

  return {
    type: action.type,
    target,
    text,
    url,
    amount: Number.isFinite(Number(action.amount)) ? Number(action.amount) : 600,
    direction: ["up", "down", "left", "right", "top", "bottom"].includes(String(action.direction || "").toLowerCase())
      ? String(action.direction).toLowerCase()
      : "down",
    highImpact: Boolean(action.highImpact) || HIGH_IMPACT_PATTERNS.test(`${target} ${text} ${url}`),
  };
}

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tab?.id) {
    throw new Error("No active browser tab is available.");
  }
  return tab;
}

async function ensureController(tabId) {
  try {
    await chrome.tabs.sendMessage(tabId, { kind: "COMMAND_PILOT_PING" });
    return;
  } catch {
    // The controller is injected only after the user opens the extension, using activeTab access.
  }

  await chrome.scripting.executeScript({
    target: { tabId },
    files: ["controller.js"],
  });
}

async function executeAction(action) {
  const cleanAction = validateAction(action);
  const tab = await activeTab();

  if (/^(chrome|edge|about|devtools|view-source):/i.test(tab.url || "")) {
    throw new Error("Browser-internal pages cannot be controlled by extensions.");
  }

  await ensureController(tab.id);
  const result = await chrome.tabs.sendMessage(tab.id, {
    kind: "COMMAND_PILOT_EXECUTE",
    action: cleanAction,
  });

  if (!result?.ok) {
    throw new Error(result?.error || "The page did not complete the requested action.");
  }

  return { ...result, action: cleanAction };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || typeof message !== "object") return;

  if (message.kind === "COMMAND_PILOT_EXECUTE") {
    executeAction(message.action)
      .then((result) => sendResponse({ ok: true, result }))
      .catch((error) => sendResponse({ ok: false, error: asErrorMessage(error) }));
    return true;
  }

  if (message.kind === "COMMAND_PILOT_GET_ACCESS") {
    chrome.permissions
      .contains({ origins: ["http://*/*", "https://*/*"] })
      .then((granted) => sendResponse({ ok: true, granted }))
      .catch((error) => sendResponse({ ok: false, error: asErrorMessage(error) }));
    return true;
  }

  if (message.kind === "COMMAND_PILOT_REQUEST_ACCESS") {
    chrome.permissions
      .request({ origins: ["http://*/*", "https://*/*"] })
      .then((granted) => sendResponse({ ok: true, granted }))
      .catch((error) => sendResponse({ ok: false, error: asErrorMessage(error) }));
    return true;
  }
});
