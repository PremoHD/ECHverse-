import { buildPlan, describeAction } from "./planner.js";

const state = { plan: [], signals: [], inspection: null, auditLog: [], activeMission: null };

const elements = {
  instruction: document.querySelector("#instruction"),
  planButton: document.querySelector("#planButton"),
  planPanel: document.querySelector("#planPanel"),
  planList: document.querySelector("#planList"),
  planCount: document.querySelector("#planCount"),
  highImpactNotice: document.querySelector("#highImpactNotice"),
  highImpactApproval: document.querySelector("#highImpactApproval"),
  runButton: document.querySelector("#runButton"),
  clearButton: document.querySelector("#clearButton"),
  inspectButton: document.querySelector("#inspectButton"),
  inspectionSummary: document.querySelector("#inspectionSummary"),
  signalStatus: document.querySelector("#signalStatus"),
  signalCount: document.querySelector("#signalCount"),
  signalsList: document.querySelector("#signalsList"),
  auditList: document.querySelector("#auditList"),
  missionMetric: document.querySelector("#missionMetric"),
  actionMetric: document.querySelector("#actionMetric"),
  signalMetric: document.querySelector("#signalMetric"),
  missionState: document.querySelector("#missionState"),
  accessBadge: document.querySelector("#accessBadge"),
  accessButton: document.querySelector("#accessButton"),
  status: document.querySelector("#status"),
  tabs: document.querySelectorAll(".tab"),
  workspaces: document.querySelectorAll(".workspace"),
  examples: document.querySelectorAll(".quick-action"),
};

function setStatus(text, kind = "") {
  elements.status.textContent = text;
  elements.status.className = `status ${kind}`.trim();
}

function escapeSummary(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function canRunPlan() {
  if (!state.plan.length) return false;
  const needsApproval = state.plan.some((action) => action.highImpact);
  return !needsApproval || elements.highImpactApproval.checked;
}

function updateRunButton() {
  elements.runButton.disabled = !canRunPlan();
}

function renderPlan() {
  elements.planList.replaceChildren();
  const hasHighImpact = state.plan.some((action) => action.highImpact);
  elements.planPanel.classList.toggle("hidden", !state.plan.length);
  elements.highImpactNotice.classList.toggle("hidden", !hasHighImpact);
  elements.planCount.textContent = `${state.plan.length} ${state.plan.length === 1 ? "step" : "steps"}`;
  elements.highImpactApproval.checked = false;

  for (const action of state.plan) {
    const item = document.createElement("li");
    if (action.highImpact) item.classList.add("high-impact");
    const type = document.createElement("span");
    type.className = "action-kind";
    type.textContent = action.highImpact ? `${action.type} · confirmation required` : action.type;
    const description = document.createElement("span");
    description.textContent = describeAction(action);
    item.append(type, description);
    elements.planList.append(item);
  }
  updateRunButton();
}

function renderSignals() {
  elements.signalsList.replaceChildren();
  elements.signalCount.textContent = `${state.signals.length} ${state.signals.length === 1 ? "item" : "items"}`;
  elements.signalMetric.textContent = String(state.signals.length);

  if (!state.signals.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "No page inspection has been run in this session.";
    elements.signalsList.append(empty);
  } else {
    state.signals.slice().sort((a, b) => b.score - a.score).forEach((signal) => {
      const item = document.createElement("article");
      item.className = "signal-item";
      if (signal.highImpact) item.classList.add("high-impact");
      if (signal.sensitive) item.classList.add("sensitive");
      const meta = document.createElement("span");
      meta.className = "signal-meta";
      meta.textContent = `${signal.category} · score ${signal.score}`;
      const label = document.createElement("div");
      label.textContent = signal.label;
      item.append(meta, label);
      if (signal.highImpact || signal.sensitive) {
        const flags = document.createElement("div");
        flags.className = "signal-flags";
        if (signal.highImpact) {
          const risk = document.createElement("span");
          risk.className = "flag risk";
          risk.textContent = "HIGH IMPACT";
          flags.append(risk);
        }
        if (signal.sensitive) {
          const sensitive = document.createElement("span");
          sensitive.className = "flag sensitive";
          sensitive.textContent = "SENSITIVE FIELD";
          flags.append(sensitive);
        }
        item.append(flags);
      }
      elements.signalsList.append(item);
    });
  }

  if (state.inspection) {
    elements.inspectionSummary.classList.remove("hidden");
    elements.inspectionSummary.replaceChildren();
    const heading = document.createElement("div");
    heading.className = "section-heading";
    const title = document.createElement("h2");
    title.textContent = "Current page map";
    const badge = document.createElement("span");
    badge.className = "badge neutral";
    badge.textContent = `${state.inspection.actionCount || 0} controls`;
    heading.append(title, badge);
    const text = document.createElement("p");
    text.className = "helper";
    text.textContent = `${escapeSummary(state.inspection.title) || "Untitled page"} · ${state.inspection.fieldCount || 0} fields · ${state.inspection.sensitiveFieldCount || 0} protected field(s)`;
    elements.inspectionSummary.append(heading, text);
    elements.signalStatus.textContent = "Mapped locally";
    elements.signalStatus.className = "badge granted";
  } else {
    elements.inspectionSummary.classList.add("hidden");
    elements.signalStatus.textContent = "Not scanned";
    elements.signalStatus.className = "badge neutral";
  }
}

function renderAudit() {
  elements.auditList.replaceChildren();
  const records = state.auditLog.slice().reverse().slice(0, 30);
  if (!records.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "No activity recorded yet.";
    elements.auditList.append(empty);
  }

  records.forEach((record) => {
    const item = document.createElement("article");
    item.className = `audit-item ${record.status === "failed" ? "failed" : ""}`.trim();
    const meta = document.createElement("span");
    meta.className = "audit-meta";
    const timestamp = record.timestamp ? new Date(record.timestamp).toLocaleString() : "Unknown time";
    meta.textContent = `${record.kind || "event"} · ${record.status || "recorded"} · ${timestamp}`;
    const detail = document.createElement("div");
    detail.textContent = escapeSummary(record.details || record.action || "Activity recorded.");
    item.append(meta, detail);
    elements.auditList.append(item);
  });

  elements.actionMetric.textContent = String(state.auditLog.filter((record) => record.kind === "action" || record.kind === "inspection").length);
  elements.missionMetric.textContent = String(state.auditLog.filter((record) => record.kind === "mission" && record.status === "planned").length);

  if (state.activeMission) {
    const progress = `${state.activeMission.currentStep || 0}/${state.activeMission.actions?.length || 0}`;
    const missionStatus = state.activeMission.status || "planned";
    elements.missionState.textContent = `Mission ${missionStatus} · ${progress} action(s) recorded locally.`;
  }
}

async function refreshState() {
  try {
    const response = await chrome.runtime.sendMessage({ kind: "AGENTSMITH_GET_STATE" });
    if (!response?.ok) throw new Error(response?.error || "Unable to retrieve local state.");
    state.auditLog = Array.isArray(response.auditLog) ? response.auditLog : [];
    state.activeMission = response.activeMission || null;
    state.inspection = response.lastInspection?.inspection || null;
    state.signals = Array.isArray(response.lastInspection?.signals) ? response.lastInspection.signals : [];
    renderSignals();
    renderAudit();
  } catch (error) {
    setStatus(`Could not load agent state: ${error instanceof Error ? error.message : String(error)}`, "error");
  }
}

function createPlan() {
  const { actions, errors } = buildPlan(elements.instruction.value);
  state.plan = actions;
  renderPlan();
  if (!actions.length) {
    setStatus(errors[0] || "No supported actions were found.", "error");
  } else if (errors.length) {
    setStatus(`Queued ${actions.length} action(s). Review: ${errors[0]}`, "progress");
  } else if (actions.some((action) => action.highImpact)) {
    setStatus("Mission planned. A highlighted action needs explicit acknowledgement before execution.", "progress");
  } else {
    setStatus("Mission plan ready for your review.", "success");
  }
}

function clearPlan() {
  state.plan = [];
  elements.instruction.value = "";
  elements.planList.replaceChildren();
  elements.planPanel.classList.add("hidden");
  elements.highImpactApproval.checked = false;
  updateRunButton();
  setStatus("Mission plan cleared.");
}

function delay(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function executeApprovedAction(action, missionId, stepIndex) {
  const response = await chrome.runtime.sendMessage({
    kind: "AGENTSMITH_EXECUTE",
    action,
    missionId,
    stepIndex,
    highImpactAcknowledged: Boolean(action.highImpact && elements.highImpactApproval.checked),
  });
  if (!response?.ok) throw new Error(response?.error || "Action failed.");
  if (action.type === "inspect" && response.result) {
    state.inspection = response.result.inspection || null;
    state.signals = Array.isArray(response.result.signals) ? response.result.signals : [];
    renderSignals();
  }
  return response.result;
}

async function runPlan() {
  if (!canRunPlan()) return;
  const plan = [...state.plan];
  elements.runButton.disabled = true;

  try {
    const started = await chrome.runtime.sendMessage({ kind: "AGENTSMITH_START_MISSION", actions: plan });
    if (!started?.ok) throw new Error(started?.error || "Could not create mission record.");
    const mission = started.mission;
    state.activeMission = mission;

    for (let index = 0; index < plan.length; index += 1) {
      const action = plan[index];
      setStatus(`Running step ${index + 1} of ${plan.length}: ${describeAction(action)}`, "progress");
      await executeApprovedAction(action, mission.id, index);
      if (action.type === "navigate" && index < plan.length - 1) await delay(1400);
    }

    await chrome.runtime.sendMessage({ kind: "AGENTSMITH_COMPLETE_MISSION", missionId: mission.id });
    setStatus("Mission completed. The local ledger has been updated.", "success");
    await refreshState();
  } catch (error) {
    setStatus(`Mission paused: ${error instanceof Error ? error.message : String(error)}`, "error");
    await refreshState();
  } finally {
    updateRunButton();
  }
}

async function inspectPage() {
  elements.inspectButton.disabled = true;
  try {
    setStatus("Inspecting visible page controls locally…", "progress");
    const result = await executeApprovedAction({ type: "inspect", highImpact: false }, null, 0);
    setStatus(result?.message || "Page inspection completed.", "success");
    await refreshState();
  } catch (error) {
    setStatus(`Inspection failed: ${error instanceof Error ? error.message : String(error)}`, "error");
  } finally {
    elements.inspectButton.disabled = false;
  }
}

async function updateAccessStatus() {
  try {
    const granted = await chrome.permissions.contains({ origins: ["http://*/*", "https://*/*"] });
    elements.accessBadge.textContent = granted ? "All sites enabled" : "Current tab only";
    elements.accessBadge.className = `badge ${granted ? "granted" : "neutral"}`;
    elements.accessButton.textContent = granted ? "All-site access enabled" : "Enable optional all-site access";
    elements.accessButton.disabled = granted;
  } catch {
    elements.accessBadge.textContent = "Unavailable";
    elements.accessBadge.className = "badge neutral";
  }
}

async function requestAccess() {
  try {
    const granted = await chrome.permissions.request({ origins: ["http://*/*", "https://*/*"] });
    await updateAccessStatus();
    setStatus(granted ? "Optional all-site access enabled." : "All-site access was not enabled; current-tab access remains available.", granted ? "success" : "");
  } catch (error) {
    setStatus(`Could not update site access: ${error instanceof Error ? error.message : String(error)}`, "error");
  }
}

function switchPanel(panelId) {
  elements.tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.panel === panelId));
  elements.workspaces.forEach((panel) => panel.classList.toggle("active", panel.id === panelId));
}

elements.planButton.addEventListener("click", createPlan);
elements.clearButton.addEventListener("click", clearPlan);
elements.runButton.addEventListener("click", runPlan);
elements.inspectButton.addEventListener("click", inspectPage);
elements.highImpactApproval.addEventListener("change", updateRunButton);
elements.accessButton.addEventListener("click", requestAccess);
elements.instruction.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") createPlan();
});
elements.examples.forEach((button) => button.addEventListener("click", () => {
  elements.instruction.value = button.dataset.example || "";
  elements.instruction.focus();
}));
elements.tabs.forEach((tab) => tab.addEventListener("click", () => switchPanel(tab.dataset.panel)));

await updateAccessStatus();
await refreshState();
