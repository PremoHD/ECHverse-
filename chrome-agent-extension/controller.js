(() => {
  if (globalThis.__agentSmithControllerLoaded) return;
  globalThis.__agentSmithControllerLoaded = true;

  const SENSITIVE_INPUT_PATTERNS = /\b(password|passcode|one[- ]?time|otp|verification|security code|cvv|cvc|card number|social security|ssn|tax id|private key|seed phrase|recovery phrase)\b/i;
  const HIGH_IMPACT_PATTERNS = /\b(delete|remove|destroy|terminate|cancel|unsubscribe|purchase|buy|checkout|pay|place order|submit order|send|transfer|wire|withdraw|sell|trade|invest|sign|agree|accept terms|publish|post|share|invite|grant access|revoke|create payment|payment link)\b/i;
  const MAX_CANDIDATES = 400;
  const MAX_SIGNALS = 80;

  const normalize = (value) => String(value || "").replace(/\s+/g, " ").trim().toLocaleLowerCase();

  function isVisible(element) {
    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return style.visibility !== "hidden" && style.display !== "none" && rect.width > 0 && rect.height > 0;
  }

  function controlText(element) {
    const aria = element.getAttribute("aria-label") || "";
    const labelledBy = (element.getAttribute("aria-labelledby") || "")
      .split(/\s+/)
      .map((id) => document.getElementById(id)?.textContent || "")
      .join(" ");
    const buttonValue = element.matches("input[type='button'], input[type='submit'], input[type='reset']") ? element.value : "";
    return [
      aria,
      labelledBy,
      element.getAttribute("title"),
      element.getAttribute("placeholder"),
      element.getAttribute("alt"),
      buttonValue,
      element.innerText,
      element.textContent,
    ].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  }

  function fieldDescription(field) {
    const labels = [];
    if (field.id) {
      labels.push(...Array.from(document.querySelectorAll(`label[for="${CSS.escape(field.id)}"]`)).map((label) => label.innerText));
    }
    const wrappingLabel = field.closest("label");
    if (wrappingLabel) labels.push(wrappingLabel.innerText);
    return [
      field.type,
      field.name,
      field.id,
      field.getAttribute("autocomplete"),
      field.getAttribute("placeholder"),
      field.getAttribute("aria-label"),
      ...labels,
    ].filter(Boolean).join(" ");
  }

  function scoreMatch(element, target) {
    const candidate = normalize(controlText(element));
    if (!candidate) return -1;
    if (candidate === target) return 100;
    if (candidate.startsWith(target)) return 80;
    if (candidate.includes(target)) return 60;
    const targetWords = target.split(" ").filter(Boolean);
    const matched = targetWords.filter((word) => candidate.includes(word)).length;
    return matched ? Math.round((matched / targetWords.length) * 40) : -1;
  }

  function findVisibleControl(target, mode = "click") {
    const selector = mode === "type"
      ? "input, textarea, [contenteditable='true'], [role='textbox']"
      : "button, a[href], input[type='button'], input[type='submit'], input[type='reset'], [role='button'], [role='link'], [onclick]";
    const normalizedTarget = normalize(target);
    const candidates = Array.from(document.querySelectorAll(selector))
      .filter(isVisible)
      .slice(0, MAX_CANDIDATES)
      .map((element) => ({ element, score: scoreMatch(element, normalizedTarget) }))
      .filter(({ score }) => score >= 0)
      .sort((a, b) => b.score - a.score);
    return candidates[0]?.element || null;
  }

  function setFieldValue(field, value) {
    if (field.matches("[contenteditable='true'], [role='textbox']") && !field.matches("input, textarea")) {
      field.focus();
      field.textContent = value;
      field.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: value }));
      field.dispatchEvent(new Event("change", { bubbles: true }));
      return;
    }

    const prototype = field instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");
    descriptor?.set?.call(field, value);
    field.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: value }));
    field.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function scrollPage(direction, amount) {
    const distance = Math.max(100, Math.min(Number(amount) || 600, 3000));
    const delta = {
      up: { top: -distance, left: 0 },
      down: { top: distance, left: 0 },
      left: { top: 0, left: -distance },
      right: { top: 0, left: distance },
      top: { top: -document.documentElement.scrollHeight, left: 0 },
      bottom: { top: document.documentElement.scrollHeight, left: 0 },
    }[direction || "down"] || { top: distance, left: 0 };
    window.scrollBy({ ...delta, behavior: "smooth" });
  }

  function signalFromElement(element, category) {
    const label = controlText(element).slice(0, 180) || "Unlabeled control";
    const sensitive = category === "field" && (String(element.getAttribute("type") || "").toLowerCase() === "password" || SENSITIVE_INPUT_PATTERNS.test(fieldDescription(element)));
    const highImpact = HIGH_IMPACT_PATTERNS.test(label);
    return {
      id: `${category}-${Array.from(element.parentNode?.children || []).indexOf(element)}-${label}`.slice(0, 220),
      category,
      label,
      highImpact,
      sensitive,
      score: sensitive ? 95 : highImpact ? 85 : category === "action" ? 45 : 25,
    };
  }

  function inspectPage() {
    const actionSelector = "button, a[href], input[type='button'], input[type='submit'], input[type='reset'], [role='button'], [role='link'], [onclick]";
    const fieldSelector = "input, textarea, [contenteditable='true'], [role='textbox']";
    const actionSignals = Array.from(document.querySelectorAll(actionSelector))
      .filter(isVisible)
      .slice(0, MAX_SIGNALS)
      .map((element) => signalFromElement(element, "action"));
    const fieldSignals = Array.from(document.querySelectorAll(fieldSelector))
      .filter(isVisible)
      .slice(0, MAX_SIGNALS)
      .map((element) => signalFromElement(element, "field"));
    const unique = new Map();
    [...actionSignals, ...fieldSignals].forEach((signal) => {
      const key = `${signal.category}:${signal.label.toLocaleLowerCase()}`;
      if (!unique.has(key)) unique.set(key, signal);
    });
    const signals = Array.from(unique.values()).slice(0, MAX_SIGNALS);
    return {
      ok: true,
      message: `Mapped ${signals.length} visible control(s).`,
      inspection: {
        title: document.title.slice(0, 180),
        url: location.href,
        actionCount: actionSignals.length,
        fieldCount: fieldSignals.length,
        sensitiveFieldCount: fieldSignals.filter((signal) => signal.sensitive).length,
      },
      signals,
    };
  }

  function execute(action) {
    if (action.type === "inspect") return inspectPage();

    if (action.type === "navigate") {
      window.setTimeout(() => window.location.assign(action.url), 0);
      return { ok: true, message: `Navigating to ${action.url}` };
    }

    if (action.type === "scroll") {
      scrollPage(action.direction, action.amount);
      return { ok: true, message: `Scrolled ${action.direction || "down"}.` };
    }

    const fieldOrControl = findVisibleControl(action.target, action.type);
    if (!fieldOrControl) {
      return { ok: false, error: `I could not find a visible ${action.type === "type" ? "field" : "control"} labeled “${action.target}”.` };
    }

    if (action.type === "type") {
      const description = fieldDescription(fieldOrControl);
      const type = (fieldOrControl.getAttribute("type") || "").toLowerCase();
      if (type === "password" || SENSITIVE_INPUT_PATTERNS.test(description)) {
        return { ok: false, error: "For your security, AgentSmith never enters passwords, one-time codes, payment verification values, government IDs, private keys, or recovery credentials. Enter this value yourself." };
      }
      fieldOrControl.scrollIntoView({ block: "center", behavior: "smooth" });
      fieldOrControl.focus();
      setFieldValue(fieldOrControl, action.text);
      return { ok: true, message: `Entered text in “${action.target}”.` };
    }

    fieldOrControl.scrollIntoView({ block: "center", behavior: "smooth" });
    fieldOrControl.focus();
    fieldOrControl.click();
    return { ok: true, message: `Clicked “${action.target}”.` };
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.kind === "AGENTSMITH_PING") {
      sendResponse({ ok: true });
      return;
    }
    if (message?.kind === "AGENTSMITH_EXECUTE") {
      try {
        sendResponse(execute(message.action));
      } catch (error) {
        sendResponse({ ok: false, error: error instanceof Error ? error.message : String(error) });
      }
    }
  });
})();
