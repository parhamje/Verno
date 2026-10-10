// Verno Studio Webview Client Controller for Code-OSS
const vscode = acquireVsCodeApi();

const state = {
  apiBaseUrl: "http://127.0.0.1:8000",
  projectId: "",
  projectName: "",
  extendedPrompt: "",
  currentPlan: "",
  suggestedProjectName: "",
  awaitingPlanApproval: false,
  awaitingProjectName: false,
  isRunning: false,
  eventSource: null,
  isNetworkPaused: false,
  reconnectTimer: null,
  reconnectCountdown: 0,
  savedProjects: [],
  workspacePath: "",
  selectedAgent: "all",
  workspaceFiles: [],
  selectedContextFiles: new Set(),
  activeFilesContext: {},
  // Active AI Configuration
  config: {
    AI_PROVIDER: "liara",
    AI_PROVIDER_BASE_URL: "https://ai.liara.ir/api/693bc6a1dc577f85e738b9a9/v1",
    AI_PROVIDER_API_KEY: "",
    PROJECT_MANAGER_MODEL: "anthropic/claude-3.5-sonnet",
    DEVELOPER_MODEL: "qwen/qwen3-coder",
    QA_TESTER_MODEL: "anthropic/claude-3.5-sonnet",
    DEVOPS_MODEL: "anthropic/claude-3.5-sonnet",
    MAX_ITERATIONS: 20,
    TIMEOUT: 120
  },
  presets: {}
};

const roleMap = {
  'project_manager': 'pm',
  'developer': 'dev',
  'qa_tester': 'qa',
  'devops': 'devops'
};

const agentData = {
  pm: { name: 'Sarah', role: 'Project Manager', short: 'PM', icon: '📋' },
  dev: { name: 'David', role: 'Lead Developer', short: 'DEV', icon: '💻' },
  qa: { name: 'Maya', role: 'QA Automation', short: 'QA', icon: '🧪' },
  devops: { name: 'Sam', role: 'DevOps & SRE', short: 'OPS', icon: '🚀' }
};

// Preset defaults for quick auto-fill
const defaultPresets = {
  openrouter: {
    name: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    models: {
      pm: "anthropic/claude-3.5-sonnet",
      dev: "anthropic/claude-3.5-sonnet",
      qa: "openai/gpt-4o-mini",
      devops: "anthropic/claude-3.5-sonnet"
    }
  },
  openai: {
    name: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    models: {
      pm: "gpt-4o",
      dev: "gpt-4o",
      qa: "gpt-4o-mini",
      devops: "gpt-4o"
    }
  },
  groq: {
    name: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    models: {
      pm: "llama-3.3-70b-versatile",
      dev: "llama-3.3-70b-versatile",
      qa: "llama-3.1-8b-instant",
      devops: "llama-3.3-70b-versatile"
    }
  },
  ollama: {
    name: "Ollama (Local)",
    baseUrl: "http://localhost:11434/v1",
    models: {
      pm: "llama3.1:latest",
      dev: "qwen2.5-coder:latest",
      qa: "llama3.1:latest",
      devops: "llama3.1:latest"
    }
  },
  gemini: {
    name: "Google Gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    models: {
      pm: "gemini-1.5-pro",
      dev: "gemini-1.5-pro",
      qa: "gemini-1.5-flash",
      devops: "gemini-1.5-pro"
    }
  },
  deepseek: {
    name: "DeepSeek",
    baseUrl: "https://api.deepseek.com/v1",
    models: {
      pm: "deepseek-chat",
      dev: "deepseek-coder",
      qa: "deepseek-chat",
      devops: "deepseek-chat"
    }
  },
  liara: {
    name: "Liara AI",
    baseUrl: "https://ai.liara.ir/api/693bc6a1dc577f85e738b9a9/v1",
    models: {
      pm: "anthropic/claude-sonnet-4.5",
      dev: "qwen/qwen3-coder",
      qa: "openai/gpt-4o-mini",
      devops: "anthropic/claude-sonnet-4.5"
    }
  },
  custom: {
    name: "Custom",
    baseUrl: "",
    models: {
      pm: "gpt-4o",
      dev: "gpt-4o",
      qa: "gpt-4o-mini",
      devops: "gpt-4o"
    }
  }
};

// DOM Elements
const chatContainer = document.getElementById("chatContainer");
const chatInput = document.getElementById("chatInput");
const sendBtn = document.getElementById("sendBtn");
const newProjectBtn = document.getElementById("newProjectBtn");
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const settingsBtn = document.getElementById("settingsBtn");
const currentProjectName = document.getElementById("currentProjectName");
const currentPhasePill = document.getElementById("currentPhasePill");
const progressFill = document.getElementById("progressFill");
const progressPercent = document.getElementById("progressPercent");
const progressLabel = document.getElementById("progressLabel");
const tasksDrawer = document.getElementById("tasksDrawer");
const tasksDrawerHeader = document.getElementById("tasksDrawerHeader");
const tasksList = document.getElementById("tasksList");
const tasksCountBadge = document.getElementById("tasksCountBadge");

// Settings Modal DOM Elements
const settingsModal = document.getElementById("settingsModal");
const closeSettingsBtn = document.getElementById("closeSettingsBtn");
const cancelSettingsBtn = document.getElementById("cancelSettingsBtn");
const saveSettingsBtn = document.getElementById("saveSettingsBtn");
const testConnBtn = document.getElementById("testConnBtn");
const testStatusMsg = document.getElementById("testStatusMsg");
const toggleApiKeyBtn = document.getElementById("toggleApiKeyBtn");

const providerSelect = document.getElementById("providerSelect");
const baseUrlInput = document.getElementById("baseUrlInput");
const apiKeyInput = document.getElementById("apiKeyInput");

const pmModelPreset = document.getElementById("pmModelPreset");
const pmModelInput = document.getElementById("pmModelInput");
const devModelPreset = document.getElementById("devModelPreset");
const devModelInput = document.getElementById("devModelInput");
const qaModelPreset = document.getElementById("qaModelPreset");
const qaModelInput = document.getElementById("qaModelInput");
const devopsModelPreset = document.getElementById("devopsModelPreset");
const devopsModelInput = document.getElementById("devopsModelInput");

const backendUrlInput = document.getElementById("backendUrlInput");
const maxIterationsInput = document.getElementById("maxIterationsInput");
const timeoutInput = document.getElementById("timeoutInput");
const openVsCodeSettingsBtn = document.getElementById("openVsCodeSettingsBtn");

// Mention & Codebase Context DOM Elements
const contextChipsContainer = document.getElementById("contextChipsContainer");
const mentionPopup = document.getElementById("mentionPopup");
const mentionList = document.getElementById("mentionList");

// History & Network Banner DOM Elements
const historyBtn = document.getElementById("historyBtn");
const historyOverlay = document.getElementById("historyOverlay");
const historyCloseBtn = document.getElementById("historyCloseBtn");
const historyList = document.getElementById("historyList");
const historySearchInput = document.getElementById("historySearchInput");
const historyCount = document.getElementById("historyCount");

const networkBanner = document.getElementById("networkBanner");
const networkStatusTitle = document.getElementById("networkStatusTitle");
const networkStatusDesc = document.getElementById("networkStatusDesc");
const networkRetryBtn = document.getElementById("networkRetryBtn");
const networkTimer = document.getElementById("networkTimer");

const pendingFileRequests = new Map();
let selectedMentionIndex = 0;
let currentMentionMatches = [];

function getFileIcon(filename) {
  const ext = (filename || '').split('.').pop().toLowerCase();
  switch (ext) {
    case 'js': case 'jsx': case 'mjs': return '🟨';
    case 'ts': case 'tsx': return '🔷';
    case 'py': return '🐍';
    case 'html': return '🌐';
    case 'css': case 'scss': case 'less': return '🎨';
    case 'json': return '📋';
    case 'md': return '📝';
    case 'rs': return '🦀';
    case 'go': return '🐹';
    case 'java': return '☕';
    case 'c': case 'cpp': case 'h': return '⚙️';
    case 'sh': case 'bat': case 'ps1': return '💻';
    case 'png': case 'jpg': case 'svg': return '🖼️';
    default: return '📄';
  }
}

function getFileContent(filePath) {
  return new Promise((resolve) => {
    const requestId = 'req_' + Math.random().toString(36).substring(2, 9);
    pendingFileRequests.set(requestId, resolve);
    vscode.postMessage({
      command: 'getFileContent',
      filePath: filePath,
      requestId: requestId
    });
    // Fallback timeout after 3.5 seconds
    setTimeout(() => {
      if (pendingFileRequests.has(requestId)) {
        pendingFileRequests.delete(requestId);
        resolve('');
      }
    }, 3500);
  });
}

function handleMentionInput() {
  if (!chatInput || !mentionPopup) return;
  const cursor = chatInput.selectionStart;
  const textBefore = chatInput.value.slice(0, cursor);
  const match = textBefore.match(/@([a-zA-Z0-9_\-\./]*)$/);

  if (match) {
    const query = match[1].toLowerCase();
    showMentionPopup(query);
  } else {
    hideMentionPopup();
  }
}

function showMentionPopup(query) {
  if (!mentionPopup || !mentionList) return;
  if (!state.workspaceFiles || state.workspaceFiles.length === 0) {
    vscode.postMessage({ command: 'getWorkspaceFiles' });
  }

  let matches = (state.workspaceFiles || []).filter(f => f.toLowerCase().includes(query));
  if (matches.length === 0 && !query) {
    matches = (state.workspaceFiles || []).slice(0, 15);
  } else {
    matches = matches.slice(0, 15);
  }

  currentMentionMatches = matches;
  selectedMentionIndex = 0;

  if (matches.length === 0) {
    mentionList.innerHTML = `<div class="mention-item" style="opacity: 0.6; cursor: default;">No matching workspace files</div>`;
  } else {
    mentionList.innerHTML = matches.map((f, idx) => {
      const filename = f.split('/').pop().split('\\').pop();
      const icon = getFileIcon(filename);
      return `<div class="mention-item ${idx === 0 ? 'selected' : ''}" data-index="${idx}" data-file="${escapeHtml(f)}">
        <span class="mention-item-icon">${icon}</span>
        <span class="mention-item-name">${escapeHtml(filename)}</span>
        <span class="mention-item-path">${escapeHtml(f)}</span>
      </div>`;
    }).join('');

    mentionList.querySelectorAll('.mention-item').forEach(item => {
      item.addEventListener('click', () => {
        const file = item.getAttribute('data-file');
        if (file) insertMention(file);
      });
    });
  }

  mentionPopup.classList.remove('hidden');
}

function hideMentionPopup() {
  if (mentionPopup) mentionPopup.classList.add('hidden');
  currentMentionMatches = [];
  selectedMentionIndex = 0;
}

function updateMentionSelection() {
  if (!mentionList) return;
  const items = mentionList.querySelectorAll('.mention-item');
  items.forEach((item, idx) => {
    if (idx === selectedMentionIndex) {
      item.classList.add('selected');
      item.scrollIntoView({ block: 'nearest' });
    } else {
      item.classList.remove('selected');
    }
  });
}

function insertMention(filePath) {
  const cursor = chatInput.selectionStart;
  const textBefore = chatInput.value.slice(0, cursor);
  const textAfter = chatInput.value.slice(cursor);
  const atIndex = textBefore.lastIndexOf('@');

  const newText = textBefore.slice(0, atIndex) + `@${filePath} ` + textAfter;
  chatInput.value = newText;
  const newPos = atIndex + filePath.length + 2;
  chatInput.selectionStart = newPos;
  chatInput.selectionEnd = newPos;

  addContextChip(filePath);
  hideMentionPopup();
  chatInput.focus();
  if (sendBtn) sendBtn.classList.add("active");
}

function addContextChip(filePath) {
  state.selectedContextFiles.add(filePath);
  renderContextChips();
}

function renderContextChips() {
  if (!contextChipsContainer) return;
  if (state.selectedContextFiles.size === 0) {
    contextChipsContainer.classList.add('hidden');
    contextChipsContainer.innerHTML = '';
    return;
  }

  contextChipsContainer.classList.remove('hidden');
  let html = '';
  for (const f of state.selectedContextFiles) {
    const filename = f.split('/').pop().split('\\').pop();
    html += `<span class="context-chip" data-file="${escapeHtml(f)}">
      <span class="chip-file-icon">${getFileIcon(filename)}</span>
      <span class="chip-file-name" title="${escapeHtml(f)}">${escapeHtml(filename)}</span>
      <button class="chip-remove" data-file="${escapeHtml(f)}" title="Remove file from context">✕</button>
    </span>`;
  }
  contextChipsContainer.innerHTML = html;

  contextChipsContainer.querySelectorAll('.chip-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const f = btn.getAttribute('data-file');
      state.selectedContextFiles.delete(f);
      renderContextChips();
    });
  });
}

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  // Listen for messages from VS Code extension host
  window.addEventListener('message', (event) => {
    const msg = event.data;
    switch (msg.type) {
      case 'initialState':
        state.workspacePath = msg.workspacePath || '';
        break;
      case 'workspaceFiles':
        state.workspaceFiles = msg.files || [];
        break;
      case 'fileContent':
        if (msg.requestId && pendingFileRequests.has(msg.requestId)) {
          const cb = pendingFileRequests.get(msg.requestId);
          pendingFileRequests.delete(msg.requestId);
          cb(msg.content || '');
        }
        break;
      case 'folderSelected':
        state.workspacePath = msg.path || '';
        break;
      case 'trigger-new-project':
        handleNewProject();
        break;
      case 'trigger-start':
        handleStart();
        break;
      case 'trigger-open-settings':
        openSettingsModal();
        break;
    }
  });

  // Request initial state & workspace files from extension host
  vscode.postMessage({ command: 'getInitialState' });
  vscode.postMessage({ command: 'getWorkspaceFiles' });

  // Load current configuration from backend
  loadBackendConfig();

  // Event Listeners
  if (sendBtn) sendBtn.addEventListener("click", sendMessage);
  if (chatInput) {
    chatInput.addEventListener("keydown", (e) => {
      // If mention popup is active, allow arrow key navigation & selection
      if (mentionPopup && !mentionPopup.classList.contains('hidden') && currentMentionMatches.length > 0) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          selectedMentionIndex = (selectedMentionIndex + 1) % currentMentionMatches.length;
          updateMentionSelection();
          return;
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          selectedMentionIndex = (selectedMentionIndex - 1 + currentMentionMatches.length) % currentMentionMatches.length;
          updateMentionSelection();
          return;
        } else if (e.key === "Enter" || e.key === "Tab") {
          e.preventDefault();
          const targetFile = currentMentionMatches[selectedMentionIndex];
          if (targetFile) {
            insertMention(targetFile);
          }
          return;
        } else if (e.key === "Escape") {
          e.preventDefault();
          hideMentionPopup();
          return;
        }
      }

      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    chatInput.addEventListener("input", function() {
      this.style.height = "auto";
      this.style.height = Math.min(this.scrollHeight, 140) + "px";
      handleMentionInput();
      if (sendBtn) {
        if (this.value.trim().length > 0) {
          sendBtn.classList.add("active");
        } else {
          sendBtn.classList.remove("active");
        }
      }
    });
  }

  if (newProjectBtn) newProjectBtn.addEventListener("click", handleNewProject);
  if (startBtn) startBtn.addEventListener("click", handleStart);
  if (stopBtn) stopBtn.addEventListener("click", handleStop);
  if (settingsBtn) settingsBtn.addEventListener("click", openSettingsModal);

  // History Drawer Listeners
  if (historyBtn) historyBtn.addEventListener("click", openHistoryDrawer);
  if (historyCloseBtn) historyCloseBtn.addEventListener("click", closeHistoryDrawer);
  if (historyOverlay) {
    historyOverlay.addEventListener("click", (e) => {
      if (e.target === historyOverlay) closeHistoryDrawer();
    });
  }
  if (historySearchInput) {
    historySearchInput.addEventListener("input", (e) => {
      renderHistoryCards(e.target.value.trim().toLowerCase());
    });
  }

  // Network Disconnection Banner & Online Listeners
  if (networkRetryBtn) {
    networkRetryBtn.addEventListener("click", () => {
      autoResumeProject();
    });
  }

  window.addEventListener("online", () => {
    console.log("[Verno] Internet connection restored (online event)");
    if (state.isNetworkPaused || (networkBanner && !networkBanner.classList.contains("hidden"))) {
      addSystemMessage("🌐 Internet connection restored. Auto-resuming workflow...");
      autoResumeProject();
    }
  });

  window.addEventListener("offline", () => {
    console.log("[Verno] Internet connection lost (offline event)");
    if (state.isRunning) {
      showNetworkBanner("Internet Connection Lost", "Your computer is currently offline. Verno safely preserved your workflow and will auto-resume once connection returns.", 0);
      state.isNetworkPaused = true;
      if (state.eventSource) {
        state.eventSource.close();
        state.eventSource = null;
      }
    }
  });

  const composerAgentTag = document.getElementById("composerAgentTag");
  if (composerAgentTag) {
    composerAgentTag.addEventListener("click", openSettingsModal);
  }

  if (tasksDrawerHeader) {
    tasksDrawerHeader.addEventListener("click", () => {
      tasksDrawer.classList.toggle("collapsed");
    });
  }

  function bindChips() {
    document.querySelectorAll(".chip-btn").forEach(btn => {
      btn.onclick = () => {
        const strong = btn.querySelector("strong");
        const prompt = strong ? strong.textContent : btn.textContent.trim();
        chatInput.value = prompt + " ";
        chatInput.focus();
        if (sendBtn) sendBtn.classList.add("active");
      };
    });
  }
  bindChips();

  document.querySelectorAll(".agent-roster .roster-pill").forEach(pill => {
    pill.addEventListener("click", () => {
      document.querySelectorAll(".agent-roster .roster-pill").forEach(p => p.classList.remove("active"));
      pill.classList.add("active");
      state.selectedAgent = pill.getAttribute("data-agent");
    });
  });

  // Settings Modal Listeners
  setupSettingsModalListeners();
});

// Setup Settings Modal
function setupSettingsModalListeners() {
  const headerStatusText = document.getElementById("headerStatusText");
  const headerStatusDot = document.getElementById("headerStatusDot");
  const connStatusDot = document.getElementById("connStatusDot");
  const resetBaseUrlBtn = document.getElementById("resetBaseUrlBtn");

  if (closeSettingsBtn) closeSettingsBtn.addEventListener("click", closeSettingsModal);
  if (cancelSettingsBtn) cancelSettingsBtn.addEventListener("click", closeSettingsModal);
  if (saveSettingsBtn) saveSettingsBtn.addEventListener("click", saveBackendConfig);
  if (testConnBtn) testConnBtn.addEventListener("click", testConnection);

  // Tab switching
  document.querySelectorAll(".settings-tabs-nav .nav-tab").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".settings-tabs-nav .nav-tab").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".modal-body-scroll .settings-tab-panel").forEach(c => c.classList.remove("active"));
      btn.classList.add("active");
      const targetId = btn.getAttribute("data-tab");
      const targetContent = document.getElementById(targetId);
      if (targetContent) targetContent.classList.add("active");
    });
  });

  // Eye toggle for API key
  if (toggleApiKeyBtn && apiKeyInput) {
    toggleApiKeyBtn.addEventListener("click", () => {
      if (apiKeyInput.type === "password") {
        apiKeyInput.type = "text";
        toggleApiKeyBtn.textContent = "🔒";
      } else {
        apiKeyInput.type = "password";
        toggleApiKeyBtn.textContent = "👁️";
      }
    });
  }

  // Provider Cards Selection
  document.querySelectorAll(".provider-card").forEach(card => {
    card.addEventListener("click", () => {
      const providerKey = card.getAttribute("data-provider");
      selectProvider(providerKey, true);
    });
  });

  // Reset Base URL button
  if (resetBaseUrlBtn) {
    resetBaseUrlBtn.addEventListener("click", () => {
      const currentProvider = providerSelect ? providerSelect.value : "liara";
      const preset = defaultPresets[currentProvider] || (state.presets ? state.presets[currentProvider] : null);
      if (preset && preset.baseUrl && baseUrlInput) {
        baseUrlInput.value = preset.baseUrl;
      }
    });
  }

  // Model chips selection
  document.querySelectorAll(".model-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      const container = chip.closest(".model-pills-container");
      const targetInputId = container ? container.getAttribute("data-target") : null;
      if (targetInputId) {
        const inputEl = document.getElementById(targetInputId);
        if (inputEl) {
          inputEl.value = chip.getAttribute("data-model");
          container.querySelectorAll(".model-chip").forEach(c => c.classList.remove("selected"));
          chip.classList.add("selected");
        }
      }
    });
  });

  // Sync typed model text with chips
  const syncChipsToInput = (inputEl, containerSelector) => {
    if (!inputEl) return;
    inputEl.addEventListener("input", () => {
      updateChipSelection(containerSelector, inputEl.value.trim());
    });
  };

  syncChipsToInput(pmModelInput, '.model-pills-container[data-target="pmModelInput"]');
  syncChipsToInput(devModelInput, '.model-pills-container[data-target="devModelInput"]');
  syncChipsToInput(qaModelInput, '.model-pills-container[data-target="qaModelInput"]');
  syncChipsToInput(devopsModelInput, '.model-pills-container[data-target="devopsModelInput"]');

  // Close on backdrop click
  if (settingsModal) {
    settingsModal.addEventListener("click", (e) => {
      if (e.target === settingsModal) {
        closeSettingsModal();
      }
    });
  }

  // Keyboard navigation: Escape to close, Ctrl+S to save
  document.addEventListener("keydown", (e) => {
    if (settingsModal && !settingsModal.classList.contains("hidden")) {
      if (e.key === "Escape") {
        closeSettingsModal();
      } else if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        saveBackendConfig();
      }
    }
  });

  if (openVsCodeSettingsBtn) {
    openVsCodeSettingsBtn.addEventListener("click", () => {
      vscode.postMessage({ command: 'openVsCodeSettings' });
      closeSettingsModal();
    });
  }
}

function updateChipSelection(containerSelector, modelValue) {
  const container = document.querySelector(containerSelector);
  if (container) {
    container.querySelectorAll(".model-chip").forEach(chip => {
      if (chip.getAttribute("data-model") === modelValue) {
        chip.classList.add("selected");
      } else {
        chip.classList.remove("selected");
      }
    });
  }
}

function selectProvider(providerKey, updateInputs = false) {
  if (providerSelect) providerSelect.value = providerKey;

  // Highlight card
  document.querySelectorAll(".provider-card").forEach(c => {
    if (c.getAttribute("data-provider") === providerKey) {
      c.classList.add("selected");
    } else {
      c.classList.remove("selected");
    }
  });

  // Update header text
  const headerStatusText = document.getElementById("headerStatusText");
  if (headerStatusText) {
    const formatted = providerKey.charAt(0).toUpperCase() + providerKey.slice(1);
    headerStatusText.textContent = `${formatted} AI`;
  }

  if (updateInputs) {
    const preset = defaultPresets[providerKey] || (state.presets ? state.presets[providerKey] : null);
    if (preset) {
      if (baseUrlInput && preset.baseUrl) baseUrlInput.value = preset.baseUrl;
      if (preset.models) {
        if (pmModelInput && preset.models.pm) {
          pmModelInput.value = preset.models.pm;
          updateChipSelection('.model-pills-container[data-target="pmModelInput"]', preset.models.pm);
        }
        if (devModelInput && preset.models.dev) {
          devModelInput.value = preset.models.dev;
          updateChipSelection('.model-pills-container[data-target="devModelInput"]', preset.models.dev);
        }
        if (qaModelInput && preset.models.qa) {
          qaModelInput.value = preset.models.qa;
          updateChipSelection('.model-pills-container[data-target="qaModelInput"]', preset.models.qa);
        }
        if (devopsModelInput && preset.models.devops) {
          devopsModelInput.value = preset.models.devops;
          updateChipSelection('.model-pills-container[data-target="devopsModelInput"]', preset.models.devops);
        }
      }
    }
  }
}

function openSettingsModal() {
  vscode.postMessage({ command: 'openSettings' });
}

function closeSettingsModal() {
  if (settingsModal) {
    settingsModal.classList.add("hidden");
    const connStatusDot = document.getElementById("connStatusDot");
    if (testStatusMsg) {
      testStatusMsg.textContent = "Ready to test connection";
      testStatusMsg.className = "test-status";
    }
    if (connStatusDot) {
      connStatusDot.className = "conn-status-dot";
    }
  }
}

// Populate Settings Form with current state values
function populateSettingsForm() {
  const c = state.config;
  const prov = c.AI_PROVIDER || "liara";
  selectProvider(prov, false);

  if (baseUrlInput) baseUrlInput.value = c.AI_PROVIDER_BASE_URL || "";
  if (apiKeyInput) apiKeyInput.value = c.AI_PROVIDER_API_KEY || "";

  if (pmModelInput) {
    pmModelInput.value = c.PROJECT_MANAGER_MODEL || "anthropic/claude-3.5-sonnet";
    updateChipSelection('.model-pills-container[data-target="pmModelInput"]', pmModelInput.value);
  }
  if (devModelInput) {
    devModelInput.value = c.DEVELOPER_MODEL || "qwen/qwen3-coder";
    updateChipSelection('.model-pills-container[data-target="devModelInput"]', devModelInput.value);
  }
  if (qaModelInput) {
    qaModelInput.value = c.QA_TESTER_MODEL || "anthropic/claude-3.5-sonnet";
    updateChipSelection('.model-pills-container[data-target="qaModelInput"]', qaModelInput.value);
  }
  if (devopsModelInput) {
    devopsModelInput.value = c.DEVOPS_MODEL || "anthropic/claude-3.5-sonnet";
    updateChipSelection('.model-pills-container[data-target="devopsModelInput"]', devopsModelInput.value);
  }

  if (backendUrlInput) backendUrlInput.value = state.apiBaseUrl;
  if (maxIterationsInput) maxIterationsInput.value = c.MAX_ITERATIONS || 20;
  if (timeoutInput) timeoutInput.value = c.TIMEOUT || 120;
}

// Load current configuration from backend
async function loadBackendConfig() {
  try {
    const res = await fetch(`${state.apiBaseUrl}/api/config`);
    if (!res.ok) return;
    const data = await res.json();
    if (data.success && data.config) {
      state.config = { ...state.config, ...data.config };
      if (data.config.PRESETS) {
        state.presets = data.config.PRESETS;
      }
      // Update header status text
      const headerStatusText = document.getElementById("headerStatusText");
      if (headerStatusText && state.config.AI_PROVIDER) {
        const prov = state.config.AI_PROVIDER;
        headerStatusText.textContent = `${prov.charAt(0).toUpperCase() + prov.slice(1)} AI`;
      }
    }
  } catch (e) {
    console.log("Could not load backend config yet (backend may still be starting):", e);
  }
}

// Save configuration to backend
async function saveBackendConfig() {
  if (!saveSettingsBtn) return;
  const originalHtml = saveSettingsBtn.innerHTML;
  saveSettingsBtn.innerHTML = "<span>⏳ Saving...</span>";
  saveSettingsBtn.disabled = true;

  const payload = {
    AI_PROVIDER: providerSelect ? providerSelect.value : state.config.AI_PROVIDER,
    AI_PROVIDER_BASE_URL: baseUrlInput ? baseUrlInput.value.trim() : state.config.AI_PROVIDER_BASE_URL,
    AI_PROVIDER_API_KEY: apiKeyInput ? apiKeyInput.value.trim() : state.config.AI_PROVIDER_API_KEY,
    PROJECT_MANAGER_MODEL: pmModelInput ? pmModelInput.value.trim() : state.config.PROJECT_MANAGER_MODEL,
    DEVELOPER_MODEL: devModelInput ? devModelInput.value.trim() : state.config.DEVELOPER_MODEL,
    QA_TESTER_MODEL: qaModelInput ? qaModelInput.value.trim() : state.config.QA_TESTER_MODEL,
    DEVOPS_MODEL: devopsModelInput ? devopsModelInput.value.trim() : state.config.DEVOPS_MODEL,
    MAX_ITERATIONS: maxIterationsInput ? parseInt(maxIterationsInput.value) : 20,
    TIMEOUT: timeoutInput ? parseInt(timeoutInput.value) : 120
  };

  if (backendUrlInput && backendUrlInput.value.trim()) {
    state.apiBaseUrl = backendUrlInput.value.trim();
  }

  try {
    const res = await fetch(`${state.apiBaseUrl}/api/config`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      state.config = { ...state.config, ...payload };
      vscode.postMessage({
        command: 'saveVsCodeSettings',
        settings: payload
      });
      vscode.postMessage({
        command: 'showNotification',
        level: 'info',
        text: 'Verno AI Settings and Per-Agent Models saved successfully!'
      });
      addSystemMessage(`AI Configuration updated: Provider <strong>${escapeHtml(payload.AI_PROVIDER)}</strong>, PM: <code>${escapeHtml(payload.PROJECT_MANAGER_MODEL)}</code>, Dev: <code>${escapeHtml(payload.DEVELOPER_MODEL)}</code>.`);
      closeSettingsModal();
    } else {
      throw new Error(data.detail || "Failed to update configuration");
    }
  } catch (err) {
    vscode.postMessage({
      command: 'showNotification',
      level: 'error',
      text: `Failed to save settings: ${err.message}`
    });
  } finally {
    saveSettingsBtn.innerHTML = originalHtml;
    saveSettingsBtn.disabled = false;
  }
}

// Test AI provider connection
async function testConnection() {
  if (!testConnBtn || !testStatusMsg) return;
  const originalHtml = testConnBtn.innerHTML;
  const connStatusDot = document.getElementById("connStatusDot");
  const headerStatusDot = document.getElementById("headerStatusDot");
  const headerStatusText = document.getElementById("headerStatusText");

  testConnBtn.innerHTML = '<span class="test-sparkle">⏳</span><span class="test-label">Testing...</span>';
  testConnBtn.disabled = true;
  testStatusMsg.textContent = "Connecting to provider API...";
  testStatusMsg.className = "test-status";
  if (connStatusDot) connStatusDot.className = "conn-status-dot testing";

  const key = apiKeyInput ? apiKeyInput.value.trim() : state.config.AI_PROVIDER_API_KEY;
  const url = baseUrlInput ? baseUrlInput.value.trim() : state.config.AI_PROVIDER_BASE_URL;
  const model = pmModelInput ? pmModelInput.value.trim() : state.config.PROJECT_MANAGER_MODEL;

  const startTime = Date.now();
  try {
    const res = await fetch(`${state.apiBaseUrl}/api/config/test`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: key,
        base_url: url,
        model: model
      })
    });
    const data = await res.json();
    const latency = Date.now() - startTime;
    if (data.success) {
      testStatusMsg.textContent = `Connected! (${latency}ms • ${model})`;
      testStatusMsg.className = "test-status success";
      if (connStatusDot) connStatusDot.className = "conn-status-dot success";
      if (headerStatusDot) headerStatusDot.className = "status-pulse-dot";
      if (headerStatusText) {
        const prov = providerSelect ? providerSelect.value : "AI";
        headerStatusText.textContent = `${prov.toUpperCase()} • Ready (${latency}ms)`;
      }
    } else {
      testStatusMsg.textContent = `${data.message || "Failed"}`;
      testStatusMsg.className = "test-status error";
      if (connStatusDot) connStatusDot.className = "conn-status-dot error";
      if (headerStatusDot) headerStatusDot.className = "status-pulse-dot error";
    }
  } catch (err) {
    testStatusMsg.textContent = `Connection error: ${err.message}`;
    testStatusMsg.className = "test-status error";
    if (connStatusDot) connStatusDot.className = "conn-status-dot error";
    if (headerStatusDot) headerStatusDot.className = "status-pulse-dot error";
  } finally {
    testConnBtn.innerHTML = originalHtml;
    testConnBtn.disabled = false;
  }
}

// Plan approval helpers
function isPlanApproved(input) {
  if (!input) return false;
  const clean = input.trim().toLowerCase().replace(/[!.؟?,]/g, "");
  const affirmatives = [
    "yes", "yep", "yeah", "y", "ok", "okay", "sure", "sounds good", 
    "looks good", "look good", "approved", "approve", "i approve", 
    "proceed", "continue", "go ahead", "start", "lets go", "let's go",
    "great", "perfect", "good", "fine", "done", "do it",
    "بله", "اره", "آره", "خوبه", "اوکی", "تایید", "تاییده", "تایید میکنم",
    "ادامه بده", "شروع کن", "بزن بریم", "حله", "حلّه", "عالیه", "موافقم"
  ];
  if (affirmatives.includes(clean)) return true;
  if (clean.length < 35 && affirmatives.some(a => clean.startsWith(a) || clean.endsWith(a))) {
    if (!/\b(no|not|dont|don't|neither|never|نه|خیر|حذف|بدون)\b/i.test(clean)) {
      return true;
    }
  }
  return false;
}

function generateDefaultProjectName(prompt) {
  if (!prompt) return "hello-world-app";
  let clean = prompt.toLowerCase()
    .replace(/^(make|create|build|develop|generate|a|an|the|in|with|please)\s+/gi, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .split(/\s+/)
    .slice(0, 4)
    .join("-");
  return clean ? `${clean}-app` : "hello-world-app";
}

window.approveCurrentPlan = function() {
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  addUserMessage("✅ I approve this plan. Proceed to build!", time);
  handlePlanApproval(time);
};

window.refineCurrentPlan = function() {
  if (chatInput) {
    chatInput.focus();
    chatInput.placeholder = "Describe changes (e.g. remove phase 6, add dark mode)...";
  }
};

function handlePlanApproval(time) {
  state.awaitingPlanApproval = false;
  const defaultName = generateDefaultProjectName(state.extendedPrompt);
  state.suggestedProjectName = defaultName;
  state.awaitingProjectName = true;
  addAgentMessage("pm", `Great! What would you like to name this project folder? (Or press <strong>Enter</strong> to use <code>${escapeHtml(defaultName)}</code>)`, time);
  if (chatInput) chatInput.placeholder = `Project folder name (default: ${defaultName})...`;
}

// Chat & Workflow Functions
async function sendMessage() {
  const text = chatInput.value.trim();
  if (!text) return;

  // Collect all @mentioned files or active context chips
  const filesToFetch = new Set(state.selectedContextFiles);
  const mentionRegex = /@([a-zA-Z0-9_\-\./]+)/g;
  let match;
  while ((match = mentionRegex.exec(text)) !== null) {
    const rawPath = match[1];
    const found = (state.workspaceFiles || []).find(wf => 
      wf === rawPath || wf.endsWith('/' + rawPath) || wf.endsWith('\\' + rawPath)
    );
    if (found) {
      filesToFetch.add(found);
    } else {
      filesToFetch.add(rawPath);
    }
  }

  // Fetch contents in parallel
  const filesContext = {};
  if (filesToFetch.size > 0) {
    const fetches = Array.from(filesToFetch).map(async (fp) => {
      const content = await getFileContent(fp);
      if (content) {
        filesContext[fp] = content;
      }
    });
    await Promise.all(fetches);
  }

  state.activeFilesContext = filesContext;

  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const fileKeys = Object.keys(filesContext);
  let badgeHtml = '';
  if (fileKeys.length > 0) {
    const shortNames = fileKeys.map(k => k.split('/').pop().split('\\').pop()).join(', ');
    badgeHtml = `<div class="msg-context-badge">📎 Attached Context: ${escapeHtml(shortNames)}</div>`;
  }
  addUserMessage(text + badgeHtml, time);

  chatInput.value = "";
  chatInput.style.height = "auto";
  state.selectedContextFiles.clear();
  renderContextChips();
  hideMentionPopup();

  // 1. Check plan approval or refinement
  if (state.awaitingPlanApproval) {
    if (isPlanApproved(text)) {
      handlePlanApproval(time);
      return;
    } else {
      // User provided feedback or requested changes to the plan (e.g. "no phase 6 no", "use react", etc.)
      showTyping("pm");
      const refinementPrompt = `Original Project Goal:
${state.extendedPrompt}

Previous Plan:
${state.currentPlan}

User's Feedback / Requested Modifications:
"${text}"

Please update the project plan according to the user's feedback. Apply the requested changes directly, keep the plan clean and actionable in markdown, and ask for final approval.`;

      try {
        const res = await fetch(`${state.apiBaseUrl}/api/projects/plan`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: refinementPrompt,
            pm_provider: state.config.PROJECT_MANAGER_PROVIDER,
            pm_model: state.config.PROJECT_MANAGER_MODEL,
            api_key: state.config.AI_PROVIDER_API_KEY,
            base_url: state.config.AI_PROVIDER_BASE_URL,
            files_context: filesContext
          })
        });
        const data = await res.json();
        removeTyping("pm");
        if (data.success) {
          state.currentPlan = data.plan;
          state.extendedPrompt += `\nUser Modification: ${text}`;
          addAgentMessage("pm", data.plan, time, true);
          state.awaitingPlanApproval = true;
        } else {
          throw new Error(data.detail || "Failed to update plan");
        }
      } catch (err) {
        removeTyping("pm");
        vscode.postMessage({ command: 'showNotification', level: 'error', text: `Verno Plan Update Error: ${err.message}` });
        addSystemMessage(`Error updating plan: ${err.message}. Please check your API settings in <strong>⚙️ Config</strong>.`);
      }
      return;
    }
  }

  // 2. Check project name
  if (state.awaitingProjectName) {
    let chosenName = text.trim();
    if (!chosenName || chosenName.toLowerCase() === "ok" || chosenName.toLowerCase() === "yes" || chosenName.toLowerCase() === "default") {
      chosenName = state.suggestedProjectName || "hello-world-app";
    }
    chosenName = chosenName.replace(/[<>:"/\\|?*]/g, "").trim() || "hello-world-app";
    state.projectName = chosenName;
    if (currentProjectName) currentProjectName.textContent = chosenName;
    if (startBtn) startBtn.disabled = false;
    addSystemMessage(`Project folder <strong>${escapeHtml(chosenName)}</strong> registered. Click <strong>▶ Start</strong> to execute autonomous development.`);
    state.awaitingProjectName = false;
    if (chatInput) chatInput.placeholder = "Ask Verno AI (use @ to add file context, / for commands)...";
    return;
  }

  // 3. Initial plan request with configured PM Model and attached files context
  if (!state.projectId) {
    showTyping("pm");
    try {
      const res = await fetch(`${state.apiBaseUrl}/api/projects/plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          pm_provider: state.config.PROJECT_MANAGER_PROVIDER,
          pm_model: state.config.PROJECT_MANAGER_MODEL,
          api_key: state.config.AI_PROVIDER_API_KEY,
          base_url: state.config.AI_PROVIDER_BASE_URL,
          files_context: filesContext
        })
      });
      const data = await res.json();
      removeTyping("pm");
      if (data.success) {
        state.extendedPrompt = text;
        state.currentPlan = data.plan;
        addAgentMessage("pm", data.plan, time, true);
        state.awaitingPlanApproval = true;
      } else {
        throw new Error(data.detail || "Failed to generate plan");
      }
    } catch (err) {
      removeTyping("pm");
      vscode.postMessage({ command: 'showNotification', level: 'error', text: `Verno Plan Error: ${err.message}` });
      addSystemMessage(`Error generating plan: ${err.message}. Please check your API settings in <strong>⚙️ Config</strong>.`);
    }
    return;
  }

  // Project active: send message to current project
  try {
    await fetch(`${state.apiBaseUrl}/api/projects/${state.projectId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text })
    });
  } catch (err) {
    console.error("Message send error:", err);
  }
}

async function handleStart() {
  if (!state.projectName) {
    vscode.postMessage({ command: 'showNotification', level: 'warning', text: 'Please describe requirements and name your project first.' });
    return;
  }

  // If project is not created yet on backend, create it:
  if (!state.projectId) {
    const projectDir = state.workspacePath || "d:/Projects/Verno/workspace";

    try {
      const res = await fetch(`${state.apiBaseUrl}/api/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_name: state.projectName,
          requirement: state.extendedPrompt,
          project_directory: projectDir,
          api_key: state.config.AI_PROVIDER_API_KEY,
          base_url: state.config.AI_PROVIDER_BASE_URL,
          pm_provider: state.config.PROJECT_MANAGER_PROVIDER,
          pm_model: state.config.PROJECT_MANAGER_MODEL,
          dev_provider: state.config.DEVELOPER_PROVIDER,
          dev_model: state.config.DEVELOPER_MODEL,
          qa_provider: state.config.QA_TESTER_PROVIDER,
          qa_model: state.config.QA_TESTER_MODEL,
          devops_provider: state.config.DEVOPS_PROVIDER,
          devops_model: state.config.DEVOPS_MODEL,
          files_context: state.activeFilesContext || {}
        })
      });
      const data = await res.json();
      if (data.success) {
        state.projectId = data.project_id;
      } else {
        throw new Error(data.detail || "Failed to create project");
      }
    } catch (err) {
      vscode.postMessage({ command: 'showNotification', level: 'error', text: `Failed to create project: ${err.message}` });
      return;
    }
  } else {
    // Resume existing or interrupted project
    try {
      await fetch(`${state.apiBaseUrl}/api/projects/${state.projectId}/resume`, { method: "POST" });
    } catch (e) {
      console.warn("Resume ping failed, continuing SSE stream:", e);
    }
  }

  startProjectSSE(state.projectId);
}

function startProjectSSE(projectId) {
  if (state.eventSource) {
    state.eventSource.close();
    state.eventSource = null;
  }

  if (state.reconnectTimer) {
    clearInterval(state.reconnectTimer);
    state.reconnectTimer = null;
  }

  hideNetworkBanner();
  state.isNetworkPaused = false;
  state.isRunning = true;
  if (startBtn) startBtn.disabled = true;
  if (stopBtn) stopBtn.disabled = false;
  if (currentPhasePill) currentPhasePill.textContent = "RUNNING";

  const eventSource = new EventSource(`${state.apiBaseUrl}/api/projects/${projectId}/start`);
  state.eventSource = eventSource;

  let typingTimeout = null;

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);

      switch (data.type) {
        case "start":
          hideNetworkBanner();
          addSystemMessage(data.message);
          break;

        case "network_warning":
          console.warn("[Verno SSE] Network issue reported:", data.message);
          showNetworkBanner("Network Disruption", data.message, 4);
          break;

        case "network_paused":
          console.warn("[Verno SSE] Network paused reported:", data.message);
          clearTimeout(typingTimeout);
          removeAllTyping();
          eventSource.close();
          state.eventSource = null;
          state.isNetworkPaused = true;
          showNetworkBanner("Connection Interrupted", data.message, 0);
          break;

        case "progress":
          hideNetworkBanner();
          state.isNetworkPaused = false;
          if (data.agent && data.message) {
            clearTimeout(typingTimeout);
            removeAllTyping();
            const agentKey = roleMap[data.agent] || data.agent;
            addAgentMessage(agentKey, data.message, new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
            highlightAgent(agentKey);

            if (data.next_agent && !data.is_complete) {
              const nextKey = roleMap[data.next_agent] || data.next_agent;
              typingTimeout = setTimeout(() => {
                if (state.isRunning) showTyping(nextKey);
              }, 650);
            }
          }

          // Direct VS Code workspace integration: write files and open in editor
          if (data.file_operations && data.file_operations.length > 0) {
            for (const fileOp of data.file_operations) {
              vscode.postMessage({
                command: 'fileOperation',
                operation: fileOp.operation,
                filePath: fileOp.path,
                content: fileOp.content
              });
            }
          }

          if (data.tasks) {
            renderTasks(data.tasks);
          }

          if (data.current_phase) {
            if (currentPhasePill) currentPhasePill.textContent = data.current_phase.toUpperCase();
          }

          // Calculate progress
          let percent = 20;
          if (data.tasks && data.tasks.length > 0) {
            const completed = data.tasks.filter(t => t.status === 'completed').length;
            percent = Math.min(95, 20 + Math.round((completed / data.tasks.length) * 75));
          }
          updateProgress(percent);

          if (data.is_complete) {
            clearTimeout(typingTimeout);
            removeAllTyping();
            updateProgress(100);
            if (currentPhasePill) currentPhasePill.textContent = "COMPLETE";
            vscode.postMessage({ command: 'showNotification', level: 'info', text: '🎉 Verno project completed successfully!' });
            eventSource.close();
            state.eventSource = null;
            state.isRunning = false;
            if (startBtn) startBtn.disabled = true;
            if (stopBtn) stopBtn.disabled = true;
          }
          break;

        case "complete":
          clearTimeout(typingTimeout);
          removeAllTyping();
          hideNetworkBanner();
          updateProgress(100);
          if (currentPhasePill) currentPhasePill.textContent = "COMPLETE";
          eventSource.close();
          state.eventSource = null;
          state.isRunning = false;
          if (startBtn) startBtn.disabled = true;
          if (stopBtn) stopBtn.disabled = true;
          break;

        case "error":
          clearTimeout(typingTimeout);
          removeAllTyping();
          hideNetworkBanner();
          vscode.postMessage({ command: 'showNotification', level: 'error', text: `Verno Error: ${data.message}` });
          eventSource.close();
          state.eventSource = null;
          state.isRunning = false;
          if (startBtn) startBtn.disabled = false;
          if (stopBtn) stopBtn.disabled = true;
          break;
      }
    } catch (e) {
      console.error("Error processing SSE message:", e);
    }
  };

  eventSource.onerror = (err) => {
    console.error("SSE stream error:", err);
    clearTimeout(typingTimeout);
    removeAllTyping();
    eventSource.close();
    state.eventSource = null;

    if (state.isRunning) {
      if (!navigator.onLine) {
        state.isNetworkPaused = true;
        showNetworkBanner("You are Offline", "Internet connection lost. Verno will auto-resume once connection returns.", 0);
      } else {
        // Disconnection or server restart
        showNetworkBanner("Connection Lost", "Connection dropped. Verno will auto-reconnect in 4 seconds...", 4);
      }
    } else {
      if (startBtn) startBtn.disabled = false;
      if (stopBtn) stopBtn.disabled = true;
    }
  };
}

function showNetworkBanner(title, desc, countdownSeconds = 0) {
  if (!networkBanner) return;
  if (networkStatusTitle) networkStatusTitle.textContent = title;
  if (networkStatusDesc) networkStatusDesc.textContent = desc;

  networkBanner.classList.remove("hidden");

  if (state.reconnectTimer) {
    clearInterval(state.reconnectTimer);
    state.reconnectTimer = null;
  }

  if (countdownSeconds > 0) {
    state.reconnectCountdown = countdownSeconds;
    if (networkTimer) {
      networkTimer.style.display = "inline-block";
      networkTimer.textContent = `Auto-retry in ${state.reconnectCountdown}s`;
    }

    state.reconnectTimer = setInterval(() => {
      state.reconnectCountdown--;
      if (state.reconnectCountdown <= 0) {
        clearInterval(state.reconnectTimer);
        state.reconnectTimer = null;
        if (networkTimer) networkTimer.textContent = "Retrying...";
        autoResumeProject();
      } else {
        if (networkTimer) networkTimer.textContent = `Auto-retry in ${state.reconnectCountdown}s`;
      }
    }, 1000);
  } else {
    if (networkTimer) {
      networkTimer.style.display = "none";
    }
  }
}

function hideNetworkBanner() {
  if (networkBanner) networkBanner.classList.add("hidden");
  if (state.reconnectTimer) {
    clearInterval(state.reconnectTimer);
    state.reconnectTimer = null;
  }
}

function autoResumeProject() {
  if (!state.projectId) return;
  if (networkStatusTitle) networkStatusTitle.textContent = "Reconnecting...";
  if (networkStatusDesc) networkStatusDesc.textContent = "Restoring workflow session...";
  if (networkTimer) networkTimer.textContent = "Connecting...";
  startProjectSSE(state.projectId);
}

function handleStop() {
  removeAllTyping();
  hideNetworkBanner();
  state.isRunning = false;
  state.isNetworkPaused = false;
  if (state.eventSource) {
    state.eventSource.close();
    state.eventSource = null;
  }
  if (state.reconnectTimer) {
    clearInterval(state.reconnectTimer);
    state.reconnectTimer = null;
  }
  if (startBtn) startBtn.disabled = false;
  if (stopBtn) stopBtn.disabled = true;
  if (currentPhasePill) currentPhasePill.textContent = "STOPPED";
}

// Chat History & Session Management
function openHistoryDrawer() {
  if (historyOverlay) {
    historyOverlay.classList.remove("hidden");
    loadProjectsHistory();
  }
}

function closeHistoryDrawer() {
  if (historyOverlay) {
    historyOverlay.classList.add("hidden");
  }
}

async function loadProjectsHistory() {
  if (!historyList) return;
  historyList.innerHTML = `<div class="history-empty">Loading saved sessions...</div>`;

  try {
    const res = await fetch(`${state.apiBaseUrl}/api/projects`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    state.savedProjects = data.projects || [];

    if (historyCount) {
      historyCount.textContent = `${state.savedProjects.length} saved session${state.savedProjects.length === 1 ? '' : 's'}`;
    }

    renderHistoryCards(historySearchInput ? historySearchInput.value.trim().toLowerCase() : "");
  } catch (err) {
    console.error("Error loading projects history:", err);
    if (historyList) {
      historyList.innerHTML = `<div class="history-empty">Failed to load history: ${escapeHtml(err.message)}</div>`;
    }
  }
}

function renderHistoryCards(query = "") {
  if (!historyList) return;
  let list = state.savedProjects || [];

  if (query) {
    list = list.filter(p => 
      (p.project_name || "").toLowerCase().includes(query) ||
      (p.requirement || "").toLowerCase().includes(query) ||
      (p.last_message || "").toLowerCase().includes(query)
    );
  }

  if (list.length === 0) {
    historyList.innerHTML = `<div class="history-empty">${query ? "No chats match your search query." : "No saved chats yet. Start a new project to create one!"}</div>`;
    return;
  }

  historyList.innerHTML = list.map(p => {
    const isActive = p.project_id === state.projectId;
    const isDone = p.is_complete;
    const badgeClass = isDone ? "completed" : (p.current_phase === "development" ? "in_progress" : "running");
    const badgeLabel = isDone ? "COMPLETED" : (p.current_phase || "ACTIVE").toUpperCase();

    let formattedDate = "";
    try {
      const d = new Date(p.updated_at || p.created_at);
      formattedDate = d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + " " + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      formattedDate = "Recently";
    }

    const snippet = p.last_message || p.requirement || "No preview available";

    return `
      <div class="history-card ${isActive ? 'active-session' : ''}" data-id="${p.project_id}">
        <div class="history-card-top">
          <span class="history-card-title" title="${escapeHtml(p.project_name)}">${escapeHtml(p.project_name)}</span>
          <span class="history-card-badge ${badgeClass}">${badgeLabel}</span>
        </div>
        <div class="history-card-snippet">${escapeHtml(snippet)}</div>
        <div class="history-card-footer">
          <div class="history-card-meta">
            <span>📅 ${formattedDate}</span>
            <span>💬 ${p.message_count || 0} msgs</span>
            <span>📋 ${p.completed_tasks || 0}/${p.task_count || 0} tasks</span>
          </div>
          <button class="history-delete-btn" data-delete-id="${p.project_id}" title="Delete session">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </div>
    `;
  }).join('');

  // Attach card click handlers
  historyList.querySelectorAll(".history-card").forEach(card => {
    card.addEventListener("click", () => {
      const id = card.getAttribute("data-id");
      if (id) loadProjectSession(id);
    });
  });

  // Attach delete handlers
  historyList.querySelectorAll(".history-delete-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const id = btn.getAttribute("data-delete-id");
      if (id) deleteProjectSession(id);
    });
  });
}

async function loadProjectSession(projectId) {
  closeHistoryDrawer();

  if (state.isRunning) {
    handleStop();
  }

  try {
    const res = await fetch(`${state.apiBaseUrl}/api/projects/${projectId}`);
    if (!res.ok) throw new Error("Could not find project");
    const data = await res.json();
    const proj = data.project;

    state.projectId = proj.project_id;
    state.projectName = proj.project_name;
    state.extendedPrompt = proj.requirement;
    state.awaitingPlanApproval = false;
    state.awaitingProjectName = false;

    if (currentProjectName) currentProjectName.textContent = proj.project_name;
    if (currentPhasePill) currentPhasePill.textContent = (proj.is_complete ? "COMPLETE" : proj.current_phase || "IDLE").toUpperCase();

    // Render tasks
    renderTasks(proj.tasks || []);

    // Progress
    let percent = 0;
    if (proj.is_complete) {
      percent = 100;
    } else if (proj.tasks && proj.tasks.length > 0) {
      const completed = proj.tasks.filter(t => t.status === 'completed').length;
      percent = Math.min(95, 20 + Math.round((completed / proj.tasks.length) * 75));
    }
    updateProgress(percent);

    // Reconstruct chat history
    if (chatContainer) {
      chatContainer.innerHTML = "";
    }

    if (proj.messages && proj.messages.length > 0) {
      for (const msg of proj.messages) {
        let t = "";
        try {
          t = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch {
          t = "Loaded";
        }

        if (msg.role === "user") {
          addUserMessage(msg.content, t);
        } else {
          const agentKey = roleMap[msg.role] || msg.role;
          addAgentMessage(agentKey, msg.content, t, false);
        }
      }
    } else {
      addSystemMessage(`Loaded project <strong>${escapeHtml(proj.project_name)}</strong>.`);
    }

    if (proj.is_complete) {
      if (startBtn) startBtn.disabled = true;
      if (stopBtn) stopBtn.disabled = true;
      addSystemMessage(`🎉 This project workflow completed previously.`);
    } else {
      if (startBtn) startBtn.disabled = false;
      if (stopBtn) stopBtn.disabled = true;
      addSystemMessage(`Restored project <strong>${escapeHtml(proj.project_name)}</strong> (Phase: <code>${proj.current_phase}</code>, Iteration ${proj.iterations}). Click <strong>▶ Start</strong> to resume!`);
    }

  } catch (err) {
    vscode.postMessage({ command: 'showNotification', level: 'error', text: `Failed to load project: ${err.message}` });
  }
}

async function deleteProjectSession(projectId) {
  try {
    const res = await fetch(`${state.apiBaseUrl}/api/projects/${projectId}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) {
      if (state.projectId === projectId) {
        handleNewProject();
      }
      loadProjectsHistory();
      vscode.postMessage({ command: 'showNotification', level: 'info', text: 'Chat session deleted successfully.' });
    }
  } catch (err) {
    vscode.postMessage({ command: 'showNotification', level: 'error', text: `Failed to delete project: ${err.message}` });
  }
}

function handleNewProject() {
  if (state.isRunning) {
    handleStop();
  }
  state.projectId = "";
  state.projectName = "";
  state.extendedPrompt = "";
  state.awaitingPlanApproval = false;
  state.awaitingProjectName = false;
  state.isRunning = false;
  state.isNetworkPaused = false;
  hideNetworkBanner();

  if (currentProjectName) currentProjectName.textContent = "No active project";
  if (currentPhasePill) currentPhasePill.textContent = "IDLE";
  if (startBtn) startBtn.disabled = true;
  if (stopBtn) stopBtn.disabled = true;

  updateProgress(0);
  renderTasks([]);

  if (chatContainer) {
    chatContainer.innerHTML = `
      <div class="chat-hero" id="chatHero">
        <div class="hero-emblem">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="url(#h-g1)"/>
            <path d="M2 17L12 22L22 17L12 12L2 17Z" fill="url(#h-g2)"/>
            <path d="M2 12L12 17L22 12L12 7L2 12Z" fill="url(#h-g3)"/>
            <defs>
              <linearGradient id="h-g1" x1="2" y1="2" x2="22" y2="12" gradientUnits="userSpaceOnUse"><stop stop-color="#c084fc"/><stop offset="1" stop-color="#818cf8"/></linearGradient>
              <linearGradient id="h-g2" x1="2" y1="12" x2="22" y2="22" gradientUnits="userSpaceOnUse"><stop stop-color="#8b5cf6"/><stop offset="1" stop-color="#6366f1"/></linearGradient>
              <linearGradient id="h-g3" x1="2" y1="12" x2="12" y2="7" gradientUnits="userSpaceOnUse"><stop stop-color="#a855f7"/><stop offset="1" stop-color="#38bdf8"/></linearGradient>
            </defs>
          </svg>
        </div>
        <h2 class="hero-title">How can Verno help you build today?</h2>
        <p class="hero-subtitle">Multi-agent software engineering powered by Project Manager, Developer, QA & DevOps.</p>
        
        <div class="hero-prompt-grid">
          <button class="hero-card chip-btn">
            <span class="hero-card-icon">⚡</span>
            <div class="hero-card-info">
              <strong>Create a Feature</strong>
              <span>Scaffold endpoints, UI, or workflows</span>
            </div>
          </button>
          <button class="hero-card chip-btn">
            <span class="hero-card-icon">🐛</span>
            <div class="hero-card-info">
              <strong>Find & Fix Bugs</strong>
              <span>Analyze workspace issues & diagnostics</span>
            </div>
          </button>
          <button class="hero-card chip-btn">
            <span class="hero-card-icon">📝</span>
            <div class="hero-card-info">
              <strong>Review & Refactor</strong>
              <span>Audit architecture, security & types</span>
            </div>
          </button>
          <button class="hero-card chip-btn">
            <span class="hero-card-icon">🧪</span>
            <div class="hero-card-info">
              <strong>Generate Test Suite</strong>
              <span>Add unit & integration test coverage</span>
            </div>
          </button>
        </div>
      </div>
    `;
    bindChips();
  }
}

function updateProgress(percent) {
  if (progressFill) progressFill.style.width = `${percent}%`;
  if (progressPercent) progressPercent.textContent = `${percent}%`;
}

function renderTasks(tasks) {
  if (!tasksList) return;
  if (!tasks || tasks.length === 0) {
    if (tasksCountBadge) tasksCountBadge.textContent = "0";
    tasksList.innerHTML = `<div class="tasks-empty">No active sprint tasks.</div>`;
    return;
  }

  if (tasksCountBadge) tasksCountBadge.textContent = tasks.length;
  if (tasksDrawer && tasksDrawer.classList.contains("collapsed")) {
    tasksDrawer.classList.remove("collapsed");
  }

  tasksList.innerHTML = tasks.map((t, idx) => {
    const status = (t.status || 'pending').toLowerCase().replace(' ', '_');
    const label = (t.status || 'PENDING').toUpperCase();
    const title = t.title || t.description || `Task #${idx + 1}`;
    return `
      <div class="task-item">
        <span class="task-item-title" title="${escapeHtml(title)}">${escapeHtml(title)}</span>
        <span class="task-tag ${status}">${label}</span>
      </div>
    `;
  }).join('');
}

function highlightAgent(agentKey) {
  document.querySelectorAll(".agent-roster .roster-pill").forEach(pill => {
    pill.classList.remove("active-speaker");
  });
  document.querySelectorAll(".agent-roster .roster-dot").forEach(d => d.classList.remove("active"));
  
  const targetPill = document.querySelector(`.agent-roster .roster-pill[data-agent="${agentKey}"]`);
  if (targetPill) targetPill.classList.add("active-speaker");

  const dot = document.getElementById(`dot-${agentKey}`);
  if (dot) dot.classList.add("active");
}

function formatAgentMentions(html) {
  if (!html) return '';
  return html
    .replace(/@Developer\b|@David\b/gi, '<span class="agent-mention dev">💻 @David (Dev)</span>')
    .replace(/@QA_Tester\b|@Maya\b/gi, '<span class="agent-mention qa">🧪 @Maya (QA)</span>')
    .replace(/@Project_Manager\b|@Sarah\b/gi, '<span class="agent-mention pm">📋 @Sarah (PM)</span>')
    .replace(/@DevOps\b|@Sam\b/gi, '<span class="agent-mention devops">🚀 @Sam (Ops)</span>')
    .replace(/@User\b/gi, '<span class="agent-mention user">👤 @User</span>');
}

function addUserMessage(text, time) {
  const hero = document.getElementById("chatHero");
  if (hero) hero.remove();
  const div = document.createElement("div");
  div.className = "msg-wrapper user";
  
  let contentHtml = '';
  if (text.includes('<div class="msg-context-badge">')) {
    const parts = text.split('<div class="msg-context-badge">');
    contentHtml = `${escapeHtml(parts[0])}<div class="msg-context-badge">${parts[1]}`;
  } else {
    contentHtml = escapeHtml(text);
  }

  div.innerHTML = `
    <div class="msg-header">
      <span class="msg-author">You</span>
      <span class="msg-time">${time}</span>
    </div>
    <div class="msg-bubble">${contentHtml}</div>
  `;
  chatContainer.appendChild(div);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

function addAgentMessage(agent, text, time, isPlan = false) {
  const hero = document.getElementById("chatHero");
  if (hero) hero.remove();
  const info = agentData[agent] || { name: agent, role: 'Agent', short: agent, icon: '🤖' };

  // Detect which teammate is addressed in the message
  let replyBarHtml = '';
  if (/@Developer\b|@David\b/i.test(text) && agent !== 'dev') {
    replyBarHtml = `<div class="msg-reply-bar"><span class="msg-reply-arrow">↳</span> speaking to <span class="agent-mention dev">💻 David (Dev)</span></div>`;
  } else if (/@QA_Tester\b|@Maya\b/i.test(text) && agent !== 'qa') {
    replyBarHtml = `<div class="msg-reply-bar"><span class="msg-reply-arrow">↳</span> addressing <span class="agent-mention qa">🧪 Maya (QA)</span></div>`;
  } else if (/@Project_Manager\b|@Sarah\b/i.test(text) && agent !== 'pm') {
    replyBarHtml = `<div class="msg-reply-bar"><span class="msg-reply-arrow">↳</span> reporting to <span class="agent-mention pm">📋 Sarah (PM)</span></div>`;
  } else if (/@DevOps\b|@Sam\b/i.test(text) && agent !== 'devops') {
    replyBarHtml = `<div class="msg-reply-bar"><span class="msg-reply-arrow">↳</span> handing over to <span class="agent-mention devops">🚀 Sam (Ops)</span></div>`;
  }

  const renderedContent = formatAgentMentions(renderMarkdown(text));

  let planButtonsHtml = '';
  if (agent === 'pm' && isPlan) {
    planButtonsHtml = `
      <div class="plan-approval-bar">
        <button class="plan-btn approve" onclick="approveCurrentPlan()">
          <span>✅ Approve Plan & Continue</span>
        </button>
        <button class="plan-btn refine" onclick="refineCurrentPlan()">
          <span>✏️ Modify / Request Changes</span>
        </button>
      </div>
    `;
  }

  const div = document.createElement("div");
  div.className = "msg-wrapper agent";
  div.innerHTML = `
    <div class="msg-header">
      <span class="msg-avatar">${info.icon}</span>
      <span class="msg-author">${info.name}</span>
      <span class="msg-role-tag ${agent}">${info.role || info.short}</span>
      <span class="msg-time">${time}</span>
    </div>
    ${replyBarHtml}
    <div class="msg-bubble">
      ${renderedContent}
      ${planButtonsHtml}
    </div>
  `;
  chatContainer.appendChild(div);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

function addSystemMessage(html) {
  const hero = document.getElementById("chatHero");
  if (hero) hero.remove();
  const div = document.createElement("div");
  div.className = "msg-wrapper system";
  div.innerHTML = `<div class="system-bubble">${html}</div>`;
  chatContainer.appendChild(div);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

function showTyping(agent) {
  removeAllTyping();
  const hero = document.getElementById("chatHero");
  if (hero) hero.remove();
  const info = agentData[agent] || { name: agent, role: 'Agent' };

  const actionDescriptions = {
    pm: 'Sarah (PM) is analyzing requirements & assigning tasks...',
    dev: 'David (Developer) is crafting code & creating files...',
    qa: 'Maya (QA Automation) is reviewing David\'s code & running tests...',
    devops: 'Sam (DevOps) is verifying environment & runtime...'
  };
  const statusText = actionDescriptions[agent] || `${info.name} is typing...`;

  const div = document.createElement("div");
  div.className = "msg-wrapper agent";
  div.id = `typing-${agent}`;
  div.innerHTML = `
    <div class="msg-header">
      <span class="msg-avatar">${info.icon || '🤖'}</span>
      <span class="msg-author">${info.name}</span>
      <span class="msg-role-tag ${agent}">${info.short || agent.toUpperCase()}</span>
      <span class="msg-time">${statusText}</span>
    </div>
    <div class="typing-dots">
      <div class="dot"></div>
      <div class="dot"></div>
      <div class="dot"></div>
    </div>
  `;
  chatContainer.appendChild(div);
  chatContainer.scrollTop = chatContainer.scrollHeight;
  highlightAgent(agent);
}

function removeTyping(agent) {
  const el = document.getElementById(`typing-${agent}`);
  if (el) el.remove();
}

function removeAllTyping() {
  document.querySelectorAll("[id^='typing-']").forEach(el => el.remove());
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function renderMarkdown(text) {
  if (!text) return "";
  let html = escapeHtml(text);

  // Fenced code blocks with language badge and copy button:
  html = html.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (match, lang, code) => {
    const langLabel = lang ? lang.toLowerCase() : "code";
    return `<div class="code-block-wrapper">
      <div class="code-block-header">
        <span class="code-lang">${langLabel}</span>
        <button class="copy-code-btn" onclick="copyCode(this)" title="Copy code">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          <span>Copy</span>
        </button>
      </div>
      <pre><code class="language-${langLabel}">${code}</code></pre>
    </div>`;
  });

  // Inline code: `code`
  html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

  // Bold: **text**
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // Italic: *text*
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // Headers: ### Header
  html = html.replace(/^### (.*$)/gim, '<h4 class="md-h4">$1</h4>');
  html = html.replace(/^## (.*$)/gim, '<h3 class="md-h3">$1</h3>');
  html = html.replace(/^# (.*$)/gim, '<h2 class="md-h2">$1</h2>');

  // Unordered list items: - item or * item
  html = html.replace(/^\s*[-*]\s+(.*)$/gim, '<li class="md-li">$1</li>');

  // Newlines to breaks (except inside pre)
  html = html.replace(/\n/g, '<br/>');
  html = html.replace(/<pre>(.*?)<\/pre>/gs, (m) => m.replace(/<br\/>/g, '\n'));

  return html;
}

window.copyCode = function(btn) {
  const wrapper = btn.closest(".code-block-wrapper");
  const codeEl = wrapper ? wrapper.querySelector("code") : null;
  if (!codeEl) return;
  const code = codeEl.innerText;
  navigator.clipboard.writeText(code).then(() => {
    const span = btn.querySelector("span");
    const oldText = span ? span.textContent : "";
    if (span) span.textContent = "Copied!";
    btn.classList.add("copied");
    setTimeout(() => {
      if (span) span.textContent = oldText;
      btn.classList.remove("copied");
    }, 1800);
  });
};
