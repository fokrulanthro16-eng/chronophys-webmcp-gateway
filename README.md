# 🌐 ChronoPhys WebMCP Gateway — The WebMCP Challenge

[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-18-blue?style=flat&logo=react)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8?style=flat&logo=tailwindcss)](https://tailwindcss.com/)
[![WebMCP Standard](https://img.shields.io/badge/WebMCP-document.modelContext-8b5cf6?style=flat)](https://github.com/W3C)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **The WebMCP Challenge Submission** — An enterprise-grade, accessible web application natively implementing the **Web Model Context Protocol (WebMCP)** standard (`document.modelContext`). Enables autonomous browser agents and human operators to seamlessly co-navigate, query technical catalogs, autofill forms, and trigger real-time UI state changes.

---

## 📌 Table of Contents
- [Executive Overview](#-executive-overview)
- [WebMCP Standard Architecture](#-webmcp-standard-architecture)
- [Registered WebMCP Tools & Code Implementation](#-registered-webmcp-tools--code-implementation)
- [Grandma Theory Accessibility](#-grandma-theory-accessibility)
- [Step-by-Step Local Setup & Execution](#-step-by-step-local-setup--execution)
- [Testing & Verification Guide](#-testing--verification-guide)
  - [Chrome DevTools Console Testing](#1-chrome-devtools-console-testing)
  - [Chrome Experimental WebMCP Flags](#2-chrome-experimental-webmcp-flags)
  - [Automated Test Suite](#3-automated-test-suite)
- [Devpost Hackathon Criteria Alignment](#-devpost-hackathon-criteria-alignment)
- [Production Deployment Guide](#-production-deployment-guide)
- [License](#-license)

---

## 🎯 Executive Overview

Modern web applications are built almost exclusively for human visual interaction, forcing AI agents to rely on brittle, non-deterministic screen scrapers or DOM heuristics. 

**ChronoPhys WebMCP Gateway** demonstrates the future of agentic web design by implementing the **W3C WebMCP Standard (`document.modelContext`)**:
1. **First-Class Agent Tool Discovery**: Exposes typed schema definitions directly to browser models.
2. **Deterministic State Synchronization**: Uses typed Custom Browser Events (`webmcp-action`) to bridge agent tool execution with React state without page reloads.
3. **Dual Human-Agent UX ("Grandma Theory")**: A high-contrast, accessible UI where every automated action can also be operated by humans with large hit targets.
4. **Live Activity Inspector**: Real-time slide-over telemetry drawer displaying latency, payloads, and execution history.

---

## 🏗️ WebMCP Standard Architecture

```
                                 +-----------------------------+
                                 |  Browser Autonomous Agent   |
                                 +--------------+--------------+
                                                |
                                 (1) Tool Discovery & Invocation
                                                v
                              +-----------------------------------+
                              |       document.modelContext       |
                              |  - query_catalog (Tool 1)         |
                              |  - AUTOFILL_FORM (Tool 2)         |
                              |  - TOGGLE_GRANDMA_MODE (Tool 3)   |
                              |  - execute_action (Tool 4)        |
                              |  - get_agent_state (Tool 5)       |
                              +-----------------+-----------------+
                                                |
                                 (2) Dispatches CustomEvent
                                                v
                              +-----------------------------------+
                              |    window.dispatchEvent(          |
                              |      'webmcp-action', { ... }     |
                              |    )                              |
                              +-----------------+-----------------+
                                                |
                                 (3) Reactive State Updates
                                                v
                              +-----------------------------------+
                              |      React UI (App Router)        |
                              |  - CatalogGrid (Live Search)      |
                              |  - BookingForm (Autofill Pulse)   |
                              |  - AgentInspector (Telemetry)     |
                              |  - GrandmaMode (Accessibility)    |
                              +-----------------------------------+
```

---

## 🛠️ Registered WebMCP Tools & Code Implementation

All tools are registered during application initialization in `lib/webmcp-tools.ts`:

### 1. `query_catalog`
Searches, filters, and ranks items based on keyword, category, max price, and stock status:

```typescript
export const queryCatalogTool: WebMCPToolDefinition = {
  name: 'query_catalog',
  description: 'Searches, filters, and ranks items in the enterprise catalog.',
  parameters: {
    type: 'object',
    properties: {
      keyword: { type: 'string', description: 'Search term' },
      category: { type: 'string', enum: ['all', 'industrial', 'ai-edge', 'sensors', 'consulting'] },
      maxPrice: { type: 'number', description: 'Maximum price in USD' },
      inStockOnly: { type: 'boolean', description: 'Filter in-stock items' }
    }
  },
  handler: async (args) => {
    // Queries structured mock data and returns ranked results
    return { totalFound: results.length, items: trimmedResults };
  }
};
```

### 2. `AUTOFILL_FORM`
Direct tool for autonomous agents to populate enterprise Request for Quote (RFQ) details:

```typescript
export const autofillFormTool: WebMCPToolDefinition = {
  name: 'AUTOFILL_FORM',
  description: 'Directly autofills the Enterprise Request for Quote (RFQ) form.',
  parameters: {
    type: 'object',
    properties: {
      customerName: { type: 'string' },
      email: { type: 'string' },
      company: { type: 'string' },
      urgencyLevel: { type: 'string', enum: ['low', 'standard', 'emergency'] },
      notes: { type: 'string' },
      itemId: { type: 'string' }
    }
  },
  handler: async (args) => {
    dispatchWebMCPAction('AUTOFILL_FORM', args, 'agent', 'AUTOFILL_FORM');
    return { success: true, message: 'Form fields populated', autofilled: args };
  }
};
```

### 3. `TOGGLE_GRANDMA_MODE`
Toggles high-contrast accessible mode ($48\text{px}+$ touch targets, enlarged text, bold outlines):

```typescript
export const toggleGrandmaModeTool: WebMCPToolDefinition = {
  name: 'TOGGLE_GRANDMA_MODE',
  description: 'Toggles high-contrast Grandma Mode accessibility.',
  parameters: { type: 'object', properties: {} },
  handler: async () => {
    dispatchWebMCPAction('TOGGLE_GRANDMA_MODE', {}, 'agent', 'TOGGLE_GRANDMA_MODE');
    return { success: true, message: 'Grandma accessibility mode toggled' };
  }
};
```

---

## 👵 Grandma Theory Accessibility

- **Large Interactive Targets**: All interactive elements scale to $\ge 48\text{px}$ touch targets.
- **High-Contrast Dark Palette**: Ultra-high contrast text (`#f8fafc` on `#020617` with `#f59e0b` amber accents).
- **Clear Visual Feedback**: Real-time green/purple glow badges when agent actions occur.
- **Equal Human-Agent Ergonomics**: Every action an AI agent can execute is also directly operable by a human operator with clear visual affordances.

---

## 🚀 Step-by-Step Local Setup & Execution

### Prerequisites
- Node.js 18.x or higher
- npm 9.x or higher

### Installation & Run

```bash
# 1. Clone or navigate to the repository
cd "C:\Users\WALTON\.gemini\antigravity\scratch\webmcp-challenge"

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev

# 4. Open in browser
http://localhost:3000
```

---

## 🧪 Testing & Verification Guide

### 1. Chrome DevTools Console Testing
Open Chrome DevTools (`F12` or `Ctrl+Shift+I`) on `http://localhost:3000` and run:

```javascript
// Test 1: Check all registered tools
console.log(document.modelContext.getRegisteredTools());

// Test 2: Query the Catalog for AI-Edge Appliances
await window.__webmcp.queryCatalog("Phase", "ai-edge");

// Test 3: Autofill the Enterprise RFQ Form as an Autonomous Agent
await window.__webmcp.executeAction("AUTOFILL_FORM", {
  customerName: "Dr. Gordon Freeman",
  email: "g.freeman@blackmesa.gov",
  company: "Black Mesa Research Facility",
  urgencyLevel: "emergency",
  notes: "Catastrophic 3.5 Hz resonance detected on Sector C cooling turbopumps.",
  itemId: "prod-001"
});

// Test 4: Toggle Grandma Accessibility Mode
await window.__webmcp.executeAction("TOGGLE_GRANDMA_MODE", {});
```

### 2. Chrome Experimental WebMCP Flags
To test with experimental native browser WebMCP flags:
1. Open Chrome and navigate to `chrome://flags/#enable-webmcp-testing` (or `chrome://flags/#enable-experimental-web-platform-features`).
2. Set to **Enabled** and relaunch Chrome.
3. The application will automatically bind directly to the native `document.modelContext` object.

### 3. Automated Test Suite
Run the built-in automated test verification script:
```bash
node test-webmcp.mjs
```

---

## 🏆 Devpost Hackathon Criteria Alignment

| Criterion | Implementation & Evidence |
| :--- | :--- |
| **WebMCP Standard Adherence** | 100% compliant with `document.modelContext.registerTool`, structured schemas, and typed event dispatching. |
| **Agent Usability** | 5 distinct tools registered (`query_catalog`, `AUTOFILL_FORM`, `TOGGLE_GRANDMA_MODE`, `execute_action`, `get_agent_state`). |
| **UI/UX & Grandma Mode** | High-contrast, large touch targets, real-time pulse badges, and slide-over Agent Activity Inspector. |
| **Technical Excellence** | Next.js 14 App Router, TypeScript, Tailwind CSS, clean SSR safety (`typeof window !== 'undefined'`), and zero build errors. |

---

## 📦 Production Deployment Guide

### Deploy to Vercel (Recommended)

```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Deploy to production
vercel --prod
```

### Push to GitHub

```bash
# 1. Initialize and commit
git init
git add .
git commit -m "feat: initial WebMCP Challenge submission (document.modelContext, Grandma Mode, Next.js App Router)"

# 2. Set main branch and remote
git branch -M main
git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/webmcp-challenge.git

# 3. Push to GitHub
git push -u origin main
```

---

## 📄 License
This project is open-source and distributed under the [MIT License](LICENSE).
