(() => {
  if (globalThis.__commandPilotControllerLoaded) return;
  globalThis.__commandPilotControllerLoaded = true;

  const SENSITIVE_INPUT_PATTERNS = /\b(password|passcode|one[- ]?time|otp|verification|security code|cvv|cvc|card number|social security|ssn|tax id|private key|seed phrase|recovery phrase)\b/i;
  const MAX_CANDIDATES = 400;

  const normalize = (value) => String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase();

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
    return [
      aria,
      labelledBy,
      element.getAttribute("title"),
      element.getAttribute("placeholder"),
      element.getAttribute("alt"),
      element.value,
      element.innerText,
      element.textContent,
    ].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
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

  function setFieldValue(field, value) {
    if (field.matches("[contenteditable='true'], [role='textbox']") && !field.matches("input, textarea")) {
      field.focus();
      field.textContent = value;
      field.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: value }));
      field.dispatchEvent(new Event("change", { bubbles: true }));
      return;
    }

    const prototype = field instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
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

  function execute(action) {
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
        return { ok: false, error: "For your security, Command Pilot never enters passwords, one-time codes, payment verification values, government IDs, or recovery credentials. Enter this value yourself." };
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
    if (message?.kind === "COMMAND_PILOT_PING") {
      sendResponse({ ok: true });
      return;
    }
    if (message?.kind === "COMMAND_PILOT_EXECUTE") {
      try {
        sendResponse(execute(message.action));
      } catch (error) {
        sendResponse({ ok: false, error: error instanceof Error ? error.message : String(error) });
      }
    }
  });
})();
