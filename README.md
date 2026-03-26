# Fusion Data Pipeline Generator

A local tool that generates Oracle PL/SQL code for loading data from Oracle Fusion Cloud into an Oracle Autonomous Database. Supports three extraction types:

- **BICC** — BI Cloud Connector CSV extracts via Object Storage
- **BIP** — BI Publisher SOAP/XML reports
- **OTBI** — Oracle Transactional BI logical SQL queries

The tool uses Claude (Anthropic API) to generate table DDL, PL/SQL load procedures, and test scripts based on your column definitions and configuration.

## Quick Start

```bash
npm install
npm run dev
```

This starts both the Vite frontend (port 5173) and the Express API proxy (port 3001).

## Setup

1. Get an [Anthropic API key](https://console.anthropic.com/)
2. Run `npm install && npm run dev`
3. Open http://localhost:5173
4. Click **API Key** in the header and paste your key
5. Go to the **Setup** tab to download skeleton PL/SQL packages for your extraction type
6. Switch to **Generator** to create load procedures

## How It Works

1. **Choose extraction type** (BICC, BIP, or OTBI)
2. **Provide source metadata** — CSV headers, BIP column names, or OTBI logical SQL
3. **Configure columns** — set Oracle types, primary keys, and indexes
4. **Generate** — Claude produces the DDL + PL/SQL, downloadable as a ZIP

## Privacy

- Your API key is stored in browser localStorage only — never sent to any server except Anthropic's API
- For BIP: if you paste sample XML, only column names are extracted client-side. Data values are immediately discarded and never leave your browser.

## Tech Stack

- React 19 + TypeScript + Tailwind CSS v4 + shadcn/ui
- Express server (API proxy to Anthropic)
- Vite build tooling
