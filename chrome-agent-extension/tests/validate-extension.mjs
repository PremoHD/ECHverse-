import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildPlan } from "../planner.js";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const requiredFiles = [
  "manifest.json",
  "package.json",
  "popup.html",
  "popup.css",
  "popup.js",
  "planner.js",
  "background.js",
  "controller.js",
  "README.md",
  "SOURCE_PROVENANCE.md",
];

for (const file of requiredFiles) {
  if (!existsSync(resolve(root, file))) {
    throw new Error(`Required extension file is missing: ${file}`);
  }
}

const manifest = JSON.parse(readFileSync(resolve(root, "manifest.json"), "utf8"));
if (manifest.manifest_version !== 3) throw new Error("Expected Manifest V3.");
for (const permission of ["activeTab", "scripting", "storage"]) {
  if (!manifest.permissions?.includes(permission)) {
    throw new Error(`Missing required permission: ${permission}`);
  }
}
if (manifest.host_permissions?.length) {
  throw new Error("Host permissions must remain optional by default.");
}
if (!manifest.optional_host_permissions?.includes("https://*/*")) {
  throw new Error("Expected optional https all-site access for cross-site missions.");
}
if (manifest.background?.service_worker !== "background.js" || manifest.action?.default_popup !== "popup.html") {
  throw new Error("Expected background coordinator and popup entry points.");
}

for (const script of ["planner.js", "popup.js", "background.js", "controller.js"]) {
  execFileSync(process.execPath, ["--check", resolve(root, script)], { stdio: "inherit" });
}

const ordinaryMission = buildPlan("Inspect this page, then click Settings, then scroll to the bottom");
if (ordinaryMission.errors.length || ordinaryMission.actions.map((action) => action.type).join(",") !== "inspect,click,scroll") {
  throw new Error("The planner did not create the expected local mission sequence.");
}

const protectedMission = buildPlan("Click Delete account then wait 2");
if (protectedMission.errors.length || !protectedMission.actions[0]?.highImpact || protectedMission.actions[1]?.type !== "wait") {
  throw new Error("The planner did not classify high-impact and wait actions correctly.");
}

console.log("Validation passed: Manifest V3 configuration, module syntax, and representative mission planning are sound.");
