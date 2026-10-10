// Chat Component

class ChatComponent {
    constructor() {
        this.container = document.getElementById('chatContainer');
        this.projectId = null;
    }
    
    init(projectId) {
        this.projectId = projectId;
        this.container.innerHTML = '';
    }
    
    addMessage(role, content, metadata = null) {
        const messageEl = document.createElement('div');
        messageEl.className = 'message';
        
        const avatarText = this.getAvatarText(role);
        const roleName = this.getRoleName(role);
        
        messageEl.innerHTML = `
            <div class="message-header">
                <div class="agent-avatar agent-${role}">${avatarText}</div>
                <span class="font-semibold">${roleName}</span>
                <span class="text-xs text-gray-500">${new Date().toLocaleTimeString()}</span>
            </div>
            <div class="message-content">${this.formatContent(content)}</div>
        `;
        
        this.container.appendChild(messageEl);
        this.container.scrollTop = this.container.scrollHeight;
    }
    
    getAvatarText(role) {
        const avatars = {
            'user': 'U',
            'project_manager': 'PM',
            'developer': 'D',
            'qa_tester': 'QA',
            'devops': 'DO',
            'system': 'S'
        };
        return avatars[role] || '?';
    }
    
    getRoleName(role) {
        const names = {
            'user': 'User',
            'project_manager': 'Project Manager',
            'developer': 'Developer',
            'qa_tester': 'QA Tester',
            'devops': 'DevOps Engineer',
            'system': 'System'
        };
        return names[role] || role;
    }
    
    formatContent(content) {
        // Simple formatting: preserve line breaks and add basic code highlighting
        return content
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\n/g, '<br>')
            .replace(/`([^`]+)`/g, '<code class="bg-gray-800 px-1 rounded">$1</code>');
    }
}

// Create global instance
window.chatComponent = new ChatComponent();