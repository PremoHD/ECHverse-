import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const requiredFiles = [
  "manifest.json",
  "popup.html",
  "popup.css",
  "popup.js",
  "background.js",
  "controller.js",
  "README.md",
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
  throw new Error("Expected optional https all-site access for cross-site workflows.");
}

for (const script of ["popup.js", "background.js", "controller.js"]) {
  execFileSync(process.execPath, ["--check", resolve(root, script)], { stdio: "inherit" });
}

console.log("Validation passed: Manifest V3 configuration and JavaScript syntax are sound.");
