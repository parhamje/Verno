// File Explorer Component

class FileExplorer {
    constructor() {
        this.container = document.getElementById('fileExplorer');
        this.projectDirectory = null;
        this.files = new Set();
    }
    
    init(projectDirectory) {
        this.projectDirectory = projectDirectory;
        this.refresh();
    }
    
    async refresh() {
        if (!this.projectDirectory) return;
        
        const result = await window.electronAPI.listDirectory(this.projectDirectory);
        
        if (result.success) {
            this.renderFiles(result.files);
        }
    }
    
    renderFiles(files) {
        this.container.innerHTML = '';
        
        if (files.length === 0) {
            this.container.innerHTML = '<p class="text-gray-500 p-4">No files yet</p>';
            return;
        }
        
        files.forEach(file => {
            const fileEl = document.createElement('div');
            fileEl.className = 'file-item';
            
            const icon = file.isDirectory ? '📁' : '📄';
            
            fileEl.innerHTML = `
                <span class="file-icon">${icon}</span>
                <span class="flex-1">${file.name}</span>
            `;
            
            if (!file.isDirectory) {
                fileEl.addEventListener('click', () => {
                    this.selectFile(file.path, file.name);
                });
            }
            
            this.container.appendChild(fileEl);
        });
    }
    
    async selectFile(path, name) {
        // Remove active class from all items
        document.querySelectorAll('.file-item').forEach(el => {
            el.classList.remove('active');
        });
        
        // Add active class to clicked item
        event.currentTarget.classList.add('active');
        
        // Read file content
        const result = await window.electronAPI.readFile(path);
        
        if (result.success) {
            window.codeEditor.display(name, result.content);
        }
    }
    
    addFile(relativePath) {
        this.files.add(relativePath);
        this.refresh();
    }
}

// Create global instance
window.fileExplorer = new FileExplorer();