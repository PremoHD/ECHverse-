const ALLOWED_ACTIONS = new Set(["navigate", "inspect", "click", "type", "scroll", "wait"]);
const HIGH_IMPACT_PATTERNS = /\b(delete|remove|destroy|terminate|cancel|unsubscribe|purchase|buy|checkout|pay|place order|submit order|send|transfer|wire|withdraw|sell|trade|invest|sign|agree|accept terms|publish|post|share|invite|grant access|revoke|create payment|payment link)\b/i;
const MAX_AUDIT_RECORDS = 200;

function asErrorMessage(error) {
  return error instanceof Error ? error.message : String(error || "Unknown error");
}

function sanitizeString(value, maxLength = 5000) {
  return typeof value === "string" ? value.slice(0, maxLength).trim() : "";
}

function isHighImpact(action) {
  return Boolean(action.highImpact) || HIGH_IMPACT_PATTERNS.test(`${action.target || ""} ${action.text || ""} ${action.url || ""}`);
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
    if (!/^https?:$/.test(parsed.protocol)) throw new Error("Only http and https destinations are allowed.");
  }

  if (["click", "type"].includes(action.type) && !target) {
    throw new Error(`${action.type} actions require a target label.`);
  }
  if (action.type === "type" && !text) throw new Error("Type actions require text.");

  return {
    type: action.type,
    target,
    text,
    url,
    amount: Number.isFinite(Number(action.amount)) ? Math.min(Math.max(Number(action.amount), 100), 3000) : 600,
    direction: ["up", "down", "left", "right", "top", "bottom"].includes(String(action.direction || "").toLowerCase())
      ? String(action.direction).toLowerCase()
      : "down",
    milliseconds: Number.isFinite(Number(action.milliseconds)) ? Math.min(Math.max(Number(action.milliseconds), 1000), 30000) : 1000,
    highImpact: isHighImpact({ target, text, url, highImpact: action.highImpact }),
  };
}

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tab?.id) throw new Error("No active browser tab is available.");
  return tab;
}

function isUnsupportedUrl(url) {
  return /^(chrome|edge|about|devtools|view-source):/i.test(url || "");
}

async function ensureController(tabId) {
  try {
    await chrome.tabs.sendMessage(tabId, { kind: "AGENTSMITH_PING" });
    return;
  } catch {
    // The controller is injected only after an explicit user interaction, using activeTab access.
  }
  await chrome.scripting.executeScript({ target: { tabId }, files: ["controller.js"] });
}

async function appendAudit(record) {
  const { auditLog = [] } = await chrome.storage.local.get({ auditLog: [] });
  const next = [...auditLog, {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    ...record,
  }].slice(-MAX_AUDIT_RECORDS);
  await chrome.storage.local.set({ auditLog: next });
  return next;
}

async function setMission(mission) {
  await chrome.storage.local.set({ activeMission: mission });
}

async function executeAction(action, highImpactAcknowledged = false) {
  const cleanAction = validateAction(action);
  if (cleanAction.highImpact && !highImpactAcknowledged) {
    throw new Error("This high-impact action requires explicit user acknowledgement before execution.");
  }

  const tab = await activeTab();
  if (isUnsupportedUrl(tab.url)) throw new Error("Browser-internal pages cannot be controlled by extensions.");

  if (cleanAction.type === "wait") {
    await new Promise((resolve) => setTimeout(resolve, cleanAction.milliseconds));
    await appendAudit({ kind: "action", status: "completed", action: cleanAction.type, details: `Waited ${cleanAction.milliseconds}ms.` });
    return { ok: true, message: `Waited ${Math.round(cleanAction.milliseconds / 1000)} seconds.` };
  }

  await ensureController(tab.id);
  const result = await chrome.tabs.sendMessage(tab.id, { kind: "AGENTSMITH_EXECUTE", action: cleanAction });
  if (!result?.ok) throw new Error(result?.error || "The page did not complete the requested action.");

  if (cleanAction.type === "inspect") {
    await chrome.storage.local.set({
      lastInspection: {
        inspection: result.inspection || null,
        signals: Array.isArray(result.signals) ? result.signals : [],
        recordedAt: new Date().toISOString(),
      },
    });
  }

  await appendAudit({
    kind: cleanAction.type === "inspect" ? "inspection" : "action",
    status: "completed",
    action: cleanAction.type,
    details: result.message || cleanAction.target || cleanAction.url || cleanAction.direction,
    highImpact: cleanAction.highImpact,
    signalCount: Array.isArray(result.signals) ? result.signals.length : undefined,
  });
  return { ...result, action: cleanAction };
}

async function startMission(actions) {
  const normalized = Array.isArray(actions) ? actions.map(validateAction) : [];
  if (!normalized.length) throw new Error("A mission needs at least one valid action.");
  const mission = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    status: "planned",
    currentStep: 0,
    actions: normalized,
  };
  await setMission(mission);
  await appendAudit({ kind: "mission", status: "planned", action: "mission", details: `${normalized.length} planned action(s).` });
  return mission;
}

async function updateMissionProgress(missionId, currentStep, status) {
  const { activeMission } = await chrome.storage.local.get("activeMission");
  if (!activeMission || activeMission.id !== missionId) return;
  await setMission({ ...activeMission, currentStep, status, updatedAt: new Date().toISOString() });
}

async function completeMission(missionId) {
  const { activeMission } = await chrome.storage.local.get("activeMission");
  if (!activeMission || activeMission.id !== missionId) return;
  await setMission({ ...activeMission, currentStep: activeMission.actions.length, status: "completed", updatedAt: new Date().toISOString() });
  await appendAudit({ kind: "mission", status: "completed", action: "mission", details: `${activeMission.actions.length} action(s) completed.` });
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || typeof message !== "object") return;

  if (message.kind === "AGENTSMITH_START_MISSION") {
    startMission(message.actions)
      .then((mission) => sendResponse({ ok: true, mission }))
      .catch((error) => sendResponse({ ok: false, error: asErrorMessage(error) }));
    return true;
  }

  if (message.kind === "AGENTSMITH_EXECUTE") {
    executeAction(message.action, Boolean(message.highImpactAcknowledged))
      .then(async (result) => {
        if (message.missionId) await updateMissionProgress(message.missionId, Number(message.stepIndex || 0) + 1, "running");
        sendResponse({ ok: true, result });
      })
      .catch(async (error) => {
        await appendAudit({ kind: "action", status: "failed", action: message.action?.type || "unknown", details: asErrorMessage(error) });
        if (message.missionId) await updateMissionProgress(message.missionId, Number(message.stepIndex || 0), "paused");
        sendResponse({ ok: false, error: asErrorMessage(error) });
      });
    return true;
  }

  if (message.kind === "AGENTSMITH_COMPLETE_MISSION") {
    completeMission(message.missionId)
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse({ ok: false, error: asErrorMessage(error) }));
    return true;
  }

  if (message.kind === "AGENTSMITH_GET_STATE") {
    chrome.storage.local.get({ auditLog: [], activeMission: null, lastInspection: null })
      .then((state) => sendResponse({ ok: true, ...state }))
      .catch((error) => sendResponse({ ok: false, error: asErrorMessage(error) }));
    return true;
  }

  if (message.kind === "AGENTSMITH_GET_ACCESS") {
    chrome.permissions.contains({ origins: ["http://*/*", "https://*/*"] })
      .then((granted) => sendResponse({ ok: true, granted }))
      .catch((error) => sendResponse({ ok: false, error: asErrorMessage(error) }));
    return true;
  }
});
