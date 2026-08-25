# Command Pilot

**Command Pilot** is a functional Manifest V3 Chrome extension for executing a small, auditable set of browser actions from plain-language instructions. It creates an explicit plan, displays every action, and runs nothing until the user chooses **Run approved actions**. Its planner is intentionally local and deterministic: it does not send the instruction, webpage text, form data, or browsing activity to a remote service.

> **Design rule:** The extension is an assistant for user-directed navigation and page interaction, not an autonomous background operator. It never has permission to act without a visible user approval step.

| Capability | Behaviour |
|---|---|
| Navigate | Opens an `http` or `https` URL in the current tab. |
| Click | Finds the best matching visible button, link, or clickable control by its accessible label or displayed text. |
| Type | Writes text into a visibly labeled text field after the user approves the plan. |
| Scroll | Moves the page up, down, left, right, top, or bottom. |
| Confirmation | Every plan must be reviewed and deliberately run. High-impact verbs require an additional checkbox confirmation. |
| Sensitive data | The extension refuses to fill password, one-time-code, payment-verification, government-ID, private-key, or recovery-phrase fields. |

## Install locally

Open `chrome://extensions` in Chrome, enable **Developer mode**, choose **Load unpacked**, and select this `chrome-agent-extension` directory. Pin **Command Pilot** from the Extensions menu if desired. Open the extension from the active page, write an instruction, select **Create action plan**, review each proposed step, and then select **Run approved actions**.

The default permission set is deliberately narrow. `activeTab` supplies temporary access only to the tab from which the user invokes the extension, while `scripting` is used to inject the page controller only when needed. For workflows that cross to a different website after navigation, the user can manually enable the optional all-site access button in the popup. Chrome’s documentation describes `activeTab` as temporary host access following a user invocation and documents `scripting` with either host permissions or `activeTab`. [1] [2]

## Instruction language

Command Pilot accepts a sequence of these safe, deterministic statements. Separate actions with **then**, **and then**, **next**, a semicolon, or a new line.

| Intent | Examples |
|---|---|
| Navigate | `Go to example.com` · `Open https://example.com/help` |
| Click | `Click Settings` · `Press Continue` · `Select Save changes` |
| Type | `Type hello@example.com into Email` · `Enter "Taylor" into the First name field` |
| Scroll | `Scroll down` · `Scroll to the bottom` · `Scroll up 800px` |
| Sequence | `Go to example.com, then type hello@example.com into Email, then click Continue` |

The extension preserves the exact parsed action in the visible plan. If an instruction is ambiguous or outside the supported action language, it stops and explains what it could not safely interpret rather than improvising an action.

## Safety model

| Boundary | Implementation |
|---|---|
| Explicit approval | Planning and execution are separate controls. Creating a plan never changes the webpage. |
| High-impact protection | The plan marks action labels containing terms such as `delete`, `purchase`, `pay`, `send`, `transfer`, `sign`, `publish`, or `grant access`; the user must separately check an approval box before execution. |
| Secret-entry protection | Page-side checks block sensitive fields by their input type, label, name, ID, autocomplete hint, and placeholder. |
| No remote planning | There are no server calls, content uploads, model API keys, or remote analytics in the extension. |
| No background page scraping | The page controller is injected only after user interaction. It does not crawl pages or run continually. |
| No external command channel | The extension does not accept messages from websites or other extensions. |
| Safe rendering | Popup content is rendered with DOM text nodes rather than untrusted HTML. |

Chrome’s extension messaging guidance advises treating content-script messages as less trustworthy and validating or sanitizing input. This implementation limits the message protocol to a fixed action schema and routes it only between its own popup, service worker, and injected controller. [3]

## Project layout

```text
chrome-agent-extension/
├── manifest.json      # Manifest V3 permissions and popup/service-worker entry points
├── popup.html         # Plan-and-approval interface
├── popup.css          # Popup styling
├── popup.js           # Local parser, plan renderer, and user-approved executor
├── background.js      # Action-schema validator and active-tab coordinator
├── controller.js      # Visible-control resolver and sensitive-field guard
└── README.md          # Setup and operating guide
```

## Manual verification checklist

After loading the unpacked extension, test on a non-sensitive site such as a local demo page or a disposable account.

1. Enter `Scroll to the bottom`, create the plan, and run it. The page should scroll only after approval.
2. Enter `Click Settings` on a page with a visible Settings button. Confirm that the plan names the intended control before running it.
3. Enter `Type example@example.com into Email` on a harmless test form. Confirm that the email field receives the text after approval.
4. Enter `Click Delete` on a test page. Confirm that the run button remains disabled until the high-impact checkbox is selected.
5. Attempt `Type secret into Password`. The controller must stop and require manual entry.
6. Create a cross-site sequence such as `Go to example.com then click More information`. Confirm that it either has optional all-site access enabled or stops rather than silently extending its access.

## Known limits

This version does not attempt to solve CAPTCHAs, bypass login prompts, read or enter credentials, interact with browser-internal pages, or infer intentions beyond the supported command patterns. Some heavily customized sites may not expose a usable visible or accessible label for a control; in that case, the agent stops rather than risking a click on a different element.

## References

[1]: https://developer.chrome.com/docs/extensions/reference/api/tabs "Chrome Tabs API — activeTab permission"
[2]: https://developer.chrome.com/docs/extensions/reference/api/scripting "Chrome Scripting API"
[3]: https://developer.chrome.com/docs/extensions/develop/concepts/messaging "Chrome extension message passing and security considerations"
