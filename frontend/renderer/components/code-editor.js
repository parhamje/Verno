// Code Editor Component

class CodeEditor {
    constructor() {
        this.editor = document.getElementById('codeEditor');
        this.fileNameDisplay = document.getElementById('currentFileName');
    }
    
    display(fileName, content) {
        this.fileNameDisplay.textContent = fileName;
        
        const language = this.detectLanguage(fileName);
        
        // Simple syntax highlighting would go here
        // For now, just display the code
        this.editor.innerHTML = `<code>${this.escapeHtml(content)}</code>`;
    }
    
    detectLanguage(fileName) {
        const ext = fileName.split('.').pop().toLowerCase();
        const languages = {
            'js': 'javascript',
            'html': 'html',
            'css': 'css',
            'py': 'python',
            'json': 'json',
            'md': 'markdown'
        };
        return languages[ext] || 'text';
    }
    
    escapeHtml(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
}

// Create global instance
window.codeEditor = new CodeEditor();