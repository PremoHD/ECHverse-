const HIGH_IMPACT_PATTERNS = /\b(delete|remove|destroy|terminate|cancel|unsubscribe|purchase|buy|checkout|pay|place order|submit order|send|transfer|wire|withdraw|sell|trade|invest|sign|agree|accept terms|publish|post|share|invite|grant access|revoke|create payment|payment link)\b/i;

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
  return String(instruction || "")
    .replace(/,\s*(?=(?:go to|navigate to|open|visit|scan|inspect|scroll|click|press|select|tap|type|enter|fill|set|wait)\b)/gi, "\n")
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
  const match = clause.match(/^scroll(?:\s+(?:to\s+)?(?:the\s+)?(top|bottom|up|down|left|right))?(?:\s+(\d{1,4})(?:px)?)?$/i);
  if (!match) return null;
  return { type: "scroll", direction: (match[1] || "down").toLowerCase(), amount: match[2] ? Number(match[2]) : 600 };
}

function parseWait(clause) {
  const match = clause.match(/^wait(?:\s+(?:for\s+)?)?(\d{1,2})(?:\s*(?:seconds?|s))?$/i);
  if (!match) return null;
  return { type: "wait", milliseconds: Math.min(Math.max(Number(match[1]) * 1000, 1000), 30000) };
}

export function parseClause(clause) {
  const navigation = clause.match(/^(?:go to|navigate to|open|visit)\s+(.+)$/i);
  if (navigation) {
    const url = safeUrl(navigation[1]);
    return url ? { type: "navigate", url } : { error: `“${clause}” is not a valid web address. Use a full domain such as example.com.` };
  }

  if (/^(?:inspect|scan|map)(?:\s+(?:this|the|current))?\s*(?:page|site|website)?$/i.test(clause)) {
    return { type: "inspect" };
  }

  const scroll = parseScroll(clause);
  if (scroll) return scroll;

  const wait = parseWait(clause);
  if (wait) return wait;

  const type = parseType(clause);
  if (type) {
    if (!type.target || !type.text) return { error: `I need both text and a field label for “${clause}”.` };
    return type;
  }

  const click = clause.match(/^(?:click|press|select|tap)(?:\s+on)?\s+(?:the\s+)?(.+)$/i);
  if (click) {
    const target = normalizeLabel(click[1]);
    return target ? { type: "click", target } : { error: "I need a visible button or link label to click." };
  }

  return { error: `I can safely plan “go to”, “inspect”, “click”, “type”, “scroll”, and “wait” actions, but I could not interpret “${clause}”.` };
}

export function buildPlan(instruction) {
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

export function describeAction(action) {
  if (action.type === "navigate") return `Navigate the active tab to ${action.url}`;
  if (action.type === "inspect") return "Inspect the current page and map its visible controls";
  if (action.type === "click") return `Click the visible control labeled “${action.target}”`;
  if (action.type === "type") return `Enter “${action.text}” into the field labeled “${action.target}”`;
  if (action.type === "scroll") return `Scroll ${action.direction} by about ${action.amount}px`;
  if (action.type === "wait") return `Wait ${Math.round(action.milliseconds / 1000)} seconds`;
  return "Unknown action";
}
