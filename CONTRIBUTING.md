# Contributing to Verno AI Studio

Thank you for your interest in contributing to **Verno**! We welcome community contributions, bug reports, feature suggestions, and pull requests.

---

## 🏛️ Project Architecture

Verno consists of two core components working seamlessly together:

1. **Python FastAPI Multi-Agent Engine (`backend/`)**:
   - Manages state machine orchestration, agent loops, self-healing syntax checks, and provider streaming.
   - Built with FastAPI, Pydantic, HTTPX, and Python asyncio.
   - Saves persistent sessions to `backend/data/projects/`.

2. **VS Code Studio Webview Extension (`verno-extension/`)**:
   - Runs directly inside Code-OSS (VS Code core).
   - Provides the modern Linear/Cursor-inspired multi-agent sidebar, live sprint task HUD, and settings modal.
   - Communicates with the backend engine via Server-Sent Events (SSE) and REST APIs.

---

## 🛠️ Local Development Setup

### 1. Prerequisites
- **Python**: 3.10+
- **Node.js**: 18+ & npm
- **Git**
- VS Code or VSCodium (for extension development)

### 2. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Create and activate a virtual environment
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the development server with auto-reload
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

Verify backend health at `http://127.0.0.1:8000/docs` (Swagger UI).

### 3. Extension Setup
```bash
# Navigate to extension directory
cd verno-extension

# If making modifications to media assets or host scripts:
# You can test directly by loading verno-extension as an unpacked extension in VS Code:
# Open VS Code -> Press F5 (Launch Extension Development Host)
```

---

## 💡 How to Contribute

### Adding a New AI Provider / Model Preset
1. Open `backend/config.py` and register the provider credentials and endpoint in `PROVIDER_PRESETS`.
2. Update `verno-extension/media/main.js` in `defaultPresets` to include recommended models for PM, Developer, QA, and DevOps.
3. Test connectivity using the Test Connection endpoint (`POST /api/config/test`).

### Extending Agent Capabilities
- Agents reside in `backend/agents/`:
  - `project_manager.py`: Sprint backlog breakdown & user requirements.
  - `developer.py`: File creation, updates, and inline refactoring.
  - `qa_tester.py`: Code review, unit test formulations, and bug detection.
  - `devops.py`: Structural verification, dockerfiles, and runtime validation.
- Agent coordination logic is orchestrated in `backend/services/orchestrator.py`.

---

## 📋 Pull Request (PR) Workflow

1. **Fork the Repository** to your GitHub account.
2. **Create a Feature Branch**:
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Commit Your Changes** with clear commit messages:
   ```bash
   git commit -m "feat(agent): add self-healing test runner for Go projects"
   ```
4. **Push to Your Branch**:
   ```bash
   git push origin feature/amazing-feature
   ```
5. **Open a Pull Request** describing:
   - What problem does this solve?
   - How was it tested?
   - Any relevant screenshots or demo recordings.

---

## 🛡️ Code of Conduct
Be respectful, constructive, and collaborative. We are building the future of autonomous agentic software engineering together!
