# Gemini CLI + ECH.ai / ECHverse

This repository can be used as the working directory for Gemini CLI. The project-specific Gemini configuration lives in `.gemini/settings.json`.

## 1. Install Gemini CLI

```bash
node --version   # Node 20+
npm install -g @google/gemini-cli@latest
gemini --version
```

## 2. Clone the repository

```bash
git clone https://github.com/PremoHD/ECHverse-.git
cd ECHverse-
```

## 3. Configure credentials

Set a GitHub token with the minimum repository permissions required by your workflow. Do not commit tokens, private keys, banking credentials, SFTP passwords, or `.env` files.

```bash
export GITHUB_PERSONAL_ACCESS_TOKEN='YOUR_TOKEN'
export ECH_MCP_URL='http://127.0.0.1:3364/mcp'
export ECH_MCP_TOKEN='YOUR_ECH_MCP_TOKEN'
```

For a production deployment, load these from your secret manager instead of shell history.

## 4. Start ECH.ai / MCP

The expected MCP endpoint is:

```text
http://127.0.0.1:3364/mcp
```

If your ECH.ai gateway uses another port or path, change `ECH_MCP_URL`; do not expose the endpoint publicly without authentication and TLS.

## 5. Start Gemini CLI

```bash
gemini
```

The project configuration should expose two MCP targets:

- `github` — GitHub repository tooling.
- `ech` — ECH.ai MCP gateway.

## 6. Recommended operating model

Gemini should work against a feature branch first:

```bash
git checkout -b gemini/<task-name>
```

Use Gemini for repository inspection, tests, documentation, refactoring, and proposed changes. Review diffs before pushing or merging:

```bash
git diff
npm test   # or the project's actual test command
git status
```

## 7. MCP safety

Keep `trust` disabled until each MCP server is reviewed. Prefer localhost or a private network for the ECH MCP gateway. Use short-lived credentials and least-privilege GitHub access.

Never place payment credentials, PANs, private keys, SFTP passwords, or production secrets in Gemini prompts, repository files, or MCP tool arguments.
