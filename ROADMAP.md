# Verno AI Studio — Engineering Roadmap

This roadmap outlines key milestones and upcoming capabilities planned for Verno.

---

## 🎯 Current Milestone (v1.0.0 — Shipped ✅)
- [x] **Native Code-OSS Integration**: Full VS Code IDE with native terminals, tree view, and editor tabs.
- [x] **4 Specialized Autonomous Agents**:
  - 📋 Sarah (Project Manager)
  - 💻 David (Lead Developer)
  - 🧪 Maya (QA Automation)
  - 🚀 Sam (DevOps Engineer)
- [x] **Direct Workspace File Generation**: Agents read, generate, and edit code directly in the open project workspace.
- [x] **Interactive Agent Chat Stream**: SSE-powered conversational dialogue between agents with @mentions and reply bars.
- [x] **Self-Healing Agentic Loop**: Automated syntax checking (`py_compile`, `node --check`) and background unit test execution with auto-repair feedback loops.
- [x] **Smart Inline Edit (Ctrl+K)**: Instant code refactoring with inline diff previews and keyboard shortcuts (Accept/Reject).
- [x] **Codebase Context & File Attachments**: Seamless `@filename` tagging and context chips in prompt composer.
- [x] **Flexible Provider Agnostic Matrix**: Support for OpenRouter, Liara AI, OpenAI, Groq, Ollama, Gemini, and DeepSeek.
- [x] **Network Resilience & Disconnection Auto-Resume**: Exponential backoff retry and browser `online` event auto-reconnection.
- [x] **Persisted Chat History & Sessions**: Disk-backed session drawer with filterable history, restoration, and deletion.

---

## 🚀 Near-Term Milestone (v1.1.0 — In Progress 🚧)
- [ ] **Embedded Live Preview Tab**:
  - In-IDE browser preview with Hot Reload for instant visual feedback on frontend code (HTML/CSS/JS, React, Vue).
- [ ] **Agent Terminal Execution & Package Management**:
  - Secure permission-gated command runner allowing DevOps/Developer agents to run `npm install`, `pip install`, and dev servers with user approval.
- [ ] **Git Checkpoints & Time-Travel Rollback**:
  - One-click "Undo This Iteration" button using underlying Git snapshot tree.
- [ ] **Multi-File Visual Diff Inspector**:
  - Review all modified files side-by-side in native VS Code diff tabs before finalizing commits.

---

## 🔮 Future Horizons (v1.2.0 & Beyond 🔭)
- [ ] **Model Context Protocol (MCP) Integration**:
  - Enable Verno agents to connect to external databases, web search, GitHub issues, and cloud servers via MCP servers.
- [ ] **Vector Indexing & Local Codebase Embeddings**:
  - Fast local semantic code search (ChromaDB / LanceDB) to index multi-thousand file repositories.
- [ ] **Voice Prompting & Speech-to-Code**:
  - Whisper-based natural voice input for hands-free architecture discussions.
- [ ] **One-Click Cloud Deployment**:
  - Automated deployment pipelines to Vercel, Netlify, Docker containers, and cloud providers.
