const state = { plan: [] };

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
  accessBadge: document.querySelector("#accessBadge"),
  accessButton: document.querySelector("#accessButton"),
  status: document.querySelector("#status"),
  examples: document.querySelectorAll(".quick-action"),
};

const HIGH_IMPACT_PATTERNS = /\b(delete|remove|destroy|terminate|cancel|unsubscribe|purchase|buy|checkout|pay|place order|submit order|send|transfer|wire|withdraw|sell|trade|invest|sign|agree|accept terms|publish|post|share|invite|grant access|revoke)\b/i;

function normalizeLabel(value) {
  return String(value || "")
    .replace(/^[\s“”"'`]+|[\s“”"'`,.;:]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function safeUrl(value) {
  const candidate = normalizeLabel(value);
  if (!candidate) return null;
  const normalized = /^https?:\/\//i.test(candidate) ? candidate : `https://${candidate}`;
  try {
    const url = new URL(normalized);
    return /^https?:$/.test(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

function isHighImpact(action) {
  return HIGH_IMPACT_PATTERNS.test(`${action.target || ""} ${action.text || ""} ${action.url || ""}`);
}

function splitInstruction(instruction) {
  return instruction
    .replace(/,\s*(?=(?:go to|navigate to|open|visit|scroll|click|press|select|tap|type|enter|fill|set)\b)/gi, "\n")
    .split(/\s*(?:\b(?:and then|then|after that|next)\b|[;\n]+)\s*/gi)
    .map((step) => normalizeLabel(step.replace(/^and\s+/i, "")))
    .filter(Boolean);
}

function parseQuotedType(clause) {
  const match = clause.match(/^(?:type|enter|fill|set)\s+[“"'](.+?)[”"']\s+(?:into|in|on|for|to)\s+(?:the\s+)?(.+)$/i);
  if (!match) return null;
  return { type: "type", target: normalizeLabel(match[2]), text: match[1] };
}

function parseType(clause) {
  const quoted = parseQuotedType(clause);
  if (quoted) return quoted;
  const match = clause.match(/^(?:type|enter|fill|set)\s+(.+?)\s+(?:into|in|on|for|to)\s+(?:the\s+)?(.+)$/i);
  if (!match) return null;
  return { type: "type", target: normalizeLabel(match[2]), text: normalizeLabel(match[1]) };
}

function parseScroll(clause) {
  const match = clause.match(/^scroll(?:\s+(?:to\s+)?(top|bottom|up|down|left|right))?(?:\s+(\d{1,4})(?:px)?)?$/i);
  if (!match) return null;
  return { type: "scroll", direction: (match[1] || "down").toLowerCase(), amount: match[2] ? Number(match[2]) : 600 };
}

function parseClause(clause) {
  const navigation = clause.match(/^(?:go to|navigate to|open|visit)\s+(.+)$/i);
  if (navigation) {
    const url = safeUrl(navigation[1]);
    return url ? { type: "navigate", url } : { error: `“${clause}” is not a valid web address. Use a full domain such as example.com.` };
  }

  const scroll = parseScroll(clause);
  if (scroll) return scroll;

  const type = parseType(clause);
  if (type) {
    if (!type.target || !type.text) return { error: `I need both text and a field label for “${clause}”.` };
    return type;
  }

  const click = clause.match(/^(?:click|press|select|tap)(?:\s+on)?\s+(?:the\s+)?(.+)$/i);
  if (click) {
    const target = normalizeLabel(click[1]);
    return target ? { type: "click", target } : { error: `I need a visible button or link label to click.` };
  }

  return { error: `I can safely plan “go to”, “click”, “type”, and “scroll” actions, but I could not interpret “${clause}”.` };
}

function buildPlan(instruction) {
  const clauses = splitInstruction(instruction);
  if (!clauses.length) return { actions: [], errors: ["Write an instruction before creating a plan."] };

  const actions = [];
  const errors = [];
  for (const clause of clauses) {
    const parsed = parseClause(clause);
    if (parsed.error) errors.push(parsed.error);
    else actions.push({ ...parsed, highImpact: isHighImpact(parsed) });
  }
  return { actions, errors };
}

function describeAction(action) {
  if (action.type === "navigate") return `Navigate the active tab to ${action.url}`;
  if (action.type === "click") return `Click the visible control labeled “${action.target}”`;
  if (action.type === "type") return `Enter “${action.text}” into the field labeled “${action.target}”`;
  if (action.type === "scroll") return `Scroll ${action.direction} ${action.amount ? `by about ${action.amount}px` : ""}`;
  return "Unknown action";
}

function setStatus(text, kind = "") {
  elements.status.textContent = text;
  elements.status.className = `status ${kind}`.trim();
}

function canRunPlan() {
  if (!state.plan.length) return false;
  const needsHighImpactApproval = state.plan.some((action) => action.highImpact);
  return !needsHighImpactApproval || elements.highImpactApproval.checked;
}

function updateRunButton() {
  elements.runButton.disabled = !canRunPlan();
}

function renderPlan() {
  elements.planList.replaceChildren();
  const highImpact = state.plan.some((action) => action.highImpact);
  elements.planPanel.classList.toggle("hidden", !state.plan.length);
  elements.highImpactNotice.classList.toggle("hidden", !highImpact);
  elements.planCount.textContent = `${state.plan.length} ${state.plan.length === 1 ? "step" : "steps"}`;
  elements.highImpactApproval.checked = false;

  for (const action of state.plan) {
    const item = document.createElement("li");
    if (action.highImpact) item.classList.add("high-impact");
    const type = document.createElement("span");
    type.className = "action-kind";
    type.textContent = action.highImpact ? `${action.type} · confirm` : action.type;
    const description = document.createElement("span");
    description.textContent = describeAction(action);
    item.append(type, description);
    elements.planList.append(item);
  }
  updateRunButton();
}

function createPlan() {
  const { actions, errors } = buildPlan(elements.instruction.value);
  state.plan = actions;
  renderPlan();

  if (!actions.length) {
    setStatus(errors[0] || "No supported actions were found.", "error");
    return;
  }

  if (errors.length) {
    setStatus(`Planned ${actions.length} action(s). Review: ${errors[0]}`, "progress");
  } else if (actions.some((action) => action.highImpact)) {
    setStatus("Plan ready. A marked action needs your explicit confirmation before it can run.", "progress");
  } else {
    setStatus("Plan ready. Review the steps, then run the approved actions.", "success");
  }
}

function clearPlan() {
  state.plan = [];
  elements.instruction.value = "";
  elements.planList.replaceChildren();
  elements.planPanel.classList.add("hidden");
  elements.highImpactApproval.checked = false;
  updateRunButton();
  setStatus("Plan cleared.");
}

function delay(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function runPlan() {
  if (!canRunPlan()) return;
  const plan = [...state.plan];
  elements.runButton.disabled = true;

  try {
    for (let index = 0; index < plan.length; index += 1) {
      const action = plan[index];
      setStatus(`Running step ${index + 1} of ${plan.length}: ${describeAction(action)}`, "progress");
      const response = await chrome.runtime.sendMessage({ kind: "COMMAND_PILOT_EXECUTE", action });
      if (!response?.ok) throw new Error(response?.error || "Action failed.");
      if (action.type === "navigate" && index < plan.length - 1) {
        await delay(1400);
      }
    }
    setStatus("All approved actions completed.", "success");
  } catch (error) {
    setStatus(`Stopped: ${error instanceof Error ? error.message : String(error)}`, "error");
  } finally {
    updateRunButton();
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

elements.planButton.addEventListener("click", createPlan);
elements.clearButton.addEventListener("click", clearPlan);
elements.runButton.addEventListener("click", runPlan);
elements.highImpactApproval.addEventListener("change", updateRunButton);
elements.accessButton.addEventListener("click", requestAccess);
elements.instruction.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") createPlan();
});
elements.examples.forEach((button) => button.addEventListener("click", () => {
  elements.instruction.value = button.dataset.example || "";
  elements.instruction.focus();
}));

updateAccessStatus();
