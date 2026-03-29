// DiariCore Insights Page JavaScript - Dashboard Layout

document.addEventListener('DOMContentLoaded', function() {
    // Initialize Chart
    initializeMoodChart();
    
    // Event Listeners
    initializeEventListeners();
    
    // Load Data
    loadInsightsData();
});

// Initialize Mood Chart
function initializeMoodChart() {
    const ctx = document.getElementById('moodChart');
    if (!ctx) return;
    
    const moodData = {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [{
            label: 'Mood Score',
            data: [7, 8, 6, 9, 8, 9, 8],
            borderColor: '#6F8F7F',
            backgroundColor: 'rgba(111, 143, 127, 0.1)',
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: '#6F8F7F',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6
        }]
    };
    
    const config = {
        type: 'line',
        data: moodData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(47, 62, 54, 0.9)',
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff',
                    padding: 12,
                    cornerRadius: 8,
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
                            return `Mood: ${context.parsed.y}/10`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#6B7C74',
                        font: {
                            size: 12,
                            weight: '500'
                        }
                    }
                },
                y: {
                    beginAtZero: true,
                    max: 10,
                    grid: {
                        color: '#E0E6E3',
                        borderDash: [5, 5]
                    },
                    ticks: {
                        color: '#6B7C74',
                        font: {
                            size: 12,
                            weight: '500'
                        },
                        stepSize: 2
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            }
        }
    };
    
    new Chart(ctx, config);
}

// Initialize Event Listeners
function initializeEventListeners() {
    // View All buttons
    const viewAllBtns = document.querySelectorAll('.view-all');
    viewAllBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            showNotification('View all feature coming soon!', 'info');
        });
    });
    
    // Insight action buttons
    const insightActions = document.querySelectorAll('.insight-action');
    insightActions.forEach(btn => {
        btn.addEventListener('click', function() {
            const insightItem = this.closest('.insight-item');
            const title = insightItem.querySelector('.insight-title').textContent;
            showNotification(`Learn more about: ${title}`, 'info');
        });
    });
    
    // Topic items
    const topicItems = document.querySelectorAll('.topic-item');
    topicItems.forEach(item => {
        item.addEventListener('click', function() {
            const topicName = this.querySelector('.topic-name').textContent;
            showNotification(`Viewing entries for: ${topicName}`, 'info');
        });
    });
    
    // Stat items
    const statItems = document.querySelectorAll('.stat-item');
    statItems.forEach(item => {
        item.addEventListener('click', function() {
            const statLabel = this.querySelector('.stat-label').textContent;
            showNotification(`Viewing details for: ${statLabel}`, 'info');
        });
    });
}

// Load Insights Data
function loadInsightsData() {
    // Simulate loading data
    setTimeout(() => {
        animateStats();
        animateTopicProgress();
    }, 500);
}

// Animate Stats
function animateStats() {
    const statNumbers = document.querySelectorAll('.stat-number');
    
    statNumbers.forEach(stat => {
        const text = stat.textContent;
        const target = parseInt(text);
        const suffix = text.replace(/[0-9]/g, '');
        let current = 0;
        const increment = target / 50;
        
        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                current = target;
                clearInterval(timer);
            }
            
            if (suffix === '%') {
                stat.textContent = Math.round(current) + '%';
            } else {
                stat.textContent = Math.round(current);
            }
        }, 30);
    });
}

// Animate Topic Progress
function animateTopicProgress() {
    const progressBars = document.querySelectorAll('.progress-bar');
    
    progressBars.forEach((bar, index) => {
        const targetWidth = bar.style.width;
        bar.style.width = '0%';
        
        setTimeout(() => {
            bar.style.width = targetWidth;
        }, 100 * index);
    });
}

// Show Notification
function showNotification(message, type = 'info') {
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    
    let icon = 'info-circle';
    if (type === 'success') icon = 'check-circle';
    if (type === 'error') icon = 'exclamation-circle';
    
    notification.innerHTML = `
        <i class="bi bi-${icon}"></i>
        <span>${message}</span>
    `;
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 12px;
        display: flex;
        align-items: center;
        gap: 0.75rem;
        font-weight: 500;
        z-index: 10000;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        transform: translateX(100%);
        transition: transform 0.3s ease;
        max-width: 400px;
        word-wrap: break-word;
        background: ${type === 'success' ? '#7FBF9F' : type === 'error' ? '#E74C3C' : '#7FA7BF'};
        color: white;
        font-family: 'Inter', sans-serif;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 10);
    
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 300);
    }, 3000);
}
