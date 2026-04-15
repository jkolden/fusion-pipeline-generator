# Running Locally with VS Code + Claude Code

This guide is for running the Fusion Data Pipeline Generator on your own machine using VS Code and Claude Code.

## Prerequisites

1. **Node.js 18+** — Download from https://nodejs.org (choose the LTS version)
2. **VS Code** — Download from https://code.visualstudio.com
3. **Claude Code extension for VS Code** — Install from the VS Code Marketplace (search "Claude Code")
4. **An Anthropic API key** — Get one at https://console.anthropic.com (requires account creation)

---

## Setup

### 1. Get the code

Clone the repository or download it as a ZIP from GitHub:

```bash
git clone https://github.com/jkolden/fusion-pipeline-generator.git
cd fusion-pipeline-generator
```

Or in VS Code: **File → Open Folder** and select the downloaded folder.

### 2. Install dependencies

Open a terminal in VS Code (**Terminal → New Terminal**) and run:

```bash
npm install
```

### 3. Start the app

```bash
npm run dev
```

This starts two things:
- The React frontend at **http://localhost:5173**
- The Express API proxy at **http://localhost:3001**

Open http://localhost:5173 in your browser.

### 4. Add your API key

Click **API Key** (top right, shown as "Missing") and paste your Anthropic API key.
Your key is stored only in your browser — it never leaves your machine except when calling Anthropic's API.

---

## Using Claude Code in VS Code

Claude Code lets you ask questions about the codebase and make changes using natural language.

1. Open the Claude Code panel in VS Code (left sidebar or `Ctrl+Shift+P` → "Claude Code")
2. You can ask things like:
   - *"How does the BICC pipeline generation work?"*
   - *"Add a new extraction type for XYZ"*
   - *"Explain what the staging table rules are"*

---

## Stopping the app

Press `Ctrl+C` in the terminal where `npm run dev` is running.

---

## Hosted version

A hosted version is available at:
**https://fusion-pipeline-generator-production.up.railway.app**

No setup required — just bring your Anthropic API key.
