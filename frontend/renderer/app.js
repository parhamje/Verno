// State Management
const state = {
  theme: "light",
  language: "en",
  accentColor: "blue",
  fontSize: "medium",
  soundEffectsEnabled: true,
  desktopNotificationsEnabled: true,
  agentResponsesNotificationsEnabled: true,
  selectedAgent: "all",
  currentFile: "",
  isRunning: false,
  conversation: [],
  projectStatus: "ready",
  progress: 0,
  agents: {
    pm: { status: "idle", messages: 0 },
    dev: { status: "idle", messages: 0 },
    qa: { status: "idle", messages: 0 },
    devops: { status: "idle", messages: 0 },
  },
  activityLog: [],
  files: {},
  soundEffectsEnabled: true,
  desktopNotificationsEnabled: true,
  agentResponsesNotificationsEnabled: true,
};

// Backend API configuration
const config = {
  API_BASE_URL: "http://127.0.0.1:8000",
  AI_PROVIDER_BASE_URL: "" // Will be populated from backend when available
};

const roleMap = {
    'project_manager': 'pm',
    'developer': 'dev',
    'qa_tester': 'qa',
    'devops': 'devops'
};

const agentData = {
  pm: {
    name: "Project Manager",
    short: "PM",
    color: "pm",
    responses: [
      "I'll help coordinate this with the team. 📋",
      "Let me create a task breakdown for that. ✅",
      "I'll schedule this in our project timeline. 📅",
      "Great idea! I'll assign this to the appropriate team member. 👥",
    ],
  },
  dev: {
    name: "Developer",
    short: "DEV",
    color: "dev",
    responses: [
      "I can implement that feature for you. 💻",
      "Let me write the code for this functionality. ⚡",
      "I'll refactor this to make it more efficient. 🔧",
      "I'm working on the implementation now. 🚀",
    ],
  },
  qa: {
    name: "QA Engineer",
    short: "QA",
    color: "qa",
    responses: [
      "I'll create comprehensive test cases for this. 🧪",
      "Let me run the test suite to verify. ✓",
      "I'll check for edge cases and potential bugs. 🔍",
      "All quality checks will be thoroughly executed. 📊",
    ],
  },
  devops: {
    name: "DevOps",
    short: "OPS",
    color: "devops",
    responses: [
      "I'll set up the deployment pipeline for this. 🔄",
      "Let me configure the necessary infrastructure. ☁️",
      "I'm preparing the production environment. 🌐",
      "I'll handle the deployment process. 🚢",
    ],
  },
};

const codeFiles = {};

const translations = {
  en: {
    "Project Name": "Project Name",
    "Ready": "Ready",
    "Start": "Start",
    "Pause": "Pause",
    "Stop": "Stop",
    "Settings": "Settings",
    "Dark Mode": "Dark Mode",
    "Switch between light and dark theme": "Switch between light and dark theme",
    "Accent Color": "Accent Color",
    "Choose your preferred accent color": "Choose your preferred accent color",
    "Persian Language": "Persian Language",
    "Switch between English and Persian": "Switch between English and Persian",
    "Appearance": "Appearance",
    "Team Chat": "Team Chat",
    "Type your message...": "Type your message...",
    "Code Editor": "Code Editor",
    "Save File": "Save File",
    "Run Code": "Run Code",
    "Copy": "Copy",
    "Project Files": "Project Files",
    "Logout": "Logout",
    "All Agents": "All Agents",
    "Project Manager": "Project Manager",
    "Developer": "Developer",
    "QA Engineer": "QA Engineer",
    "DevOps": "DevOps",
    "Select Agent": "Select Agent",
    "Suggest feature": "Suggest feature",
    "Report bug": "Report bug",
    "Review code": "Review code",
    "Chat with": "Chat with",
    "You are now chatting with": "You are now chatting with",
    "Hello! I'm your Project Manager. Let's start building something amazing together! 🚀": "Hello! I'm your Project Manager. Let's start building something amazing together! 🚀",
    "Chat Settings": "Chat Settings",
    "Message Animations": "Message Animations",
    "Enable smooth animations for messages": "Enable smooth animations for messages",
    "Font Size": "Font Size",
    "Adjust the chat text size": "Adjust the chat text size",
    "Small": "Small",
    "Medium": "Medium",
    "Large": "Large",
    "Sound Effects": "Sound Effects",
    "Play sounds for new messages": "Play sounds for new messages",
    "Notifications": "Notifications",
    "Desktop Notifications": "Desktop Notifications",
    "Show notifications on your desktop": "Show notifications on your desktop",
    "Agent Responses": "Agent Responses",
    "Get notified when agents respond": "Get notified when agents respond",
    "Editor Settings": "Editor Settings",
    "Auto-Save": "Auto-Save",
    "Automatically save code changes": "Automatically save code changes",
    "Code Theme": "Code Theme",
    "Choose editor color scheme": "Choose editor color scheme",
    "Default": "Default",
    "Monokai": "Monokai",
    "GitHub": "GitHub",
    "Dracula": "Dracula",
    "Line Numbers": "Line Numbers",
    "Show line numbers in editor": "Show line numbers in editor",
    "Environment Settings": "Environment Settings"
  },
  fa: {
    "Project Name": "نام پروژه",
    "Ready": "آماده",
    "Start": "شروع",
    "Pause": "مکث",
    "Stop": "توقف",
    "Settings": "تنظیمات",
    "Dark Mode": "حالت تاریک",
    "Switch between light and dark theme": "تغییر بین تم روشن و تاریک",
    "Accent Color": "رنگ تاکید",
    "Choose your preferred accent color": "رنگ تاکید مورد نظر خود را انتخاب کنید",
    "Persian Language": "زبان فارسی",
    "Switch between English and Persian": "تغییر بین زبان انگلیسی و فارسی",
    "Appearance": "ظاهر",
    "Team Chat": "چت تیم",
    "Type your message...": "پیام خود را تایپ کنید...",
    "Code Editor": "ویرایشگر کد",
    "Save File": "ذخیره فایل",
    "Run Code": "اجرای کد",
    "Copy": "کپی",
    "Project Files": "فایل های پروژه",
    "Logout": "خروج",
    "All Agents": "همه نماینده ها",
    "Project Manager": "مدیر پروژه",
    "Developer": "توسعه دهنده",
    "QA Engineer": "مهندس کیفیت",
    "DevOps": "دواپس",
    "Select Agent": "نماینده را انتخاب کنید",
    "Suggest feature": "پیشنهاد ویژگی",
    "Report bug": "گزارش اشکال",
    "Review code": "بررسی کد",
    "Chat with": "چت با",
    "You are now chatting with": "شما در حال چت با",
    "Hello! I'm your Project Manager. Let's start building something amazing together! 🚀": "سلام! من مدیر پروژه شما هستم. بیایید با هم یک چیز شگفت انگیز بسازیم! 🚀",
    "Chat Settings": "تنظیمات چت",
    "Message Animations": "انیمیشن پیام ها",
    "Enable smooth animations for messages": "فعال کردن انیمیشن های روان برای پیام ها",
    "Font Size": "اندازه فونت",
    "Adjust the chat text size": "اندازه متن چت را تنظیم کنید",
    "Small": "کوچک",
    "Medium": "متوسط ",
    "Large": "بزرگ",
    "Sound Effects": "جلوه های صوتی",
    "Play sounds for new messages": "پخش صدا برای پیام های جدید",
    "Notifications": "اعلان ها",
    "Desktop Notifications": "اعلان های دسکتاپ",
    "Show notifications on your desktop": "نمایش اعلان ها روی دسکتاپ شما",
    "Agent Responses": "پاسخ های نماینده",
    "Get notified when agents respond": "هنگام پاسخ دادن نمایندگان مطلع شوید",
    "Editor Settings": "تنظیمات ویرایشگر",
    "Auto-Save": "ذخیره خودکار",
    "Automatically save code changes": "ذخیره خودکار تغییرات کد",
    "Code Theme": "تم کد",
    "Choose editor color scheme": "طرح رنگ ویرایشگر را انتخاب کنید",
    "Default": "پیش فرض",
    "Monokai": "مونوکای",
    "GitHub": "گیت هاب",
    "Dracula": "دراکولا",
    "Line Numbers": "شماره خطوط",
    "Show line numbers in editor": "نمایش شماره خطوط در ویرایشگر",
    "Environment Settings": "تنظیمات محیط"
  }
};

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  initializeTheme();
  initializeLang();
  initializeChat();
  initializeCodeEditor();
  initializeControls();
  initializeTextareaResize();
  initializeSettings();
  initializeDocumentClickListeners();
  initializeStudioViewModes();
  initializeLivePreview();
  initializeTaskDrawer();
  initializeRosterListeners();

  const settingsModal = document.getElementById("settingsModal");
  if (settingsModal) {
    initializeAccentColor();
    initializeFontSize();
    initializeSoundEffects();
    initializeDesktopNotifications();
    initializeAgentResponsesNotifications();
    initializeAutoSave();
    initializeCodeTheme();

    const darkModeToggle = document.getElementById("darkModeToggle");
    if (darkModeToggle) {
      darkModeToggle.addEventListener("change", (e) => {
        const newTheme = e.target.checked ? "dark" : "light";
        setTheme(newTheme);
      });
    }

    document.querySelectorAll(".color-option").forEach((option) => {
      option.addEventListener("click", () => {
        const color = option.dataset.color;
        setAccentColor(color);
        showToast("🎨 Color Changed", "Accent color updated successfully");
      });
    });

    const fontSizeSelect = document.getElementById("fontSizeSelect");
    if (fontSizeSelect) {
      fontSizeSelect.addEventListener("change", (e) => {
        setFontSize(e.target.value);
        showToast("📝 Font Size", `Changed to ${e.target.value}`);
      });
    }
  }
});

function initializeDocumentClickListeners() {
  document.addEventListener("mousedown", function(e) {
    const profileDropdown = document.getElementById("profileDropdown");
    const profileAvatar = document.getElementById("profileAvatar");
    if (profileDropdown && profileDropdown.classList.contains("active") && 
        !profileAvatar.contains(e.target) && !profileDropdown.contains(e.target)) {
      profileDropdown.classList.remove("active");
    }

    const agentDropdown = document.getElementById("agentMentionDropdown");
    const mentionBtn = document.getElementById("mentionBtn");
    const chatSection = document.querySelector('.chat-section'); // Get the chat section to modify its overflow
    if (agentDropdown && agentDropdown.classList.contains("active") && 
        !mentionBtn.contains(e.target) && !agentDropdown.contains(e.target)) {
      agentDropdown.classList.remove("active");
      mentionBtn.classList.remove("active");
      // Move dropdown back to its original parent
      if (agentDropdown.originalParent) {
        agentDropdown.originalParent.appendChild(agentDropdown);
      }
      // Reset positioning when closing
      agentDropdown.style.position = 'absolute';
      agentDropdown.style.top = '';
      agentDropdown.style.left = '';
      // Remove class from chat section when closing
      if (chatSection) {
        chatSection.classList.remove("dropdown-open");
      }
    }

    const fileTreePanel = document.getElementById("fileTreePanel");
    const fileTreeToggle = document.getElementById("fileTreeToggle");
    if (fileTreePanel && fileTreePanel.classList.contains("active") && 
        !fileTreeToggle.contains(e.target) && !fileTreePanel.contains(e.target)) {
      fileTreePanel.classList.remove("active");
    }
  });
}

// Language Management
function initializeLang() {
  const savedLang = localStorage.getItem("language") || "en";
  setLanguage(savedLang);
  const languageToggle = document.getElementById("languageToggle");
  if (languageToggle) {
    languageToggle.checked = savedLang === "fa";
  }
}

function setLanguage(lang) {
  state.language = lang;
  localStorage.setItem("language", lang);
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'fa' ? 'rtl' : 'ltr';

  const elements = document.querySelectorAll("[data-translate]");
  elements.forEach(el => {
    const key = el.dataset.translate;
    el.innerText = translations[lang][key] || key;
  });
}

// Theme Management
function initializeTheme() {
  const savedTheme = localStorage.getItem("theme") || "light";
  setTheme(savedTheme);
}

function setTheme(theme) {
  state.theme = theme;
  document.body.classList.toggle("dark", theme === "dark");
  localStorage.setItem("theme", theme);

  if (window.monaco) {
    monaco.editor.setTheme(theme === "dark" ? "vs-dark" : "vs");
  }

  const darkModeToggle = document.getElementById("darkModeToggle");
  const darkModeToggleProfile = document.getElementById("darkModeToggleProfile");

  if (darkModeToggle) {
    darkModeToggle.checked = theme === "dark";
  }
  if (darkModeToggleProfile) {
    darkModeToggleProfile.checked = theme === "dark";
  }
}

// Accent Color Management
function initializeAccentColor() {
  const savedAccent = localStorage.getItem("accentColor") || "purple";
  setAccentColor(savedAccent);
}

function setAccentColor(color) {
  state.accentColor = color;
  localStorage.setItem("accentColor", color);

  const root = document.documentElement;
  root.style.setProperty("--primary", `var(--accent-${color}-primary)`);
  root.style.setProperty("--primary-light", `var(--accent-${color}-light)`);
  root.style.setProperty("--primary-dark", `var(--accent-${color}-dark)`);
  root.style.setProperty("--message-user-bg", `var(--accent-${color}-gradient)`);
  root.style.setProperty("--pm-color", `var(--accent-${color}-primary)`);
  root.style.setProperty("--pm-gradient", `var(--accent-${color}-gradient)`);

  document.querySelectorAll(".color-option").forEach((option) => {
    if (option.dataset.color === color) {
      option.classList.add("active");
    } else {
      option.classList.remove("active");
    }
  });
}

// Font Size Management
function initializeFontSize() {
    const savedSize = localStorage.getItem("fontSize") || "medium";
    setFontSize(savedSize);
    const fontSizeSelect = document.getElementById("fontSizeSelect");
    if (fontSizeSelect) {
        fontSizeSelect.value = savedSize;
    }
}

function setFontSize(size) {
    console.log(`Setting font size to: ${size}`);
    state.fontSize = size;
    document.documentElement.style.setProperty('--font-size', `var(--font-size-${size})`);
    localStorage.setItem("fontSize", size);
    if (window.monacoEditor) {
        window.monacoEditor.updateOptions({
            fontSize: size === 'small' ? 12 : (size === 'large' ? 16 : 14)
        });
    }
}

// Sound Effects Management
function initializeSoundEffects() {
    const savedSoundEffects = localStorage.getItem("soundEffectsEnabled");
    if (savedSoundEffects !== null) {
        state.soundEffectsEnabled = savedSoundEffects === "true";
    }
    const soundToggle = document.getElementById("soundToggle");
    soundToggle.checked = state.soundEffectsEnabled;
}

function setSoundEffectsEnabled(enabled) {
    state.soundEffectsEnabled = enabled;
    localStorage.setItem("soundEffectsEnabled", enabled);
}

// Desktop Notifications Management
function initializeDesktopNotifications() {
    const savedDesktopNotifications = localStorage.getItem("desktopNotificationsEnabled");
    if (savedDesktopNotifications !== null) {
        state.desktopNotificationsEnabled = savedDesktopNotifications === "true";
    }
    const desktopNotifToggle = document.getElementById("desktopNotifToggle");
    if (desktopNotifToggle) {
        desktopNotifToggle.checked = state.desktopNotificationsEnabled;
    }
}

function setDesktopNotificationsEnabled(enabled) {
    state.desktopNotificationsEnabled = enabled;
    localStorage.setItem("desktopNotificationsEnabled", enabled);
}

// Agent Responses Notifications Management
function initializeAgentResponsesNotifications() {
    const savedAgentResponsesNotifications = localStorage.getItem("agentResponsesNotificationsEnabled");
    if (savedAgentResponsesNotifications !== null) {
        state.agentResponsesNotificationsEnabled = savedAgentResponsesNotifications === "true";
    }
    const agentNotifToggle = document.getElementById("agentNotifToggle");
    if (agentNotifToggle) {
        agentNotifToggle.checked = state.agentResponsesNotificationsEnabled;
    }
}

function setAgentResponsesNotificationsEnabled(enabled) {
    state.agentResponsesNotificationsEnabled = enabled;
    localStorage.setItem("agentResponsesNotificationsEnabled", enabled);
}

// Auto-Save Management
function initializeAutoSave() {
    const savedAutoSave = localStorage.getItem("autoSaveEnabled");
    if (savedAutoSave !== null) {
        state.autoSaveEnabled = savedAutoSave === "true";
    }
    const autoSaveToggle = document.getElementById("autoSaveToggle");
    if (autoSaveToggle) {
        autoSaveToggle.checked = state.autoSaveEnabled;
    }
}

function setAutoSaveEnabled(enabled) {
    state.autoSaveEnabled = enabled;
    localStorage.setItem("autoSaveEnabled", enabled);
}

// Code Theme Management
function initializeCodeTheme() {
    const savedCodeTheme = localStorage.getItem("codeTheme") || "default";
    setCodeTheme(savedCodeTheme);
    const codeThemeSelect = document.getElementById("codeThemeSelect");
    if (codeThemeSelect) {
        codeThemeSelect.value = savedCodeTheme;
    }
}

function setCodeTheme(theme) {
    console.log(`Setting code theme to: ${theme}`);
    state.codeTheme = theme;
    if (window.monaco) {
        if (theme === 'github') {
            monaco.editor.setTheme('vs');
        } else if (theme === 'monokai' || theme === 'dracula') {
            monaco.editor.setTheme('vs-dark');
        } else {
            monaco.editor.setTheme(state.theme === 'dark' ? 'vs-dark' : 'vs');
        }
    }
    const codeEditorWrapper = document.querySelector(".code-editor-wrapper");
    if (codeEditorWrapper) {
        codeEditorWrapper.classList.remove("theme-default", "theme-monokai", "theme-github", "theme-dracula");
        codeEditorWrapper.classList.add(`theme-${theme}`);
    }
    localStorage.setItem("codeTheme", theme);
}

// Settings Modal
function initializeSettings() {
  const settingsMenuBtn = document.getElementById("settingsMenuBtn");
  const settingsModal = document.getElementById("settingsModal");
  const closeSettings = document.getElementById("closeSettings");
  const darkModeToggle = document.getElementById("darkModeToggle");
  const profileAvatar = document.getElementById("profileAvatar");
  const profileDropdown = document.getElementById("profileDropdown");

  if (profileAvatar && profileDropdown) {
    profileAvatar.addEventListener("click", function(event) {
      event.stopPropagation();
      profileDropdown.classList.toggle("active");
    });
  }

  if (settingsMenuBtn) {
    settingsMenuBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (profileDropdown) {
        profileDropdown.classList.remove("active");
      }
      settingsModal.classList.add("active");
      const darkModeToggleElement = document.getElementById("darkModeToggle");
      if (darkModeToggleElement) {
        darkModeToggleElement.checked = state.theme === "dark";
      }
    });
  }
  
  document.querySelectorAll('.profile-dropdown-item').forEach(item => {
    item.addEventListener('click', function(event) {
      event.stopPropagation();
      if (profileDropdown) {
        profileDropdown.classList.remove("active");
      }
      
      // Handle specific dropdown items
      if (this.id === 'envSettingsBtn') {
        showEnvSettings();
      }
    });
  });

  if (closeSettings) {
    closeSettings.addEventListener("click", () => {
      settingsModal.classList.remove("active");
    });
  }

  if (settingsModal) {
    settingsModal.addEventListener("click", (e) => {
      if (e.target === settingsModal) {
        settingsModal.classList.remove("active");
      }
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && settingsModal && settingsModal.classList.contains("active")) {
      settingsModal.classList.remove("active");
    }
  });

  if (darkModeToggle) {
    darkModeToggle.addEventListener("change", (e) => {
      const newTheme = e.target.checked ? "dark" : "light";
      setTheme(newTheme);
    });
  }

  document.querySelectorAll(".color-option").forEach((option) => {
    option.addEventListener("click", () => {
      const color = option.dataset.color;
      setAccentColor(color);
      showToast("🎨 Color Changed", "Accent color updated successfully");
    });
  });

  const fontSizeSelect = document.getElementById("fontSizeSelect");
  if (fontSizeSelect) {
    fontSizeSelect.addEventListener("change", (e) => {
      setFontSize(e.target.value);
      showToast("📝 Font Size", `Changed to ${e.target.value}`);
    });

    const soundToggle = document.getElementById("soundToggle");
    soundToggle.addEventListener("change", (e) => {
      setSoundEffectsEnabled(e.target.checked);
      showToast("🔊 Sound Effects", e.target.checked ? "Enabled" : "Disabled");
    });

    const desktopNotifToggle = document.getElementById("desktopNotifToggle");
    if (desktopNotifToggle) {
      desktopNotifToggle.addEventListener("change", (e) => {
        setDesktopNotificationsEnabled(e.target.checked);
        showToast("🔔 Notifications", e.target.checked ? "Enabled" : "Disabled");
      });
    }

    const agentNotifToggle = document.getElementById("agentNotifToggle");
    if (agentNotifToggle) {
      agentNotifToggle.addEventListener("change", (e) => {
        setAgentResponsesNotificationsEnabled(e.target.checked);
        showToast("👥 Agent Alerts", e.target.checked ? "Enabled" : "Disabled");
      });
    }

    const autoSaveToggle = document.getElementById("autoSaveToggle");
    if (autoSaveToggle) {
      autoSaveToggle.addEventListener("change", (e) => {
        setAutoSaveEnabled(e.target.checked);
        showToast("💾 Auto-Save", e.target.checked ? "Enabled" : "Disabled");
      });
    }

    const codeThemeSelect = document.getElementById("codeThemeSelect");
    if (codeThemeSelect) {
      codeThemeSelect.addEventListener("change", (e) => {
        setCodeTheme(e.target.value);
        showToast("🎨 Code Theme", `Changed to ${e.target.value}`);
      });
    }
  }

  document.querySelectorAll(".color-option").forEach((option) => {
    option.addEventListener("click", () => {
      document.querySelectorAll(".color-option").forEach((opt) => {
        opt.classList.remove("active");
      });
      option.classList.add("active");
      showToast("🎨 Color Changed", "Accent color updated successfully");
    });
  });

  const soundToggle = document.getElementById("soundToggle");
  if (soundToggle) {
    soundToggle.addEventListener("change", (e) => {
      state.soundEffectsEnabled = e.target.checked;
      showToast("🔊 Sound Effects", e.target.checked ? "Enabled" : "Disabled");
    });
  }

  const animationsToggle = document.getElementById("animationsToggle");
  if (animationsToggle) {
    animationsToggle.addEventListener("change", (e) => {
      showToast("✨ Animations", e.target.checked ? "Enabled" : "Disabled");
    });
  }

  const desktopNotifToggle = document.getElementById("desktopNotifToggle");
  if (desktopNotifToggle) {
    desktopNotifToggle.addEventListener("change", (e) => {
      state.desktopNotificationsEnabled = e.target.checked;
      showToast("🔔 Notifications", e.target.checked ? "Enabled" : "Disabled");
    });
  }

  const agentNotifToggle = document.getElementById("agentNotifToggle");
  if (agentNotifToggle) {
    agentNotifToggle.addEventListener("change", (e) => {
      state.agentResponsesNotificationsEnabled = e.target.checked;
      showToast("👥 Agent Alerts", e.target.checked ? "Enabled" : "Disabled");
    });
  }

  const autoSaveToggle = document.getElementById("autoSaveToggle");
  if (autoSaveToggle) {
    autoSaveToggle.addEventListener("change", (e) => {
      showToast("💾 Auto-Save", e.target.checked ? "Enabled" : "Disabled");
    });
  }

  const lineNumbersToggle = document.getElementById("lineNumbersToggle");
  if (lineNumbersToggle) {
    lineNumbersToggle.addEventListener("change", (e) => {
      if (window.monacoEditor) {
        window.monacoEditor.updateOptions({ lineNumbers: e.target.checked ? 'on' : 'off' });
      }
      showToast("🔢 Line Numbers", e.target.checked ? "Shown" : "Hidden");
    });
  }

  const codeThemeSelect = document.getElementById("codeThemeSelect");
  if (codeThemeSelect) {
    codeThemeSelect.addEventListener("change", (e) => {
      showToast("🎨 Code Theme", `Changed to ${e.target.value}`);
    });
  }

  const languageToggle = document.getElementById("languageToggle");
  if (languageToggle) {
    languageToggle.addEventListener("change", (e) => {
      const newLang = e.target.checked ? "fa" : "en";
      setLanguage(newLang);
    });
  }
}

// Chat Functionality
function initializeChat() {
  const mentionBtn = document.getElementById("mentionBtn");
  const agentDropdown = document.getElementById("agentMentionDropdown");
  const agentItems = document.querySelectorAll(".agent-mention-item");
  const chatSection = document.querySelector('.chat-section'); // Get the chat section to modify its overflow
  const originalParent = agentDropdown.parentNode; // Keep reference to original parent

  if (mentionBtn && agentDropdown) {
    mentionBtn.addEventListener("click", () => {
      // Calculate position relative to viewport
      const rect = mentionBtn.getBoundingClientRect();
      const dropdownHeight = agentDropdown.offsetHeight || 300; // Estimate if not visible yet
      const spaceAbove = rect.top;
      const spaceBelow = window.innerHeight - rect.bottom;
      
      // Position the dropdown above if there's more space above, otherwise below
      if (spaceAbove > spaceBelow && spaceAbove >= dropdownHeight) {
        // Position above the button
        agentDropdown.style.position = 'fixed';
        agentDropdown.style.top = `${rect.top - dropdownHeight - 8}px`;
        agentDropdown.style.left = `${rect.left}px`;
      } else if (spaceBelow >= dropdownHeight) {
        // Position below the button
        agentDropdown.style.position = 'fixed';
        agentDropdown.style.top = `${rect.bottom + 8}px`;
        agentDropdown.style.left = `${rect.left}px`;
      } else {
        // If neither direction has enough space, default to above
        agentDropdown.style.position = 'fixed';
        agentDropdown.style.top = `${rect.top - dropdownHeight - 8}px`;
        agentDropdown.style.left = `${rect.left}px`;
      }
      
      // Move dropdown to body to escape parent overflow constraints
      if (!agentDropdown.classList.contains("active")) {
        // Only move to body when opening
        document.body.appendChild(agentDropdown);
      } else {
        // Move back to original parent when closing (this happens in document click handler)
      }
      
      agentDropdown.classList.toggle("active");
      mentionBtn.classList.toggle("active");
      
      // Add class to chat section to allow dropdown to be visible
      if (agentDropdown.classList.contains("active") && chatSection) {
        chatSection.classList.add("dropdown-open");
      }
    });
  }
  
  // Store original parent for later use
  agentDropdown.originalParent = originalParent;

  agentItems.forEach((item) => {
    item.addEventListener("click", () => {
      const agent = item.dataset.agent;
      const agentDropdown = document.getElementById("agentMentionDropdown");
      const mentionBtn = document.getElementById("mentionBtn");

      if (state.selectedAgent === agent) {
        agentDropdown.classList.remove("active");
        mentionBtn.classList.remove("active");
        return;
      }
      state.selectedAgent = agent;

      agentItems.forEach((i) => {
        i.classList.remove("active");
        const checkElement = i.querySelector(".agent-mention-check");
        if (checkElement) {
          checkElement.style.display = "none";
        }
      });
      item.classList.add("active");
      const itemCheckElement = item.querySelector(".agent-mention-check");
      if (itemCheckElement) {
        itemCheckElement.style.display = "block";
      }

      const agentNameElement = item.querySelector(".agent-mention-name");
      const agentName = agentNameElement ? agentNameElement.textContent : "";
      const chatTitle = document.getElementById("chatTitle");

      if (chatTitle) {
        if (agent === "all") {
          chatTitle.innerHTML = "Team Chat";
          addSystemMessage("You are now chatting with <strong>All Agents</strong>.");
        } else {
          chatTitle.innerHTML = `Chat with <span style="color: var(--${agentData[agent].color}-color)">${agentName}</span>`;
          addSystemMessage(`You are now chatting with <strong>${agentName}</strong>.`);
        }
      }

      if (agentDropdown) {
        agentDropdown.classList.remove("active");
        // Move dropdown back to its original parent
        if (agentDropdown.originalParent) {
          agentDropdown.originalParent.appendChild(agentDropdown);
        }
        // Reset positioning when closing
        agentDropdown.style.position = 'absolute';
        agentDropdown.style.top = '';
        agentDropdown.style.left = '';
      }
      if (mentionBtn) {
        mentionBtn.classList.remove("active");
      }
      // Remove class from chat section when closing
      const chatSection = document.querySelector('.chat-section');
      if (chatSection) {
        chatSection.classList.remove("dropdown-open");
      }
    });
  });

  const sendBtn = document.getElementById("sendBtn");
  const chatInput = document.getElementById("chatInput");

  if (sendBtn) {
    sendBtn.addEventListener("click", sendMessage);
  }
  
  if (chatInput) {
    chatInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
  }

  document.querySelectorAll(".quick-action").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (chatInput) {
        chatInput.value = btn.textContent.trim();
        chatInput.focus();
      }
    });
  });
}

let projectId = "";
let extendedPrompt = "";
let currentPlan = "";
let suggestedProjectName = "";
let projectName = "";
let awaitingProjectName = false;
let awaitingPlanApproval = false;

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

async function sendMessage() {
  const input = document.getElementById("chatInput");
  if (!input) return;
  
  const message = input.value.trim();
  if (!message) return;

  const time = new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  addMessageToUI("user", message, time, state.selectedAgent);
  state.conversation.push({
    sender: "user",
    text: message,
    time,
    agent: state.selectedAgent,
  });

  input.value = "";
  input.style.height = "auto";

  if (awaitingPlanApproval) {
    if (isPlanApproved(message)) {
      awaitingPlanApproval = false;
      const defaultName = generateDefaultProjectName(extendedPrompt);
      suggestedProjectName = defaultName;
      addMessageWithTypingEffect("pm", `Great! What would you like to name this project? (Or press <strong>Enter</strong> to use <code>${escapeHtml(defaultName)}</code>)`, new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }));
      awaitingProjectName = true;
      if (input) input.placeholder = `Project name (default: ${defaultName})...`;
      return;
    } else {
      // User provided feedback or requested changes to the plan
      showTypingIndicator("pm");
      const refinementPrompt = `Original Project Goal:
${extendedPrompt}

Previous Plan:
${currentPlan || ""}

User's Feedback / Requested Modifications:
"${message}"

Please update the project plan according to the user's feedback. Apply the requested changes directly, keep the plan clean and actionable in markdown, and ask for final approval.`;

      try {
        const response = await fetch("http://127.0.0.1:8000/api/projects/plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: refinementPrompt })
        });
        const data = await response.json();
        removeTypingIndicator("pm");
        if (data.success) {
          currentPlan = data.plan;
          extendedPrompt += `\nUser Modification: ${message}`;
          addMessageWithTypingEffect("pm", data.plan, new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }));
          awaitingPlanApproval = true;
        } else {
          throw new Error(data.detail);
        }
      } catch (err) {
        removeTypingIndicator("pm");
        showToast("Error", `Failed to update plan: ${err.message}`, "error");
      }
      return;
    }
  }

  if (awaitingProjectName) {
    let chosenName = message.trim();
    if (!chosenName || chosenName.toLowerCase() === "ok" || chosenName.toLowerCase() === "yes" || chosenName.toLowerCase() === "default") {
      chosenName = suggestedProjectName || "hello-world-app";
    }
    chosenName = chosenName.replace(/[<>:"/\\|?*]/g, "").trim() || "hello-world-app";
    projectName = chosenName;
    const currentProjectName = document.getElementById("currentProjectName");
    if (currentProjectName) {
      currentProjectName.textContent = projectName;
    }
    const startBtn = document.getElementById("startBtn");
    if (startBtn) {
      startBtn.disabled = false;
    }
    addSystemMessage(`Project <strong>${escapeHtml(projectName)}</strong> registered. Click <strong>Start</strong> to begin development.`);
    awaitingProjectName = false;
    if (input) input.placeholder = "Ask Verno AI...";
    return;
  }

  if (!projectId) {
    // Show typing indicator while waiting for plan
    showTypingIndicator("pm");
    
    try {
      const response = await fetch("http://127.0.0.1:8000/api/projects/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message })
      });
      const data = await response.json();
      
      // Remove typing indicator
      removeTypingIndicator("pm");
      
      if (data.success) {
        extendedPrompt = message;
        currentPlan = data.plan;
        addMessageWithTypingEffect("pm", data.plan, new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }));
        awaitingPlanApproval = true;
      } else {
        throw new Error(data.detail);
      }
    } catch (error) {
      // Remove typing indicator in case of error
      removeTypingIndicator("pm");
      console.error("Error getting project plan:", error);
      showToast("Error", `Failed to get project plan: ${error.message}`, "error");
    }
    return;
  }

  try {
    await fetch(`http://127.0.0.1:8000/api/projects/${projectId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: message })
    });
  } catch (error) {
    console.error("Error sending agent message:", error);
    showToast("Error", "Failed to send message to agent", "error");
  }
}

function addMessageToUI(sender, text, time, targetAgent = null, scroll = true) {
  const isUser = sender === "user";
  
  if (!isUser && state.soundEffectsEnabled) {
    const notificationSound = document.getElementById("notification-sound");
    if (notificationSound) {
      notificationSound.play().catch(e => console.log("Audio play failed:", e));
    }
  }

  if (!isUser && state.desktopNotificationsEnabled && state.agentResponsesNotificationsEnabled) {
    const info = agentData[sender];
    const authorName = info ? info.name : sender;
    if (window.electronAPI && window.electronAPI.sendNotification) {
      window.electronAPI.sendNotification({ 
        title: `New message from ${authorName}`, 
        body: text 
      });
    }
  }

  const messagesContainer = document.getElementById("chatMessages");
  if (!messagesContainer) return;

  const messageDiv = document.createElement("div");
  messageDiv.className = `message-wrapper ${isUser ? "user" : "agent"}`;

  let agentTag = "";
  if (isUser && targetAgent) {
    const agentName = targetAgent === "all" ? "All" : agentData[targetAgent].short;
    agentTag = `<span class="message-tag ${targetAgent}">@${agentName}</span>`;
  }

  const info = isUser ? null : agentData[sender];
  const authorName = isUser ? "You" : (info ? info.name : sender);
  const agentIcons = { pm: '📋', dev: '💻', qa: '🧪', devops: '🚀' };
  const badgeHtml = !isUser ? `<span class="agent-avatar-badge ${sender}">${agentIcons[sender] || '🤖'}</span>` : '';
  const roleHtml = (!isUser && info) ? `<span class="message-role-tag ${sender}">${info.short}</span>` : '';

  messageDiv.innerHTML = `
    <div class="message-header">
      ${badgeHtml}
      <span class="message-author">${authorName}</span>
      ${roleHtml}
      <span class="message-time">${time}</span>
    </div>
    <div class="message-bubble">${agentTag}${escapeHtml(text)}</div>
  `;

  messagesContainer.appendChild(messageDiv);

  if (scroll) {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }
}

// Function to add message with typing effect
function addMessageWithTypingEffect(sender, text, time, targetAgent = null) {
  const isUser = sender === "user";
  
  if (!isUser && state.soundEffectsEnabled) {
    const notificationSound = document.getElementById("notification-sound");
    if (notificationSound) {
      notificationSound.play().catch(e => console.log("Audio play failed:", e));
    }
  }

  if (!isUser && state.desktopNotificationsEnabled && state.agentResponsesNotificationsEnabled) {
    const info = agentData[sender];
    const authorName = info ? info.name : sender;
    if (window.electronAPI && window.electronAPI.sendNotification) {
      window.electronAPI.sendNotification({ 
        title: `New message from ${authorName}`, 
        body: text 
      });
    }
  }

  const messagesContainer = document.getElementById("chatMessages");
  if (!messagesContainer) return;

  const messageDiv = document.createElement("div");
  messageDiv.className = `message-wrapper ${isUser ? "user" : "agent"}`;

  let agentTag = "";
  if (isUser && targetAgent) {
    const agentName = targetAgent === "all" ? "All" : agentData[targetAgent].short;
    agentTag = `<span class="message-tag ${targetAgent}">@${agentName}</span>`;
  }

  const info = isUser ? null : agentData[sender];
  const authorName = isUser ? "You" : (info ? info.name : sender);
  const agentIcons = { pm: '📋', dev: '💻', qa: '🧪', devops: '🚀' };
  const badgeHtml = !isUser ? `<span class="agent-avatar-badge ${sender}">${agentIcons[sender] || '🤖'}</span>` : '';
  const roleHtml = (!isUser && info) ? `<span class="message-role-tag ${sender}">${info.short}</span>` : '';

  messageDiv.innerHTML = `
    <div class="message-header">
      ${badgeHtml}
      <span class="message-author">${authorName}</span>
      ${roleHtml}
      <span class="message-time">${time}</span>
    </div>
    <div class="message-bubble">${agentTag}</div>
  `;

  messagesContainer.appendChild(messageDiv);

  if (!isUser) {
    // Apply typing effect to agent messages
    const bubble = messageDiv.querySelector('.message-bubble');
    const words = text.split(' ');
    bubble.innerHTML = agentTag; // Keep the agent tag

    let i = 0;
    const typingInterval = setInterval(() => {
      if (i < words.length) {
        // Add the current word and a space
        bubble.innerHTML += (i > 0 ? ' ' : '') + escapeHtml(words[i]);
        i++;
        messagesContainer.scrollTop = messagesContainer.scrollHeight; // Keep scrolling to bottom
      } else {
        clearInterval(typingInterval);
      }
    }, 100); // Speed of typing (100ms per word)
  } else {
    // For user messages, just add the text directly
    const bubble = messageDiv.querySelector('.message-bubble');
    bubble.innerHTML += escapeHtml(text);
  }

  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function addSystemMessage(text) {
  const messagesContainer = document.getElementById("chatMessages");
  if (!messagesContainer) return;
  
  const messageDiv = document.createElement("div");
  messageDiv.className = "message-wrapper system";
  messageDiv.innerHTML = `<div class="system-message-bubble">${text}</div>`;
  messagesContainer.appendChild(messageDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function detectLanguage(fileName) {
    const ext = fileName.split('.').pop().toLowerCase();
    const languages = {
        'js': 'javascript',
        'jsx': 'javascript',
        'ts': 'typescript',
        'tsx': 'typescript',
        'html': 'html',
        'htm': 'html',
        'css': 'css',
        'scss': 'scss',
        'less': 'less',
        'py': 'python',
        'json': 'json',
        'md': 'markdown',
        'xml': 'xml',
        'sql': 'sql',
        'sh': 'shell',
        'bat': 'bat',
        'yaml': 'yaml',
        'yml': 'yaml'
    };
    return languages[ext] || 'plaintext';
}

// Function to show typing indicator for an agent
function showTypingIndicator(agent) {
  const messagesContainer = document.getElementById("chatMessages");
  if (!messagesContainer) return;
  
  const info = agentData[agent];
  if (!info) return;

  const typingDiv = document.createElement("div");
  typingDiv.className = `message-wrapper agent`;
  typingDiv.id = `typing-${agent}`; // Unique ID to identify this typing indicator

  typingDiv.innerHTML = `
    <div class="message-header">
      <span class="message-author">${info.name}</span>
      <span class="message-time">typing...</span>
    </div>
    <div class="typing-indicator">
      <div class="typing-dots">
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      </div>
    </div>
  `;

  messagesContainer.appendChild(typingDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Function to remove typing indicator for an agent
function removeTypingIndicator(agent) {
  const typingElement = document.getElementById(`typing-${agent}`);
  if (typingElement) {
    typingElement.remove();
  }
}

function removeAllTypingIndicators() {
  document.querySelectorAll("[id^='typing-']").forEach(el => el.remove());
}

function initializeTextareaResize() {
  const textarea = document.getElementById("chatInput");
  if (textarea) {
    textarea.addEventListener("input", function () {
      this.style.height = "auto";
      this.style.height = Math.min(this.scrollHeight, 120) + "px";
    });
  }
}

// Code Editor
function initializeCodeEditor() {
  document.querySelectorAll(".code-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      const file = tab.dataset.file;
      switchFile(file);

      document.querySelectorAll(".code-tab").forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
    });
  });

  const fileTreeToggle = document.getElementById("fileTreeToggle");
  const fileTreePanel = document.getElementById("fileTreePanel");
  
  if (fileTreeToggle && fileTreePanel) {
    fileTreeToggle.addEventListener("click", function(event) {
      event.stopPropagation();
      fileTreePanel.classList.toggle("active");
    });
  }

  document.querySelectorAll(".file-tree-item").forEach((item) => {
    item.addEventListener("click", () => {
      const fileName = item.textContent.trim();
      if (codeFiles[fileName]) {
        switchFile(fileName);
        if (fileTreePanel) {
          fileTreePanel.classList.remove("active");
        }
      }
    });
  });

  const saveCodeBtn = document.getElementById("saveCodeBtn");
  const runCodeBtn = document.getElementById("runCodeBtn");
  const copyCodeBtn = document.getElementById("copyCodeBtn");

  if (saveCodeBtn) {
    saveCodeBtn.addEventListener("click", saveCurrentFile);
  }

  if (runCodeBtn) {
    runCodeBtn.addEventListener("click", () => {
      showToast("▶️ Running Code", `Executing ${state.currentFile}...`);
    });
  }

  if (copyCodeBtn) {
    copyCodeBtn.addEventListener("click", copyCodeToClipboard);
  }

  // Initialize Monaco Editor
  initMonaco();
}

function initMonaco() {
  if (typeof require !== 'undefined' && typeof require.config === 'function') {
    window.MonacoEnvironment = {
      getWorkerUrl: function (moduleId, label) {
        if (label === 'json') {
          return '../node_modules/monaco-editor/min/vs/language/json/json.worker.js';
        }
        if (label === 'css' || label === 'scss' || label === 'less') {
          return '../node_modules/monaco-editor/min/vs/language/css/css.worker.js';
        }
        if (label === 'html' || label === 'handlebars' || label === 'razor') {
          return '../node_modules/monaco-editor/min/vs/language/html/html.worker.js';
        }
        if (label === 'typescript' || label === 'javascript') {
          return '../node_modules/monaco-editor/min/vs/language/typescript/ts.worker.js';
        }
        return '../node_modules/monaco-editor/min/vs/editor/editor.worker.js';
      }
    };

    require.config({ paths: { vs: '../node_modules/monaco-editor/min/vs' } });

    require(['vs/editor/editor.main'], function () {
      const container = document.getElementById('monacoEditorContainer');
      if (!container) return;

      const isDark = state.theme === 'dark';
      window.monacoEditor = monaco.editor.create(container, {
        value: '// Verno Code Editor (Powered by Monaco / VS Code)\n// Select or generate a file to start editing\n',
        language: 'javascript',
        theme: isDark ? 'vs-dark' : 'vs',
        automaticLayout: true,
        fontSize: state.fontSize === 'small' ? 12 : (state.fontSize === 'large' ? 16 : 14),
        fontFamily: "'Fira Code', 'Cascadia Code', Consolas, monospace",
        fontLigatures: true,
        minimap: { enabled: true },
        scrollBeyondLastLine: false,
        lineNumbers: 'on',
        roundedSelection: true,
        cursorBlinking: 'smooth',
        cursorSmoothCaretAnimation: 'on',
        smoothScrolling: true,
        tabSize: 2,
        wordWrap: 'on'
      });

      // Update theme if custom codeTheme is set
      if (state.codeTheme === 'github') {
        monaco.editor.setTheme('vs');
      } else if (state.codeTheme === 'monokai' || state.codeTheme === 'dracula') {
        monaco.editor.setTheme('vs-dark');
      }

      // Track editor content changes
      window.monacoEditor.onDidChangeModelContent(() => {
        if (state.currentFile) {
          const val = window.monacoEditor.getValue();
          codeFiles[state.currentFile] = val;
          const model = window.monacoEditor.getModel();
          if (model) {
            updateEditorStats(model.getLineCount(), val.length);
          }
          if (window.livePreviewDebounceTimer) clearTimeout(window.livePreviewDebounceTimer);
          window.livePreviewDebounceTimer = setTimeout(() => {
            updateLivePreview();
          }, 600);
        }
      });

      const lineNumbersToggle = document.getElementById("lineNumbersToggle");
      if (lineNumbersToggle) {
        lineNumbersToggle.addEventListener("change", function() {
          if (window.monacoEditor) {
            window.monacoEditor.updateOptions({ lineNumbers: this.checked ? 'on' : 'off' });
          }
        });
      }
    });
  }
}

function updateSyntaxHighlighting(code) {
  // Monaco handles syntax highlighting automatically based on language model
}

// Function to simulate AI typing code word by word in the editor
let typingInterval = null;
let typingQueue = [];
let isTyping = false;

function processTypingQueue() {
  if (isTyping || typingQueue.length === 0) return;

  const nextTask = typingQueue.shift();
  isTyping = true;
  
  switchFile(nextTask.fileName);
  
  addCodeWithTypingEffect(nextTask.code, nextTask.fileName, () => {
    isTyping = false;
    updateLivePreview();
    setTimeout(processTypingQueue, 100);
  });
}

function addCodeWithTypingEffect(code, fileName, callback, speed = 10) {
  if (!window.monacoEditor) {
    codeFiles[fileName] = code;
    if (callback) callback();
    return;
  }

  if (typingInterval) {
    clearInterval(typingInterval);
    typingInterval = null;
  }

  const words = code.split(/(\s+)/);
  let currentText = '';
  let index = 0;

  if (state.currentFile === fileName) {
    window.monacoEditor.setValue('');
  }

  typingInterval = setInterval(() => {
    const isVisible = state.currentFile === fileName;

    if (index < words.length) {
      currentText += words[index];
      
      if (isVisible) {
        window.monacoEditor.setValue(currentText);
        const model = window.monacoEditor.getModel();
        if (model) {
          const lineCount = model.getLineCount();
          window.monacoEditor.revealLine(lineCount);
          updateEditorStats(lineCount, currentText.length);
        }
      }
      index++;
    } else {
      clearInterval(typingInterval);
      typingInterval = null;
      
      if (isVisible) {
        window.monacoEditor.setValue(currentText);
        const model = window.monacoEditor.getModel();
        if (model) {
          const lineCount = model.getLineCount();
          window.monacoEditor.revealLine(lineCount);
          updateEditorStats(lineCount, currentText.length);
        }
      }
      
      if (callback) callback();
    }
  }, speed);
}

async function saveCurrentFile() {
  if (!state.currentFile) {
    showToast("Warning", "No file selected to save", "warning");
    return;
  }
  const content = window.monacoEditor ? window.monacoEditor.getValue() : (codeFiles[state.currentFile] || "");
  codeFiles[state.currentFile] = content;
  
  if (window.electronAPI && window.electronAPI.writeFile) {
    try {
      const projectDir = localStorage.getItem('projectDirectory');
      let filePath = state.currentFile;
      if (projectDir && window.electronAPI.joinPath) {
        filePath = await window.electronAPI.joinPath(projectDir, state.currentFile);
      }
      const result = await window.electronAPI.writeFile(filePath, content);
      if (result && result.success) {
        showToast("💾 File Saved", `${state.currentFile} has been saved successfully`);
        updateLivePreview();
      } else {
        showToast("Error", `Failed to save file: ${result ? result.error : 'Unknown error'}`, "error");
      }
    } catch (err) {
      showToast("Error", `Failed to save file: ${err.message}`, "error");
    }
  } else {
    showToast("💾 File Saved", `${state.currentFile} has been saved successfully`);
    updateLivePreview();
  }
}

function copyCodeToClipboard() {
  const code = window.monacoEditor ? window.monacoEditor.getValue() : (codeFiles[state.currentFile] || "");
  if (code) {
    navigator.clipboard.writeText(code)
      .then(() => {
        showToast("📋 Copied", "Code copied to clipboard");
      })
      .catch(err => {
        showToast("Error", "Failed to copy code to clipboard", "error");
      });
  }
}

function switchFile(fileName) {
  state.currentFile = fileName;
  const currentFileDisplay = document.getElementById("editorCurrentFileDisplay");
  if (currentFileDisplay) {
    currentFileDisplay.textContent = fileName || "No file open";
  }
  const code = codeFiles[fileName] || "// File not found";
  
  // Ensure tab exists for this file
  addFileToCodeTabs(fileName);
  
  if (window.monacoEditor && window.monaco) {
    const lang = detectLanguage(fileName);
    const oldModel = window.monacoEditor.getModel();
    const newModel = monaco.editor.createModel(code, lang);
    window.monacoEditor.setModel(newModel);
    if (oldModel) {
      oldModel.dispose();
    }
    updateEditorStats(newModel.getLineCount(), code.length);
  }

  // Update active state in tabs
  document.querySelectorAll(".code-tab").forEach((tab) => {
    if (tab.dataset.file === fileName) {
      tab.classList.add("active");
    } else {
      tab.classList.remove("active");
    }
  });

  // Update active state in file tree
  document.querySelectorAll(".file-tree-item").forEach((item) => {
    const itemFileName = item.getAttribute('data-file-path') || item.textContent.trim();
    if (itemFileName === fileName) {
      item.classList.add("active");
    } else {
      item.classList.remove("active");
    }
  });
}

function updateLineNumbers(code) {
  // Handled natively by Monaco
}

function syncLineNumbersScroll() {
  // Handled natively by Monaco
}

function updateEditorStats(lines, size) {
  const statsElement = document.getElementById("editorStats");
  if (statsElement) {
    statsElement.textContent = `Lines: ${lines} | Size: ${size} bytes`;
  }
}

function updateProjectProgress(percent, text = null) {
  const rounded = Math.round(percent);
  const progressBar = document.getElementById("projectProgressBar");
  const progressText = document.getElementById("projectProgressText");
  const headerPercent = document.getElementById("headerProgressPercent");
  
  if (progressBar) {
    progressBar.style.width = `${rounded}%`;
  }
  
  if (progressText) {
    progressText.textContent = text || `Project Progress: ${rounded}%`;
  }

  if (headerPercent) {
    headerPercent.textContent = `${rounded}%`;
  }
}

function getFileIcon(fileName) {
  const ext = fileName.split('.').pop().toLowerCase();
  const icons = {
    'py': '<svg width="14" height="14" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15.865 1.87c-3.636 0-6.243 1.566-7.628 3.98l-.157.286h4.889c1.698 0 2.383.877 2.383 2.705v.328h-8.82c-3.249 0-6.422 2.19-6.517 6.096l-.003.223c0 3.636 2.76 5.797 5.958 5.992l.319.011h1.622v-2.16c0-2.468 1.46-3.728 4.398-3.728h3.296v-1.185c0-2.842-2.038-4.263-5.168-4.263h-.385l.003.024c1.138-1.758 3.093-2.778 5.81-2.778 2.496 0 4.275.63 5.192 1.51l.143.143 1.607-1.95-.186-.17c-1.263-1.14-3.614-2.04-6.764-2.04z" fill="#3776AB"/><path d="M16.135 30.13c3.636 0 6.243-1.566 7.628-3.98l.157-.286h-4.889c-1.698 0-2.383-.877-2.383-2.705v-.328h8.82c3.249 0 6.422-2.19 6.517-6.096l.003-.223c0-3.636-2.76-5.797-5.958-5.992l-.319-.011h-1.622v2.16c0 2.468-1.46 3.728-4.398 3.728h-3.296v1.185c0 2.842 2.038 4.263 5.168 4.263h.385l-.003-.024c-1.138 1.758-3.093 2.778-5.81 2.778-2.496 0-4.275-.63-5.192-1.51l-.143-.143-1.607 1.95.186.17c1.263 1.14 3.614 2.04 6.764 2.04z" fill="#FFD43B"/></svg>',
    'js': '<svg width="14" height="14" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M0 0h32v32H0V0z" fill="#F7DF1E"/><path d="M6.8 24.6c0 .7.6 1.3 1.4 1.3 1 0 1.5-.6 1.5-1.6v-5.6h3v5.6c0 2.4-1.6 4.1-4.4 4.1-2.5 0-4.1-1.5-4.3-3.5l2.8-.3zm10.7 1.4c1.7 0 2.6-.8 2.8-2.1l-2.7-.3c-.1.6-.5.8-1 .8-.6 0-1-.3-1-1 0-.6.5-.9 1.4-1.3 1.5-.6 2.7-1.5 2.7-3.6 0-2.3-1.6-3.8-4.1-3.8-2.6 0-4.2 1.5-4.4 3.8l2.8.3c.1-.9.8-1.6 1.7-1.6.7 0 1.1.3 1.1.9 0 .6-.4.9-1.2 1.2-1.7.7-2.9 1.6-2.9 3.7 0 2.2 1.6 3.9 4.4 3.9.1-.9-.1-.9.4-1.1zm.3-4.5c-.6 0-.9-.3-.9-.8 0-.5.3-.7.9-.7.6 0 .9.3.9.8 0 .5-.4.7-.9.7z" fill="#000"/></svg>',
    'html': '<svg width="14" height="14" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4.3 27.9L2.1 2.8h27.8l-2.2 25.1L16 30.7l-11.7-2.8z" fill="#E34F26"/><path d="M16 28l9.3-2.5 1.8-20.2H4.9l1.8 20.2L16 28z" fill="#EF652A"/><path d="M16 13.7v-3H9l.3 3.6h6.7zm0 6.1l-.1.7-4.2-1.1-.3-2.8H8.2l.4 5.4 7.4 2 .1-4.2z" fill="#fff"/><path d="M16 13.7h6.7l-.6 7.3-6.1 1.6v-2.7l3.4-.9.2-2.3H16v-3z" fill="#EEE"/></svg>',
    'css': '<svg width="14" height="14" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4.3 27.9L2.1 2.8h27.8l-2.2 25.1L16 30.7l-11.7-2.8z" fill="#1572B6"/><path d="M16 28l9.3-2.5 1.8-20.2H4.9l1.8 20.2L16 28z" fill="#33A9DC"/><path d="M16 13.7v-3H9l.3 3.6h6.7zm0 6.1l-.1.7-4.2-1.1-.3-2.8H8.2l.4 5.4 7.4 2 .1-4.2z" fill="#fff"/><path d="M16 13.7h6.7l-.6 7.3-6.1 1.6v-2.7l3.4-.9.2-2.3H16v-3z" fill="#EEE"/></svg>',
    'json': '<svg width="14" height="14" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 0C7.16 0 0 7.16 0 16s7.16 16 16 16 16-7.16 16-16S24.84 0 16 0zm-3 24h-2v-2h2v2zm5-12h-2v-2h2v2zm-5-4h-2V6h2v2zm5 8h-2v-2h2v2zm5 8h-2v-2h2v2zm-5 4h-2v-2h2v2zm5-12h-2v-2h2v2z" fill="#CB3837"/></svg>',
    'md': '<svg width="14" height="14" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M29.2 3.3H2.8C1.3 3.3 0 4.6 0 6.1v19.8c0 1.5 1.3 2.8 2.8 2.8h26.4c1.5 0 2.8-1.3 2.8-2.8V6.1c0-1.5-1.3-2.8-2.8-2.8zM7.3 22.6H4.5V9.4h2.8v13.2zm6.8 0l-4-5h2.8V9.4h2.4v8.2h2.8l-4 5zm11.4 0h-2.8V9.4h2.8v13.2z" fill="#fff"/></svg>'
  };
  return icons[ext] || '<svg width="14" height="14" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 2h13l7 7v19a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M19 2v7h7" fill="none" stroke="currentColor" stroke-width="2"/><path d="M16 28v-10" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 22h8" fill="none" stroke="currentColor" stroke-width="2"/></svg>';
}

// Add file to file tree and code tabs if it doesn't exist
function addFileToFileTree(fileName) {
  const fileTreeContainer = document.querySelector('.file-tree-panel');
  if (!fileTreeContainer) return;
  
  // Check if file already exists in the tree
  const existingFile = fileTreeContainer.querySelector(`[data-file-path="${fileName}"]`);
  if (existingFile) return;  // File already exists
  
  // Create new file item
  const fileItem = document.createElement('div');
  fileItem.className = 'file-tree-item';
  fileItem.setAttribute('data-file-path', fileName);
  
  fileItem.innerHTML = `
    ${getFileIcon(fileName)}
    ${fileName}
  `;
  
  // Add click event to open the file
  fileItem.addEventListener('click', () => {
    // Switch to this file in the editor
    switchFile(fileName);
    
    // Close the file tree panel
    const fileTreePanel = document.getElementById("fileTreePanel");
    if (fileTreePanel) {
      fileTreePanel.classList.remove("active");
    }
    
    // Update active state in the file tree
    document.querySelectorAll('.file-tree-item').forEach(item => {
      item.classList.remove('active');
    });
    fileItem.classList.add('active');
  });
  
  // Add to the file tree
  fileTreeContainer.appendChild(fileItem);
  
  // Removed call to addFileToCodeTabs so it doesn't open automatically
}

// Add file to code tabs if it doesn't exist
function addFileToCodeTabs(fileName) {
  const codeTabsContainer = document.querySelector('.code-tabs');
  if (!codeTabsContainer) return;
  
  // Check if tab already exists
  const existingTab = codeTabsContainer.querySelector(`[data-file="${fileName}"]`);
  if (existingTab) return;  // Tab already exists
  
  // Create new tab
  const tab = document.createElement('div');
  tab.className = 'code-tab';
  tab.setAttribute('data-file', fileName);
  
  tab.innerHTML = `
    ${getFileIcon(fileName)}
    <span>${fileName}</span>
    <span class="close-tab" style="margin-left: 8px; opacity: 0.6; font-size: 14px;">&times;</span>
  `;
  
  // Add click event to switch to this file
  tab.addEventListener('click', (e) => {
    if (e.target.classList.contains('close-tab')) {
      e.stopPropagation();
      tab.remove();
      // If active tab is closed, switch to another one if available
      if (tab.classList.contains('active')) {
        const remainingTabs = document.querySelectorAll('.code-tab');
        if (remainingTabs.length > 0) {
          const lastTab = remainingTabs[remainingTabs.length - 1];
          switchFile(lastTab.dataset.file);
        } else {
            // clear editor
            if (window.monacoEditor) {
                window.monacoEditor.setValue("");
            }
            updateEditorStats(0, 0);
            state.currentFile = "";
        }
      }
      return;
    }
    switchFile(fileName);
    
    // Update active state in tabs
    document.querySelectorAll('.code-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
  });
  
  // Add to the code tabs
  codeTabsContainer.appendChild(tab);
  
  // If this is the first tab being added, make it active and switch to it
  if (codeTabsContainer.children.length === 1) {
    tab.classList.add('active');
    switchFile(fileName);
  }
}

// Remove file from file tree
function removeFileFromFileTree(fileName) {
  const fileTreeContainer = document.querySelector('.file-tree-panel');
  if (!fileTreeContainer) return;
  
  const fileItem = fileTreeContainer.querySelector(`[data-file-path="${fileName}"]`);
  if (fileItem) {
    fileItem.remove();
  }
}

// Controls
function initializeControls() {
  const newProjectBtn = document.getElementById("newProjectBtn");
  const startBtn = document.getElementById("startBtn");
  const pauseBtn = document.getElementById("pauseBtn");
  const stopBtn = document.getElementById("stopBtn");

  if (newProjectBtn) {
    newProjectBtn.addEventListener("click", handleNewProject);
  }
  if (startBtn) {
    startBtn.addEventListener("click", handleStart);
  }
  if (pauseBtn) {
    pauseBtn.addEventListener("click", handlePause);
  }
  if (stopBtn) {
    stopBtn.addEventListener("click", handleStop);
  }
}

function handleNewProject() {
  if (state.isRunning || projectId) {
    if (!confirm("Start a new project? This will clear current progress.")) {
      return;
    }
  }

  if (state.isRunning) {
    handleStop();
  }

  // Reset Variables
  projectId = "";
  extendedPrompt = "";
  projectName = "";
  awaitingProjectName = false;
  awaitingPlanApproval = false;
  
  // Reset State
  state.isRunning = false;
  state.conversation = [];
  state.projectStatus = "ready";
  state.progress = 0;
  state.currentFile = "";
  for (const key in codeFiles) delete codeFiles[key];

  // UI Resets
  const messagesContainer = document.getElementById("chatMessages");
  if (messagesContainer) {
    messagesContainer.innerHTML = `
      <div class="message-wrapper agent">
        <div class="message-header">
          <span class="agent-avatar-badge pm">📋</span>
          <span class="message-author" data-translate="Project Manager">Project Manager</span>
          <span class="message-role-tag pm">PM</span>
          <span class="message-time">Just now</span>
        </div>
        <div class="message-bubble" data-translate="Hello! I'm your Project Manager. Let's start building something amazing together! 🚀">
          Hello! I'm your Project Manager. Tell me what application or feature you'd like to build today, and our team will plan and craft it for you! 🚀
        </div>
      </div>
    `;
  }
  
  if (window.monacoEditor) {
    window.monacoEditor.setValue("");
  }
  updateEditorStats(0, 0);
  
  const fileTreePanel = document.getElementById("fileTreePanel");
  if (fileTreePanel) {
    const header = fileTreePanel.querySelector("h3");
    fileTreePanel.innerHTML = "";
    if (header) fileTreePanel.appendChild(header);
  }
  
  const codeTabs = document.querySelector(".code-tabs");
  if (codeTabs) {
    codeTabs.innerHTML = "";
  }
  
  const currentProjectName = document.getElementById("currentProjectName");
  if (currentProjectName) {
    currentProjectName.textContent = "No active project";
  }
  updatePhasePill("IDLE");
  const currentFileDisplay = document.getElementById("editorCurrentFileDisplay");
  if (currentFileDisplay) {
    currentFileDisplay.textContent = "No file open";
  }
  const activityText = document.getElementById("agentActivityText");
  if (activityText) {
    activityText.textContent = "Studio Ready";
  }
  renderTasks([]);
  updateLivePreview();

  updateProjectProgress(0);
  updateStatus("Ready");
  updateControlButtons();
  
  const chatInput = document.getElementById("chatInput");
  if (chatInput) {
    chatInput.value = "";
    chatInput.focus();
  }
  
  showToast("New Project", "Ready for a new project!");
}

async function handleStart() {
  if (!projectName) {
    showToast("Error", "Please provide a project name first.", "error");
    return;
  }

  let projectDirectory = "";
  if (window.electronAPI && window.electronAPI.selectDirectory) {
    projectDirectory = await window.electronAPI.selectDirectory();
    if (!projectDirectory) {
      showToast("Error", "Please select a project directory", "error");
      return;
    }
  } else {
    projectDirectory = "/default/project/path";
  }

  // Store the project directory path
  let fullProjectPath = projectDirectory;
  if (window.electronAPI && window.electronAPI.joinPath) {
    fullProjectPath = await window.electronAPI.joinPath(projectDirectory, projectName);
  }
  localStorage.setItem('projectDirectory', fullProjectPath);

  try {
    const response = await fetch("http://127.0.0.1:8000/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project_name: projectName,
        requirement: extendedPrompt,
        project_directory: projectDirectory
      })
    });
    const data = await response.json();
    if (data.success) {
      projectId = data.project_id;
    } else {
      throw new Error(data.detail);
    }
  } catch (error) {
    console.error("Error creating project:", error);
    showToast("Error", "Failed to create project", "error");
    return;
  }

  state.isRunning = true;
  updateControlButtons();
  updateStatus("Running");
  updatePhasePill("RUNNING");

  const eventSource = new EventSource(`http://127.0.0.1:8000/api/projects/${projectId}/start`);

  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);

    switch (data.type) {
      case "start":
        addSystemMessage(data.message);
        break;
      case "progress":
        if (data.agent && data.message) {
          const agentKey = roleMap[data.agent] || data.agent;
          if (agentKey) {
            addMessageWithTypingEffect(agentKey, data.message, new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }));
            highlightActiveAgent(agentKey, `${agentData[agentKey]?.name || agentKey}: active`);
          }
        }
        // Handle file operations - show code being written with typing effect
        if (data.file_operations && data.file_operations.length > 0) {
          for (const fileOp of data.file_operations) {
            if (fileOp.operation === 'create' || fileOp.operation === 'update') {
              // Check if this is a new file (doesn't exist in our records yet)
              const isNewFile = !(fileOp.path in codeFiles);
              
              // Update the codeFiles object with the new content
              codeFiles[fileOp.path] = fileOp.content;
              
              // Add file to file tree and tabs if it doesn't already exist
              addFileToFileTree(fileOp.path);
              
              // If the operation is for the currently selected file or a new file, show the typing effect
              if (fileOp.content) {
                // Add to typing queue
                typingQueue.push({
                  fileName: fileOp.path,
                  code: fileOp.content
                });
                
                // Start processing if not already running
                processTypingQueue();
              }
            } else if (fileOp.operation === 'delete') {
              // Remove from codeFiles and file tree
              delete codeFiles[fileOp.path];
              removeFileFromFileTree(fileOp.path);
              
              // If the deleted file was the current file, switch to the first available file
              if (state.currentFile === fileOp.path) {
                const availableFiles = Object.keys(codeFiles);
                if (availableFiles.length > 0) {
                  switchFile(availableFiles[0]);
                } else {
                  // If no files are left, clear the editor
                  if (window.monacoEditor) {
                    window.monacoEditor.setValue("");
                  }
                  updateEditorStats(0, 0);
                  state.currentFile = "";
                }
              }
            }
          }
          updateLivePreview();
        }
        if (data.tasks) {
          renderTasks(data.tasks);
        }
        if (data.current_phase) {
          updateStatus(data.current_phase);
          updatePhasePill(data.current_phase);
        }
        
        // Calculate and update project progress
        // Assume different phases contribute different percentages to the overall project
        let progressPercent = 0;
        if (data.current_phase) {
          switch(data.current_phase) {
            case 'initialization':
              progressPercent = 10;
              break;
            case 'planning':
              progressPercent = 20;
              break;
            case 'development':
              progressPercent = 50; // This can vary based on tasks completed
              break;
            case 'testing':
              progressPercent = 80;
              break;
            case 'deployment':
              progressPercent = 95;
              break;
            case 'complete':
            case 'Completed':
              progressPercent = 100;
              break;
            default:
              progressPercent = 30; // Default progress for other states
          }
        }
        
        // If there are tasks data, we can calculate more precise progress
        if (data.tasks && data.tasks.length > 0) {
          const totalTasks = data.tasks.length;
          const completedTasks = data.tasks.filter(task => task.status === 'completed').length;
          const tasksProgress = (completedTasks / totalTasks) * 100 * 0.7; // Tasks contribute 70% to progress
          
          // Adjust development progress based on tasks completed
          if (data.current_phase === 'development') {
            progressPercent = Math.min(50, 20 + tasksProgress); // Up to 50% for development
          } else if (data.current_phase === 'testing') {
            progressPercent = Math.min(80, 50 + (tasksProgress * 0.5)); // Testing phase
          }
        }
        
        updateProjectProgress(progressPercent, `Project Progress: ${Math.round(progressPercent)}%`);
        
        if (data.is_complete) {
          removeAllTypingIndicators();
          updateStatus("Completed");
          updatePhasePill("COMPLETE");
          updateProjectProgress(100, "Project Completed: 100%");
          showToast("Success", "Project completed successfully!", "success");
          state.isRunning = false;
          updateControlButtons();
          eventSource.close();
        }
        break;
      case "complete":
        removeAllTypingIndicators();
        updateStatus("Completed");
        updatePhasePill("COMPLETE");
        updateProjectProgress(100, "Project Completed: 100%");
        showToast("Success", "Project completed successfully!", "success");
        state.isRunning = false;
        updateControlButtons();
        eventSource.close();
        break;
      case "error":
        removeAllTypingIndicators();
        showToast("Error", data.message, "error");
        updateStatus("Error");
        state.isRunning = false;
        updateControlButtons();
        eventSource.close();
        break;
      default:
        console.log("Unknown message type:", data.type);
    }
  };

  eventSource.onerror = (error) => {
    console.error("SSE error:", error);
    eventSource.close();
    updateStatus("Error");
    state.isRunning = false;
    updateControlButtons();
  };
}

function handlePause() {
  state.isRunning = false;
  updateControlButtons();
  updateStatus("Paused");
}

function handleStop() {
  state.isRunning = false;
  updateControlButtons();
  updateStatus("Ready");
  projectId = "";
  extendedPrompt = "";
}

function updateControlButtons() {
  const startBtn = document.getElementById("startBtn");
  const pauseBtn = document.getElementById("pauseBtn");
  const stopBtn = document.getElementById("stopBtn");

  if (startBtn) {
    startBtn.disabled = state.isRunning;
  }
  if (pauseBtn) {
    pauseBtn.disabled = !state.isRunning;
  }
  if (stopBtn) {
    stopBtn.disabled = !state.isRunning;
  }
}

function updateStatus(text) {
  const statusElement = document.getElementById("systemStatusText") || document.querySelector(".status-text");
  if (statusElement) {
    statusElement.textContent = text;
  }
}

// Show environment settings
function showEnvSettings() {
  // Create modal overlay
  const modalOverlay = document.createElement("div");
  modalOverlay.className = "modal-overlay";
  modalOverlay.style.cssText = `
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: fadeIn 0.3s ease;
    z-index: 2000;
  `;

  // Create modal content
  const modal = document.createElement("div");
  modal.style.cssText = `
    background: var(--bg-elevated);
    border-radius: 24px;
    width: 90%;
    max-width: 800px;
    max-height: 80vh;
    overflow: hidden;
    box-shadow: var(--shadow-2xl);
    display: flex;
    flex-direction: column;
  `;

  // Create modal header
  const modalHeader = document.createElement("div");
  modalHeader.style.cssText = `
    padding: 28px 32px;
    border-bottom: 1px solid var(--border-color);
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: var(--bg-elevated);
  `;

  modalHeader.innerHTML = `
    <h2 style="font-size: 24px; font-weight: 800; letter-spacing: -0.5px; color: var(--text-primary); margin: 0;" data-translate="Environment Settings">
      ${translations[state.language]["Environment Settings"] || "Environment Settings"}
    </h2>
    <button id="closeEnvSettings" style="
      width: 40px;
      height: 40px;
      border-radius: 12px;
      border: none;
      background: var(--bg-secondary);
      color: var(--text-secondary);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
      font-size: 20px;
    ">&times;</button>
  `;

  // Create modal body
  const modalBody = document.createElement("div");
  modalBody.style.cssText = `
    padding: 32px;
    overflow-y: auto;
    flex: 1;
  `;

  // Fetch environment settings and display them
  modalBody.innerHTML = `
    <div class="env-settings-container">
      <div class="settings-section">
        <div class="settings-section-title" data-translate="AI Provider Configuration">
          ${translations[state.language]["AI Provider Configuration"] || "AI Provider Configuration"}
        </div>
        <div class="setting-item" style="padding: 12px 16px; background: var(--bg-secondary); border-radius: 16px; margin-bottom: 12px; border: 2px solid transparent;">
          <div class="setting-info">
            <div class="setting-label" data-translate="Base URL">
              ${translations[state.language]["Base URL"] || "Base URL"}
            </div>
            <div class="setting-description" data-translate="AI Provider Base URL">
              ${translations[state.language]["AI Provider Base URL"] || "AI Provider Base URL"}
            </div>
          </div>
          <div id="envBaseUrl" style="font-family: monospace; font-size: 14px; padding: 8px 12px; background: var(--bg-tertiary); border-radius: 8px; color: var(--text-secondary); font-weight: 500;">
            Loading...
          </div>
        </div>
        
        <div class="setting-item" style="padding: 12px 16px; background: var(--bg-secondary); border-radius: 16px; margin-bottom: 12px; border: 2px solid transparent;">
          <div class="setting-info">
            <div class="setting-label" data-translate="API Key">
              ${translations[state.language]["API Key"] || "API Key"}
            </div>
            <div class="setting-description" data-translate="AI Provider API Key">
              ${translations[state.language]["AI Provider API Key"] || "AI Provider API Key"}
            </div>
          </div>
          <div id="envApiKey" style="font-family: monospace; font-size: 14px; padding: 8px 12px; background: var(--bg-tertiary); border-radius: 8px; color: var(--text-secondary); font-weight: 500;">
            •••••••••••••••
          </div>
        </div>
      </div>

      <div class="settings-divider"></div>

      <div class="settings-section">
        <div class="settings-section-title" data-translate="Model Configuration">
          ${translations[state.language]["Model Configuration"] || "Model Configuration"}
        </div>
        <div class="setting-item" style="padding: 12px 16px; background: var(--bg-secondary); border-radius: 16px; margin-bottom: 12px; border: 2px solid transparent;">
          <div class="setting-info">
            <div class="setting-label" data-translate="Project Manager Model">
              ${translations[state.language]["Project Manager Model"] || "Project Manager Model"}
            </div>
            <div class="setting-description" data-translate="Model for project planning">
              ${translations[state.language]["Model for project planning"] || "Model for project planning"}
            </div>
          </div>
          <div id="envPmModel" style="font-family: monospace; font-size: 14px; padding: 8px 12px; background: var(--bg-tertiary); border-radius: 8px; color: var(--text-secondary); font-weight: 500;">
            Loading...
          </div>
        </div>
        
        <div class="setting-item" style="padding: 12px 16px; background: var(--bg-secondary); border-radius: 16px; margin-bottom: 12px; border: 2px solid transparent;">
          <div class="setting-info">
            <div class="setting-label" data-translate="Developer Model">
              ${translations[state.language]["Developer Model"] || "Developer Model"}
            </div>
            <div class="setting-description" data-translate="Model for code generation">
              ${translations[state.language]["Model for code generation"] || "Model for code generation"}
            </div>
          </div>
          <div id="envDevModel" style="font-family: monospace; font-size: 14px; padding: 8px 12px; background: var(--bg-tertiary); border-radius: 8px; color: var(--text-secondary); font-weight: 500;">
            Loading...
          </div>
        </div>
        
        <div class="setting-item" style="padding: 12px 16px; background: var(--bg-secondary); border-radius: 16px; margin-bottom: 12px; border: 2px solid transparent;">
          <div class="setting-info">
            <div class="setting-label" data-translate="QA Tester Model">
              ${translations[state.language]["QA Tester Model"] || "QA Tester Model"}
            </div>
            <div class="setting-description" data-translate="Model for testing tasks">
              ${translations[state.language]["Model for testing tasks"] || "Model for testing tasks"}
            </div>
          </div>
          <div id="envQaModel" style="font-family: monospace; font-size: 14px; padding: 8px 12px; background: var(--bg-tertiary); border-radius: 8px; color: var(--text-secondary); font-weight: 500;">
            Loading...
          </div>
        </div>
        
        <div class="setting-item" style="padding: 12px 16px; background: var(--bg-secondary); border-radius: 16px; margin-bottom: 12px; border: 2px solid transparent;">
          <div class="setting-info">
            <div class="setting-label" data-translate="DevOps Model">
              ${translations[state.language]["DevOps Model"] || "DevOps Model"}
            </div>
            <div class="setting-description" data-translate="Model for deployment tasks">
              ${translations[state.language]["Model for deployment tasks"] || "Model for deployment tasks"}
            </div>
          </div>
          <div id="envDevopsModel" style="font-family: monospace; font-size: 14px; padding: 8px 12px; background: var(--bg-tertiary); border-radius: 8px; color: var(--text-secondary); font-weight: 500;">
            Loading...
          </div>
        </div>
      </div>
    </div>
  `;

  // Add the elements to the modal
  modal.appendChild(modalHeader);
  modal.appendChild(modalBody);
  modalOverlay.appendChild(modal);
  document.body.appendChild(modalOverlay);

  // Add event listener to close button
  const closeBtn = document.getElementById("closeEnvSettings");
  closeBtn.addEventListener("click", () => {
    modalOverlay.remove();
  });

  // Add click outside to close
  modalOverlay.addEventListener("click", (e) => {
    if (e.target === modalOverlay) {
      modalOverlay.remove();
    }
  });

  // Fetch actual settings from the backend
  fetchEnvSettings(modalBody);

  // Add keydown listener for Escape key
  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      modalOverlay.remove();
      document.removeEventListener("keydown", handleKeyDown);
    }
  };
  document.addEventListener("keydown", handleKeyDown);
}

// Fetch environment settings from backend
async function fetchEnvSettings(modalBody) {
  try {
    const response = await fetch(`${config.API_BASE_URL}/api/config`);
    const data = await response.json();
    
    if (data.success && data.config) {
      document.getElementById("envBaseUrl").textContent = data.config.AI_PROVIDER_BASE_URL || "Not configured";
      document.getElementById("envApiKey").textContent = "•••••••••••••••"; // Masked for security
      document.getElementById("envPmModel").textContent = data.config.PROJECT_MANAGER_MODEL;
      document.getElementById("envDevModel").textContent = data.config.DEVELOPER_MODEL;
      document.getElementById("envQaModel").textContent = data.config.QA_TESTER_MODEL;
      document.getElementById("envDevopsModel").textContent = data.config.DEVOPS_MODEL;
    } else {
      document.getElementById("envBaseUrl").textContent = "Error loading";
      document.getElementById("envApiKey").textContent = "Error loading";
      document.getElementById("envPmModel").textContent = "Error loading";
      document.getElementById("envDevModel").textContent = "Error loading";
      document.getElementById("envQaModel").textContent = "Error loading";
      document.getElementById("envDevopsModel").textContent = "Error loading";
    }
  } catch (error) {
    console.error("Error fetching environment settings:", error);
    document.getElementById("envBaseUrl").textContent = "Error loading";
    document.getElementById("envApiKey").textContent = "Error loading";
    document.getElementById("envPmModel").textContent = "Error loading";
    document.getElementById("envDevModel").textContent = "Error loading";
    document.getElementById("envQaModel").textContent = "Error loading";
    document.getElementById("envDevopsModel").textContent = "Error loading";
  }
}

// Toast Notifications
function showToast(title, message) {
  const toast = document.createElement("div");
  toast.style.cssText = `
    position: fixed;
    top: 90px;
    right: 28px;
    background: var(--bg-elevated);
    padding: 18px 24px;
    border-radius: 14px;
    box-shadow: var(--shadow-xl);
    border: 1px solid var(--border-color);
    z-index: 1000;
    animation: slideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    min-width: 280px;
  `;

  toast.innerHTML = `
    <div style="font-weight: 700; margin-bottom: 4px; font-size: 15px;">${title}</div>
    <div style="font-size: 13px; color: var(--text-secondary);">${message}</div>
  `;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = "slideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1) reverse";
    setTimeout(() => toast.remove(), 400);
  }, 3000);
}

// Auto-save interval
setInterval(() => {
  if (state.autoSaveEnabled && state.currentFile) {
    saveCurrentFile();
  }
}, 10000);

// ==========================================================================
// STUDIO WORKSPACE: DUAL VIEW MODES (EDITOR, SPLIT, PREVIEW)
// ==========================================================================

function initializeStudioViewModes() {
  const modeEditorBtn = document.getElementById("viewModeEditor");
  const modeSplitBtn = document.getElementById("viewModeSplit");
  const modePreviewBtn = document.getElementById("viewModePreview");
  const studioWorkspace = document.getElementById("studioWorkspace");

  if (!studioWorkspace) return;

  function setMode(mode) {
    studioWorkspace.classList.remove("mode-editor", "mode-split", "mode-preview");
    studioWorkspace.classList.add(`mode-${mode}`);

    [modeEditorBtn, modeSplitBtn, modePreviewBtn].forEach(btn => {
      if (btn) btn.classList.remove("active");
    });

    if (mode === "editor" && modeEditorBtn) modeEditorBtn.classList.add("active");
    if (mode === "split" && modeSplitBtn) modeSplitBtn.classList.add("active");
    if (mode === "preview" && modePreviewBtn) modePreviewBtn.classList.add("active");

    // Re-layout monaco editor if visible
    if (mode !== "preview" && window.monacoEditor) {
      setTimeout(() => {
        window.monacoEditor.layout();
      }, 50);
    }

    if (mode !== "editor") {
      updateLivePreview();
    }
  }

  if (modeEditorBtn) modeEditorBtn.addEventListener("click", () => setMode("editor"));
  if (modeSplitBtn) modeSplitBtn.addEventListener("click", () => setMode("split"));
  if (modePreviewBtn) modePreviewBtn.addEventListener("click", () => setMode("preview"));
}

// ==========================================================================
// LIVE WEB PREVIEW ENGINE (IFRAME SRCDOC COMPILATION)
// ==========================================================================

function initializeLivePreview() {
  const reloadBtn = document.getElementById("previewReloadBtn");
  if (reloadBtn) {
    reloadBtn.addEventListener("click", () => {
      reloadBtn.style.transform = "rotate(360deg)";
      reloadBtn.style.transition = "transform 0.5s ease";
      updateLivePreview();
      setTimeout(() => {
        reloadBtn.style.transform = "";
        reloadBtn.style.transition = "";
      }, 500);
      showToast("🔄 Preview Reloaded", "Web preview refreshed");
    });
  }

  const deviceDesktop = document.getElementById("deviceDesktopBtn");
  const deviceTablet = document.getElementById("deviceTabletBtn");
  const deviceMobile = document.getElementById("deviceMobileBtn");
  const previewIframe = document.getElementById("previewIframe");

  function setDevice(device) {
    [deviceDesktop, deviceTablet, deviceMobile].forEach(btn => {
      if (btn) btn.classList.remove("active");
    });

    if (!previewIframe) return;

    if (device === "desktop") {
      if (deviceDesktop) deviceDesktop.classList.add("active");
      previewIframe.style.width = "100%";
      previewIframe.style.maxWidth = "100%";
    } else if (device === "tablet") {
      if (deviceTablet) deviceTablet.classList.add("active");
      previewIframe.style.width = "768px";
      previewIframe.style.maxWidth = "100%";
    } else if (device === "mobile") {
      if (deviceMobile) deviceMobile.classList.add("active");
      previewIframe.style.width = "375px";
      previewIframe.style.maxWidth = "100%";
    }
  }

  if (deviceDesktop) deviceDesktop.addEventListener("click", () => setDevice("desktop"));
  if (deviceTablet) deviceTablet.addEventListener("click", () => setDevice("tablet"));
  if (deviceMobile) deviceMobile.addEventListener("click", () => setDevice("mobile"));

  // Initial preview render
  updateLivePreview();
}

function updateLivePreview() {
  const previewIframe = document.getElementById("previewIframe");
  if (!previewIframe) return;

  // Find index.html or main html file
  const htmlKey = Object.keys(codeFiles).find(f => f.toLowerCase().endsWith('index.html') || f.toLowerCase().endsWith('.html'));
  const htmlContent = htmlKey ? codeFiles[htmlKey] : null;

  if (!htmlContent) {
    // If no HTML file exists yet, render an empty/placeholder state
    const fileList = Object.keys(codeFiles);
    if (fileList.length === 0) {
      previewIframe.srcdoc = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              background: #0f1117;
              color: #94a3b8;
              text-align: center;
            }
            .placeholder-box {
              padding: 24px;
              max-width: 320px;
            }
            .icon { font-size: 36px; margin-bottom: 12px; }
            h3 { color: #f8fafc; margin: 0 0 8px 0; font-size: 16px; font-weight: 700; }
            p { font-size: 13px; line-height: 1.5; margin: 0; }
          </style>
        </head>
        <body>
          <div class="placeholder-box">
            <div class="icon">⚡</div>
            <h3>Live Web Preview</h3>
            <p>Waiting for code generation. When the AI agents create web files (HTML/CSS/JS), the live preview will automatically render here.</p>
          </div>
        </body>
        </html>
      `;
      return;
    } else {
      // Show list of generated files
      previewIframe.srcdoc = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: monospace;
              padding: 24px;
              background: #0f1117;
              color: #f8fafc;
            }
            h3 { color: #8b5cf6; margin-top: 0; font-size: 15px; }
            ul { padding-left: 20px; }
            li { margin: 8px 0; color: #94a3b8; font-size: 13px; }
          </style>
        </head>
        <body>
          <h3>Generated Project Files:</h3>
          <ul>
            ${fileList.map(f => `<li>📄 ${escapeHtml(f)}</li>`).join('')}
          </ul>
        </body>
        </html>
      `;
      return;
    }
  }

  // Parse HTML and inject CSS / JS from codeFiles
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');

    // Inject any standalone CSS files into doc head
    Object.keys(codeFiles).forEach(fileName => {
      if (fileName.toLowerCase().endsWith('.css')) {
        const styleEl = doc.createElement('style');
        styleEl.setAttribute('data-injected-from', fileName);
        styleEl.textContent = codeFiles[fileName];
        doc.head.appendChild(styleEl);
      }
    });

    // Inject any standalone JS files into doc body
    Object.keys(codeFiles).forEach(fileName => {
      if (fileName.toLowerCase().endsWith('.js') && !fileName.toLowerCase().endsWith('.config.js')) {
        const scriptEl = doc.createElement('script');
        scriptEl.setAttribute('data-injected-from', fileName);
        scriptEl.textContent = codeFiles[fileName];
        doc.body.appendChild(scriptEl);
      }
    });

    previewIframe.srcdoc = doc.documentElement.outerHTML;
  } catch (err) {
    console.error("Preview compilation error:", err);
    previewIframe.srcdoc = htmlContent;
  }
}

// ==========================================================================
// TASK DRAWER MANAGEMENT & RENDERING
// ==========================================================================

function initializeTaskDrawer() {
  const drawerHeader = document.getElementById("tasksDrawerHeader");
  const drawerToggle = document.getElementById("tasksDrawerToggle");
  const drawer = document.getElementById("tasksDrawer");

  function toggleDrawer() {
    if (drawer) {
      drawer.classList.toggle("collapsed");
    }
  }

  if (drawerHeader) {
    drawerHeader.addEventListener("click", (e) => {
      if (e.target !== drawerToggle && !drawerToggle.contains(e.target)) {
        toggleDrawer();
      }
    });
  }

  if (drawerToggle) {
    drawerToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleDrawer();
    });
  }
}

function renderTasks(tasks) {
  const tasksList = document.getElementById("tasksList");
  const badge = document.getElementById("tasksCountBadge");
  const drawer = document.getElementById("tasksDrawer");

  if (!tasks || tasks.length === 0) {
    if (badge) badge.textContent = "0";
    if (tasksList) {
      tasksList.innerHTML = `<div class="tasks-empty">No active sprint tasks. Send a prompt to plan features.</div>`;
    }
    return;
  }

  if (badge) badge.textContent = tasks.length;

  if (drawer && drawer.classList.contains("collapsed")) {
    drawer.classList.remove("collapsed");
  }

  if (tasksList) {
    tasksList.innerHTML = tasks.map((t, idx) => {
      const statusClass = (t.status || 'pending').toLowerCase().replace(' ', '_');
      const statusLabel = (t.status || 'PENDING').toUpperCase();
      const title = t.title || t.description || `Task #${idx + 1}`;
      return `
        <div class="task-item">
          <div class="task-item-left">
            <span class="task-item-title" title="${escapeHtml(title)}">${escapeHtml(title)}</span>
          </div>
          <span class="task-status-tag ${statusClass}">${statusLabel}</span>
        </div>
      `;
    }).join('');
  }
}

// ==========================================================================
// MULTI-AGENT PRESENCE ROSTER & STATUS HUD
// ==========================================================================

function initializeRosterListeners() {
  const pills = document.querySelectorAll(".agent-roster .roster-pill");
  pills.forEach(pill => {
    pill.addEventListener("click", () => {
      const agentKey = pill.getAttribute("data-agent");
      pills.forEach(p => p.classList.remove("active"));
      pill.classList.add("active");

      state.selectedAgent = agentKey;
      const chatTitle = document.getElementById("chatTitle");
      if (chatTitle) {
        if (agentKey === "all") {
          chatTitle.innerHTML = "Team Chat";
        } else {
          const agentInfo = agentData[agentKey];
          if (agentInfo) {
            chatTitle.innerHTML = `Chat with <span style="color: var(--${agentInfo.color}-color)">${agentInfo.name}</span>`;
          }
        }
      }
    });
  });
}

function highlightActiveAgent(agentKey, activityDesc = null) {
  document.querySelectorAll(".agent-roster .roster-status-dot").forEach(dot => {
    dot.classList.remove("active");
  });

  const targetDot = document.getElementById(`rosterDot-${agentKey}`);
  if (targetDot) {
    targetDot.classList.add("active");
  }

  const activityText = document.getElementById("agentActivityText");
  const activityDot = document.getElementById("activityPulseDot");
  if (activityText) {
    const info = agentData[agentKey];
    const name = info ? info.name : agentKey;
    activityText.textContent = activityDesc || `${name} working...`;
  }
  if (activityDot) {
    activityDot.classList.add("active");
  }
}

function updatePhasePill(phase) {
  const pill = document.getElementById("currentPhasePill");
  if (pill) {
    pill.textContent = (phase || "ACTIVE").toUpperCase();
  }
}