const { app, BrowserWindow, ipcMain, dialog, Notification } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const { spawn } = require('child_process');

app.disableHardwareAcceleration();

let mainWindow;
let backendProcess;

// Start Python backend
function startBackend() {
    console.log('Attempting to start backend...');
    const pythonPath = process.platform === 'win32' ? 'python' : 'python3';
    const backendPath = app.isPackaged
        ? path.join(process.resourcesPath, 'backend', 'main.py')
        : path.join(__dirname, '..', 'backend', 'main.py');
    console.log(`Backend path: ${backendPath}`);
    
    backendProcess = spawn(pythonPath, [backendPath], {
        detached: process.platform !== 'win32',
        windowsHide: true
    });
    console.log(`Backend process started with PID: ${backendProcess.pid}`);
    
    backendProcess.stdout.on('data', (data) => {
        console.log(`Backend: ${data}`);
    });
    
    backendProcess.stderr.on('data', (data) => {
        console.error(`Backend Error: ${data}`);
    });

    backendProcess.on('close', (code) => {
        console.log(`Backend process exited with code ${code}`);
    });
    
    // Wait for backend to start
    return new Promise((resolve) => {
        setTimeout(resolve, 5000); // Increased timeout for backend to start
    });
}

async function createWindow() {
    try {
        // Start backend first
        await startBackend();
        
        mainWindow = new BrowserWindow({
            width: 1400,
            height: 900,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                preload: path.join(__dirname, 'preload.js')
            },
            icon: path.join(__dirname, 'assets', 'logo.png'),
            autoHideMenuBar: true,
            frame: true
        });

        mainWindow.maximize();

        const indexPath = path.join(__dirname, 'renderer', 'index.html');
        console.log(`Loading URL: ${indexPath}`);
        mainWindow.loadFile(indexPath);

        // Open DevTools in development
        if (process.argv.includes('--dev')) {
            mainWindow.webContents.openDevTools();
        }

        mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
            console.error(`Failed to load page: ${errorDescription} (Code: ${errorCode})`);
        });
        
    } catch (error) {
        console.error('Error creating window:', error);
    }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (backendProcess) {
        console.log('Killing backend process...');
        try {
            if (process.platform === 'win32' && backendProcess.pid) {
                spawn('taskkill', ['/pid', backendProcess.pid.toString(), '/f', '/t']);
            } else {
                backendProcess.kill();
            }
        } catch (e) {
            console.error('Error stopping backend:', e);
        }
    }
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// IPC Handlers
ipcMain.handle('join-path', (event, ...args) => {
    return path.join(...args);
});
ipcMain.handle('select-directory', async (event) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  if (result.canceled) {
    return null;
  } else {
    return result.filePaths[0];
  }
});

ipcMain.on('send-notification', (event, { title, body }) => {
  new Notification({ title, body }).show();
});
ipcMain.handle('write-file', async (event, filePath, content) => {
    try {
        // Ensure directory exists
        const dir = path.dirname(filePath);
        await fs.mkdir(dir, { recursive: true });
        
        // Write file
        await fs.writeFile(filePath, content, 'utf8');
        return { success: true };
    } catch (error) {
        console.error('Error writing file:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('read-file', async (event, filePath) => {
    try {
        const content = await fs.readFile(filePath, 'utf8');
        return { success: true, content };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('list-directory', async (event, dirPath) => {
    try {
        const files = await fs.readdir(dirPath, { withFileTypes: true });
        const fileList = files.map(file => ({
            name: file.name,
            isDirectory: file.isDirectory(),
            path: path.join(dirPath, file.name)
        }));
        return { success: true, files: fileList };
    } catch (error) {
        return { success: false, error: error.message };
    }
});