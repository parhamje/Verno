const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    selectDirectory: () => ipcRenderer.invoke('select-directory'),
    writeFile: (filePath, content) => ipcRenderer.invoke('write-file', filePath, content),
    readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
    listDirectory: (dirPath) => ipcRenderer.invoke('list-directory', dirPath),
    joinPath: (...args) => ipcRenderer.invoke('join-path', ...args),
    sendNotification: ({ title, body }) => {
        ipcRenderer.send('send-notification', { title, body });
    },
});