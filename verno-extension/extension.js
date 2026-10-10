const vscode = require('vscode');
const path = require('path');
const fs = require('fs');

/**
 * Activates the Verno Studio extension.
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  console.log('Verno Studio extension activated.');

  const provider = new VernoViewProvider(context.extensionUri, context);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      VernoViewProvider.viewType,
      provider,
      {
        webviewOptions: {
          retainContextWhenHidden: true
        }
      }
    )
  );

  // Auto-open Verno Copilot chat on startup
  setTimeout(async () => {
    try {
      await vscode.commands.executeCommand('verno.chatView.focus');
    } catch (e) {
      console.log('Auto-open chat error:', e);
    }
  }, 500);

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('verno.openChat', async () => {
      if (provider._view && provider._view.visible) {
        // Chat is open -> toggle close
        try {
          await vscode.commands.executeCommand('workbench.action.closeAuxiliaryBar');
        } catch (e) {}
        try {
          await vscode.commands.executeCommand('workbench.action.closeSidebar');
        } catch (e) {}
      } else {
        // Chat is closed/hidden -> open and reveal
        if (provider._view) {
          try {
            provider._view.show(true);
          } catch (e) {}
        }
        try {
          await vscode.commands.executeCommand('workbench.view.extension.verno-sidebar');
        } catch (e) {}
        try {
          await vscode.commands.executeCommand('verno.chatView.focus');
        } catch (e) {}
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('verno.newProject', async () => {
      try {
        await vscode.commands.executeCommand('workbench.view.extension.verno-sidebar');
      } catch (e) {}
      vscode.commands.executeCommand('verno.chatView.focus');
      provider.postMessageToWebview({ type: 'trigger-new-project' });
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('verno.startDev', async () => {
      try {
        await vscode.commands.executeCommand('workbench.view.extension.verno-sidebar');
      } catch (e) {}
      vscode.commands.executeCommand('verno.chatView.focus');
      provider.postMessageToWebview({ type: 'trigger-start' });
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('verno.openSettings', async () => {
      try {
        await vscode.commands.executeCommand('verno.openCenterSettings');
      } catch (e) {
        console.error('Failed to open center settings:', e);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('verno.openTerminal', () => {
      const terminal = getOrCreateVernoTerminal();
      terminal.show();
    })
  );

  // Register Inline Edit (Ctrl+K)
  context.subscriptions.push(
    vscode.commands.registerCommand('verno.inlineEdit', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showInformationMessage('Please open a code file in the editor to use Verno Inline Edit.');
        return;
      }

      // If previous edit active, clear it first
      if (activeInlineEdit) {
        await vscode.commands.executeCommand('verno.rejectInlineEdit');
      }

      let selection = editor.selection;
      let targetText = editor.document.getText(selection);

      // If empty selection, default to the entire current line
      if (!targetText || !targetText.trim()) {
        const line = editor.document.lineAt(selection.active.line);
        selection = new vscode.Selection(line.range.start, line.range.end);
        targetText = editor.document.getText(selection);
      }

      const instruction = await vscode.window.showInputBox({
        title: '✨ Verno Inline Edit (Ctrl+K)',
        prompt: 'Describe changes for Verno Developer Agent (or press Esc to cancel)',
        placeHolder: 'e.g. Optimize algorithm, add docstrings & types, fix bug, refactor to async...',
        ignoreFocusOut: true
      });

      if (!instruction || !instruction.trim()) {
        return;
      }

      await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: '✨ Verno Developer Agent is refactoring code...',
        cancellable: false
      }, async () => {
        try {
          const payload = {
            code: targetText,
            instruction: instruction.trim(),
            language: editor.document.languageId,
            file_path: vscode.workspace.asRelativePath(editor.document.uri)
          };

          const response = await fetch('http://127.0.0.1:8000/api/inline-edit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.detail || `Server responded with status ${response.status}`);
          }

          const data = await response.json();
          if (!data.success || typeof data.modified_code !== 'string') {
            throw new Error('Verno backend did not return modified code.');
          }

          const modifiedCode = data.modified_code;

          // Apply modified code to editor selection
          await editor.edit(editBuilder => {
            editBuilder.replace(selection, modifiedCode);
          });

          // Calculate replacement range
          const startPos = selection.start;
          const newLines = modifiedCode.split('\n');
          const endLine = startPos.line + newLines.length - 1;
          const endChar = (newLines.length === 1) 
            ? (startPos.character + modifiedCode.length) 
            : newLines[newLines.length - 1].length;
          const appliedRange = new vscode.Range(startPos, new vscode.Position(endLine, endChar));

          // Set highlight decoration (diff view)
          editor.setDecorations(inlineEditDecorationType, [appliedRange]);

          // Set active context for keybindings (Ctrl+Enter / Esc)
          await vscode.commands.executeCommand('setContext', 'vernoInlineEditActive', true);

          // Status bar action item
          const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 10000);
          statusBarItem.text = '$(sparkle) Verno Diff: $(check) Accept (Ctrl+Enter) | $(x) Reject (Esc)';
          statusBarItem.tooltip = 'Click to accept changes or press Ctrl+Enter / Esc';
          statusBarItem.command = 'verno.acceptInlineEdit';
          statusBarItem.show();

          activeInlineEdit = {
            editor,
            originalRange: selection,
            originalText: targetText,
            appliedRange,
            statusBarItem
          };

          // User-friendly action notification
          vscode.window.showInformationMessage(
            '✨ Verno Inline Edit applied. Review diff in editor:',
            'Accept (Ctrl+Enter)',
            'Reject (Esc)'
          ).then(action => {
            if (action === 'Accept (Ctrl+Enter)') {
              vscode.commands.executeCommand('verno.acceptInlineEdit');
            } else if (action === 'Reject (Esc)') {
              vscode.commands.executeCommand('verno.rejectInlineEdit');
            }
          });

        } catch (err) {
          vscode.window.showErrorMessage(`Verno Inline Edit failed: ${err.message}`);
        }
      });
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('verno.acceptInlineEdit', async () => {
      if (!activeInlineEdit) return;
      try {
        activeInlineEdit.editor.setDecorations(inlineEditDecorationType, []);
        if (activeInlineEdit.statusBarItem) activeInlineEdit.statusBarItem.dispose();
        activeInlineEdit = null;
        await vscode.commands.executeCommand('setContext', 'vernoInlineEditActive', false);
        vscode.window.setStatusBarMessage('✅ Verno Inline Edit accepted.', 3000);
      } catch (e) {
        console.error('Accept error:', e);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('verno.rejectInlineEdit', async () => {
      if (!activeInlineEdit) return;
      try {
        const { editor, appliedRange, originalText } = activeInlineEdit;
        await editor.edit(editBuilder => {
          editBuilder.replace(appliedRange, originalText);
        });
        editor.setDecorations(inlineEditDecorationType, []);
        if (activeInlineEdit.statusBarItem) activeInlineEdit.statusBarItem.dispose();
        activeInlineEdit = null;
        await vscode.commands.executeCommand('setContext', 'vernoInlineEditActive', false);
        vscode.window.setStatusBarMessage('❌ Verno Inline Edit discarded.', 3000);
      } catch (e) {
        console.error('Reject error:', e);
      }
    })
  );
}

const inlineEditDecorationType = vscode.window.createTextEditorDecorationType({
  backgroundColor: 'rgba(16, 185, 129, 0.22)',
  border: '1px solid rgba(16, 185, 129, 0.6)',
  borderRadius: '4px',
  isWholeLine: false,
  overviewRulerColor: '#10b981',
  overviewRulerLane: vscode.OverviewRulerLane.Right
});

let activeInlineEdit = null;
let vernoTerminal = null;
function getOrCreateVernoTerminal() {
  if (!vernoTerminal || vernoTerminal.exitStatus !== undefined) {
    vernoTerminal = vscode.window.createTerminal({
      name: 'Verno Agents',
      iconPath: new vscode.ThemeIcon('hubot')
    });
  }
  return vernoTerminal;
}

class VernoViewProvider {
  static viewType = 'verno.chatView';

  constructor(extensionUri, context) {
    this._extensionUri = extensionUri;
    this._context = context;
    this._view = null;
  }

  resolveWebviewView(webviewView, context, _token) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri]
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    // Listen for messages from Webview
    webviewView.webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case 'getInitialState': {
          const workspaceFolder = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0
            ? vscode.workspace.workspaceFolders[0].uri.fsPath
            : '';
          webviewView.webview.postMessage({
            type: 'initialState',
            workspacePath: workspaceFolder
          });
          break;
        }

        case 'selectFolder': {
          const folderUri = await vscode.window.showOpenDialog({
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
            openLabel: 'Select Project Directory'
          });
          if (folderUri && folderUri[0]) {
            webviewView.webview.postMessage({
              type: 'folderSelected',
              path: folderUri[0].fsPath
            });
          }
          break;
        }

        case 'fileOperation': {
          await this._handleFileOperation(message.operation, message.filePath, message.content);
          break;
        }

        case 'openFile': {
          await this._openFileInEditor(message.filePath);
          break;
        }

        case 'runTerminalCommand': {
          const terminal = getOrCreateVernoTerminal();
          terminal.show();
          terminal.sendText(message.commandText);
          break;
        }

        case 'openSettings':
        case 'openSettingsModal': {
          try {
            await vscode.commands.executeCommand('verno.openCenterSettings');
          } catch (e) {
            console.error('Failed to open center settings:', e);
          }
          break;
        }

        case 'openVsCodeSettings': {
          vscode.commands.executeCommand('workbench.action.openSettings', 'Verno AI Studio');
          break;
        }

        case 'saveVsCodeSettings': {
          const cfg = vscode.workspace.getConfiguration('verno');
          const s = message.settings;
          if (s) {
            try {
              if (s.AI_PROVIDER) await cfg.update('provider', s.AI_PROVIDER, vscode.ConfigurationTarget.Global);
              if (s.AI_PROVIDER_BASE_URL) await cfg.update('aiBaseUrl', s.AI_PROVIDER_BASE_URL, vscode.ConfigurationTarget.Global);
              if (s.AI_PROVIDER_API_KEY) await cfg.update('apiKey', s.AI_PROVIDER_API_KEY, vscode.ConfigurationTarget.Global);
              if (s.PROJECT_MANAGER_MODEL) await cfg.update('models.projectManager', s.PROJECT_MANAGER_MODEL, vscode.ConfigurationTarget.Global);
              if (s.DEVELOPER_MODEL) await cfg.update('models.developer', s.DEVELOPER_MODEL, vscode.ConfigurationTarget.Global);
              if (s.QA_TESTER_MODEL) await cfg.update('models.qaTester', s.QA_TESTER_MODEL, vscode.ConfigurationTarget.Global);
              if (s.DEVOPS_MODEL) await cfg.update('models.devops', s.DEVOPS_MODEL, vscode.ConfigurationTarget.Global);
            } catch (err) {
              console.error('Failed to sync settings to VS Code configuration:', err);
            }
          }
          break;
        }

        case 'getWorkspaceFiles': {
          try {
            const files = await vscode.workspace.findFiles(
              '**/*',
              '{**/node_modules/**,**/.git/**,**/dist/**,**/build/**,**/.venv/**,**/__pycache__/**,**/target/**,**/.next/**,**/bin/**,**/obj/**}',
              300
            );
            const relativePaths = files.map(f => vscode.workspace.asRelativePath(f)).sort();
            webviewView.webview.postMessage({
              type: 'workspaceFiles',
              files: relativePaths
            });
          } catch (err) {
            console.error('Failed to get workspace files:', err);
            webviewView.webview.postMessage({
              type: 'workspaceFiles',
              files: []
            });
          }
          break;
        }

        case 'getFileContent': {
          const relPath = message.filePath;
          try {
            let content = '';
            const openDoc = vscode.workspace.textDocuments.find(d => 
              vscode.workspace.asRelativePath(d.uri) === relPath || d.fileName.endsWith(relPath)
            );
            if (openDoc) {
              content = openDoc.getText();
            } else {
              const workspaceFolders = vscode.workspace.workspaceFolders;
              if (workspaceFolders && workspaceFolders.length > 0) {
                const targetUri = vscode.Uri.joinPath(workspaceFolders[0].uri, relPath);
                const bytes = await vscode.workspace.fs.readFile(targetUri);
                content = Buffer.from(bytes).toString('utf-8');
              }
            }
            if (content.length > 80000) {
              content = content.substring(0, 80000) + '\n\n// [Truncated: File exceeds 80KB limit]';
            }
            webviewView.webview.postMessage({
              type: 'fileContent',
              filePath: relPath,
              content: content,
              requestId: message.requestId
            });
          } catch (err) {
            webviewView.webview.postMessage({
              type: 'fileContent',
              filePath: relPath,
              content: `// Error reading file: ${err.message}`,
              requestId: message.requestId
            });
          }
          break;
        }

        case 'showNotification': {
          if (message.level === 'error') {
            vscode.window.showErrorMessage(message.text);
          } else if (message.level === 'warning') {
            vscode.window.showWarningMessage(message.text);
          } else {
            vscode.window.showInformationMessage(message.text);
          }
          break;
        }
      }
    });
  }

  postMessageToWebview(msg) {
    if (this._view) {
      this._view.webview.postMessage(msg);
    }
  }

  async _handleFileOperation(operation, relativePath, content) {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    let targetUri;

    if (path.isAbsolute(relativePath)) {
      targetUri = vscode.Uri.file(relativePath);
    } else if (workspaceFolders && workspaceFolders.length > 0) {
      targetUri = vscode.Uri.joinPath(workspaceFolders[0].uri, relativePath);
    } else {
      vscode.window.showWarningMessage(`No open workspace folder to write ${relativePath}`);
      return;
    }

    try {
      if (operation === 'create' || operation === 'update') {
        const buffer = Buffer.from(content || '', 'utf-8');
        // Ensure parent directory exists
        const parentDir = vscode.Uri.file(path.dirname(targetUri.fsPath));
        await vscode.workspace.fs.createDirectory(parentDir);
        await vscode.workspace.fs.writeFile(targetUri, buffer);

        // Open in editor
        const doc = await vscode.workspace.openTextDocument(targetUri);
        await vscode.window.showTextDocument(doc, { preview: false, preserveFocus: true });
      } else if (operation === 'delete') {
        await vscode.workspace.fs.delete(targetUri, { recursive: true, useTrash: true });
      }
    } catch (err) {
      console.error(`File operation error on ${relativePath}:`, err);
    }
  }

  async _openFileInEditor(filePath) {
    try {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      let targetUri;
      if (path.isAbsolute(filePath)) {
        targetUri = vscode.Uri.file(filePath);
      } else if (workspaceFolders && workspaceFolders.length > 0) {
        targetUri = vscode.Uri.joinPath(workspaceFolders[0].uri, filePath);
      } else {
        return;
      }
      const doc = await vscode.workspace.openTextDocument(targetUri);
      await vscode.window.showTextDocument(doc, { preview: false });
    } catch (e) {
      console.error('Failed to open file in editor:', e);
    }
  }

  _getHtmlForWebview(webview) {
    const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'styles.css'));
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'main.js'));
    const logoUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'icon.svg'));

    const htmlPath = path.join(this._extensionUri.fsPath, 'media', 'index.html');
    let html = fs.readFileSync(htmlPath, 'utf-8');

    // Replace asset placeholders with Webview URIs
    html = html.replace('{{STYLE_URI}}', styleUri.toString());
    html = html.replace('{{SCRIPT_URI}}', scriptUri.toString());
    html = html.replace(/\{\{LOGO_URI\}\}/g, logoUri.toString());

    return html;
  }
}

function deactivate() {
  if (vernoTerminal) {
    vernoTerminal.dispose();
  }
}

module.exports = {
  activate,
  deactivate
};
