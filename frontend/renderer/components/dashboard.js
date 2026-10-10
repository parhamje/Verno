// Dashboard Component

class Dashboard {
    constructor() {
        this.chart = null;
        this.data = {
            totalTasks: 0,
            completedTasks: 0,
            filesCreated: 0,
            iterations: 0
        };
    }
    
    init() {
        this.initChart();
    }
    
    initChart() {
        const ctx = document.getElementById('progressChart').getContext('2d');
        
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Tasks Completed',
                    data: [],
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4
                }, {
                    label: 'Files Created',
                    data: [],
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            color: '#f3f4f6'
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: '#9ca3af'
                        },
                        grid: {
                            color: '#374151'
                        }
                    },
                    x: {
                        ticks: {
                            color: '#9ca3af'
                        },
                        grid: {
                            color: '#374151'
                        }
                    }
                }
            }
        });
    }
    
    update(data) {
        // Update stats
        if (data.tasks) {
            this.data.totalTasks = data.tasks.length;
            this.data.completedTasks = data.tasks.filter(t => t.status === 'completed').length;
        }
        
        if (data.file_operations) {
            this.data.filesCreated += data.file_operations.length;
        }
        
        this.data.iterations = data.iterations || this.data.iterations;
        
        // Update UI
        document.getElementById('totalTasks').textContent = this.data.totalTasks;
        document.getElementById('completedTasks').textContent = this.data.completedTasks;
        document.getElementById('filesCreated').textContent = this.data.filesCreated;
        document.getElementById('iterations').textContent = this.data.iterations;
        
        // Update chart
        const timestamp = new Date().toLocaleTimeString();
        this.chart.data.labels.push(timestamp);
        this.chart.data.datasets[0].data.push(this.data.completedTasks);
        this.chart.data.datasets[1].data.push(this.data.filesCreated);
        
        // Keep only last 10 data points
        if (this.chart.data.labels.length > 10) {
            this.chart.data.labels.shift();
            this.chart.data.datasets[0].data.shift();
            this.chart.data.datasets[1].data.shift();
        }
        
        this.chart.update();
    }
}

// Create global instance
window.dashboard = new Dashboard();