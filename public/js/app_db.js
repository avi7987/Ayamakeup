/**
 * CRM System for Beauty Business
 * Version: 9.0 - Database Edition with Authentication
 * Date: 29.12.2025
 */

// ==================== AUTHENTICATION ====================
let currentUser = null;
let isAuthenticated = false;

// Check authentication status on page load
async function checkAuthStatus() {
    try {
        const response = await fetch('/api/user');
        const data = await response.json();
        
        // In fallback mode or authenticated - show data
        if (data.isFallbackMode || data.isAuthenticated) {
            isAuthenticated = true;
            currentUser = data.user;
            
            // In fallback mode, don't show user menu
            if (data.isFallbackMode) {
                showLoginButton();
            } else {
                showUserProfile(data.user);
            }
            
            // Load user data
            await loadAllData();
        } else {
            isAuthenticated = false;
            currentUser = null;
            showLoginButton();
            // Show empty dashboard
            showEmptyDashboard();
        }
    } catch (error) {
        console.error('❌ Error checking auth status:', error);
        isAuthenticated = false;
        showLoginButton();
        showEmptyDashboard();
    }
}

// Show user profile in header
function showUserProfile(user) {
    document.getElementById('login-button').classList.add('hidden');
    document.getElementById('user-menu').classList.remove('hidden');
    document.getElementById('user-name').textContent = user.name.split(' ')[0]; // First name only
    
    // Set avatar - replace entire container content
    const avatarContainer = document.getElementById('user-avatar-container');
    
    if (user.picture && user.picture.trim() !== '') {
        // Has picture - show image
        avatarContainer.innerHTML = `<img src="${user.picture}" alt="User" class="w-full h-full object-cover rounded-full">`;
    } else {
        // No picture - show default SVG icon
        avatarContainer.innerHTML = `<svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
        </svg>`;
    }
    
    document.getElementById('dropdown-user-name').textContent = user.name;
    document.getElementById('dropdown-user-email').textContent = user.email;
}

// Show login button
function showLoginButton() {
    document.getElementById('login-button').classList.remove('hidden');
    document.getElementById('user-menu').classList.add('hidden');
}

// Toggle user dropdown
function toggleUserDropdown() {
    const dropdown = document.getElementById('user-dropdown');
    dropdown.classList.toggle('hidden');
}

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    const userMenu = document.getElementById('user-menu');
    const dropdown = document.getElementById('user-dropdown');
    if (userMenu && !userMenu.contains(e.target)) {
        dropdown.classList.add('hidden');
    }
});

// Logout function
async function logout() {
    try {
        const response = await fetch('/auth/logout', { 
            method: 'POST',
            credentials: 'include' // Important for cookies
        });
        
        if (response.ok) {
            console.log('✅ התנתקת בהצלחה');
            window.location.href = '/'; // Force redirect to home
        } else {
            throw new Error('Logout failed');
        }
    } catch (error) {
        console.error('❌ Error logging out:', error);
        // Force reload anyway
        window.location.href = '/';
    }
}

// Show empty dashboard for non-authenticated users
function showEmptyDashboard() {
    // Clear all stats
    document.getElementById('stat-monthly-income').textContent = '0 ₪';
    document.getElementById('stat-yearly-income').textContent = '0 ₪';
    document.getElementById('stat-monthly-brides').textContent = '0';
    document.getElementById('stat-yearly-brides').textContent = '0';
    
    // Show message to login
    const welcomeMsg = document.getElementById('welcome-message');
    if (welcomeMsg) {
        welcomeMsg.innerHTML = '🌙 התחבר כדי לראות את הנתונים שלך';
    }
}

// Load all user data after authentication
async function loadAllData() {
    await State.loadFromDatabase();
    // Trigger a refresh of the current page to show data
    const currentPage = document.querySelector('section:not(.hidden)').id;
    await switchPage(currentPage.replace('page-', ''));
}

// ==================== SOUND EFFECTS ====================
const SoundEffects = {
    playCashRegister() {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const now = audioContext.currentTime;
        
        // Classic "ka-ching" cash register sound
        const playTone = (frequency, startTime, duration, volume = 0.25) => {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = frequency;
            oscillator.type = 'triangle'; // Warmer sound
            
            gainNode.gain.setValueAtTime(volume, startTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
            
            oscillator.start(startTime);
            oscillator.stop(startTime + duration);
        };
        
        // "Ka" - Quick low impact
        playTone(440, now, 0.06, 0.3);
        // "Ching" - Bell-like high notes
        playTone(1047, now + 0.05, 0.25, 0.25);
        playTone(1319, now + 0.06, 0.3, 0.2);
        playTone(1568, now + 0.07, 0.35, 0.15);
        
        console.log('💰 קא-צ\'ינג!');
    }
};

// ==================== MOTIVATIONAL MESSAGES ====================
const MotivationalMessages = {
    brideMessages: [
        '🎉 כל הכבוד! עוד כלה במאגר!',
        '👰 יופי! צועדים לעבר היעד!',
        '💪 אחלה! המומנטום עובד!',
        '🌟 מדהים! היעד מתקרב!',
        '🔥 בום! עוד כלה בפוקט!',
        '⭐ שיא! היעד בהישג יד!',
        '💎 מושלם! ככה ממשיכים!',
        '🚀 יאללה! זורמים לעבר המטרה!',
        '✨ וואו! עוד צעד קדימה!',
        '🎯 יפה! היעד השנתי מתקדם!',
        '💫 אדיר! הכל זורם נהדר!',
        '🌈 מעולה! עוד הצלחה בדרך!',
        '🎊 חזק! המטרה מתקרבת!',
        '💝 טוב מאוד! ממשיכים ככה!',
        '🏆 גאון! זה הולך מצוין!'
    ],
    
    previousBridesCount: 0,
    
    getRandomMessage() {
        const randomIndex = Math.floor(Math.random() * this.brideMessages.length);
        return this.brideMessages[randomIndex];
    },
    
    showMessage(message) {
        // Create floating message element
        const messageEl = document.createElement('div');
        messageEl.className = 'fixed top-20 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-pink-500 to-purple-600 text-white px-8 py-4 rounded-2xl shadow-2xl z-50 text-xl font-bold';
        messageEl.style.cssText = 'animation: slideDown 0.5s ease-out, pulse 0.5s ease-in-out 0.5s 3';
        messageEl.innerHTML = `<div class="text-center">${message}</div>`;
        
        document.body.appendChild(messageEl);
        
        // Remove after 3 seconds
        setTimeout(() => {
            messageEl.style.transition = 'all 0.5s ease-out';
            messageEl.style.opacity = '0';
            messageEl.style.transform = 'translateX(-50%) translateY(-30px) scale(0.8)';
            setTimeout(() => messageEl.remove(), 500);
        }, 2500);
    }
};

// Add CSS animations
if (!document.getElementById('motivational-styles')) {
    const style = document.createElement('style');
    style.id = 'motivational-styles';
    style.textContent = `
        @keyframes slideDown {
            from {
                opacity: 0;
                transform: translateX(-50%) translateY(-50px) scale(0.8);
            }
            to {
                opacity: 1;
                transform: translateX(-50%) translateY(0) scale(1);
            }
        }
        @keyframes pulse {
            0%, 100% {
                transform: translateX(-50%) translateY(0) scale(1);
            }
            50% {
                transform: translateX(-50%) translateY(0) scale(1.05);
            }
        }
        /* Smooth progress bar animation */
        .progress-bar {
            transition: width 0.8s ease-out, transform 0.4s ease-out !important;
        }
    `;
    document.head.appendChild(style);
}

// Configuration
const CONFIG = {
    API_BASE_URL: 'https://lunabusiness.up.railway.app/api',
    STORAGE_KEYS: {
        CLIENTS: 'crm_clients_v3',
        LEADS: 'crm_leads_v3',
        MESSAGE_SETTINGS: 'message_settings_v1'
    },
    MONTHS: ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'],
    LEAD_STAGES: [
        {id: 'new', title: 'ליד חדש', tooltip: 'ליד שנכנס למערכת ועדיין לא נוצר איתו קשר.'},
        {id: 'in-process', title: 'בטיפול', tooltip: 'הליד בשיח פעיל: נוצר קשר ראשוני, משא ומתן, שליחת הצעת מחיר וטיפול בשאלות.'},
        {id: 'contract-sent', title: 'נשלח חוזה', tooltip: 'הלקוחה אישרה עקרונית והחוזה נשלח לחתימה.'},
        {id: 'closed', title: 'סגורה', tooltip: 'החוזה נחתם והאירוע נקבע ביומן.'},
        {id: 'completed', title: 'האירוע בוצע', tooltip: 'האירוע הסתיים בהצלחה.'}
    ],
    LEAD_STAGES_ARCHIVE: [
        {id: 'lost', title: 'לא נסגר', tooltip: 'לידים שלא התקדמו לסגירה - אפשר להעביר לכאן מכל שלב.'}
    ],
    DEFAULT_MESSAGE_SETTINGS: {
        'new': {
            immediate: {enabled: false, template: 'היי {{firstName}}! 👋\nתודה שפנית אלינו.\nאשוב אליך בהקדם!'},
            followUp: {enabled: false, delay: 1, unit: 'days', template: 'היי {{firstName}},\nעדיין מעוניינת? אשמח לעזור!'}
        },
        'in-process': {
            immediate: {enabled: true, template: 'שלום {{firstName}}! 😊\nאני כאן לענות על כל שאלה.\nמה חשוב לך לדעת?'},
            followUp: {enabled: true, delay: 2, unit: 'days', template: 'היי {{firstName}},\nהספקת לחשוב על ההצעה?\nאשמח לעזור בכל דבר!'}
        },
        'contract-sent': {
            immediate: {enabled: true, template: 'היי {{firstName}}! 🎉\nשלחתי את החוזה לאישור.\nנא לאשר בהקדם כדי לשמור את התאריך!'},
            followUp: {enabled: true, delay: 3, unit: 'days', template: 'היי {{firstName}},\nהספקת לעבור על החוזה?\nהתאריך עדיין שמור לך!'}
        },
        'closed': {
            immediate: {enabled: true, template: 'מזל טוב {{firstName}}! 🎊👰\nהזמנת אושרה!\nכל הפרטים שמורים במערכת.\nנתראה בתאריך {{date}}!'},
            followUp: {enabled: false, delay: 7, unit: 'days', template: 'היי {{firstName}},\nמתרגשת לקראת האירוע?\nאני פה לכל שאלה!'}
        },
        'completed': {
            immediate: {enabled: true, template: 'תודה {{firstName}}! 💕\nהיה כיף לעבוד איתך!\nשתמיד תזכרי את היום המיוחד הזה! 🌟'},
            followUp: {enabled: false, delay: 1, unit: 'days', template: ''}
        },
        'lost': {
            immediate: {enabled: false, template: 'היי {{firstName}},\nמקווה שהכל בסדר.\nאם תרצי לחזור בעתיד - אני כאן!'},
            followUp: {enabled: false, delay: 30, unit: 'days', template: ''}
        }
    }
};

// State Management
const State = {
    clients: [],
    leads: [],
    chart: null,
    
    async init() {
        await this.loadFromDatabase();
    },
    
    async loadFromDatabase() {
        // Don't load data if user is not authenticated
        if (!isAuthenticated) {
            console.log('ℹ️ משתמש לא מחובר - לא טוען נתונים');
            this.clients = [];
            this.leads = [];
            return;
        }
        
        try {
            console.log('🔄 טוען נתונים מ-MongoDB...');
            // Always load from database
            const [clientsRes, leadsRes] = await Promise.all([
                fetch(`${CONFIG.API_BASE_URL}/clients`),
                fetch(`${CONFIG.API_BASE_URL}/leads`)
            ]);
            
            if (clientsRes.ok && leadsRes.ok) {
                this.clients = await clientsRes.json();
                this.leads = await leadsRes.json();
                
                console.log('✅ Loaded', this.leads.length, 'leads from database');
                // Debug: Log proposedPrice values
                this.leads.forEach(lead => {
                    if (lead.proposedPrice) {
                        console.log('💰 Lead', lead._id, 'has proposedPrice:', lead.proposedPrice);
                    }
                });
                
                // Convert to booleans and add missing fields for backward compatibility
                this.clients = this.clients.map(c => ({...c, isBride: Boolean(c.isBride)}));
                this.leads = this.leads.map(l => ({
                    ...l, 
                    isBride: Boolean(l.isBride),
                    // Add missing fields for old leads
                    notes: l.notes || '',
                    price: l.price || 0,
                    deposit: l.deposit || 0,
                    contractStatus: l.contractStatus || 'pending',
                    reminders: l.reminders || [],
                    stageHistory: l.stageHistory || [{
                        stage: l.status || 'new',
                        timestamp: l.createdAt || new Date().toISOString(),
                        note: 'ליד קיים'
                    }],
                    calendarEventId: l.calendarEventId || null
                }));
                
                console.log(`✅ נטענו ${this.clients.length} לקוחות ו-${this.leads.length} לידים מ-MongoDB`);
            } else {
                throw new Error('Failed to fetch from database');
            }
        } catch (error) {
            console.error('❌ שגיאה בטעינה מ-MongoDB:', error);
            alert('שגיאה בחיבור למסד הנתונים. אנא בדוק את חיבור האינטרנט.');
            this.clients = [];
            this.leads = [];
        }
    },
    
    // Remove localStorage functions - use MongoDB only
    // Goals are still saved in localStorage in separate functions
    
    getFilteredClients(monthName, year = new Date().getFullYear()) {
        if (monthName === 'ALL') {
            return this.clients.filter(c => {
                const date = new Date(c.date);
                return date.getFullYear() === year;
            });
        }
        const months = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
        const monthIndex = months.indexOf(monthName);
        if (monthIndex === -1) return this.clients;
        
        return this.clients.filter(c => {
            const date = new Date(c.date);
            return date.getMonth() === monthIndex && date.getFullYear() === year;
        });
    }
};

// API Service
const API = {
    async request(endpoint, options = {}) {
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}${endpoint}`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });
            
            if (!response.ok) {
                let errorMsg = `API error: ${response.statusText}`;
                try {
                    const errorData = await response.json();
                    if (errorData.error) {
                        errorMsg = errorData.error;
                    }
                } catch (e) {
                    // Can't parse error as JSON
                }
                throw new Error(errorMsg);
            }
            
            return await response.json();
        } catch (error) {
            console.error('API Request failed:', error);
            throw error;
        }
    },
    
    // Clients/Income
    async getClients() {
        return await this.request('/clients');
    },
    
    async addClient(data) {
        return await this.request('/clients', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },
    
    async updateClient(id, data) {
        return await this.request(`/clients/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },
    
    async deleteClient(id) {
        return await this.request(`/clients/${id}`, {
            method: 'DELETE'
        });
    },
    
    async bulkDeleteClients(ids) {
        return await this.request('/clients/bulk-delete', {
            method: 'POST',
            body: JSON.stringify({ ids })
        });
    },
    
    // Leads
    async getLeads() {
        return await this.request('/leads');
    },
    
    async addLead(data) {
        return await this.request('/leads', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },
    
    async updateLeadStatus(id, status) {
        return await this.request(`/leads/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status })
        });
    },
    
    async updateLead(id, data) {
        console.log('📤 Updating lead:', id, 'proposedPrice in data:', data.proposedPrice);
        console.trace('📍 Called from:');
        const result = await this.request(`/leads/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
        console.log('📥 Lead updated, proposedPrice in response:', result?.proposedPrice);
        
        // CRITICAL: Update State.leads with the returned data
        const leadIndex = State.leads.findIndex(l => (l._id || l.id) === id);
        if (leadIndex !== -1 && result) {
            State.leads[leadIndex] = result;
            console.log('✅ State.leads[' + leadIndex + '] updated, proposedPrice now:', State.leads[leadIndex].proposedPrice);
        }
        
        return result;
    },
    
    async deleteLead(id) {
        return await this.request(`/leads/${id}`, {
            method: 'DELETE'
        });
    },
    
    // Migration
    async migrateData(clients, leads) {
        return await this.request('/migrate', {
            method: 'POST',
            body: JSON.stringify({ clients, leads })
        });
    }
};

// UI Controllers
const Navigation = {
    async switchPage(pageName) {
        // Scroll to top FIRST - before hiding/showing pages
        window.scrollTo(0, 0);
        document.body.scrollTop = 0;
        document.documentElement.scrollTop = 0;
        
        // Hide all pages
        ['home', 'entry', 'leads', 'stats', 'insights', 'contracts', 'social', 'social-planning'].forEach(id => {
            const page = document.getElementById('page-' + id);
            if (page) page.classList.add('hidden');
        });
        
        // Show selected page
        const selectedPage = document.getElementById('page-' + pageName);
        if (selectedPage) selectedPage.classList.remove('hidden');
        
        // Trigger page-specific initialization
        if (pageName === 'home') {
            // Reload data from MongoDB to sync across devices
            await State.loadFromDatabase();
            await HomeView.update(true); // Show messages when navigating to home page
        }
        if (pageName === 'leads') LeadsView.render();
        if (pageName === 'stats') StatsView.update();
        if (pageName === 'insights') InsightsView.render();
        if (pageName === 'social-planning') SocialPlanning.init();
        // contracts and social pages don't need initialization (they're static coming soon pages)
        
        // Scroll to top again to ensure it worked
        setTimeout(() => {
            window.scrollTo(0, 0);
            document.body.scrollTop = 0;
            document.documentElement.scrollTop = 0;
        }, 10);
    }
};

const ModalManager = {
    open(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'flex';
            
            // Load goals when opening settings modal
            if (modalId === 'modal-settings') {
                window.loadGoalsToModal();
            }
            
            // Render message settings when opening that modal
            if (modalId === 'modal-message-settings') {
                MessageSettings.render();
                // Check template status after a small delay to ensure UI is rendered
                setTimeout(() => ContractManager.checkTemplateStatus(), 100);
            }
        }
    },
    
    close(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
        }
    }
};

// Income Management
const IncomeManager = {
    async save() {
        const btn = document.getElementById('btn-save');
        const nameInput = document.getElementById('inc-name');
        const amountInput = document.getElementById('inc-amount');
        const dateInput = document.getElementById('inc-date');
        const serviceInput = document.getElementById('inc-service');
        const paymentSelect = document.getElementById('inc-payment');
        const isBrideCheck = document.getElementById('inc-isbride');
        
        const data = {
            name: nameInput.value.trim(),
            phone: '0000000000', // Default phone if not collected
            price: parseFloat(amountInput.value),
            date: dateInput.value,
            service: serviceInput.value.trim() || 'שירות כללי',
            notes: `אמצעי תשלום: ${paymentSelect.value}${isBrideCheck.checked ? ' | כלה 👰' : ''}`,
            isBride: isBrideCheck.checked
        };
        
        // Don't send id field - let MongoDB create _id
        
        if (!data.name || isNaN(data.price)) {
            alert('נא למלא את כל השדות');
            return;
        }
        
        btn.innerText = "שומר...";
        btn.disabled = true;
        
        try {
            console.log('📤 שולח נתונים למסד נתונים:', data);
            const savedClient = await API.addClient(data);
            console.log('✅ נשמר בהצלחה! isBride:', savedClient.isBride, 'notes:', savedClient.notes);
            
            // Play cash register sound
            SoundEffects.playCashRegister();
            
            // Add to local state
            State.clients.push(savedClient);
            // Update home view to reflect new data (NO messages here - only when returning to home page)
            console.log('🔄 מעדכן תצוגת דף הבית (ללא הודעות)...');
            await HomeView.update(false);
            
            alert('הלקוח נשמר בהצלחה במסד הנתונים!');
            nameInput.value = '';
            amountInput.value = '';
            serviceInput.value = '';
            isBrideCheck.checked = false;
        } catch (error) {
            console.error('Save error:', error);
            alert("שגיאה בשמירה: " + error.message);
        }
        
        btn.innerText = "שמור במסד נתונים";
        btn.disabled = false;
    },
    
    async update() {
        const btn = document.getElementById('btn-edit-save');
        const id = document.getElementById('edit-id').value;
        const data = {
            name: document.getElementById('edit-name').value,
            price: parseFloat(document.getElementById('edit-amount').value),
            service: document.getElementById('edit-service').value,
            date: document.getElementById('edit-date').value,
            payment: document.getElementById('edit-payment').value,
            isBride: document.getElementById('edit-isbride').checked,
            month: CONFIG.MONTHS[new Date(document.getElementById('edit-date').value).getMonth()]
        };
        
        btn.innerText = "מעדכן... אנא המתן";
        btn.disabled = true;
        
        try {
            await API.updateClient(id, data);
            
            const index = State.clients.findIndex(c => (c._id || c.id) === id);
            if (index !== -1) {
                State.clients[index] = { ...State.clients[index], ...data };
            }
            // Update home view
            await HomeView.update();
            
            ModalManager.close('modal-edit-row');
            ManageView.open();
            StatsView.update();
        } catch (error) {
            alert("העידכון נכשל: " + error.message);
        }
        
        btn.innerText = "שמור שינויים";
        btn.disabled = false;
    },
    
    async delete(id) {
        if (!confirm('למחוק את הרשומה?')) return;
        
        try {
            await API.deleteClient(id);
            State.clients = State.clients.filter(c => (c._id || c.id) !== id);
            // Update home view
            await HomeView.update();
            ManageView.open();
            StatsView.update();
        } catch (error) {
            alert("המחיקה נכשלה: " + error.message);
        }
    },
    
    startEdit(id) {
        const client = State.clients.find(c => (c._id || c.id) === id);
        if (!client) {
            console.error('Client not found:', id, State.clients);
            return;
        }
        
        const dateOnly = client.date ? client.date.split('T')[0] : client.date;
        
        document.getElementById('edit-id').value = client._id || client.id;
        document.getElementById('edit-name').value = client.name;
        document.getElementById('edit-amount').value = client.price || client.amount;
        document.getElementById('edit-service').value = client.service || '';
        document.getElementById('edit-date').value = dateOnly;
        document.getElementById('edit-payment').value = client.payment || 'מזומן';
        document.getElementById('edit-isbride').checked = client.isBride || false;
        
        ModalManager.close('modal-manage');
        ModalManager.open('modal-edit-row');
        
        ModalManager.open('modal-edit-row');
    }
};

// Leads Management
const LeadsManager = {
    async add() {
        const btn = document.getElementById('btn-save-lead');
        const now = new Date().toISOString();
        const data = {
            status: 'new',
            name: document.getElementById('lead-name').value.trim(),
            lastName: document.getElementById('lead-last-name').value.trim(),
            phone: document.getElementById('lead-phone').value.trim(),
            source: document.getElementById('lead-source').value.trim(),
            service: document.getElementById('lead-service').value.trim(),
            eventDate: document.getElementById('lead-event-date').value,
            location: document.getElementById('lead-location').value.trim(),
            isBride: document.getElementById('lead-is-bride').checked,
            // New fields
            notes: '',
            proposedPrice: 0, // Will be filled in later stage
            price: 0,
            deposit: 0,
            contractStatus: 'pending',
            escortType: 'none',
            escortPrice: 0,
            bridesmaids: [],
            reminders: [],
            stageHistory: [{
                stage: 'new',
                timestamp: now,
                note: 'ליד חדש נוצר'
            }],
            messageHistory: [], // Initialize empty message history
            createdAt: now,
            updatedAt: now,
            calendarEventId: null
        };
        
        if (!data.name || !data.lastName || !data.phone) {
            alert('אנא מלאי את כל השדות המסומנים בכוכבית (*): שם פרטי, שם משפחה וטלפון');
            return;
        }
        
        btn.innerText = "שומר...";
        btn.disabled = true;
        
        try {
            const savedLead = await API.addLead(data);
            State.leads.push(savedLead); // Use the lead returned from server with _id
            
            ModalManager.close('modal-new-lead');
            LeadsView.render();
            alert('ליד חדש נוסף בהצלחה!');
            
            // Clear form
            document.getElementById('lead-name').value = '';
            document.getElementById('lead-last-name').value = '';
            document.getElementById('lead-phone').value = '';
            document.getElementById('lead-source').value = '';
            document.getElementById('lead-service').value = '';
            document.getElementById('lead-event-date').value = '';
            document.getElementById('lead-location').value = '';
            document.getElementById('lead-is-bride').checked = false;
        } catch (error) {
            alert("שגיאה בהוספת ליד: " + error.message);
        }
        
        btn.innerText = "שמור ליד";
        btn.disabled = false;
    },
    
    async updateStatus(leadId, newStatus) {
        try {
            const lead = State.leads.find(l => (l._id || l.id) === leadId);
            if (!lead) return;
            
            // Check if stage manager needs to handle this
            const canProceed = await StageManager.handleStageChange(leadId, newStatus);
            if (!canProceed) return; // Wait for modal
            
            const oldStatus = lead.status;
            
            // Add to stage history
            if (!lead.stageHistory) lead.stageHistory = [];
            lead.stageHistory.push({
                stage: newStatus,
                timestamp: new Date().toISOString(),
                note: `עובר מ-${CONFIG.LEAD_STAGES.find(s => s.id === oldStatus)?.title || oldStatus} ל-${CONFIG.LEAD_STAGES.find(s => s.id === newStatus)?.title || newStatus}`
            });
            
            lead.status = newStatus;
            lead.updatedAt = new Date().toISOString();
            
            // Save full lead data to database (not just status)
            await API.updateLead(leadId, lead);
            
            // Handle Google Calendar for "closed" (סגורה) stage
            if (newStatus === 'closed' && lead.eventDate && !lead.calendarEventId) {
                // Trigger calendar integration
                GoogleCalendar.createEvent(lead);
            }
        } catch (error) {
            console.error('Failed to update lead status:', error);
        }
    },
    
    async delete(id) {
        if (!confirm('למחוק את הליד?')) return;
        
        try {
            await API.deleteLead(id);
            State.leads = State.leads.filter(l => l.id !== id);
            LeadsView.render();
        } catch (error) {
            alert("שגיאה במחיקה: " + error.message);
        }
    },
    
    view(id) {
        LeadProfile.open(id);
    }
};

// WhatsApp Integration
const WhatsAppHelper = {
    templates: {
        'in-process': 'היי {{firstName}}! 👋\nשמחתי שפנית אלינו.\nאני כאן לענות על כל שאלה ולעזור לך להתקדם.\nמה חשוב לך לדעת?',
        'contract-sent': 'היי {{firstName}}! 🎉\nשלחתי את החוזה לאישור.\nנא לאשר בהקדם כדי לשמור את התאריך.\nמצפה לעבוד איתך!',
        'closed': 'מזל טוב {{firstName}}! 🎊👰\nהזמנת אושרה לתאריך {{date}}!\nכל הפרטים שמורים במערכת.\nנתראה ביום המיוחד! 💕'
    },
    
    extractFirstName(fullName) {
        if (!fullName) return '';
        // Extract first name (text before first space)
        const firstName = fullName.trim().split(' ')[0];
        return firstName;
    },
    
    getTemplate(stage, lead) {
        // Only certain stages have templates
        const template = this.templates[stage];
        if (!template) {
            return `שלום ${lead.name}!`; // Default message for stages without template
        }
        
        const firstName = this.extractFirstName(lead.name);
        let message = template;
        
        // Replace variables
        message = message.replace(/\{\{firstName\}\}/g, firstName || lead.name);
        message = message.replace(/\{\{service\}\}/g, lead.service || 'שירותי האיפור');
        message = message.replace(/\{\{date\}\}/g, lead.eventDate ? new Date(lead.eventDate).toLocaleDateString('he-IL') : 'התאריך שנקבע');
        
        return message;
        return template;
    },
    
    send(lead, customMessage = null) {
        const phone = lead.phone.replace(/[^0-9]/g, '').replace(/^0/, '');
        const message = customMessage || this.getTemplate(lead.status, lead);
        const url = `https://wa.me/972${phone}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
    }
};

// Reminder System
const ReminderSystem = {
    add(leadId, reminderData) {
        const lead = State.leads.find(l => (l._id || l.id) === leadId);
        if (!lead) return;
        
        if (!lead.reminders) lead.reminders = [];
        lead.reminders.push({
            id: Date.now(),
            date: reminderData.date,
            time: reminderData.time,
            note: reminderData.note,
            completed: false,
            createdAt: new Date().toISOString()
        });
        
        lead.updatedAt = new Date().toISOString();
        // Save to DB
        API.updateLead(leadId, lead);
    },
    
    check() {
        const now = new Date();
        State.leads.forEach(lead => {
            if (!lead.reminders) return;
            
            lead.reminders.forEach(reminder => {
                if (reminder.completed) return;
                
                const reminderDateTime = new Date(`${reminder.date}T${reminder.time}`);
                const diff = reminderDateTime - now;
                
                // Alert if within 15 minutes
                if (diff > 0 && diff < 15 * 60 * 1000) {
                    this.showAlert(lead, reminder);
                    reminder.completed = true;
                }
            });
        });
    },
    
    showAlert(lead, reminder) {
        const alertDiv = document.createElement('div');
        alertDiv.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 bg-amber-500 text-white px-6 py-4 rounded-xl shadow-2xl z-50 animate-bounce';
        alertDiv.innerHTML = `
            <div class="font-bold text-lg">🔔 תזכורת!</div>
            <div class="text-sm mt-1">${lead.name}: ${reminder.note}</div>
            <button onclick="this.parentElement.remove()" class="mt-2 bg-white text-amber-600 px-3 py-1 rounded text-xs font-bold">
                הבנתי
            </button>
        `;
        document.body.appendChild(alertDiv);
        
        // Auto remove after 10 seconds
        setTimeout(() => alertDiv.remove(), 10000);
    }
};

// Google Calendar Integration
const GoogleCalendar = {
    createEvent(lead) {
        if (!lead.eventDate) {
            alert('אין תאריך אירוע להוספה ליומן');
            return;
        }
        
        const eventTitle = `${lead.name} - Wedding`;
        const eventDate = lead.eventDate;
        const eventTime = '18:00'; // Default time
        const location = lead.location || '';
        const description = `Client: ${lead.name}\nPhone: ${lead.phone}\nService: ${lead.service || 'Bridal Makeup'}\nSource: ${lead.source || 'N/A'}`;
        
        // Create Google Calendar link
        const startDateTime = `${eventDate}T${eventTime.replace(':', '')}00`;
        const endDateTime = `${eventDate}T${eventTime.split(':')[0]}${(parseInt(eventTime.split(':')[1]) + 180) % 60}00`;
        
        const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventTitle)}&dates=${startDateTime}/${endDateTime}&details=${encodeURIComponent(description)}&location=${encodeURIComponent(location)}`;
        
        window.open(calendarUrl, '_blank');
        
        // Mark as calendar event created
        lead.calendarEventId = `gcal_${Date.now()}`;
        lead.updatedAt = new Date().toISOString();
    }
};

// Lead Profile View
const LeadProfile = {
    currentLeadId: null,
    
    open(leadId) {
        this.currentLeadId = leadId;
        const lead = State.leads.find(l => (l._id || l.id) === leadId);
        if (!lead) {
            console.error('Lead not found:', leadId);
            return;
        }
        
        this.render(lead);
        ModalManager.open('modal-lead-profile');
    },
    
    render(lead) {
        const profileHTML = `
            <div class="bg-white rounded-3xl w-full max-w-2xl shadow-2xl text-right overflow-y-auto max-h-[90vh]">
                <!-- Header -->
                <div class="bg-gradient-to-r from-purple-600 to-indigo-700 p-6 text-white sticky top-0 z-10">
                    <div class="flex justify-between items-start">
                        <div>
                            <h2 class="text-2xl font-bold">${lead.name}</h2>
                            ${lead.isBride ? '<span class="text-pink-300 text-sm">👰 לקוחת כלה</span>' : ''}
                        </div>
                        <button onclick="LeadProfile.close()" class="text-white hover:bg-white/20 rounded-full p-2">
                            ✕
                        </button>
                    </div>
                    <div class="mt-2 text-sm opacity-90">
                        ${CONFIG.LEAD_STAGES.find(s => s.id === lead.status)?.title || lead.status}
                    </div>
                </div>
                
                <div class="p-6 space-y-6">
                    <!-- Contact Info -->
                    <div class="bg-gray-50 p-4 rounded-xl">
                        <h3 class="font-bold text-purple-800 mb-3">פרטי קשר</h3>
                        <div class="space-y-2 text-sm">
                            <p><b>טלפון:</b> ${lead.phone}</p>
                            <p><b>מקור:</b> ${lead.source || 'לא צוין'}</p>
                        </div>
                    </div>
                    
                    <!-- Event Details -->
                    <div class="bg-blue-50 p-4 rounded-xl">
                        <h3 class="font-bold text-blue-800 mb-3">פרטי אירוע</h3>
                        <div class="space-y-2 text-sm">
                            <p><b>שירות:</b> ${lead.service || 'לא צוין'}</p>
                            <p><b>תאריך:</b> ${lead.eventDate ? new Date(lead.eventDate).toLocaleDateString('he-IL') : 'לא נקבע'}</p>
                            <p><b>מיקום:</b> ${lead.location || 'לא צוין'}</p>
                        </div>
                    </div>
                    
                    <!-- Financial Info -->
                    <div class="bg-green-50 p-4 rounded-xl">
                        <h3 class="font-bold text-green-800 mb-3">פרטים כספיים</h3>
                        <div class="space-y-2 text-sm">
                            <p><b>מחיר:</b> ₪${(lead.price || 0).toLocaleString()}</p>
                            <p><b>מקדמה:</b> ₪${(lead.deposit || 0).toLocaleString()}</p>
                            <p><b>חוזה:</b> ${lead.contractStatus === 'signed' ? '✅ נחתם' : lead.contractStatus === 'sent' ? '📄 נשלח' : '⏳ ממתין'}</p>
                        </div>
                    </div>
                    
                    <!-- Stage History -->
                    <div class="bg-purple-50 p-4 rounded-xl">
                        <h3 class="font-bold text-purple-800 mb-3">היסטוריית שלבים</h3>
                        <div class="space-y-2">
                            ${(lead.stageHistory || []).map(h => `
                                <div class="text-xs bg-white p-2 rounded border-r-4 border-purple-400">
                                    <div class="font-bold">${h.note}</div>
                                    <div class="text-gray-500">${new Date(h.timestamp).toLocaleString('he-IL')}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <!-- Reminders -->
                    <div class="bg-amber-50 p-4 rounded-xl">
                        <h3 class="font-bold text-amber-800 mb-3">תזכורות</h3>
                        <div id="reminders-list" class="space-y-2 mb-3">
                            ${(lead.reminders || []).filter(r => !r.completed).map(r => `
                                <div class="text-xs bg-white p-2 rounded">
                                    <div class="font-bold">📅 ${r.date} ${r.time}</div>
                                    <div>${r.note}</div>
                                </div>
                            `).join('') || '<p class="text-sm text-gray-500">אין תזכורות</p>'}
                        </div>
                        <button onclick="LeadProfile.addReminder()" class="text-xs bg-amber-200 text-amber-800 px-3 py-2 rounded-lg font-bold w-full">
                            + הוסף תזכורת
                        </button>
                    </div>
                    
                    <!-- Notes -->
                    <div class="bg-gray-50 p-4 rounded-xl">
                        <h3 class="font-bold text-gray-800 mb-3">הערות</h3>
                        <textarea id="lead-notes" class="w-full p-3 border rounded-lg text-sm" rows="3" placeholder="הוסף הערות...">${lead.notes || ''}</textarea>
                        <button onclick="LeadProfile.saveNotes()" class="mt-2 bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-bold">
                            שמור הערות
                        </button>
                    </div>
                    
                    <!-- Message History -->
                    <div class="bg-green-50 p-4 rounded-xl">
                        <h3 class="font-bold text-green-800 mb-3">💬 הודעות שנשלחו</h3>
                        <div class="space-y-2">
                            ${(lead.messageHistory || []).length > 0 ? (lead.messageHistory || []).map(msg => `
                                <div class="text-xs bg-white p-3 rounded-lg border-r-4 ${msg.type === 'immediate' ? 'border-green-400' : 'border-blue-400'}">
                                    <div class="flex justify-between items-start mb-1">
                                        <span class="font-bold">${msg.type === 'immediate' ? '📩 הודעה מיידית' : '⏰ Follow-up'}</span>
                                        <span class="text-gray-500">${new Date(msg.sentAt).toLocaleString('he-IL')}</span>
                                    </div>
                                    <div class="text-gray-600 bg-gray-50 p-2 rounded mt-1 font-mono text-[10px]">${msg.message}</div>
                                    <div class="text-[9px] text-gray-400 mt-1">שלב: ${CONFIG.LEAD_STAGES.find(s => s.id === msg.stage)?.title || msg.stage}</div>
                                </div>
                            `).join('') : '<p class="text-sm text-gray-500">עדיין לא נשלחו הודעות</p>'}
                        </div>
                    </div>
                    
                    <!-- Active Timers -->
                    ${(() => {
                        const activeTimers = FollowUpTimers.getActiveTimers(lead._id || lead.id);
                        if (activeTimers.length === 0) return '';
                        
                        return `
                        <div class="bg-orange-50 p-4 rounded-xl">
                            <h3 class="font-bold text-orange-800 mb-3">⏰ טיימרים פעילים</h3>
                            <div class="space-y-2">
                                ${activeTimers.map(timer => {
                                    const timeLeft = timer.triggerTime - Date.now();
                                    const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
                                    const daysLeft = Math.floor(hoursLeft / 24);
                                    const timeStr = daysLeft > 0 ? `${daysLeft} ימים` : `${hoursLeft} שעות`;
                                    
                                    return `
                                    <div class="text-xs bg-white p-3 rounded-lg border-r-4 border-orange-400">
                                        <div class="flex justify-between items-center">
                                            <span class="font-bold">Follow-up - ${CONFIG.LEAD_STAGES.find(s => s.id === timer.stage)?.title}</span>
                                            <span class="text-orange-600 font-bold">${timeStr}</span>
                                        </div>
                                        <div class="text-gray-500 text-[10px] mt-1">
                                            יופעל ב: ${new Date(timer.triggerTime).toLocaleString('he-IL')}
                                        </div>
                                    </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                        `;
                    })()}
                    
                    <!-- Actions -->
                    <div class="flex gap-2">
                        <button onclick="LeadProfile.sendWhatsApp()" class="flex-1 bg-green-500 text-white py-3 rounded-xl font-bold">
                            📱 WhatsApp
                        </button>
                        ${lead.status === 'done' && lead.eventDate ? `
                            <button onclick="LeadProfile.openCalendar()" class="flex-1 bg-blue-500 text-white py-3 rounded-xl font-bold">
                                📅 יומן
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
        
        const modal = document.getElementById('modal-lead-profile');
        modal.innerHTML = profileHTML;
    },
    
    close() {
        ModalManager.close('modal-lead-profile');
    },
    
    openCalendar() {
        const lead = State.leads.find(l => (l._id || l.id) === this.currentLeadId);
        if (lead) {
            GoogleCalendar.createEvent(lead);
        }
    },
    
    saveNotes() {
        const lead = State.leads.find(l => (l._id || l.id) === this.currentLeadId);
        if (!lead) return;
        
        lead.notes = document.getElementById('lead-notes').value;
        lead.updatedAt = new Date().toISOString();
        
        // Save to DB
        API.updateLead(this.currentLeadId, lead);
        alert('ההערות נשמרו!');
    },
    
    sendWhatsApp() {
        const lead = State.leads.find(l => (l._id || l.id) === this.currentLeadId);
        if (!lead) return;
        
        // Get template for current stage
        const message = WhatsAppHelper.getTemplate(lead.status, lead);
        
        // Show edit modal
        this.showWhatsAppModal(lead, message);
    },
    
    showWhatsAppModal(lead, defaultMessage) {
        const modalHTML = `
            <div class="bg-white rounded-3xl w-full max-w-md shadow-2xl text-right p-6">
                <h3 class="text-xl font-bold mb-4 text-green-600">📱 שליחת הודעת WhatsApp</h3>
                <div class="mb-4">
                    <p class="text-sm text-gray-600 mb-2">שלח ל: <strong>${lead.name}</strong></p>
                    <p class="text-sm text-gray-600 mb-4">שלב נוכחי: <strong>${CONFIG.LEAD_STAGES.find(s => s.id === lead.status)?.title || lead.status}</strong></p>
                </div>
                
                <label class="block text-sm font-bold mb-2">ערוך את ההודעה:</label>
                <textarea id="whatsapp-message" class="w-full p-3 border rounded-lg text-sm" rows="8">${defaultMessage}</textarea>
                
                <div class="flex gap-2 mt-4">
                    <button onclick="LeadProfile.confirmSendWhatsApp()" class="flex-1 bg-green-500 text-white py-3 rounded-xl font-bold hover:bg-green-600">
                        שלח WhatsApp
                    </button>
                    <button onclick="LeadProfile.closeWhatsAppModal()" class="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl font-bold hover:bg-gray-200">
                        ביטול
                    </button>
                </div>
            </div>
        `;
        
        const modal = document.getElementById('modal-whatsapp');
        if (!modal) {
            // Create modal if doesn't exist
            const newModal = document.createElement('div');
            newModal.id = 'modal-whatsapp';
            newModal.className = 'modal';
            document.body.appendChild(newModal);
        }
        document.getElementById('modal-whatsapp').innerHTML = modalHTML;
        ModalManager.open('modal-whatsapp');
    },
    
    confirmSendWhatsApp() {
        const lead = State.leads.find(l => (l._id || l.id) === this.currentLeadId);
        if (!lead) return;
        
        const customMessage = document.getElementById('whatsapp-message').value;
        
        if (customMessage) {
            WhatsAppHelper.send(lead, customMessage);
            this.closeWhatsAppModal();
        }
    },
    
    closeWhatsAppModal() {
        ModalManager.close('modal-whatsapp');
    },
    
    addReminder() {
        const lead = State.leads.find(l => (l._id || l.id) === this.currentLeadId);
        if (!lead) return;
        
        const date = prompt('תאריך (YYYY-MM-DD):');
        const time = prompt('שעה (HH:MM):');
        const note = prompt('הערה:');
        
        if (date && time && note) {
            ReminderSystem.add(this.currentLeadId, { date, time, note });
            this.render(lead);
        }
    }
};

// Check reminders every minute
setInterval(() => ReminderSystem.check(), 60000);

// Views
const LeadsView = {
    showLostLeads: false,
    
    render() {
        const board = document.getElementById('kanban-board');
        
        // Main stages only (5 columns)
        const mainStages = CONFIG.LEAD_STAGES.map(stage => `
            <div class="kanban-col">
                <div class="flex items-center justify-center gap-1 mb-4 border-b pb-2">
                    <h3 class="font-bold text-purple-900 text-center text-xs">${stage.title}</h3>
                    <div class="tooltip-container relative inline-block">
                        <span class="info-icon text-purple-400 cursor-help text-xs">ℹ️</span>
                        <div class="tooltip-text">${stage.tooltip}</div>
                    </div>
                </div>
                <div class="kanban-list space-y-2" data-status="${stage.id}">
                    ${this.renderLeadsForStage(stage.id)}
                </div>
            </div>
        `).join('');
        
        // Lost leads toggle button + conditional column
        const lostCount = State.leads.filter(l => l.status === 'lost').length;
        const lostColumn = this.showLostLeads ? `
            <div class="kanban-col-lost">
                <div class="flex items-center justify-between mb-4 border-b pb-2">
                    <h3 class="font-bold text-gray-600 text-center text-xs">לא נסגר (${lostCount})</h3>
                    <button onclick="LeadsView.toggleLostLeads()" class="text-xs text-gray-400 hover:text-gray-600">הסתר</button>
                </div>
                <div class="kanban-list space-y-2" data-status="lost">
                    ${this.renderLeadsForStage('lost')}
                </div>
            </div>
        ` : '';
        
        board.innerHTML = `
            <div class="flex items-center justify-between mb-4 px-2">
                <div></div>
                <button 
                    onclick="LeadsView.toggleLostLeads()" 
                    class="px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                        this.showLostLeads 
                        ? 'bg-gray-200 text-gray-700' 
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }">
                    ${this.showLostLeads ? 'הסתר לא נסגר' : `הצג לא נסגר (${lostCount})`}
                </button>
            </div>
            <div class="kanban-container-main">
                ${mainStages}
                ${lostColumn}
            </div>
        `;
        
        this.initDragAndDrop();
    },
    
    toggleLostLeads() {
        this.showLostLeads = !this.showLostLeads;
        this.render();
    },
    
    renderLeadsForStage(stageId) {
        const leads = State.leads.filter(l => (l.status || 'new') === stageId);
        
        return leads.map(lead => {
            // Check for active reminders
            const hasReminders = lead.reminders && lead.reminders.filter(r => !r.completed).length > 0;
            const reminderBadge = hasReminders ? '<span class="text-amber-500 text-xs">🔔</span>' : '';
            const leadId = lead._id || lead.id;
            
            return `
            <div class="lead-card text-right" data-id="${leadId}">
                <div class="flex justify-between mb-1">
                    <span class="font-bold text-gray-800 text-sm">${lead.name} ${reminderBadge}</span>
                    <span class="source-tag">${lead.source || 'אחר'}</span>
                </div>
                <div class="text-[10px] text-gray-400 mb-2">${lead.service || ''}</div>
                ${lead.isBride ? '<div class="text-[10px] text-pink-500 mb-1">👰 כלה</div>' : ''}
                <div class="flex gap-2 border-t pt-2 mt-1">
                    <button onclick="viewLead('${leadId}')" class="text-[10px] bg-purple-50 text-purple-600 px-2 py-1 rounded font-bold">הצג פרטים</button>
                    <button onclick="deleteLead('${leadId}')" class="text-[10px] text-red-300 mr-auto">מחק</button>
                </div>
            </div>
        `;
        }).join('');
    },
    
    initDragAndDrop() {
        document.querySelectorAll('.kanban-list').forEach(el => {
            new Sortable(el, {
                group: 'leads',
                animation: 150,
                ghostClass: 'sortable-ghost',
                delay: 200,
                delayOnTouchOnly: true,
                onEnd: async function(evt) {
                    const leadId = evt.item.getAttribute('data-id');
                    const newStatus = evt.to.getAttribute('data-status');
                    
                    // First check if stage manager needs to handle this
                    const canProceed = await StageManager.handleStageChange(leadId, newStatus);
                    if (!canProceed) {
                        // Stage manager opened a modal - will handle the rest
                        // Revert the visual change temporarily
                        evt.from.appendChild(evt.item);
                        return;
                    }
                    
                    // Now use WhatsApp automation system
                    await WhatsAppAutomation.checkAndPrompt(leadId, newStatus);
                }
            });
        });
        
        // Position tooltips dynamically to prevent cut-off
        document.querySelectorAll('.tooltip-container').forEach(container => {
            const icon = container.querySelector('.info-icon');
            const tooltip = container.querySelector('.tooltip-text');
            
            if (!icon || !tooltip) return;
            
            icon.addEventListener('mouseenter', () => {
                const rect = icon.getBoundingClientRect();
                tooltip.style.top = (rect.bottom + 10) + 'px';
                tooltip.style.left = Math.max(10, rect.left - 100) + 'px';
            });
        });
    }
};

const GreetingMessages = {
    morning: [
        'בוקר טוב מהממת! הגיע הזמן לעבוד על העסק שלך 🌟',
        'בוקר טוב! יום חדש מלא הזדמנויות ממתין לך ✨',
        'שבוע טוב! בואי נעשה את היום מדהים 🚀',
        'בוקר של הצלחה! היום את עושה צעד נוסף ליעדים שלך 🎯',
        'בוקר מושלם! את יכולה להשיג כל דבר שתרצי 💪'
    ],
    afternoon: [
        'שלום! את עושה עבודה מעולה 👏',
        'אחרי צהריים טובים! המשיכי בקצב המדהים הזה 🚀',
        'את בדרך להצלחה גדולה! כל הכבוד ❤️',
        'שלום! העסק שלך מתפתח וצומח 🌱',
        'היי, יופי! המשיכי להאיר את הדרך 💡'
    ],
    evening: [
        'ערב טוב! את עושה עבודה מנצחת 🌟',
        'ערב של השגים! כל יום את מתקדמת 🎆',
        'שלום! היום היה מלא בהצלחות 🎉',
        'ערב טוב! העסק שלך עולה למדרגה הבאה 🚀',
        'היי! את יוצרת משהו מדהים כאן ✨'
    ],
    night: [
        'לילה טוב! את עובדת קשה וזה נראה 🌙',
        'עוד עבודה בשעה הזו? את משהו מדהים! 🌟',
        'לילה טוב! המחויבות שלך בטוחות ידיים 💪',
        'שלום! העבודה המקצועית שלך משלמת! 🎯',
        'לילה פרודוקטיבי! את משיגה דברים גדולים 🚀'
    ],
    
    get() {
        const hour = new Date().getHours();
        let timeCategory;
        
        if (hour >= 5 && hour < 12) {
            timeCategory = this.morning;
        } else if (hour >= 12 && hour < 17) {
            timeCategory = this.afternoon;
        } else if (hour >= 17 && hour < 21) {
            timeCategory = this.evening;
        } else {
            timeCategory = this.night;
        }
        
        // Pick a random message from the time category
        const randomIndex = Math.floor(Math.random() * timeCategory.length);
        return timeCategory[randomIndex];
    }
};

const HomeView = {
    async update(showMessages = false) {
        console.log('🏠 מעדכן דף הבית - סה"כ לקוחות:', State.clients.length);
        
        // Update greeting message with dynamic text
        const greetingEl = document.getElementById('welcome-message');
        if (greetingEl) {
            greetingEl.textContent = GreetingMessages.get();
        }
        
        // Load goals from MongoDB
        const goals = await GoalsManager.load();
        console.log('🎯 יעדים מ-MongoDB:', goals);
        
        // Calculate current period data
        const now = new Date();
        const thisYear = now.getFullYear();
        const thisMonth = now.getMonth();
        
        // Yearly clients for current year
        const yearlyClients = State.clients.filter(c => {
            const date = new Date(c.date);
            return date.getFullYear() === thisYear;
        });
        
        // Monthly clients for current month
        const monthlyClients = yearlyClients.filter(c => {
            const date = new Date(c.date);
            return date.getMonth() === thisMonth;
        });
        
        // Previous month for trend calculation
        const prevMonth = thisMonth === 0 ? 11 : thisMonth - 1;
        const prevMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear;
        const prevMonthClients = State.clients.filter(c => {
            const date = new Date(c.date);
            return date.getMonth() === prevMonth && date.getFullYear() === prevMonthYear;
        });
        
        // Calculate stats
        const monthlyRevenue = monthlyClients.reduce((sum, c) => sum + (c.income || c.price || c.amount || 0), 0);
        const prevMonthRevenue = prevMonthClients.reduce((sum, c) => sum + (c.income || c.price || c.amount || 0), 0);
        const revenueTrend = prevMonthRevenue > 0 
            ? Math.round(((monthlyRevenue - prevMonthRevenue) / prevMonthRevenue) * 100)
            : monthlyRevenue > 0 ? 100 : 0;
        
        // Active leads count (new + contact + quoted + in-process)
        const activeLeads = State.leads.filter(l => 
            ['new', 'contact', 'quoted', 'in-process'].includes(l.stage)
        ).length;
        
        // Pending response (leads in new or contact stage for more than 2 days)
        const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
        const pendingResponse = State.leads.filter(l => {
            const leadDate = new Date(l.createdAt || l.date);
            return ['new', 'contact'].includes(l.stage) && leadDate < twoDaysAgo;
        }).length;
        
        // Upcoming events (next 7 days)
        const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const upcomingEvents = State.leads.filter(l => {
            if (!l.eventDate) return false;
            const eventDate = new Date(l.eventDate);
            return eventDate >= now && eventDate <= nextWeek;
        }).length;
        
        // Closed deals this month
        const closedDeals = monthlyClients.length;
        
        // New leads this month
        const newLeadsThisMonth = State.leads.filter(l => {
            const leadDate = new Date(l.createdAt || l.date);
            return leadDate.getFullYear() === thisYear && leadDate.getMonth() === thisMonth;
        }).length;
        
        // ===== NEW DASHBOARD SECTIONS =====
        
        // Section 1: Goals & Progress
        this.updateGoalsSection(goals, monthlyRevenue, newLeadsThisMonth, closedDeals);
        
        // Section 2: Business Health Snapshot
        this.updateSnapshotSection(activeLeads, pendingResponse, monthlyRevenue, upcomingEvents);
        
        // Section 3: Attention Required
        this.updateAttentionSection(pendingResponse, activeLeads);
        
        // Section 4: Recent Activity
        this.updateActivityFeed();
        
        // Show motivational message for brides milestone
        if (showMessages) {
            const currentBrides = monthlyClients.filter(c => c.isBride || c.notes?.includes('כלה')).length;
            const shouldShowMessage = MotivationalMessages.previousBridesCount > 0 && 
                                      currentBrides > MotivationalMessages.previousBridesCount;
            
            if (shouldShowMessage) {
                const message = MotivationalMessages.getRandomMessage();
                MotivationalMessages.showMessage(message);
                console.log('🎊 הצגת הודעת עידוד:', message);
            }
            
            MotivationalMessages.previousBridesCount = currentBrides;
        }
    },
    
    updateGoalsSection(goals, currentIncome, currentLeads, currentDeals) {
        const incomeGoal = goals.monthlyIncome || 200000;
        const leadsGoal = goals.monthlyLeads || 50;
        const dealsGoal = goals.monthlyDeals || 20;
        
        // Income goal
        const incomePercent = Math.min(100, Math.round((currentIncome / incomeGoal) * 100));
        const incomeStatus = incomePercent >= 90 ? 'עומד ביעד ✔️' : incomePercent >= 70 ? 'קרוב ליעד ⚠️' : 'רחוק מהיעד';
        
        document.getElementById('income-goal-current-display').innerText = `₪${currentIncome.toLocaleString()}`;
        document.getElementById('income-goal-target-display').innerText = `₪${incomeGoal.toLocaleString()}`;
        document.getElementById('income-goal-percentage-display').innerText = `${incomePercent}%`;
        document.getElementById('income-goal-status').innerText = incomeStatus;
        document.getElementById('income-goal-bar-new').style.width = `${incomePercent}%`;
        
        // Leads goal
        const leadsPercent = Math.min(100, Math.round((currentLeads / leadsGoal) * 100));
        const leadsStatus = leadsPercent >= 90 ? 'עומד ביעד ✔️' : leadsPercent >= 70 ? 'קרוב ליעד ⚠️' : 'רחוק מהיעד';
        
        document.getElementById('leads-goal-current-display').innerText = currentLeads;
        document.getElementById('leads-goal-target-display').innerText = leadsGoal;
        document.getElementById('leads-goal-percentage-display').innerText = `${leadsPercent}%`;
        document.getElementById('leads-goal-status').innerText = leadsStatus;
        document.getElementById('leads-goal-bar-new').style.width = `${leadsPercent}%`;
        
        // Deals goal
        const dealsPercent = Math.min(100, Math.round((currentDeals / dealsGoal) * 100));
        const dealsStatus = dealsPercent >= 90 ? 'עומד ביעד ✔️' : dealsPercent >= 70 ? 'קרוב ליעד ⚠️' : 'רחוק מהיעד';
        
        document.getElementById('deals-goal-current-display').innerText = currentDeals;
        document.getElementById('deals-goal-target-display').innerText = dealsGoal;
        document.getElementById('deals-goal-percentage-display').innerText = `${dealsPercent}%`;
        document.getElementById('deals-goal-status').innerText = dealsStatus;
        document.getElementById('deals-goal-bar-new').style.width = `${dealsPercent}%`;
    },
    
    updateSnapshotSection(activeLeads, pendingResponse, monthlyRevenue, upcomingEvents) {
        document.getElementById('snapshot-active-leads').innerText = activeLeads;
        document.getElementById('snapshot-pending-response').innerText = pendingResponse;
        document.getElementById('snapshot-monthly-revenue').innerText = `₪${monthlyRevenue.toLocaleString()}`;
        document.getElementById('snapshot-upcoming-events').innerText = upcomingEvents;
    },
    
    updateAttentionSection(pendingResponse, activeLeads) {
        const attentionList = document.getElementById('attention-list');
        if (!attentionList) return;
        
        const items = [];
        
        // Check for pending leads
        if (pendingResponse > 0) {
            items.push({
                icon: '<svg class="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>',
                title: `${pendingResponse} לידים ממתינים למענה`,
                subtitle: 'יותר מיומיים ללא מענה'
            });
        }
        
        // Check for goals not met
        const goals = {
            income: parseFloat(document.getElementById('income-goal-percentage-display')?.innerText || '0'),
            leads: parseFloat(document.getElementById('leads-goal-percentage-display')?.innerText || '0'),
            deals: parseFloat(document.getElementById('deals-goal-percentage-display')?.innerText || '0')
        };
        
        if (goals.income < 50) {
            items.push({
                icon: '<svg class="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>',
                title: 'יעד הכנסה רחוק',
                subtitle: `${goals.income.toFixed(0)}% מהיעד החודשי`
            });
        }
        
        if (items.length === 0) {
            attentionList.innerHTML = `
                <div class="text-center py-8">
                    <svg class="w-16 h-16 mx-auto text-emerald-500 dark:text-emerald-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <div class="text-lg font-semibold text-emerald-600 dark:text-emerald-400">הכול בשליטה 👍</div>
                    <div class="text-sm text-gray-500 dark:text-gray-400 mt-1">אין פריטים הדורשים תשומת לב</div>
                </div>
            `;
        } else {
            attentionList.innerHTML = items.map(item => `
                <div class="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
                    ${item.icon}
                    <div class="flex-1">
                        <div class="text-sm font-semibold text-gray-900 dark:text-white">${item.title}</div>
                        <div class="text-xs text-gray-600 dark:text-gray-400 mt-0.5">${item.subtitle}</div>
                    </div>
                </div>
            `).join('');
        }
    },
    
    updateActivityFeed() {
        const activityFeed = document.getElementById('activity-feed');
        if (!activityFeed) return;
        
        // Combine clients and leads, sort by date
        const activities = [];
        
        // Recent clients (last 5)
        State.clients.slice(-5).reverse().forEach(client => {
            activities.push({
                type: 'client',
                date: new Date(client.date),
                title: `עסקה נסגרה - ${client.name}`,
                amount: client.income || client.price || client.amount,
                icon: '<svg class="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>'
            });
        });
        
        // Recent leads (last 5)
        State.leads.slice(-5).reverse().forEach(lead => {
            const stageNames = {
                'new': 'ליד חדש',
                'contact': 'יצירת קשר',
                'quoted': 'הצעת מחיר נשלחה',
                'in-process': 'בתהליך',
                'won': 'זכייה',
                'lost': 'אבד'
            };
            
            activities.push({
                type: 'lead',
                date: new Date(lead.createdAt || lead.date),
                title: `${stageNames[lead.stage] || lead.stage} - ${lead.name}`,
                stage: lead.stage,
                icon: '<svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>'
            });
        });
        
        // Sort by date and take last 5
        activities.sort((a, b) => b.date - a.date);
        const recentActivities = activities.slice(0, 5);
        
        if (recentActivities.length === 0) {
            activityFeed.innerHTML = `
                <div class="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">
                    אין פעילות אחרונה להצגה
                </div>
            `;
        } else {
            activityFeed.innerHTML = recentActivities.map(activity => {
                const timeAgo = this.getTimeAgo(activity.date);
                const amountText = activity.amount ? `<span class="text-emerald-600 dark:text-emerald-400 font-semibold">₪${activity.amount.toLocaleString()}</span>` : '';
                
                return `
                    <div class="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/30 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors">
                        <div class="mt-0.5">${activity.icon}</div>
                        <div class="flex-1 min-w-0">
                            <div class="text-sm font-medium text-gray-900 dark:text-white truncate">${activity.title}</div>
                            <div class="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-2">
                                <span>${timeAgo}</span>
                                ${amountText}
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }
    },
    
    getTimeAgo(date) {
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (days > 0) return `לפני ${days} ימים`;
        if (hours > 0) return `לפני ${hours} שעות`;
        if (minutes > 0) return `לפני ${minutes} דקות`;
        return 'עכשיו';
    }
};

const StatsView = {
    render() {
        this.update();
    },
    
    update() {
        const filterVal = document.getElementById('stats-month-filter').value;
        const yearVal = parseInt(document.getElementById('stats-year-filter').value);
        const filtered = State.getFilteredClients(filterVal, yearVal);
        
        this.updateSummary(filtered, filterVal, yearVal);
        this.updateChart(filterVal, yearVal, filtered);
    },
    
    updateSummary(filtered, filterVal, yearVal) {
        const totalIncome = filtered.reduce((sum, client) => sum + (client.income || client.price || client.amount || 0), 0);
        const bridesCount = filtered.filter(c => c.isBride || c.notes?.includes('כלה')).length;
        const totalCount = filtered.length;
        
        const periodText = filterVal === 'ALL' ? `סה"כ ${yearVal}` : `${filterVal} ${yearVal}`;
        document.getElementById('sum-total').innerHTML = `<div class="text-3xl font-bold text-white">${totalIncome.toLocaleString()} ₪</div><div class="text-sm text-purple-200 mt-1">${periodText}</div>`;
        document.getElementById('sum-brides').innerHTML = `<div class="text-3xl font-bold text-white">${bridesCount}</div><div class="text-sm text-pink-100 mt-1">כלות ${filterVal === 'ALL' ? 'בשנה' : 'בחודש'}</div>`;
        document.getElementById('sum-count').innerHTML = `<div class="text-3xl font-bold text-white">${totalCount}</div><div class="text-sm text-cyan-100 mt-1">עסקאות ${filterVal === 'ALL' ? 'בשנה' : 'בחודש'}</div>`;
    },
    
    updateChart(filterVal, yearVal, filtered) {
        const isYearView = filterVal === 'ALL';
        const months = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
        
        let labels, incomeData, bridesData;
        
        if (isYearView) {
            labels = months;
            incomeData = months.map((_, idx) => {
                return State.clients
                    .filter(c => {
                        const date = new Date(c.date);
                        return date.getMonth() === idx && date.getFullYear() === yearVal;
                    })
                    .reduce((sum, c) => sum + (c.income || c.price || c.amount || 0), 0);
            });
            bridesData = months.map((_, idx) => {
                return State.clients
                    .filter(c => {
                        const date = new Date(c.date);
                        return date.getMonth() === idx && date.getFullYear() === yearVal && (c.isBride || c.notes?.includes('כלה'));
                    })
                    .length;
            });
        } else {
            labels = [filterVal];
            incomeData = [filtered.reduce((sum, c) => sum + (c.income || c.price || c.amount || 0), 0)];
            bridesData = [filtered.filter(c => c.isBride || c.notes?.includes('כלה')).length];
        }
        
        if (State.chart) {
            State.chart.destroy();
        }
        
        const datasets = [
            { 
                type: 'bar',
                label: 'הכנסות (₪)', 
                data: incomeData,
                backgroundColor: 'rgba(168, 85, 247, 0.8)',
                borderColor: '#a855f7',
                borderWidth: 2,
                borderRadius: 8,
                yAxisID: 'y'
            }
        ];
        
        // Add trend line only for year view
        if (isYearView) {
            datasets.push({
                type: 'line',
                label: 'מגמה',
                data: incomeData,
                borderColor: '#f472b6',
                backgroundColor: 'rgba(244, 114, 182, 0.1)',
                borderWidth: 3,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 6,
                yAxisID: 'y'
            });
        }
        
        State.chart = new Chart(document.getElementById('incomeChart'), {
            data: {
                labels,
                datasets
            },
            options: { 
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    title: {
                        display: true,
                        text: isYearView ? 'סטטיסטיקות שנתיות - הכנסות ומגמה' : `סטטיסטיקות חודש ${filterVal}`,
                        font: { size: 18, weight: 'bold' },
                        color: '#e9d5ff',
                        padding: { bottom: 20 }
                    },
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            color: '#e9d5ff',
                            font: { size: 13, weight: '600' },
                            padding: 15
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(17, 24, 39, 0.95)',
                        titleColor: '#f9fafb',
                        bodyColor: '#e5e7eb',
                        borderColor: '#a855f7',
                        borderWidth: 1,
                        padding: 12,
                        displayColors: true,
                        callbacks: {
                            afterLabel: function(context) {
                                if (context.datasetIndex === 0) {
                                    const monthIdx = months.indexOf(context.label);
                                    if (monthIdx !== -1) {
                                        const brides = bridesData[monthIdx];
                                        return `כלות: ${brides}`;
                                    }
                                }
                                return '';
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.05)',
                            drawBorder: false
                        },
                        ticks: {
                            color: '#d8b4fe',
                            font: { size: 12, weight: '600' }
                        }
                    },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)',
                            drawBorder: false
                        },
                        title: {
                            display: true,
                            text: 'הכנסות (₪)',
                            color: '#e9d5ff',
                            font: { size: 14, weight: 'bold' }
                        },
                        ticks: {
                            color: '#d8b4fe',
                            font: { size: 12, weight: '600' },
                            callback: function(value) {
                                return value.toLocaleString() + ' ₪';
                            }
                        }
                    }
                }
            }
        });
    }
};

const ManageView = {
    open() {
        const filterVal = document.getElementById('stats-month-filter').value;
        const yearVal = parseInt(document.getElementById('stats-year-filter').value);
        const filtered = State.getFilteredClients(filterVal, yearVal);
        const tbody = document.getElementById('manage-tbody');
        
        tbody.innerHTML = filtered
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .map(client => {
                const clientId = client._id || client.id;
                const dateOnly = client.date ? client.date.split('T')[0] : client.date;
                const brideIcon = client.isBride ? '👰' : '-';
                return `
                <tr class="border-b border-gray-700 hover:bg-gray-700 text-right bg-gray-800">
                    <td class="p-3">
                        <input type="checkbox" class="row-sel cursor-pointer" data-id="${clientId}" onchange="checkBulkVisibility()">
                    </td>
                    <td class="p-3 text-xs text-gray-400">${dateOnly}</td>
                    <td class="p-3 font-bold text-white">${client.name}</td>
                    <td class="p-3 text-sm text-gray-300">${client.service || '-'}</td>
                    <td class="p-3 text-purple-400 font-bold">${client.income || client.price || client.amount} ₪</td>
                    <td class="p-3 text-xs text-gray-300">${client.payment || 'מזומן'}</td>
                    <td class="p-3 text-center">${brideIcon}</td>
                    <td class="p-3 flex gap-2">
                        <button onclick="startEdit('${clientId}')" class="text-blue-300 hover:text-blue-200 font-bold text-xs bg-blue-900/40 hover:bg-blue-900/60 px-2 py-1 rounded transition-all">ערוך</button>
                        <button onclick="deleteRow('${clientId}')" class="text-red-300 hover:text-red-200 font-bold text-xs bg-red-900/40 hover:bg-red-900/60 px-2 py-1 rounded transition-all">מחק</button>
                    </td>
                </tr>
            `}).join('');
        
        this.checkBulkVisibility();
        ModalManager.open('modal-manage');
    },
    
    toggleSelectAll(masterCheckbox) {
        document.querySelectorAll('.row-sel').forEach(cb => {
            cb.checked = masterCheckbox.checked;
        });
        this.checkBulkVisibility();
    },
    
    checkBulkVisibility() {
        const checked = document.querySelectorAll('.row-sel:checked');
        const btn = document.getElementById('bulk-del-btn');
        btn.classList.toggle('hidden', checked.length === 0);
        btn.innerText = `מחק ${checked.length} רשומות`;
    },
    
    async bulkDelete() {
        if (!confirm('האם למחוק את כל הרשומות המסומנות?')) return;
        
        const ids = Array.from(document.querySelectorAll('.row-sel:checked'))
            .map(cb => cb.dataset.id); // Keep as string for MongoDB _id
        
        try {
            await API.bulkDeleteClients(ids);
            State.clients = State.clients.filter(c => !ids.includes(c._id || c.id));
            this.open();
            StatsView.update();
        } catch (error) {
            alert("המחיקה נכשלה: " + error.message);
        }
    }
};

// Excel Export Tool
const ExcelExporter = {
    export() {
        const filterVal = document.getElementById('stats-month-filter').value;
        const isYearView = filterVal === 'ALL';
        const workbook = XLSX.utils.book_new();
        
        if (isYearView) {
            // Create dashboard sheet
            this.createDashboard(workbook);
            
            // Create a sheet for each month
            CONFIG.MONTHS.forEach((month, index) => {
                const monthData = State.clients.filter(c => {
                    const date = new Date(c.date);
                    return date.getMonth() === index;
                });
                if (monthData.length > 0) {
                    this.createMonthSheet(workbook, month, monthData);
                }
            });
        } else {
            // Single month export
            const yearVal = parseInt(document.getElementById('stats-year-filter').value);
            const monthData = State.getFilteredClients(filterVal, yearVal);
            this.createMonthSheet(workbook, filterVal, monthData);
        }
        
        // Download file
        const fileName = isYearView 
            ? `דוח_שנתי_${new Date().getFullYear()}.xlsx`
            : `דוח_${filterVal}_${new Date().getFullYear()}.xlsx`;
        XLSX.writeFile(workbook, fileName);
    },
    
    createDashboard(workbook) {
        const ws_data = [];
        let currentRow = 0;
        
        // Title Section - BIG and BOLD
        ws_data.push(['דשבורד הכנסות שנתי']);
        ws_data.push([`שנת ${new Date().getFullYear()}`]);
        ws_data.push([]);
        
        // Calculate yearly totals
        let yearlyTotal = 0;
        let yearlyCount = 0;
        let yearlyBrides = 0;
        const paymentMethods = {};
        const monthlyData = [];
        
        CONFIG.MONTHS.forEach((month, index) => {
            const monthClients = State.clients.filter(c => {
                const date = new Date(c.date);
                return date.getMonth() === index;
            });
            
            const total = monthClients.reduce((sum, c) => sum + (c.income || c.price || c.amount || 0), 0);
            const count = monthClients.length;
            const brides = monthClients.filter(c => c.isBride).length;
            
            yearlyTotal += total;
            yearlyCount += count;
            yearlyBrides += brides;
            
            // Count payment methods
            monthClients.forEach(c => {
                const payment = c.payment || 'מזומן';
                paymentMethods[payment] = (paymentMethods[payment] || 0) + (c.income || c.price || c.amount || 0);
            });
            
            if (count > 0) {
                monthlyData.push({ month, total, count, brides });
            }
        });
        
        // Key Metrics Summary - Large Cards
        ws_data.push(['📊 סיכום ביצועים שנתי']);
        ws_data.push([]);
        ws_data.push(['מדד', 'ערך']);
        ws_data.push(['💰 סה"כ הכנסות שנתיות', `₪${yearlyTotal.toLocaleString()}`]);
        ws_data.push(['📈 מספר עסקאות', yearlyCount]);
        ws_data.push(['👰 עסקאות כלות', yearlyBrides]);
        ws_data.push(['💵 ממוצע לעסקה', `₪${Math.round(yearlyTotal / yearlyCount).toLocaleString()}`]);
        ws_data.push([]);
        ws_data.push([]);
        
        // Monthly Breakdown Table
        ws_data.push(['📅 פירוט הכנסות חודשי']);
        ws_data.push([]);
        ws_data.push(['חודש', 'סה"כ הכנסות (₪)', 'מספר עסקאות', 'כלות', 'ממוצע לעסקה (₪)']);
        
        monthlyData.forEach(({ month, total, count, brides }) => {
            const avg = Math.round(total / count);
            ws_data.push([month, total, count, brides, avg]);
        });
        
        // Totals row
        ws_data.push([]);
        ws_data.push(['סה"כ שנתי', yearlyTotal, yearlyCount, yearlyBrides, Math.round(yearlyTotal / yearlyCount)]);
        
        // Payment Methods Section
        ws_data.push([]);
        ws_data.push([]);
        ws_data.push(['💳 התפלגות לפי אמצעי תשלום']);
        ws_data.push([]);
        ws_data.push(['אמצעי תשלום', 'סה"כ הכנסות (₪)', 'אחוז']);
        
        Object.entries(paymentMethods)
            .sort((a, b) => b[1] - a[1])
            .forEach(([method, amount]) => {
                const percentage = ((amount / yearlyTotal) * 100).toFixed(1);
                ws_data.push([method, amount, `${percentage}%`]);
            });
        
        const ws = XLSX.utils.aoa_to_sheet(ws_data);
        
        // Styling - Wide columns for better readability
        ws['!cols'] = [
            { wch: 25 },  // Column A - wider for labels
            { wch: 20 },  // Column B
            { wch: 18 },  // Column C
            { wch: 15 },  // Column D
            { wch: 20 }   // Column E
        ];
        
        // Row heights for title
        ws['!rows'] = [
            { hpx: 40 },  // Row 1 - Title
            { hpx: 25 }   // Row 2 - Subtitle
        ];
        
        XLSX.utils.book_append_sheet(workbook, ws, '📊 דשבורד');
    },
    
    createMonthSheet(workbook, monthName, clients) {
        const ws_data = [];
        
        // Title with emoji
        ws_data.push([`📅 דוח הכנסות - ${monthName} ${new Date().getFullYear()}`]);
        ws_data.push([]);
        
        // Summary box at top
        const total = clients.reduce((sum, c) => sum + (c.income || c.price || c.amount || 0), 0);
        const brides = clients.filter(c => c.isBride).length;
        const avg = Math.round(total / clients.length);
        
        ws_data.push(['סיכום חודשי']);
        ws_data.push(['סה"כ הכנסות:', `₪${total.toLocaleString()}`]);
        ws_data.push(['מספר עסקאות:', clients.length]);
        ws_data.push(['עסקאות כלות:', brides]);
        ws_data.push(['ממוצע לעסקה:', `₪${avg.toLocaleString()}`]);
        ws_data.push([]);
        
        // Headers with emojis
        ws_data.push(['📅 תאריך', '👤 שם לקוח', '💄 סוג שירות', '💰 סכום (₪)', '💳 תשלום', '👰 כלה?']);
        
        // Data rows - sorted by date
        const sortedClients = clients.sort((a, b) => new Date(a.date) - new Date(b.date));
        sortedClients.forEach(client => {
            ws_data.push([
                client.date,
                client.name,
                client.service || 'שירות רגיל',
                client.income || client.price || client.amount || 0,
                client.payment || 'מזומן',
                client.isBride ? '✓ כן' : 'לא'
            ]);
        });
        
        // Bottom summary
        ws_data.push([]);
        ws_data.push(['', '', 'סיכום:', total, '', '']);
        
        const ws = XLSX.utils.aoa_to_sheet(ws_data);
        
        // Column widths - optimized for Hebrew text
        ws['!cols'] = [
            { wch: 12 },  // תאריך
            { wch: 25 },  // שם - wider for names
            { wch: 20 },  // שירות
            { wch: 15 },  // סכום
            { wch: 15 },  // תשלום
            { wch: 10 }   // כלה
        ];
        
        // Row heights
        ws['!rows'] = [
            { hpx: 35 }  // Title row
        ];
        
        XLSX.utils.book_append_sheet(workbook, ws, monthName);
    }
};

// ==================== MESSAGE SETTINGS MANAGEMENT ====================
const MessageSettings = {
    settings: {},
    
    async init() {
        // Try to load from localStorage first
        const saved = localStorage.getItem(CONFIG.STORAGE_KEYS.MESSAGE_SETTINGS);
        if (saved) {
            this.settings = JSON.parse(saved);
        } else {
            // Use defaults
            this.settings = JSON.parse(JSON.stringify(CONFIG.DEFAULT_MESSAGE_SETTINGS));
        }
    },
    
    render() {
        const content = document.getElementById('message-settings-content');
        if (!content) {
            console.error('message-settings-content not found');
            return;
        }
        
        console.log('Rendering message settings...');
        
        const allStages = [...CONFIG.LEAD_STAGES, ...CONFIG.LEAD_STAGES_ARCHIVE];
        
        content.innerHTML = allStages.map(stage => {
            // Ensure we have settings for this stage
            if (!this.settings[stage.id]) {
                this.settings[stage.id] = JSON.parse(JSON.stringify(CONFIG.DEFAULT_MESSAGE_SETTINGS[stage.id] || {
                    immediate: {enabled: false, template: ''},
                    followUp: {enabled: false, delay: 1, unit: 'days', template: ''}
                }));
            }
            
            const stageSettings = this.settings[stage.id];
            
            return `
                <div class="border-2 border-purple-100 rounded-2xl p-6 bg-gradient-to-br from-purple-50 to-white">
                    <h4 class="text-xl font-bold text-purple-900 mb-4 flex items-center gap-2">
                        <span class="text-2xl">${this.getStageEmoji(stage.id)}</span>
                        ${stage.title}
                    </h4>
                    
                    <!-- Immediate Message -->
                    <div class="bg-white rounded-xl p-4 mb-4 border border-gray-200">
                        <div class="flex items-center justify-between mb-3">
                            <label class="flex items-center gap-2 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    id="immediate-${stage.id}"
                                    ${stageSettings.immediate.enabled ? 'checked' : ''}
                                    class="w-5 h-5 text-purple-600 rounded"
                                    onchange="MessageSettings.updateToggle('${stage.id}', 'immediate', this.checked)"
                                >
                                <span class="font-bold text-gray-800">📩 הודעה מיידית בכניסה לשלב</span>
                            </label>
                        </div>
                        <textarea 
                            id="immediate-template-${stage.id}"
                            rows="3"
                            class="w-full border-2 border-gray-200 rounded-xl p-3 text-sm font-mono resize-none focus:border-purple-400 focus:outline-none"
                            placeholder="תבנית הודעה... השתמש ב-{{firstName}}, {{service}}, {{date}}"
                            onchange="MessageSettings.updateTemplate('${stage.id}', 'immediate', this.value)"
                        >${stageSettings.immediate.template || ''}</textarea>
                        <div class="text-xs text-gray-500 mt-2">
                            💡 משתנים זמינים: {{firstName}}, {{service}}, {{date}}
                        </div>
                    </div>
                    

                </div>
            `;
        }).join('');
        
        console.log('Message settings rendered successfully');
    },
    
    getStageEmoji(stageId) {
        const emojis = {
            'new': '🆕',
            'in-process': '💬',
            'contract-sent': '📄',
            'closed': '✅',
            'completed': '🎉',
            'lost': '📥'
        };
        return emojis[stageId] || '📌';
    },
    
    updateToggle(stageId, type, enabled) {
        if (!this.settings[stageId]) {
            this.settings[stageId] = JSON.parse(JSON.stringify(CONFIG.DEFAULT_MESSAGE_SETTINGS[stageId]));
        }
        this.settings[stageId][type].enabled = enabled;
    },
    
    updateTemplate(stageId, type, template) {
        if (!this.settings[stageId]) {
            this.settings[stageId] = JSON.parse(JSON.stringify(CONFIG.DEFAULT_MESSAGE_SETTINGS[stageId]));
        }
        this.settings[stageId][type].template = template;
    },
    
    updateDelay(stageId, delay, unit) {
        if (!this.settings[stageId]) {
            this.settings[stageId] = JSON.parse(JSON.stringify(CONFIG.DEFAULT_MESSAGE_SETTINGS[stageId]));
        }
        this.settings[stageId].followUp.delay = parseInt(delay);
        this.settings[stageId].followUp.unit = unit;
    },
    
    save() {
        // Save to localStorage
        localStorage.setItem(CONFIG.STORAGE_KEYS.MESSAGE_SETTINGS, JSON.stringify(this.settings));
        
        // Show success message
        alert('✅ ההגדרות נשמרו בהצלחה!');
        closeModal('modal-message-settings');
    },
    
    getSettings(stageId) {
        return this.settings[stageId] || CONFIG.DEFAULT_MESSAGE_SETTINGS[stageId];
    }
};

// ==================== TIMER SETTINGS ====================
const TimerSettings = {
    settings: {},
    
    async init() {
        const saved = localStorage.getItem('timer_settings_v1');
        if (saved) {
            this.settings = JSON.parse(saved);
        } else {
            // Use defaults from message settings for timers
            this.settings = {};
            const allStages = [...CONFIG.LEAD_STAGES, ...CONFIG.LEAD_STAGES_ARCHIVE];
            allStages.forEach(stage => {
                const defaults = CONFIG.DEFAULT_MESSAGE_SETTINGS[stage.id];
                if (defaults && defaults.followUp) {
                    this.settings[stage.id] = {
                        enabled: defaults.followUp.enabled,
                        delay: defaults.followUp.delay,
                        unit: defaults.followUp.unit,
                        template: defaults.followUp.template
                    };
                }
            });
        }
    },
    
    render() {
        const content = document.getElementById('timer-settings-content');
        if (!content) {
            console.error('timer-settings-content not found');
            return;
        }
        
        const allStages = [...CONFIG.LEAD_STAGES, ...CONFIG.LEAD_STAGES_ARCHIVE];
        
        // Filter out stages that shouldn't have timers (new, completed/lost)
        const timerStages = allStages.filter(stage => 
            stage.id !== 'new' && stage.id !== 'completed' && stage.id !== 'lost'
        );
        
        content.innerHTML = timerStages.map(stage => {
            if (!this.settings[stage.id]) {
                this.settings[stage.id] = {
                    enabled: false,
                    delay: 1,
                    unit: 'days',
                    template: ''
                };
            }
            
            const stageSettings = this.settings[stage.id];
            
            return `
                <div class="border-2 border-purple-100 dark:border-gray-700 rounded-2xl p-6 bg-gradient-to-br from-purple-50 to-white dark:from-gray-800 dark:to-gray-900">
                    <h4 class="text-xl font-bold text-purple-900 dark:text-purple-300 mb-4 flex items-center gap-2">
                        <span class="text-2xl">${MessageSettings.getStageEmoji(stage.id)}</span>
                        ${stage.title}
                    </h4>
                    
                    <div class="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-600">
                        <div class="flex items-center justify-between mb-3">
                            <label class="flex items-center gap-2 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    id="timer-${stage.id}"
                                    ${stageSettings.enabled ? 'checked' : ''}
                                    class="w-5 h-5 text-purple-600 rounded"
                                    onchange="TimerSettings.updateToggle('${stage.id}', this.checked)"
                                >
                                <span class="font-bold text-gray-800 dark:text-gray-200">⏰ הפעל טיימר Follow-up</span>
                            </label>
                        </div>
                        
                        <div class="flex gap-2 mb-3">
                            <input 
                                type="number" 
                                id="timer-delay-${stage.id}"
                                value="${stageSettings.delay || 1}"
                                min="1"
                                class="w-20 border-2 border-gray-200 dark:border-gray-600 rounded-lg p-2 text-center font-bold dark:bg-gray-700 dark:text-gray-200"
                                onchange="TimerSettings.updateDelay('${stage.id}', this.value, document.getElementById('timer-unit-${stage.id}').value)"
                            >
                            <select 
                                id="timer-unit-${stage.id}"
                                class="flex-1 border-2 border-gray-200 dark:border-gray-600 rounded-lg p-2 font-bold dark:bg-gray-700 dark:text-gray-200"
                                onchange="TimerSettings.updateDelay('${stage.id}', document.getElementById('timer-delay-${stage.id}').value, this.value)"
                            >
                                <option value="hours" ${stageSettings.unit === 'hours' ? 'selected' : ''}>שעות</option>
                                <option value="days" ${stageSettings.unit === 'days' ? 'selected' : ''}>ימים</option>
                                <option value="weeks" ${stageSettings.unit === 'weeks' ? 'selected' : ''}>שבועות</option>
                            </select>
                        </div>
                        
                        <textarea 
                            id="timer-template-${stage.id}"
                            rows="3"
                            class="w-full border-2 border-gray-200 dark:border-gray-600 rounded-xl p-3 text-sm font-mono resize-none focus:border-purple-400 focus:outline-none dark:bg-gray-700 dark:text-gray-200"
                            placeholder="תבנית הודעת follow-up..."
                            onchange="TimerSettings.updateTemplate('${stage.id}', this.value)"
                        >${stageSettings.template || ''}</textarea>
                        <div class="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            💡 משתנים זמינים: {{firstName}}, {{service}}, {{date}}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    },
    
    updateToggle(stageId, enabled) {
        if (!this.settings[stageId]) {
            this.settings[stageId] = {enabled: false, delay: 1, unit: 'days', template: ''};
        }
        this.settings[stageId].enabled = enabled;
    },
    
    updateTemplate(stageId, template) {
        if (!this.settings[stageId]) {
            this.settings[stageId] = {enabled: false, delay: 1, unit: 'days', template: ''};
        }
        this.settings[stageId].template = template;
    },
    
    updateDelay(stageId, delay, unit) {
        if (!this.settings[stageId]) {
            this.settings[stageId] = {enabled: false, delay: 1, unit: 'days', template: ''};
        }
        this.settings[stageId].delay = parseInt(delay);
        this.settings[stageId].unit = unit;
    },
    
    save() {
        localStorage.setItem('timer_settings_v1', JSON.stringify(this.settings));
        alert('✅ הגדרות הטיימרים נשמרו בהצלחה!');
        closeModal('modal-timer-settings');
    },
    
    getSettings(stageId) {
        return this.settings[stageId] || {enabled: false, delay: 1, unit: 'days', template: ''};
    }
};

// ==================== WHATSAPP AUTOMATION ====================
const WhatsAppAutomation = {
    pendingLead: null,
    pendingStage: null,
    
    async checkAndPrompt(leadId, newStage) {
        const lead = State.leads.find(l => (l._id || l.id) === leadId);
        if (!lead) return;
        
        const stageSettings = MessageSettings.getSettings(newStage);
        
        // Check if immediate message is enabled
        if (stageSettings.immediate.enabled && stageSettings.immediate.template) {
            this.pendingLead = lead;
            this.pendingStage = newStage;
            
            // For in-process stage, show proposed price field
            const inProcessFields = document.getElementById('in-process-fields');
            const additionalFields = document.getElementById('contract-additional-fields');
            const contractActions = document.getElementById('contract-actions');
            
            if (newStage === 'in-process') {
                // No need to show price field again - price was already entered in modal-set-price
                if (inProcessFields) inProcessFields.classList.add('hidden');
                if (additionalFields) additionalFields.classList.add('hidden');
                if (contractActions) contractActions.classList.add('hidden');
            } else if (newStage === 'contract-sent') {
                if (inProcessFields) inProcessFields.classList.add('hidden');
                if (additionalFields) additionalFields.classList.remove('hidden');
                if (contractActions) contractActions.classList.remove('hidden');
                
                // Pre-fill existing data with NEW structure
                // Escort type dropdown
                document.getElementById('contract-escortType').value = lead.escortType || 'none';
                document.getElementById('contract-escortPrice').value = lead.escortPrice || '';
                document.getElementById('contract-proposedDeposit').value = lead.proposedDeposit || '';
                toggleEscortPrice(); // Show/hide price field based on dropdown
                
                // Bridesmaids dynamic fields
                const bridesmaidsCount = lead.bridesmaids?.length || 0;
                document.getElementById('contract-bridesmaidsCount').value = bridesmaidsCount;
                updateBridesmaidsFields();
                
                // Fill existing bridesmaids data
                if (lead.bridesmaids && lead.bridesmaids.length > 0) {
                    lead.bridesmaids.forEach((bridesmaid, i) => {
                        const serviceInput = document.getElementById(`bridesmaid-service-${i}`);
                        const priceInput = document.getElementById(`bridesmaid-price-${i}`);
                        if (serviceInput) serviceInput.value = bridesmaid.service || '';
                        if (priceInput) priceInput.value = bridesmaid.price || '';
                    });
                }
            } else if (newStage === 'closed') {
                // For 'closed' stage - no additional fields needed
                // Deposit was already recorded in modal-deal-closed
                if (inProcessFields) inProcessFields.classList.add('hidden');
                if (additionalFields) additionalFields.classList.add('hidden');
                if (contractActions) contractActions.classList.add('hidden');
            } else {
                if (inProcessFields) inProcessFields.classList.add('hidden');
                if (additionalFields) additionalFields.classList.add('hidden');
                if (contractActions) contractActions.classList.add('hidden');
            }
            
            // Generate message with variables
            const message = this.fillTemplate(stageSettings.immediate.template, lead);
            
            // Show confirmation modal
            document.getElementById('whatsapp-confirm-message').textContent = message;
            openModal('modal-whatsapp-confirm');
        } else {
            // No message configured, just update status
            await this.completeStageChange(leadId, newStage);
        }
    },
    
    fillTemplate(template, lead) {
        const firstName = lead.name.trim().split(' ')[0];
        let message = template;
        
        message = message.replace(/\{\{firstName\}\}/g, firstName || lead.name);
        message = message.replace(/\{\{service\}\}/g, lead.service || 'שירותי האיפור');
        message = message.replace(/\{\{date\}\}/g, lead.eventDate ? new Date(lead.eventDate).toLocaleDateString('he-IL') : 'התאריך שנקבע');
        
        return message;
    },
    
    async sendConfirmed() {
        if (!this.pendingLead || !this.pendingStage) return;
        
        // For in-process stage, proposedPrice was already saved in StageManager.confirmPrice()
        // No need to update it again here
        
        // If closed stage, update actual deposit (real payment)
        if (this.pendingStage === 'closed') {
            const actualDeposit = parseFloat(document.getElementById('closed-actualDeposit').value) || 0;
            this.pendingLead.actualDeposit = actualDeposit;
        }
        
        // If contract-sent stage, update lead with additional fields
        if (this.pendingStage === 'contract-sent') {
            // lastName already exists from lead creation (required field)
            
            // Use proposedPrice from previous "in-process" stage if exists
            const proposedPrice = this.pendingLead.proposedPrice || 0;
            
            // Update proposed deposit (for contract display)
            this.pendingLead.proposedDeposit = parseInt(document.getElementById('contract-proposedDeposit').value) || 0;
            console.log('💰 Proposed Deposit saved:', this.pendingLead.proposedDeposit);
            console.log('💰 Using Proposed Price from in-process stage:', proposedPrice);
            
            // Update escort type and price
            this.pendingLead.escortType = document.getElementById('contract-escortType').value;
            if (this.pendingLead.escortType !== 'none') {
                this.pendingLead.escortPrice = parseInt(document.getElementById('contract-escortPrice').value) || 0;
            } else {
                this.pendingLead.escortPrice = 0;
            }
            
            // Collect bridesmaids data from dynamic fields
            const bridesmaidsCount = parseInt(document.getElementById('contract-bridesmaidsCount').value) || 0;
            this.pendingLead.bridesmaids = [];
            
            for (let i = 0; i < bridesmaidsCount; i++) {
                const service = document.getElementById(`bridesmaid-service-${i}`)?.value.trim() || '';
                const price = parseInt(document.getElementById(`bridesmaid-price-${i}`)?.value) || 0;
                
                if (service) { // Only add if service is provided
                    this.pendingLead.bridesmaids.push({ service, price });
                }
            }
            
            // Save updated lead data
            await API.updateLead(this.pendingLead._id || this.pendingLead.id, this.pendingLead);
            
            // Generate contract
            try {
                const result = await ContractManager.generateContract(this.pendingLead._id || this.pendingLead.id);
                
                // Update lead with contract URL
                this.pendingLead.contractFileUrl = result.pdfUrl;
                
                // Add contract link to message
                const stageSettings = MessageSettings.getSettings(this.pendingStage);
                let message = this.fillTemplate(stageSettings.immediate.template, this.pendingLead);
                
                // Create full URL for WhatsApp sharing
                const fullPdfUrl = `${window.location.protocol}//${window.location.host}${result.pdfUrl}`;
                console.log('📤 PDF URL for WhatsApp:', fullPdfUrl);
                console.log('🌐 Protocol:', window.location.protocol);
                console.log('🌐 Host:', window.location.host);
                console.log('📄 Result PDF URL:', result.pdfUrl);
                message += `\n\nקישור לחוזה: ${fullPdfUrl}`;
                
                console.log('💬 Full message:', message);
                
                // Send via WhatsApp with contract link
                const phone = this.pendingLead.phone.replace(/[^0-9]/g, '').replace(/^0/, '');
                const url = `https://wa.me/972${phone}?text=${encodeURIComponent(message)}`;
                window.open(url, '_blank');
                
                // Record message sent
                if (!this.pendingLead.messageHistory) this.pendingLead.messageHistory = [];
                this.pendingLead.messageHistory.push({
                    type: 'immediate',
                    stage: this.pendingStage,
                    message: message,
                    sentAt: new Date().toISOString(),
                    contractUrl: result.pdfUrl
                });
                
                // Complete stage change
                await this.completeStageChange(this.pendingLead._id || this.pendingLead.id, this.pendingStage);
                
                closeModal('modal-whatsapp-confirm');
                this.pendingLead = null;
                this.pendingStage = null;
                
                alert('✅ החוזה נוצר ונשלח בהצלחה!');
            } catch (error) {
                console.error('❌ Contract generation error:', error);
                const errorMsg = error.message || JSON.stringify(error);
                alert('❌ שגיאה ביצירת החוזה:\n\n' + errorMsg + '\n\nפרטים נוספים בקונסול (F12)');
            }
        } else {
            // Regular message sending (non-contract)
            const stageSettings = MessageSettings.getSettings(this.pendingStage);
            const message = this.fillTemplate(stageSettings.immediate.template, this.pendingLead);
            
            // Send via WhatsApp
            const phone = this.pendingLead.phone.replace(/[^0-9]/g, '').replace(/^0/, '');
            const url = `https://wa.me/972${phone}?text=${encodeURIComponent(message)}`;
            window.open(url, '_blank');
            
            // Record message sent
            if (!this.pendingLead.messageHistory) this.pendingLead.messageHistory = [];
            this.pendingLead.messageHistory.push({
                type: 'immediate',
                stage: this.pendingStage,
                message: message,
                sentAt: new Date().toISOString()
            });
            
            // Complete stage change
            await this.completeStageChange(this.pendingLead._id || this.pendingLead.id, this.pendingStage);
            
            closeModal('modal-whatsapp-confirm');
            this.pendingLead = null;
            this.pendingStage = null;
        }
    },
    
    async previewContractHTML() {
        if (!this.pendingLead) return;
        
        console.log('🔍 Opening HTML preview for lead:', this.pendingLead._id || this.pendingLead.id);
        
        // Update lead with current form values (same as previewContract)
        this.pendingLead.escortType = document.getElementById('contract-escortType').value;
        if (this.pendingLead.escortType !== 'none') {
            this.pendingLead.escortPrice = parseInt(document.getElementById('contract-escortPrice').value) || 0;
        } else {
            this.pendingLead.escortPrice = 0;
        }
        
        const bridesmaidsCount = parseInt(document.getElementById('contract-bridesmaidsCount').value) || 0;
        this.pendingLead.bridesmaids = [];
        
        for (let i = 0; i < bridesmaidsCount; i++) {
            const service = document.getElementById(`bridesmaid-service-${i}`)?.value.trim() || '';
            const price = parseInt(document.getElementById(`bridesmaid-price-${i}`)?.value) || 0;
            
            if (service) {
                this.pendingLead.bridesmaids.push({ service, price });
            }
        }
        
        // Save lead data first
        console.log('💾 Saving lead data...');
        await API.updateLead(this.pendingLead._id || this.pendingLead.id, this.pendingLead);
        console.log('✅ Lead data saved');
        
        // Open HTML preview in new tab
        const previewUrl = `${CONFIG.API_BASE_URL}/preview-contract/${this.pendingLead._id || this.pendingLead.id}`;
        window.open(previewUrl, '_blank');
    },
    
    async previewContract() {
        if (!this.pendingLead) return;
        
        console.log('📋 Preparing contract preview for lead:', this.pendingLead._id || this.pendingLead.id);
        
        // Update lead with current form values
        // lastName already exists from lead creation (required field)
        
        // Update escort type and price
        this.pendingLead.escortType = document.getElementById('contract-escortType').value;
        if (this.pendingLead.escortType !== 'none') {
            this.pendingLead.escortPrice = parseInt(document.getElementById('contract-escortPrice').value) || 0;
        } else {
            this.pendingLead.escortPrice = 0;
        }
        
        console.log('👔 Escort:', this.pendingLead.escortType, this.pendingLead.escortPrice);
        
        // Collect bridesmaids data from dynamic fields
        const bridesmaidsCount = parseInt(document.getElementById('contract-bridesmaidsCount').value) || 0;
        this.pendingLead.bridesmaids = [];
        
        for (let i = 0; i < bridesmaidsCount; i++) {
            const service = document.getElementById(`bridesmaid-service-${i}`)?.value.trim() || '';
            const price = parseInt(document.getElementById(`bridesmaid-price-${i}`)?.value) || 0;
            
            if (service) { // Only add if service is provided
                this.pendingLead.bridesmaids.push({ service, price });
            }
        }
        
        console.log('👥 Bridesmaids:', this.pendingLead.bridesmaids);
        
        // Save lead data first
        console.log('💾 Saving lead data...');
        await API.updateLead(this.pendingLead._id || this.pendingLead.id, this.pendingLead);
        console.log('✅ Lead data saved');
        
        try {
            console.log('📄 Generating contract...');
            const result = await ContractManager.generateContract(this.pendingLead._id || this.pendingLead.id);
            console.log('✅ Contract generated:', result);
            
            // CRITICAL: Save the PDF URL to the lead object
            this.pendingLead.contractFileUrl = result.pdfUrl;
            console.log('💾 Saved pdfUrl to lead:', this.pendingLead.contractFileUrl);
            
            // Show preview in iframe
            const iframe = document.getElementById('contract-preview-frame');
            iframe.src = result.pdfUrl;
            
            // Hide confirm modal, show preview modal
            closeModal('modal-whatsapp-confirm');
            openModal('modal-contract-preview');
        } catch (error) {
            console.error('❌ Preview error:', error);
            const errorMsg = error.message || JSON.stringify(error);
            alert('❌ שגיאה ביצירת תצוגה מקדימה:\n\n' + errorMsg + '\n\nפתחי קונסול (F12) לפרטים נוספים');
        }
    },
    
    async confirmContractSend() {
        // Contract already generated, send signing link
        const stageSettings = MessageSettings.getSettings(this.pendingStage);
        let message = this.fillTemplate(stageSettings.immediate.template, this.pendingLead);
        
        // Create signing page URL (not PDF!)
        const signingUrl = `${window.location.protocol}//${window.location.host}/contract-sign/${this.pendingLead._id || this.pendingLead.id}`;
        console.log('📤 Signing URL for WhatsApp:', signingUrl);
        
        message += `\n\n👉 לחצי כאן לצפייה וחתימה:\n${signingUrl}`;
        
        console.log('💬 Full message:', message);
        
        // Send via WhatsApp
        const phone = this.pendingLead.phone.replace(/[^0-9]/g, '').replace(/^0/, '');
        const url = `https://wa.me/972${phone}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
        
        // Record message sent
        if (!this.pendingLead.messageHistory) this.pendingLead.messageHistory = [];
        this.pendingLead.messageHistory.push({
            type: 'immediate',
            stage: this.pendingStage,
            message: message,
            sentAt: new Date().toISOString(),
            contractUrl: this.pendingLead.contractFileUrl
        });
        
        // Complete stage change
        await this.completeStageChange(this.pendingLead._id || this.pendingLead.id, this.pendingStage);
        
        closeModal('modal-contract-preview');
        this.pendingLead = null;
        this.pendingStage = null;
        
        alert('✅ החוזה נשלח בהצלחה!');
    },
    
    async skipMessage() {
        if (!this.pendingLead || !this.pendingStage) return;
        
        // DON'T update proposedPrice here - it was already saved in confirmPrice()
        // The in-process-fields are now hidden, so we can't read from them anyway
        
        // If contract-sent stage, save deposit and other fields before skipping
        if (this.pendingStage === 'contract-sent') {
            this.pendingLead.proposedDeposit = parseInt(document.getElementById('contract-proposedDeposit').value) || 0;
            this.pendingLead.escortType = document.getElementById('contract-escortType').value;
            if (this.pendingLead.escortType !== 'none') {
                this.pendingLead.escortPrice = parseInt(document.getElementById('contract-escortPrice').value) || 0;
            }
            await API.updateLead(this.pendingLead._id || this.pendingLead.id, this.pendingLead);
        }
        
        // Just update stage without sending
        await this.completeStageChange(this.pendingLead._id || this.pendingLead.id, this.pendingStage);
        
        closeModal('modal-whatsapp-confirm');
        this.pendingLead = null;
        this.pendingStage = null;
    },
    
    // Save proposed deposit immediately when changed
    async saveProposedDeposit() {
        if (!this.pendingLead) return;
        
        const deposit = parseInt(document.getElementById('contract-proposedDeposit').value) || 0;
        this.pendingLead.proposedDeposit = deposit;
        
        console.log('💰 Auto-saving proposed deposit:', deposit);
        
        try {
            await API.updateLead(this.pendingLead._id || this.pendingLead.id, { proposedDeposit: deposit });
            console.log('✅ Deposit saved to database');
        } catch (error) {
            console.error('❌ Failed to save deposit:', error);
        }
    },
    
    async completeStageChange(leadId, newStage) {
        const lead = State.leads.find(l => (l._id || l.id) === leadId);
        if (!lead) return;
        
        const oldStatus = lead.status;
        
        // Add to stage history
        if (!lead.stageHistory) lead.stageHistory = [];
        lead.stageHistory.push({
            stage: newStage,
            timestamp: new Date().toISOString(),
            note: `עבר לשלב: ${CONFIG.LEAD_STAGES.find(s => s.id === newStage)?.title || newStage}`
        });
        
        lead.status = newStage;
        lead.updatedAt = new Date().toISOString();
        
        // Cancel old timers for previous stage
        FollowUpTimers.cancelTimer(leadId, oldStatus);
        
        // Start new follow-up timer if enabled
        const stageSettings = MessageSettings.getSettings(newStage);
        if (stageSettings.followUp.enabled && stageSettings.followUp.template) {
            FollowUpTimers.startTimer(leadId, newStage, stageSettings.followUp);
        }
        
        // Save to database
        await API.updateLead(leadId, lead);
        
        // Handle Google Calendar for "closed" stage
        if (newStage === 'closed' && lead.eventDate && !lead.calendarEventId) {
            GoogleCalendar.createEvent(lead);
        }
        
        // Refresh view
        LeadsView.render();
    }
};

// ==================== FOLLOW-UP TIMERS ====================
const FollowUpTimers = {
    timers: {},
    checkInterval: null,
    
    init() {
        // Load timers from localStorage
        const saved = localStorage.getItem('followup_timers');
        if (saved) {
            this.timers = JSON.parse(saved);
        }
        
        // Start checking every minute
        this.checkInterval = setInterval(() => this.checkTimers(), 60000);
        
        // Check immediately on load
        setTimeout(() => this.checkTimers(), 5000);
    },
    
    startTimer(leadId, stage, followUpSettings) {
        const { delay, unit } = followUpSettings;
        
        // Calculate trigger time
        let milliseconds = delay;
        if (unit === 'hours') milliseconds *= 60 * 60 * 1000;
        else if (unit === 'days') milliseconds *= 24 * 60 * 60 * 1000;
        else if (unit === 'weeks') milliseconds *= 7 * 24 * 60 * 60 * 1000;
        
        const triggerTime = Date.now() + milliseconds;
        
        this.timers[`${leadId}_${stage}`] = {
            leadId,
            stage,
            triggerTime,
            createdAt: Date.now()
        };
        
        this.save();
        console.log(`⏰ Timer started for lead ${leadId} in stage ${stage} - triggers at ${new Date(triggerTime).toLocaleString('he-IL')}`);
    },
    
    cancelTimer(leadId, stage) {
        const key = `${leadId}_${stage}`;
        if (this.timers[key]) {
            delete this.timers[key];
            this.save();
            console.log(`⏰ Timer cancelled for lead ${leadId} in stage ${stage}`);
        }
    },
    
    checkTimers() {
        const now = Date.now();
        
        Object.entries(this.timers).forEach(([key, timer]) => {
            if (now >= timer.triggerTime) {
                this.triggerTimer(timer);
                delete this.timers[key];
            }
        });
        
        this.save();
    },
    
    triggerTimer(timer) {
        const lead = State.leads.find(l => (l._id || l.id) === timer.leadId);
        if (!lead) return;
        
        // Check if lead is still in the same stage
        if (lead.status !== timer.stage) {
            console.log(`⏰ Timer skipped - lead moved from ${timer.stage} to ${lead.status}`);
            return;
        }
        
        const stageSettings = MessageSettings.getSettings(timer.stage);
        if (!stageSettings.followUp.enabled) return;
        
        const message = WhatsAppAutomation.fillTemplate(stageSettings.followUp.template, lead);
        
        // Show popup notification
        const sendNow = confirm(`⏰ הגיע הזמן לעקוב אחרי ${lead.name}!\n\nשלח הודעת follow-up ב-WhatsApp?\n\n"${message}"`);
        
        if (sendNow) {
            // Send message
            const phone = lead.phone.replace(/[^0-9]/g, '').replace(/^0/, '');
            const url = `https://wa.me/972${phone}?text=${encodeURIComponent(message)}`;
            window.open(url, '_blank');
            
            // Record message
            if (!lead.messageHistory) lead.messageHistory = [];
            lead.messageHistory.push({
                type: 'followup',
                stage: timer.stage,
                message: message,
                sentAt: new Date().toISOString()
            });
            
            API.updateLead(lead._id || lead.id, lead);
        }
    },
    
    save() {
        localStorage.setItem('followup_timers', JSON.stringify(this.timers));
    },
    
    getActiveTimers(leadId) {
        return Object.values(this.timers).filter(t => t.leadId === leadId);
    }
};

// Global Functions (for onclick handlers in HTML)
window.switchPage = async (page) => await Navigation.switchPage(page);
window.openModal = (id) => {
    if (id === 'modal-timer-settings') {
        TimerSettings.render();
    }
    ModalManager.open(id);
};
window.closeModal = (id) => ModalManager.close(id);
window.saveIncome = () => IncomeManager.save();
window.addLead = () => LeadsManager.add();
window.viewLead = (id) => LeadsManager.view(id);
window.deleteLead = (id) => LeadsManager.delete(id);
window.openManageModal = () => ManageView.open();
window.startEdit = (id) => IncomeManager.startEdit(id);
window.submitEdit = () => IncomeManager.update();
window.deleteRow = (id) => IncomeManager.delete(id);
window.toggleSelectAll = (checkbox) => ManageView.toggleSelectAll(checkbox);
window.checkBulkVisibility = () => ManageView.checkBulkVisibility();
window.bulkDelete = () => ManageView.bulkDelete();
window.updateStats = () => StatsView.update();
window.exportToExcel = () => ExcelExporter.export();
// Goals Management
const GoalsManager = {
    async load() {
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/goals`);
            if (response.ok) {
                const goals = await response.json();
                return { income: goals.income, brides: goals.brides };
            }
        } catch (error) {
            console.error('❌ שגיאה בטעינת יעדים:', error);
        }
        return { income: 0, brides: 0 };
    },
    
    async save(income, brides) {
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/goals`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ income, brides })
            });
            
            if (response.ok) {
                console.log('✅ יעדים נשמרו ב-MongoDB');
                return true;
            }
        } catch (error) {
            console.error('❌ שגיאה בשמירת יעדים:', error);
        }
        return false;
    }
};

window.saveGoals = async () => {
    const income = parseInt(document.getElementById('goal-income').value) || 0;
    const brides = parseInt(document.getElementById('goal-brides').value) || 0;
    
    if (income <= 0 && brides <= 0) {
        alert('נא להזין לפחות יעד אחד');
        return;
    }
    
    const saved = await GoalsManager.save(income, brides);
    
    if (saved) {
        ModalManager.close('modal-settings');
        await HomeView.update();
        alert('✅ היעדים נשמרו בהצלחה ויופיעו בכל המכשירים!');
    } else {
        alert('❌ שגיאה בשמירת היעדים');
    }
};

window.loadGoalsToModal = async () => {
    const goals = await GoalsManager.load();
    document.getElementById('goal-income').value = goals.income || '';
    document.getElementById('goal-brides').value = goals.brides || '';
};

window.toggleEscortFields = () => {
    const checked = document.getElementById('contract-hasEscort').checked;
    const fields = document.getElementById('escort-fields');
    if (checked) {
        fields.classList.remove('hidden');
    } else {
        fields.classList.add('hidden');
    }
};

window.toggleBridesmaidsFields = () => {
    const checked = document.getElementById('contract-hasBridesmaids').checked;
    const fields = document.getElementById('bridesmaids-fields');
    if (checked) {
        fields.classList.remove('hidden');
    } else {
        fields.classList.add('hidden');
    }
};

// Initialize Application
// ==================== CONTRACT MANAGER ====================
const ContractManager = {
    async uploadTemplate(file) {
        if (!file) {
            alert('❌ לא נבחר קובץ. אנא בחרי קובץ Word (.docx)');
            return;
        }

        // Check file extension
        const fileName = file.name.toLowerCase();
        if (!fileName.endsWith('.docx')) {
            alert('❌ רק קבצי .docx מותרים!\n\nיש לשמור את הקובץ כ-Word Document (.docx) ולא .doc או פורמט אחר.');
            return;
        }

        // Check file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('❌ הקובץ גדול מדי!\n\nגודל מקסימלי: 5MB\nגודל הקובץ שלך: ' + (file.size / 1024 / 1024).toFixed(2) + 'MB');
            return;
        }

        const statusDiv = document.getElementById('contract-template-status');
        statusDiv.textContent = '⏳ מעלה את הקובץ...';
        statusDiv.className = 'text-sm text-blue-600';

        const formData = new FormData();
        formData.append('template', file);

        try {
            console.log('📤 Uploading template:', file.name, 'Size:', file.size);
            
            const response = await fetch(`${CONFIG.API_BASE_URL}/contract-template`, {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            
            if (response.ok) {
                statusDiv.textContent = '✅ תבנית הועלתה בהצלחה! שם: ' + file.name;
                statusDiv.className = 'text-sm text-green-600 font-bold';
                console.log('✅ Template uploaded successfully');
                alert('🎉 התבנית הועלתה בהצלחה!\n\nשם הקובץ: ' + file.name + '\nעכשיו אפשר ליצור חוזים!');
            } else {
                throw new Error(data.error || 'שגיאה בהעלאת התבנית');
            }
        } catch (error) {
            console.error('❌ Upload error:', error);
            statusDiv.textContent = `❌ שגיאה: ${error.message}`;
            statusDiv.className = 'text-sm text-red-600 font-bold';
            alert('❌ שגיאה בהעלאת התבנית!\n\n' + error.message + '\n\nבדקי:\n1. שהקובץ שמור כ-.docx\n2. שגודל הקובץ פחות מ-5MB\n3. שיש חיבור לאינטרנט');
        }
    },

    async checkTemplateStatus() {
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/contract-template/status`);
            const data = await response.json();
            
            const statusDiv = document.getElementById('contract-template-status');
            if (statusDiv) {
                if (data.exists) {
                    statusDiv.textContent = '✅ תבנית קיימת במערכת';
                    statusDiv.className = 'text-sm text-green-600';
                } else {
                    statusDiv.textContent = 'ℹ️ לא הועלתה תבנית עדיין';
                    statusDiv.className = 'text-sm text-gray-500';
                }
            }
        } catch (error) {
            console.error('Error checking template status:', error);
        }
    },

    async generateContract(leadId) {
        try {
            console.log('📄 Generating contract for lead:', leadId);
            
            const response = await fetch(`${CONFIG.API_BASE_URL}/generate-contract/${leadId}`, {
                method: 'POST'
            });

            const data = await response.json();
            
            console.log('🔍 Full response status:', response.status);
            console.log('🔍 Full response data:', JSON.stringify(data, null, 2));
            console.log('🔍 data.pdfUrl:', data.pdfUrl);
            console.log('🔍 data.success:', data.success);
            
            if (response.ok) {
                console.log('✅ Contract generated successfully');
                console.log('✅ Returning data:', data);
                return data;
            } else {
                console.error('❌ Contract generation failed:', data);
                // Extract actual error message
                const errorMsg = data.error || data.message || JSON.stringify(data);
                throw new Error(errorMsg);
            }
        } catch (error) {
            console.error('❌ Contract generation error:', error);
            // If error.message is still generic, try to get more details
            if (error.message === '[object Object]' || error.message === 'Multi error') {
                throw new Error('שגיאה בשרת. פתחי את הקונסול (F12) לפרטים מלאים');
            }
            throw error;
        }
    }
};

// ==================== STAGE MANAGER ====================
const StageManager = {
    pendingLead: null,
    
    async handleStageChange(leadId, newStage) {
        const lead = State.leads.find(l => (l._id || l.id) === leadId);
        if (!lead) return;
        
        // Check if moving to "in-process" and proposedPrice is not set
        console.log('🔍 Checking in-process condition:', {
            newStage,
            leadId,
            proposedPrice: lead.proposedPrice,
            shouldShowModal: newStage === 'in-process' && (!lead.proposedPrice || lead.proposedPrice === 0)
        });
        
        if (newStage === 'in-process' && (!lead.proposedPrice || lead.proposedPrice === 0)) {
            this.pendingLead = lead;
            document.getElementById('price-input').value = lead.proposedPrice || lead.price || '';
            openModal('modal-set-price');
            
            return false; // Don't complete stage change yet
        }
        
        // Check if moving to "closed" (סגורה) - need to record actual deposit paid
        if (newStage === 'closed') {
            this.pendingLead = lead;
            const totalPrice = (lead.proposedPrice || 0) + (lead.escortPrice || 0) + 
                              (lead.bridesmaids || []).reduce((sum, b) => sum + (b.price || 0), 0);
            document.getElementById('closed-totalPrice').textContent = totalPrice.toLocaleString('he-IL');
            document.getElementById('closed-proposedDeposit').textContent = (lead.proposedDeposit || 0).toLocaleString('he-IL');
            document.getElementById('closed-actualDeposit').value = lead.actualDeposit || lead.proposedDeposit || '';
            
            openModal('modal-deal-closed');
            return false; // Don't complete stage change yet
        }
        
        // Check if moving to "completed" (האירוע בוצע) - show event payment with auto-filled remaining balance
        if (newStage === 'completed') {
            this.pendingLead = lead;
            const totalPrice = (lead.proposedPrice || 0) + (lead.escortPrice || 0) + 
                              (lead.bridesmaids || []).reduce((sum, b) => sum + (b.price || 0), 0);
            const actualDeposit = lead.actualDeposit || 0;
            const remainingBalance = totalPrice - actualDeposit;
            const eventPayment = lead.eventPayment || remainingBalance; // Default to remaining balance
            const totalIncome = actualDeposit + eventPayment;
            
            document.getElementById('completed-totalPrice').textContent = totalPrice.toLocaleString('he-IL');
            document.getElementById('completed-depositPaid').textContent = actualDeposit.toLocaleString('he-IL') + ' ₪';
            document.getElementById('completed-remainingBalance').textContent = remainingBalance.toLocaleString('he-IL') + ' ₪';
            document.getElementById('completed-eventPayment').value = eventPayment;
            document.getElementById('completed-totalIncome').textContent = totalIncome.toLocaleString('he-IL');
            
            openModal('modal-event-completed');
            return false; // Don't complete stage change yet
        }
        
        return true; // OK to proceed
    },
    
    async confirmPrice() {
        if (!this.pendingLead) return;
        
        const price = parseInt(document.getElementById('price-input').value) || 0;
        
        // Save to proposedPrice (this is the price for the contract)
        this.pendingLead.proposedPrice = price;
        
        console.log('💰 Confirm Price - Saving:', {
            leadId: this.pendingLead._id || this.pendingLead.id,
            proposedPrice: this.pendingLead.proposedPrice,
            fullLead: this.pendingLead
        });
        
        // Ensure required fields exist
        if (!this.pendingLead.lastName || this.pendingLead.lastName.trim() === '') {
            this.pendingLead.lastName = this.pendingLead.name.split(' ').slice(1).join(' ') || 'לא צוין';
        }
        
        await API.updateLead(this.pendingLead._id || this.pendingLead.id, this.pendingLead);
        
        console.log('✅ Price saved to database');
        
        // CRITICAL: Update State.leads with the new price
        const leadInState = State.leads.find(l => (l._id || l.id) === (this.pendingLead._id || this.pendingLead.id));
        if (leadInState) {
            leadInState.proposedPrice = price;
            leadInState.lastName = this.pendingLead.lastName;
            console.log('✅ State.leads updated with proposedPrice:', price);
            console.log('📊 Lead in State now:', leadInState);
        } else {
            console.error('❌ Lead not found in State.leads!');
        }
        
        closeModal('modal-set-price');
        
        // Now complete the stage change
        await WhatsAppAutomation.checkAndPrompt(this.pendingLead._id || this.pendingLead.id, 'in-process');
        
        this.pendingLead = null;
    },
    
    async skipPrice() {
        if (!this.pendingLead) return;
        
        // Save the price even when skipping (if user entered something)
        const price = parseInt(document.getElementById('price-input').value) || 0;
        if (price > 0) {
            this.pendingLead.proposedPrice = price;
        }
        
        // Ensure required fields exist
        if (!this.pendingLead.lastName || this.pendingLead.lastName.trim() === '') {
            this.pendingLead.lastName = this.pendingLead.name.split(' ').slice(1).join(' ') || 'לא צוין';
        }
        
        // Save to database before closing
        await API.updateLead(this.pendingLead._id || this.pendingLead.id, this.pendingLead);
        
        // CRITICAL: Update State.leads with the new price
        const leadInState = State.leads.find(l => (l._id || l.id) === (this.pendingLead._id || this.pendingLead.id));
        if (leadInState) {
            if (price > 0) leadInState.proposedPrice = price;
            leadInState.lastName = this.pendingLead.lastName;
            console.log('✅ State.leads updated (skip) with proposedPrice:', price);
        }
        
        closeModal('modal-set-price');
        
        // Complete stage change without price
        await WhatsAppAutomation.checkAndPrompt(this.pendingLead._id || this.pendingLead.id, 'in-process');
        
        this.pendingLead = null;
    },
    
    async confirmDealClosed() {
        if (!this.pendingLead) return;
        
        try {
            // Reload lead from server to get latest data
            const leadId = this.pendingLead._id || this.pendingLead.id;
            const response = await fetch(`${CONFIG.API_BASE_URL}/leads/${leadId}`);
            if (response.ok) {
                const freshLead = await response.json();
                this.pendingLead = freshLead; // Update with fresh data
            }
            
            const actualDeposit = parseInt(document.getElementById('closed-actualDeposit').value) || 0;
            const paymentMethod = document.getElementById('closed-paymentMethod').value;
            
            // Check if deposit income was already recorded - BEFORE any processing
            if (actualDeposit > 0 && this.pendingLead.depositIncomeRecorded) {
                alert('⚠️ הכנסת המקדמה כבר נרשמה במערכת הכנסות.\nלא נוסף רישום כפול.');
                closeModal('modal-deal-closed');
                return; // Stop here - don't process anything
            }
            
            // Save actual deposit
            this.pendingLead.actualDeposit = actualDeposit;
            this.pendingLead.depositPaymentMethod = paymentMethod;
            this.pendingLead.status = 'closed';
            
            // Update stage history
            if (!this.pendingLead.stageHistory) this.pendingLead.stageHistory = [];
            this.pendingLead.stageHistory.push({
                stage: 'closed',
                timestamp: new Date().toISOString(),
                note: `עסקה נסגרה - מקדמה: ${actualDeposit.toLocaleString('he-IL')} ₪ (תשלום: ${paymentMethod})`
            });
            
            // Save lead WITHOUT the flag first
            await API.updateLead(this.pendingLead._id || this.pendingLead.id, this.pendingLead);
            
            // Create income record for deposit if amount > 0
            if (actualDeposit > 0) {
                const incomeRecord = {
                    name: this.pendingLead.fullName || this.pendingLead.name,
                    phone: this.pendingLead.phone || '',
                    amount: actualDeposit,
                    price: actualDeposit,
                    service: `מקדמה - ${this.pendingLead.fullName || this.pendingLead.name}`,
                    date: new Date().toISOString().split('T')[0],
                    payment: paymentMethod,
                    isBride: false,
                    notes: `מקדמה - אירוע: ${this.pendingLead.eventDate || ''} | אמצעי תשלום: ${paymentMethod}`,
                    income: actualDeposit,
                    leadId: this.pendingLead._id || this.pendingLead.id
                };
                
                await API.addClient(incomeRecord);
                
                // Mark as recorded ONLY AFTER income was successfully created
                this.pendingLead.depositIncomeRecorded = true;
                this.pendingLead.depositIncomeRecordedAt = new Date().toISOString();
                await API.updateLead(this.pendingLead._id || this.pendingLead.id, this.pendingLead);
            }
            
            closeModal('modal-deal-closed');
            
            // Show combined calendar + whatsapp modal
            document.getElementById('calendar-clientName').textContent = this.pendingLead.fullName || this.pendingLead.name;
            document.getElementById('calendar-eventDate').textContent = this.pendingLead.eventDate || 'לא צוין';
            document.getElementById('calendar-location').value = this.pendingLead.location || '';
            document.getElementById('calendar-notes').value = '';
            
            // Show/hide escort section based on lead's escort type
            const hasEscort = this.pendingLead.escortType && this.pendingLead.escortType !== 'none';
            const escortSection = document.getElementById('escort-time-section');
            if (escortSection) {
                escortSection.style.display = hasEscort ? 'block' : 'none';
            }
            
            // Initialize calendar buttons
            this.initializeCalendarButtons();
            
            openModal('modal-calendar-date');
            
            // Show WhatsApp message preview automatically
            setTimeout(async () => {
                await this.sendWhatsAppFromCalendar();
            }, 300);
            
        } catch (error) {
            console.error('Error in confirmDealClosed:', error);
            alert('אירעה שגיאה בשמירת המקדמה. אנא נסה שוב.');
        }
    },
    
    initializeCalendarButtons() {
        if (!this.pendingLead) return;
        
        const container = document.getElementById('calendar-buttons-container');
        if (!container) return;
        
        container.innerHTML = '';
        
        const hasEscort = this.pendingLead.escortType && this.pendingLead.escortType !== 'none';
        
        // Main service button
        const mainBtn = document.createElement('button');
        mainBtn.onclick = () => this.saveMainCalendarEvent();
        mainBtn.className = 'w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-xl font-bold transition-all';
        mainBtn.innerHTML = '📅 שמור אירוע ביומן (שירות ראשי)';
        container.appendChild(mainBtn);
        
        // Escort button if exists
        if (hasEscort) {
            const escortBtn = document.createElement('button');
            escortBtn.onclick = () => this.saveEscortCalendarEvent();
            escortBtn.className = 'w-full bg-purple-500 hover:bg-purple-600 text-white py-3 rounded-xl font-bold transition-all';
            escortBtn.innerHTML = ' שמור אירוע ליווי ביומן';
            container.appendChild(escortBtn);
        }
    },
    
    saveMainCalendarEvent() {
        if (!this.pendingLead) return;
        
        const startTime = document.getElementById('calendar-startTime').value;
        const duration = parseFloat(document.getElementById('calendar-duration').value) || 3;
        const location = document.getElementById('calendar-location').value;
        const notes = document.getElementById('calendar-notes').value;
        
        // Save to lead
        this.pendingLead.calendarStartTime = startTime;
        this.pendingLead.calendarDuration = duration;
        this.pendingLead.calendarLocation = location || this.pendingLead.location;
        this.pendingLead.calendarNotes = notes;
        
        API.updateLead(this.pendingLead._id || this.pendingLead.id, this.pendingLead);
        
        // Open Google Calendar immediately
        this.openGoogleCalendar(this.pendingLead, startTime, duration, location, notes);
    },
    
    saveEscortCalendarEvent() {
        if (!this.pendingLead) return;
        
        const escortTime = document.getElementById('calendar-escortTime').value;
        const escortDuration = parseFloat(document.getElementById('calendar-escortDuration').value) || 4;
        const escortLocation = document.getElementById('calendar-escortLocation').value;
        const location = document.getElementById('calendar-location').value;
        const notes = document.getElementById('calendar-notes').value;
        
        // Save to lead
        this.pendingLead.calendarEscortTime = escortTime;
        this.pendingLead.calendarEscortDuration = escortDuration;
        this.pendingLead.calendarEscortLocation = escortLocation || location;
        
        API.updateLead(this.pendingLead._id || this.pendingLead.id, this.pendingLead);
        
        // Open Google Calendar for escort immediately
        this.openGoogleCalendarEscort(this.pendingLead, escortTime, escortDuration, escortLocation || location, notes);
    },
    
    async sendWhatsAppFromCalendar() {
        if (!this.pendingLead) {
            console.warn('⚠️ No pending lead');
            return;
        }
        
        const stage = 'closed';
        
        console.log('📱 Loading WhatsApp message for stage:', stage);
        console.log('📋 MessageSettings object:', MessageSettings);
        console.log('📋 MessageSettings.settings:', MessageSettings.settings);
        
        // Get WhatsApp settings for this stage
        const stageSettings = MessageSettings.getSettings(stage);
        
        console.log('📋 Stage settings for closed:', stageSettings);
        
        if (!stageSettings) {
            console.error('❌ No settings found for stage:', stage);
            alert('לא נמצאו הגדרות עבור שלב "סגורה"');
            return;
        }
        
        if (!stageSettings.immediate) {
            console.error('❌ No immediate settings found');
            alert('לא נמצאו הגדרות הודעה מיידית');
            return;
        }
        
        if (!stageSettings.immediate.template) {
            console.error('❌ No template found');
            alert('לא הוגדר תבנית הודעה עבור שלב "סגורה".\nנא להגדיר הודעה בהגדרות > הודעות WhatsApp');
            return;
        }
        
        console.log('📝 Template:', stageSettings.immediate.template);
        console.log('👤 Lead data:', this.pendingLead);
        
        // Replace variables in template using WhatsAppAutomation.fillTemplate
        const message = WhatsAppAutomation.fillTemplate(stageSettings.immediate.template, this.pendingLead);
        
        console.log('✅ Final message:', message);
        
        // Load message into textarea
        const textarea = document.getElementById('whatsapp-message-text');
        if (textarea) {
            textarea.value = message;
            console.log('✅ Message loaded into textarea');
        } else {
            console.error('❌ Textarea not found');
        }
    },
    
    sendWhatsAppMessage() {
        if (!this.pendingLead) return;
        
        const phone = this.pendingLead.phone?.replace(/[^0-9]/g, '').replace(/^0/, '');
        const textarea = document.getElementById('whatsapp-message-text');
        const message = textarea?.value;
        
        console.log('📱 Sending WhatsApp:', { phone, message });
        
        if (!phone) {
            alert('לא נמצא מספר טלפון ללקוחה');
            return;
        }
        
        if (!message || message.trim() === '') {
            alert('ההודעה ריקה');
            return;
        }
        
        this.openWhatsApp(phone, message);
    },
    
    openWhatsApp(phone, message) {
        const whatsappUrl = `https://wa.me/972${phone}?text=${encodeURIComponent(message)}`;
        console.log('🔗 Opening WhatsApp URL:', whatsappUrl);
        window.open(whatsappUrl, '_blank');
    },
    
    finishCalendarFlow() {
        // Just close the modal and refresh view
        closeModal('modal-calendar-date');
        this.pendingLead = null;
        HomeView.update();
    },
    
    async confirmCalendarDate() {
        if (!this.pendingLead) return;
        
        try {
            const startTime = document.getElementById('calendar-startTime').value;
            const duration = parseFloat(document.getElementById('calendar-duration').value) || 3;
            const location = document.getElementById('calendar-location').value;
            const notes = document.getElementById('calendar-notes').value;
            
            // Get escort details if applicable
            const hasEscort = this.pendingLead.escortType && this.pendingLead.escortType !== 'none';
            let escortTime = null;
            let escortDuration = null;
            let escortLocation = null;
            
            if (hasEscort) {
                escortTime = document.getElementById('calendar-escortTime').value;
                escortDuration = parseFloat(document.getElementById('calendar-escortDuration').value) || 4;
                escortLocation = document.getElementById('calendar-escortLocation').value;
            }
            
            // Save calendar information
            this.pendingLead.calendarStartTime = startTime;
            this.pendingLead.calendarDuration = duration;
            this.pendingLead.calendarLocation = location || this.pendingLead.location;
            this.pendingLead.calendarNotes = notes;
            if (hasEscort) {
                this.pendingLead.calendarEscortTime = escortTime;
                this.pendingLead.calendarEscortDuration = escortDuration;
                this.pendingLead.calendarEscortLocation = escortLocation || location; // Use escort location or fallback to main location
            }
            this.pendingLead.calendarSet = true;
            
            await API.updateLead(this.pendingLead._id || this.pendingLead.id, this.pendingLead);
            
            // Open Google Calendar directly (no ICS download)
            this.openGoogleCalendar(this.pendingLead, startTime, duration, location, notes);
            
            // Open escort calendar event if applicable
            if (hasEscort && escortTime) {
                // Small delay to ensure both windows open
                setTimeout(() => {
                    this.openGoogleCalendarEscort(this.pendingLead, escortTime, escortDuration, escortLocation || location, notes);
                }, 500);
            }
            
            closeModal('modal-calendar-date');
            
            // Continue with WhatsApp automation (if applicable)
            const leadId = this.pendingLead._id || this.pendingLead.id;
            this.pendingLead = null;
            
            await WhatsAppAutomation.checkAndPrompt(leadId, 'closed');
            
            // Refresh view
            HomeView.update();
        } catch (error) {
            console.error('Error in confirmCalendarDate:', error);
            alert('אירעה שגיאה בקביעת התאריך ביומן. אנא נסה שוב.');
        }
    },
    
    openGoogleCalendar(lead, startTime, duration, location, notes) {
        // Parse event date
        const eventDateParts = lead.eventDate.split('/');
        let eventDate;
        
        if (eventDateParts.length === 3) {
            const day = eventDateParts[0].padStart(2, '0');
            const month = eventDateParts[1].padStart(2, '0');
            const year = eventDateParts[2];
            eventDate = `${year}${month}${day}`;
        } else {
            eventDate = new Date().toISOString().split('T')[0].replace(/-/g, '');
        }
        
        // Calculate times in format YYYYMMDDTHHMMSS
        const [startHour, startMin] = startTime.split(':');
        const startDateTime = `${eventDate}T${startHour}${startMin}00`;
        
        const endTime = this.addHours(startTime, duration);
        const [endHour, endMin] = endTime.split(':');
        const endDateTime = `${eventDate}T${endHour}${endMin}00`;
        
        // Build full name (first + last)
        const firstName = lead.name || '';
        const lastName = lead.lastName || '';
        const fullName = `${firstName} ${lastName}`.trim() || lead.fullName || lead.name;
        
        // Build event title with full name
        const eventTitle = `${fullName} - ${location || 'מיקום לא צוין'}`;
        
        // Build complete services list with prices (WITHOUT escort for main event)
        const servicesList = [];
        if (lead.service) {
            const mainPrice = lead.proposedPrice || lead.price || 0;
            servicesList.push(`${lead.service} (₪${mainPrice.toLocaleString('he-IL')})`);
        }
        // Don't include escort in main event - it has its own calendar entry
        if (lead.bridesmaids && lead.bridesmaids.length > 0) {
            lead.bridesmaids.forEach((bridesmaid, i) => {
                const bridesmaidPrice = bridesmaid.price || 0;
                servicesList.push(`מלווה ${i + 1}: ${bridesmaid.service || 'שירות מלווה'} (₪${bridesmaidPrice.toLocaleString('he-IL')})`);
            });
        }
        const allServices = servicesList.join(' + ');
        
        // Build detailed description
        const descriptionParts = [];
        descriptionParts.push(`לקוחה: ${fullName}`);
        descriptionParts.push(`טלפון: ${lead.phone || 'לא צוין'}`);
        if (lead.actualDeposit) {
            descriptionParts.push(`\nמקדמה ששולמה: ₪${lead.actualDeposit.toLocaleString('he-IL')}`);
            if (lead.stageHistory && lead.stageHistory.length > 0) {
                const closedStage = lead.stageHistory.find(h => h.stage === 'closed');
                if (closedStage) {
                    const depositDate = new Date(closedStage.timestamp).toLocaleDateString('he-IL');
                    descriptionParts.push(`תאריך תשלום מקדמה: ${depositDate}`);
                }
            }
        }
        if (allServices) {
            descriptionParts.push(`\nשירותים: ${allServices}`);
        }
        if (notes && notes.trim()) {
            descriptionParts.push(`\nהערות: ${notes}`);
        }
        if (lead.notes && lead.notes.trim()) {
            descriptionParts.push(`הערות נוספות: ${lead.notes}`);
        }
        
        const eventDescription = descriptionParts.join('\n');
        
        // Create Google Calendar URL
        const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE` +
            `&text=${encodeURIComponent(eventTitle)}` +
            `&dates=${startDateTime}/${endDateTime}` +
            `&details=${encodeURIComponent(eventDescription)}` +
            `&location=${encodeURIComponent(location || '')}` +
            `&ctz=Asia/Jerusalem`;
        
        // Open in new window
        window.open(calendarUrl, '_blank');
    },
    
    openGoogleCalendarEscort(lead, escortTime, escortDuration, escortLocation, notes) {
        // Parse event date
        const eventDateParts = lead.eventDate.split('/');
        let eventDate;
        
        if (eventDateParts.length === 3) {
            const day = eventDateParts[0].padStart(2, '0');
            const month = eventDateParts[1].padStart(2, '0');
            const year = eventDateParts[2];
            eventDate = `${year}${month}${day}`;
        } else {
            eventDate = new Date().toISOString().split('T')[0].replace(/-/g, '');
        }
        
        // Calculate times
        const [startHour, startMin] = escortTime.split(':');
        const startDateTime = `${eventDate}T${startHour}${startMin}00`;
        
        const endTime = this.addHours(escortTime, escortDuration);
        const [endHour, endMin] = endTime.split(':');
        const endDateTime = `${eventDate}T${endHour}${endMin}00`;
        
        const escortTypeHebrew = {
            'short': 'ליווי קצר',
            'long': 'ליווי ארוך'
        };
        
        // Build full name (first + last)
        const firstName = lead.name || '';
        const lastName = lead.lastName || '';
        const fullName = `${firstName} ${lastName}`.trim() || lead.fullName || lead.name;
        
        // Build event title with full name
        const eventTitle = `${fullName} - ${escortTypeHebrew[lead.escortType] || 'ליווי'} - ${escortLocation || 'מיקום לא צוין'}`;
        
        // Build description
        const descriptionParts = [];
        descriptionParts.push(`ליווי לאירוע`);
        descriptionParts.push(`לקוחה: ${fullName}`);
        descriptionParts.push(`טלפון: ${lead.phone || 'לא צוין'}`);
        
        // Add escort price in notes
        const escortPrice = lead.escortPrice || 0;
        if (escortPrice > 0) {
            descriptionParts.push(`\nעלות ליווי: ₪${escortPrice.toLocaleString('he-IL')}`);
        }
        
        if (notes && notes.trim()) {
            descriptionParts.push(`\nהערות: ${notes}`);
        }
        
        const eventDescription = descriptionParts.join('\n');
        
        // Create Google Calendar URL
        const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE` +
            `&text=${encodeURIComponent(eventTitle)}` +
            `&dates=${startDateTime}/${endDateTime}` +
            `&details=${encodeURIComponent(eventDescription)}` +
            `&location=${encodeURIComponent(escortLocation || '')}` +
            `&ctz=Asia/Jerusalem`;
        
        // Open in new window
        window.open(calendarUrl, '_blank');
    },
    
    addHours(time, hours) {
        const [h, m] = time.split(':');
        const totalMinutes = parseInt(h) * 60 + parseInt(m) + (hours * 60);
        const newHours = Math.floor(totalMinutes / 60) % 24;
        const newMinutes = totalMinutes % 60;
        return `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`;
    },
    
    async skipCalendarDate() {
        if (!this.pendingLead) return;
        
        closeModal('modal-calendar-date');
        
        // Continue with WhatsApp automation (if applicable)
        const leadId = this.pendingLead._id || this.pendingLead.id;
        this.pendingLead = null;
        
        await WhatsAppAutomation.checkAndPrompt(leadId, 'closed');
        
        // Refresh view
        HomeView.update();
    },
    
    async skipDealClosed() {
        if (!this.pendingLead) return;
        
        closeModal('modal-deal-closed');
        
        // Complete stage change without recording deposit
        const leadId = this.pendingLead._id || this.pendingLead.id;
        const lead = this.pendingLead;
        lead.status = 'closed';
        
        // Update stage history
        if (!lead.stageHistory) lead.stageHistory = [];
        lead.stageHistory.push({
            stage: 'closed',
            timestamp: new Date().toISOString(),
            note: 'עסקה נסגרה (ללא רישום מקדמה)'
        });
        
        await API.updateLead(leadId, lead);
        
        this.pendingLead = null;
        
        // Continue with WhatsApp automation
        await WhatsAppAutomation.checkAndPrompt(leadId, 'closed');
        
        HomeView.update();
    },
    
    updateIncomeCalculation() {
        if (!this.pendingLead) return;
        
        const actualDeposit = this.pendingLead.actualDeposit || 0;
        const eventPayment = parseFloat(document.getElementById('completed-eventPayment').value) || 0;
        const totalIncome = actualDeposit + eventPayment;
        
        document.getElementById('completed-totalIncome').textContent = `${totalIncome.toLocaleString('he-IL')} ₪`;
    },
    
    async confirmEventCompleted() {
        if (!this.pendingLead) return;
        
        // Reload lead from server to get latest data
        const currentLeadId = this.pendingLead._id || this.pendingLead.id;
        const response = await fetch(`${CONFIG.API_BASE_URL}/leads/${currentLeadId}`);
        if (response.ok) {
            const freshLead = await response.json();
            this.pendingLead = freshLead; // Update with fresh data
        }
        
        const actualDeposit = this.pendingLead.actualDeposit || 0;
        const eventPayment = parseFloat(document.getElementById('completed-eventPayment').value) || 0;
        const paymentMethod = document.getElementById('completed-paymentMethod').value;
        const totalIncome = actualDeposit + eventPayment;
        
        // Check if event payment income was already recorded - BEFORE any processing
        if (eventPayment > 0 && this.pendingLead.eventPaymentIncomeRecorded) {
            alert('⚠️ הכנסת התשלום באירוע כבר נרשמה במערכת הכנסות.\nלא נוסף רישום כפול.');
            closeModal('modal-event-completed');
            return; // Stop here - don't process anything
        }
        
        // Save event payment and total income
        this.pendingLead.eventPayment = eventPayment;
        this.pendingLead.eventPaymentMethod = paymentMethod;
        this.pendingLead.income = totalIncome;
        this.pendingLead.completedAt = new Date().toISOString();
        this.pendingLead.status = 'completed';
        
        // Update stage history
        if (!this.pendingLead.stageHistory) this.pendingLead.stageHistory = [];
        this.pendingLead.stageHistory.push({
            stage: 'completed',
            timestamp: new Date().toISOString(),
            note: `האירוע הושלם - הכנסה כוללת: ${totalIncome.toLocaleString('he-IL')} ₪`
        });
        
        // Save lead WITHOUT the flag first
        await API.updateLead(this.pendingLead._id || this.pendingLead.id, this.pendingLead);
        
        // Create income record for event payment if amount > 0
        if (eventPayment > 0) {
            const incomeRecord = {
                name: this.pendingLead.fullName || this.pendingLead.name,
                phone: this.pendingLead.phone || '',
                amount: eventPayment,
                price: eventPayment,
                service: this.pendingLead.service || `אירוע - ${this.pendingLead.fullName || this.pendingLead.name}`,
                date: new Date().toISOString().split('T')[0],
                payment: paymentMethod,
                isBride: this.pendingLead.isBride || false,
                notes: `תשלום באירוע - אירוע: ${this.pendingLead.eventDate || ''} | אמצעי תשלום: ${paymentMethod}${this.pendingLead.isBride ? ' | כלה 👰' : ''}`,
                income: eventPayment,
                leadId: this.pendingLead._id || this.pendingLead.id
            };
            
            await API.addClient(incomeRecord);
            
            // Mark as recorded ONLY AFTER income was successfully created
            this.pendingLead.eventPaymentIncomeRecorded = true;
            this.pendingLead.eventPaymentIncomeRecordedAt = new Date().toISOString();
            await API.updateLead(this.pendingLead._id || this.pendingLead.id, this.pendingLead);
        }
        
        closeModal('modal-event-completed');
        
        // Show success message
        alert(`✅ האירוע סומן כהושלם!\n💰 סך הכל הכנסה: ${totalIncome.toLocaleString('he-IL')} ₪\n(מקדמה: ${actualDeposit.toLocaleString('he-IL')} ₪ + תשלום באירוע: ${eventPayment.toLocaleString('he-IL')} ₪)`);
        
        // Now continue with WhatsApp automation (if applicable)
        const completedLeadId = this.pendingLead._id || this.pendingLead.id;
        this.pendingLead = null;
        
        await WhatsAppAutomation.checkAndPrompt(completedLeadId, 'completed');
        
        // Refresh view
        HomeView.update();
    },
    
    async skipEventCompleted() {
        if (!this.pendingLead) return;
        
        closeModal('modal-event-completed');
        
        // Complete stage change without recording income
        const leadId = this.pendingLead._id || this.pendingLead.id;
        const lead = this.pendingLead;
        lead.status = 'completed';
        
        // Update stage history
        if (!lead.stageHistory) lead.stageHistory = [];
        lead.stageHistory.push({
            stage: 'completed',
            timestamp: new Date().toISOString(),
            note: 'האירוע הושלם'
        });
        
        await API.updateLead(leadId, lead);
        
        this.pendingLead = null;
        
        // Continue with WhatsApp automation
        await WhatsAppAutomation.checkAndPrompt(leadId, 'completed');
        
        HomeView.update();
    }
};

// ==================== UI HELPERS ====================
window.toggleEscortPrice = () => {
    const escortType = document.getElementById('contract-escortType').value;
    const priceField = document.getElementById('escort-price-field');
    
    if (escortType === 'none') {
        priceField.classList.add('hidden');
    } else {
        priceField.classList.remove('hidden');
    }
};

window.updateBridesmaidsFields = () => {
    const count = parseInt(document.getElementById('contract-bridesmaidsCount').value) || 0;
    const container = document.getElementById('bridesmaids-list');
    
    if (count === 0) {
        container.innerHTML = '';
        return;
    }
    
    let html = '<div class="bg-gray-50 rounded-lg p-3 space-y-2">';
    html += '<div class="font-bold text-sm text-gray-700 mb-2">פרטי המלוות:</div>';
    
    for (let i = 0; i < count; i++) {
        html += `
            <div class="bg-white rounded-lg p-2 border border-gray-200">
                <div class="text-xs font-bold text-gray-600 mb-1">מלווה ${i + 1}</div>
                <input type="text" 
                    id="bridesmaid-service-${i}" 
                    placeholder="שירות (למשל: איפור + שיער)" 
                    class="w-full p-2 border border-gray-300 rounded text-sm mb-1">
                <input type="number" 
                    id="bridesmaid-price-${i}" 
                    placeholder="מחיר (₪)" 
                    class="w-full p-2 border border-gray-300 rounded text-sm"
                    min="0">
            </div>
        `;
    }
    
    html += '</div>';
    container.innerHTML = html;
};


// Global functions
window.saveIncome = () => IncomeManager.save();
window.editClient = (id) => IncomeManager.edit(id);
window.deleteClient = (id) => IncomeManager.delete(id);
window.saveLead = () => LeadManager.save();
window.editLead = (id) => LeadManager.edit(id);
window.deleteLead = (id) => LeadManager.delete(id);
window.convertLeadToClient = (leadId) => LeadManager.convertToClient(leadId);

// Page navigation
window.showPage = (pageId) => {
    document.querySelectorAll('[id^="page-"]').forEach(p => p.classList.add('hidden'));
    document.getElementById(pageId).classList.remove('hidden');
    
    document.querySelectorAll('.nav-button').forEach(btn => btn.classList.remove('active'));
    event?.target?.classList?.add('active');
    
    if (pageId === 'page-home') IncomeView.render();
    if (pageId === 'page-leads') LeadsView.render();
    if (pageId === 'page-stats') StatsView.render();
};

// ==================== DARK MODE ====================
function toggleDarkMode() {
    const body = document.body;
    const isDark = body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', isDark ? 'enabled' : 'disabled');
    
    // Update all dark mode icons
    const icons = [
        'dark-mode-icon',
        'dark-mode-icon-entry',
        'dark-mode-icon-leads',
        'dark-mode-icon-stats'
    ];
    
    const sunIcon = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path>';
    const moonIcon = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>';
    
    icons.forEach(iconId => {
        const icon = document.getElementById(iconId);
        if (icon) {
            icon.innerHTML = isDark ? sunIcon : moonIcon;
        }
    });
}

// Load dark mode preference on init
function loadDarkMode() {
    const darkMode = localStorage.getItem('darkMode');
    if (darkMode === 'enabled') {
        document.body.classList.add('dark-mode');
        
        // Update all icons
        const icons = [
            'dark-mode-icon',
            'dark-mode-icon-entry',
            'dark-mode-icon-leads',
            'dark-mode-icon-stats'
        ];
        
        const sunIcon = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path>';
        
        icons.forEach(iconId => {
            const icon = document.getElementById(iconId);
            if (icon) {
                icon.innerHTML = sunIcon;
            }
        });
    }
}

// ==================== SETTINGS DROPDOWN ====================
function toggleSettingsDropdown() {
    const menu = document.getElementById('settings-menu');
    menu.classList.toggle('hidden');
}

// Close dropdown when clicking outside
document.addEventListener('click', function(event) {
    const dropdown = document.getElementById('settings-dropdown');
    const menu = document.getElementById('settings-menu');
    if (dropdown && menu && !dropdown.contains(event.target)) {
        menu.classList.add('hidden');
    }
});

// Make toggleDarkMode global
window.toggleDarkMode = toggleDarkMode;

// ==================== TOOLTIP HELPER ====================
window.showTooltip = function(tooltipId) {
    const tooltip = document.getElementById(tooltipId);
    if (tooltip) {
        tooltip.classList.toggle('hidden');
    }
};

// ==================== BUSINESS INSIGHTS VIEW ====================
const InsightsView = {
    charts: {},
    
    render() {
        if (!isAuthenticated) {
            this.showEmptyState();
            return;
        }
        
        this.populateFilters();
        this.refresh();
    },
    
    populateFilters() {
        // Populate source filter with unique sources from leads
        const sources = [...new Set(State.leads.map(l => l.source).filter(s => s))];
        const sourceFilter = document.getElementById('insights-source-filter');
        
        if (sourceFilter) {
            sourceFilter.innerHTML = '<option value="all">הכל</option>' +
                sources.map(s => `<option value="${s}">${s}</option>`).join('');
        }
    },
    
    refresh() {
        const period = document.getElementById('insights-period')?.value || 'year';
        const sourceFilter = document.getElementById('insights-source-filter')?.value || 'all';
        
        // Filter data by period
        const filteredLeads = this.filterByPeriod(State.leads, period);
        const filteredData = sourceFilter === 'all' ? 
            filteredLeads : 
            filteredLeads.filter(l => l.source === sourceFilter);
        
        if (filteredData.length === 0) {
            this.showEmptyState();
            return;
        }
        
        this.hideEmptyState();
        this.updateKPIs(filteredData);
        this.updateMarketingCharts(filteredData);
        this.updateProcessCharts(filteredData);
    },
    
    filterByPeriod(leads, period) {
        const now = new Date();
        let cutoffDate;
        
        switch(period) {
            case 'month':
                cutoffDate = new Date(now.setMonth(now.getMonth() - 1));
                break;
            case '3months':
                cutoffDate = new Date(now.setMonth(now.getMonth() - 3));
                break;
            case '6months':
                cutoffDate = new Date(now.setMonth(now.getMonth() - 6));
                break;
            case 'year':
                cutoffDate = new Date(now.setFullYear(now.getFullYear() - 1));
                break;
            case 'all':
            default:
                return leads;
        }
        
        return leads.filter(l => new Date(l.createdAt) >= cutoffDate);
    },
    
    updateKPIs(leads) {
        // Total Leads
        document.getElementById('kpi-total-leads').textContent = leads.length;
        
        // Conversion Rate
        const closed = leads.filter(l => l.status === 'closed').length;
        const conversionRate = leads.length > 0 ? ((closed / leads.length) * 100).toFixed(1) : 0;
        document.getElementById('kpi-conversion-rate').textContent = conversionRate + '%';
        
        // Total Revenue
        const totalRevenue = leads
            .filter(l => l.status === 'closed' && l.income)
            .reduce((sum, l) => sum + (l.income || 0), 0);
        document.getElementById('kpi-total-revenue').textContent = totalRevenue.toLocaleString('he-IL') + ' ₪';
        
        // Average Time to Close
        const closedWithDates = leads.filter(l => l.status === 'closed' && l.completedAt && l.createdAt);
        let avgTime = 0;
        if (closedWithDates.length > 0) {
            const totalDays = closedWithDates.reduce((sum, l) => {
                const start = new Date(l.createdAt);
                const end = new Date(l.completedAt);
                const days = Math.floor((end - start) / (1000 * 60 * 60 * 24));
                return sum + days;
            }, 0);
            avgTime = Math.round(totalDays / closedWithDates.length);
        }
        document.getElementById('kpi-avg-time').textContent = avgTime;
    },
    
    updateMarketingCharts(leads) {
        // Group by source
        const sourceData = {};
        leads.forEach(l => {
            const source = l.source || 'לא צוין';
            if (!sourceData[source]) {
                sourceData[source] = { total: 0, closed: 0, revenue: 0 };
            }
            sourceData[source].total++;
            if (l.status === 'closed') {
                sourceData[source].closed++;
                sourceData[source].revenue += (l.income || 0);
            }
        });
        
        // Pie Chart - Lead Sources Distribution
        this.renderPieChart(sourceData);
        
        // Bar Chart - Conversion Rate by Source
        this.renderConversionChart(sourceData);
        
        // Table - Revenue by Source
        this.renderRevenueTable(sourceData);
        
        // Generate insights
        this.generateMarketingInsights(sourceData);
    },
    
    renderPieChart(sourceData) {
        const ctx = document.getElementById('chart-sources-pie');
        if (!ctx) return;
        
        if (this.charts.pie) this.charts.pie.destroy();
        
        const labels = Object.keys(sourceData);
        const data = Object.values(sourceData).map(d => d.total);
        
        this.charts.pie = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: [
                        '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', 
                        '#3B82F6', '#EF4444', '#6366F1', '#14B8A6'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom' }
                }
            }
        });
    },
    
    renderConversionChart(sourceData) {
        const ctx = document.getElementById('chart-conversion-bar');
        if (!ctx) return;
        
        if (this.charts.conversion) this.charts.conversion.destroy();
        
        const labels = Object.keys(sourceData);
        const data = Object.entries(sourceData).map(([source, stats]) => {
            return stats.total > 0 ? ((stats.closed / stats.total) * 100).toFixed(1) : 0;
        });
        
        this.charts.conversion = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'אחוז המרה (%)',
                    data: data,
                    backgroundColor: '#10B981'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        });
    },
    
    renderRevenueTable(sourceData) {
        const tbody = document.getElementById('revenue-by-source-table');
        if (!tbody) return;
        
        const rows = Object.entries(sourceData)
            .sort((a, b) => b[1].revenue - a[1].revenue)
            .map(([source, stats]) => {
                const convRate = stats.total > 0 ? ((stats.closed / stats.total) * 100).toFixed(1) : 0;
                const avgDeal = stats.closed > 0 ? (stats.revenue / stats.closed).toFixed(0) : 0;
                
                return `
                    <tr class="border-b border-gray-200 dark:border-gray-700">
                        <td class="text-right p-3">${source}</td>
                        <td class="text-center p-3">${stats.total}</td>
                        <td class="text-center p-3">${stats.closed}</td>
                        <td class="text-center p-3">${convRate}%</td>
                        <td class="text-right p-3 font-bold text-green-600">${stats.revenue.toLocaleString('he-IL')} ₪</td>
                        <td class="text-right p-3">${avgDeal.toLocaleString('he-IL')} ₪</td>
                    </tr>
                `;
            }).join('');
        
        tbody.innerHTML = rows;
    },
    
    generateMarketingInsights(sourceData) {
        // Find best source
        const bestSource = Object.entries(sourceData)
            .sort((a, b) => b[1].revenue - a[1].revenue)[0];
        
        if (bestSource) {
            const sourcesInsight = document.getElementById('sources-insight');
            if (sourcesInsight) {
                sourcesInsight.textContent = `המקור המניב ביותר: ${bestSource[0]} (${bestSource[1].revenue.toLocaleString('he-IL')} ₪)`;
            }
        }
        
        // Find best conversion
        const bestConversion = Object.entries(sourceData)
            .map(([source, stats]) => ({
                source,
                rate: stats.total > 0 ? (stats.closed / stats.total) * 100 : 0
            }))
            .sort((a, b) => b.rate - a.rate)[0];
        
        if (bestConversion) {
            const conversionInsight = document.getElementById('conversion-insight');
            if (conversionInsight) {
                conversionInsight.textContent = `האיכות הגבוהה ביותר: ${bestConversion.source} (${bestConversion.rate.toFixed(1)}% המרה)`;
            }
        }
    },
    
    updateProcessCharts(leads) {
        // Funnel data
        const funnel = {
            new: leads.filter(l => l.status === 'new').length,
            inProgress: leads.filter(l => l.status === 'in-progress' || l.status === 'proposal-sent').length,
            contractSent: leads.filter(l => l.status === 'contract-sent').length,
            closed: leads.filter(l => l.status === 'closed').length,
            notClosed: leads.filter(l => l.status === 'not-closed' || l.status === 'lost').length
        };
        
        const total = leads.length;
        this.renderFunnel(funnel, total);
        
        // Deal size by source/service
        this.renderDealSizeChart(leads);
    },
    
    renderFunnel(funnel, total) {
        // Update counts
        document.getElementById('funnel-new-count').textContent = funnel.new;
        document.getElementById('funnel-progress-count').textContent = funnel.inProgress;
        document.getElementById('funnel-contract-count').textContent = funnel.contractSent;
        document.getElementById('funnel-closed-count').textContent = funnel.closed;
        document.getElementById('funnel-not-closed-count').textContent = funnel.notClosed;
        
        // Update bars
        const newPct = 100;
        const progressPct = total > 0 ? (funnel.inProgress / total * 100).toFixed(1) : 0;
        const contractPct = total > 0 ? (funnel.contractSent / total * 100).toFixed(1) : 0;
        const closedPct = total > 0 ? (funnel.closed / total * 100).toFixed(1) : 0;
        const notClosedPct = total > 0 ? (funnel.notClosed / total * 100).toFixed(1) : 0;
        
        document.getElementById('funnel-new-bar').style.width = newPct + '%';
        document.getElementById('funnel-new-bar').textContent = newPct + '%';
        
        document.getElementById('funnel-progress-bar').style.width = progressPct + '%';
        document.getElementById('funnel-progress-bar').textContent = progressPct + '%';
        
        document.getElementById('funnel-contract-bar').style.width = contractPct + '%';
        document.getElementById('funnel-contract-bar').textContent = contractPct + '%';
        
        document.getElementById('funnel-closed-bar').style.width = closedPct + '%';
        document.getElementById('funnel-closed-bar').textContent = closedPct + '%';
        
        document.getElementById('funnel-not-closed-bar').style.width = notClosedPct + '%';
        document.getElementById('funnel-not-closed-bar').textContent = notClosedPct + '%';
        
        // Generate insight
        const funnelInsight = document.getElementById('funnel-insight');
        if (funnelInsight) {
            if (funnel.inProgress > funnel.contractSent + funnel.closed) {
                funnelInsight.textContent = 'הרבה לידים תקועים ב"בתהליך" - כדאי להזדרז לשלוח חוזים!';
            } else if (funnel.contractSent > funnel.closed && funnel.contractSent > 0) {
                funnelInsight.textContent = 'יש הרבה חוזים שלא נסגרו - מומלץ לעקוב ולהזכיר ללקוחות';
            } else {
                funnelInsight.textContent = 'המשפך נראה בריא! המשיכו לעבוד חזק 💪';
            }
        }
    },
    
    renderDealSizeChart(leads) {
        const ctx = document.getElementById('chart-deal-size');
        if (!ctx) return;
        
        if (this.charts.dealSize) this.charts.dealSize.destroy();
        
        // Group by service
        const serviceData = {};
        leads.filter(l => l.status === 'closed' && l.income).forEach(l => {
            const service = l.service || 'לא צוין';
            if (!serviceData[service]) {
                serviceData[service] = { total: 0, count: 0 };
            }
            serviceData[service].total += l.income;
            serviceData[service].count++;
        });
        
        const labels = Object.keys(serviceData);
        const data = Object.values(serviceData).map(d => 
            d.count > 0 ? (d.total / d.count).toFixed(0) : 0
        );
        
        this.charts.dealSize = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'ממוצע (₪)',
                    data: data,
                    backgroundColor: '#3B82F6'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return value.toLocaleString('he-IL') + ' ₪';
                            }
                        }
                    }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        });
        
        // Generate insight
        const dealSizeInsight = document.getElementById('deal-size-insight');
        if (dealSizeInsight && labels.length > 0) {
            const maxIndex = data.indexOf(Math.max(...data));
            dealSizeInsight.textContent = `השירות הכי רווחי: ${labels[maxIndex]} (${data[maxIndex].toLocaleString('he-IL')} ₪ בממוצע)`;
        }
    },
    
    showEmptyState() {
        document.getElementById('insights-empty-state')?.classList.remove('hidden');
        // Hide all content sections
        document.querySelectorAll('#page-insights > div:not(#insights-empty-state)').forEach(el => {
            el.classList.add('hidden');
        });
    },
    
    hideEmptyState() {
        document.getElementById('insights-empty-state')?.classList.add('hidden');
        // Show all content sections
        document.querySelectorAll('#page-insights > div:not(#insights-empty-state)').forEach(el => {
            el.classList.remove('hidden');
        });
    }
};

// Initialize app
async function init() {
    console.log('🚀 Initializing CRM...');
    loadDarkMode(); // Load dark mode preference first
    
    // Initialize UI elements first
    await State.init();
    await MessageSettings.init();
    await TimerSettings.init();
    FollowUpTimers.init();
    
    // Populate year filter
    const yearFilter = document.getElementById('stats-year-filter');
    const currentYear = new Date().getFullYear();
    const years = [currentYear - 1, currentYear, currentYear + 1]; // Previous, current, next year
    yearFilter.innerHTML = years
        .map(year => `<option value="${year}" ${year === currentYear ? 'selected' : ''}>${year}</option>`)
        .join('');
    
    // Populate month filter
    const filter = document.getElementById('stats-month-filter');
    const currentMonth = CONFIG.MONTHS[new Date().getMonth()];
    filter.innerHTML = CONFIG.MONTHS
        .map(month => `<option value="${month}" ${month === currentMonth ? 'selected' : ''}>${month}</option>`)
        .join('') + `<option value="ALL">הצג הכל</option>`;
    
    document.getElementById('inc-date').valueAsDate = new Date();
    
    // Check authentication status AFTER UI is ready
    await checkAuthStatus();
    
    // Initial render - Show home page by default
    await switchPage('home');
    console.log('✅ CRM Ready!');
}

// Side Navigation Functions
async function switchPageNav(pageName) {
    console.log('🔄 Switching to page:', pageName);
    
    // Close any open modals
    document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
    });
    
    // Hide all pages - use ID selector for all page-* elements
    ['home', 'entry', 'leads', 'stats', 'insights', 'contracts', 'social'].forEach(page => {
        const pageEl = document.getElementById(`page-${page}`);
        if (pageEl) {
            pageEl.classList.add('hidden');
            pageEl.classList.remove('active');
        }
    });
    
    // Show requested page
    const targetPage = document.getElementById(`page-${pageName}`);
    if (targetPage) {
        console.log('✅ Found page:', targetPage.id);
        targetPage.classList.remove('hidden');
        targetPage.classList.add('active');
    } else {
        console.error('❌ Page not found:', `page-${pageName}`);
    }
    
    // Update active state in side nav
    document.querySelectorAll('.side-nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-page') === pageName) {
            item.classList.add('active');
        }
    });
    
    // Load data for specific pages
    if (pageName === 'leads') {
        console.log('📊 Loading leads data...');
        await LeadsView.render();
    } else if (pageName === 'stats') {
        console.log('📈 Loading stats data...');
        await StatsView.update();
    } else if (pageName === 'insights') {
        console.log('💡 Loading insights data...');
        await InsightsView.render();
    } else if (pageName === 'home') {
        console.log('🏠 Loading home dashboard...');
        await HomeView.update();
    }
    
    // Scroll to top
    window.scrollTo(0, 0);
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
}

// Make it globally accessible
window.switchPageNav = switchPageNav;

// ==============================================
// SOCIAL PLANNING MODULE (AI-Powered Weekly Planner)
// ==============================================

const SocialPlanning = {
    currentWeek: [],
    selectedMobileDay: 0,
    
    // Initialize the planning module
    init() {
        console.log('📅 Initializing Social Planning module...');
        this.currentWeek = this.getWeekDays();
    },

    // Get array of 7 days (starting from today)
    getWeekDays() {
        const days = [];
        const today = new Date();
        const hebrewDays = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
        
        for (let i = 0; i < 7; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            days.push({
                date: date,
                dayName: hebrewDays[date.getDay()],
                dayNumber: date.getDate(),
                month: date.getMonth() + 1,
                cards: []
            });
        }
        return days;
    },

    // Show setup section
    showSetup() {
        document.getElementById('planning-setup').classList.remove('hidden');
        document.getElementById('weekly-planner').classList.add('hidden');
    },

    // Generate weekly plan using AI
    async generateWeeklyPlan() {
        console.log('✨ Generating AI-powered weekly plan...');
        
        // Get user preferences
        const frequency = document.getElementById('posting-frequency').value;
        const goal = document.getElementById('publishing-goal').value;
        const audience = document.getElementById('target-audience').value;
        
        const platforms = [];
        if (document.getElementById('platform-instagram').checked) platforms.push('Instagram');
        if (document.getElementById('platform-facebook').checked) platforms.push('Facebook');
        if (document.getElementById('platform-tiktok').checked) platforms.push('TikTok');

        if (platforms.length === 0) {
            alert('⚠️ יש לבחור לפחות פלטפורמה אחת');
            return;
        }

        // Show loading state
        const button = event.target;
        const originalText = button.innerHTML;
        button.innerHTML = '<span class="text-2xl animate-spin inline-block">⏳</span><span>מייצר תוכנית...</span>';
        button.disabled = true;

        try {
            // Call AI service (Gemini)
            const plan = await this.callGeminiAPI({
                frequency: parseInt(frequency),
                goal,
                audience,
                platforms
            });

            // Apply generated plan
            this.applyGeneratedPlan(plan);

            // Hide setup, show planner
            document.getElementById('planning-setup').classList.add('hidden');
            document.getElementById('weekly-planner').classList.remove('hidden');

            // Render the board
            this.renderWeekBoard();
            this.updateCardsCount();

        } catch (error) {
            console.error('❌ Error generating plan:', error);
            alert('שגיאה ביצירת התוכנית. נסה שוב.');
        } finally {
            button.innerHTML = originalText;
            button.disabled = false;
        }
    },

    // Call Gemini AI API
    async callGeminiAPI(preferences) {
        console.log('🤖 Calling Gemini AI...', preferences);
        
        // Prepare prompt for Gemini
        const prompt = `
אתה מומחה לתוכן ברשתות חברתיות. צור תוכנית תוכן שבועית עבור עסק של איפור כלות.

הגדרות:
- קצב פרסום: ${preferences.frequency} פוסטים בשבוע
- מטרה: ${this.getGoalDescription(preferences.goal)}
- קהל יעד: ${preferences.audience || 'כלות לפני חתונה'}
- פלטפורמות: ${preferences.platforms.join(', ')}

צור בדיוק ${preferences.frequency} כרטיסי תוכן מפוזרים בצורה חכמה לאורך השבוע.
כל כרטיס צריך לכלול:
1. יום בשבוע (0-6, כאשר 0=ראשון)
2. זמן פרסום מומלץ (בפורמט HH:MM)
3. פלטפורמה (אחת מ: ${preferences.platforms.join(', ')})
4. סוג תוכן (למשל: תמונת לפני ואחרי, טיפ מקצועי, סרטון הדרכה, תמונה של עבודה, סיפור הצלחה)
5. פורמט (למשל: תמונה בודדת, קרוסלה, Reel, Story, Video)
6. רעיון תוכן (משפט קצר עם הרעיון המדויק)
7. מטרת התוכן (למשל: אירוסין, מכירה, מודעות)

החזר JSON array בפורמט הבא:
[
  {
    "day": 0,
    "time": "18:30",
    "platform": "Instagram",
    "contentType": "תמונת לפני ואחרי",
    "format": "תמונה בודדת",
    "idea": "הצגת עבודת איפור דרמטית - טרנספורמציה מדהימה",
    "goal": "אירוסין"
  }
]

חשוב: החזר רק JSON תקין, ללא טקסט נוסף.
`;

        // Call the API via your backend
        const response = await fetch('/api/ai/generate-content-plan', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                prompt,
                preferences
            })
        });

        if (!response.ok) {
            throw new Error('Failed to generate plan');
        }

        const data = await response.json();
        return data.plan;
    },

    // Get goal description in Hebrew
    getGoalDescription(goal) {
        const goals = {
            awareness: 'העלאת מודעות למותג',
            engagement: 'יצירת אינטראקציה וקהילה',
            leads: 'הפקת לידים והזמנות',
            sales: 'מכירות ישירות',
            mixed: 'שילוב של מטרות שונות'
        };
        return goals[goal] || 'שילוב מטרות';
    },

    // Apply generated plan to week structure
    applyGeneratedPlan(plan) {
        // Reset all days
        this.currentWeek.forEach(day => day.cards = []);

        // Distribute cards to days
        plan.forEach((card, index) => {
            const dayIndex = card.day;
            if (dayIndex >= 0 && dayIndex < 7) {
                this.currentWeek[dayIndex].cards.push({
                    id: `card-${Date.now()}-${index}`,
                    ...card
                });
            }
        });
    },

    // Render the week board (desktop)
    renderWeekBoard() {
        const board = document.getElementById('week-board');
        board.innerHTML = '';

        this.currentWeek.forEach((day, dayIndex) => {
            const dayColumn = document.createElement('div');
            dayColumn.className = 'bg-gray-50 dark:bg-slate-900 rounded-xl p-3 min-h-[400px]';
            dayColumn.innerHTML = `
                <!-- Day Header -->
                <div class="bg-white dark:bg-slate-800 rounded-lg p-3 mb-3 shadow-sm sticky top-0">
                    <div class="text-center">
                        <div class="text-sm font-bold text-gray-900 dark:text-white">${day.dayName}</div>
                        <div class="text-xs text-gray-500 dark:text-gray-400">${day.dayNumber}/${day.month}</div>
                    </div>
                    <button onclick="SocialPlanning.addCard(${dayIndex})" class="w-full mt-2 bg-purple-100 dark:bg-purple-900 hover:bg-purple-200 dark:hover:bg-purple-800 text-purple-700 dark:text-purple-200 px-3 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-1">
                        <span>➕</span>
                        <span>הוסף תוכן</span>
                    </button>
                </div>

                <!-- Cards Container -->
                <div class="space-y-3" id="day-${dayIndex}-cards" data-day="${dayIndex}">
                    ${this.renderDayCards(day.cards, dayIndex)}
                </div>
            `;
            board.appendChild(dayColumn);
        });

        // Initialize drag & drop
        this.initDragAndDrop();
    },

    // Render cards for a specific day
    renderDayCards(cards, dayIndex) {
        if (cards.length === 0) {
            return `<div class="text-center text-gray-400 dark:text-gray-600 text-sm py-8">אין תוכן מתוכנן</div>`;
        }

        return cards.map(card => this.renderCard(card, dayIndex)).join('');
    },

    // Render a single content card
    renderCard(card, dayIndex) {
        const platformEmoji = {
            'Instagram': '📷',
            'Facebook': '👥',
            'TikTok': '🎵'
        };

        return `
            <div class="content-card bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm hover:shadow-md transition-all cursor-move border-r-4 ${this.getPlatformColor(card.platform)}" 
                 draggable="true" 
                 data-card-id="${card.id}"
                 data-day="${dayIndex}">
                
                <!-- Card Header -->
                <div class="flex items-start justify-between mb-3">
                    <div class="flex items-center gap-2">
                        <span class="text-xl">${platformEmoji[card.platform] || '📱'}</span>
                        <div>
                            <div class="text-xs font-bold text-gray-900 dark:text-white">${card.platform}</div>
                            <div class="text-xs text-gray-500 dark:text-gray-400">🕒 ${card.time}</div>
                        </div>
                    </div>
                    <button onclick="SocialPlanning.deleteCard('${card.id}', ${dayIndex})" class="text-gray-400 hover:text-red-500 transition-colors">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                        </svg>
                    </button>
                </div>

                <!-- Content Type & Format -->
                <div class="mb-2">
                    <span class="inline-block bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-200 px-2 py-1 rounded text-xs font-bold">
                        ${card.contentType}
                    </span>
                    <span class="inline-block bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded text-xs ml-1">
                        ${card.format}
                    </span>
                </div>

                <!-- Content Idea (Editable) -->
                <div class="mb-2">
                    <input type="text" 
                           value="${card.idea}" 
                           onchange="SocialPlanning.updateCardField('${card.id}', ${dayIndex}, 'idea', this.value)"
                           class="w-full text-sm text-gray-700 dark:text-gray-200 bg-transparent border-none p-0 focus:outline-none focus:ring-0"
                           placeholder="רעיון התוכן...">
                </div>

                <!-- Goal Badge -->
                <div class="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                    <span>🎯</span>
                    <span>${card.goal}</span>
                </div>

                <!-- AI Badge -->
                <div class="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                    <div class="text-xs text-purple-600 dark:text-purple-400 flex items-center gap-1">
                        <span>✨</span>
                        <span>זמן מומלץ ע״י המערכת</span>
                    </div>
                </div>
            </div>
        `;
    },

    // Get platform color class
    getPlatformColor(platform) {
        const colors = {
            'Instagram': 'border-pink-500',
            'Facebook': 'border-blue-500',
            'TikTok': 'border-purple-500'
        };
        return colors[platform] || 'border-gray-500';
    },

    // Initialize drag and drop functionality
    initDragAndDrop() {
        const cards = document.querySelectorAll('.content-card');
        const containers = document.querySelectorAll('[id^="day-"][id$="-cards"]');

        cards.forEach(card => {
            card.addEventListener('dragstart', (e) => {
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/html', card.innerHTML);
                e.dataTransfer.setData('card-id', card.dataset.cardId);
                e.dataTransfer.setData('source-day', card.dataset.day);
                card.classList.add('opacity-50');
            });

            card.addEventListener('dragend', (e) => {
                card.classList.remove('opacity-50');
            });
        });

        containers.forEach(container => {
            container.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                container.classList.add('bg-purple-100', 'dark:bg-purple-900');
            });

            container.addEventListener('dragleave', (e) => {
                container.classList.remove('bg-purple-100', 'dark:bg-purple-900');
            });

            container.addEventListener('drop', (e) => {
                e.preventDefault();
                container.classList.remove('bg-purple-100', 'dark:bg-purple-900');
                
                const cardId = e.dataTransfer.getData('card-id');
                const sourceDay = parseInt(e.dataTransfer.getData('source-day'));
                const targetDay = parseInt(container.dataset.day);

                if (sourceDay !== targetDay) {
                    this.moveCard(cardId, sourceDay, targetDay);
                }
            });
        });
    },

    // Move card between days
    moveCard(cardId, fromDay, toDay) {
        const card = this.currentWeek[fromDay].cards.find(c => c.id === cardId);
        if (card) {
            // Remove from source
            this.currentWeek[fromDay].cards = this.currentWeek[fromDay].cards.filter(c => c.id !== cardId);
            // Add to target
            this.currentWeek[toDay].cards.push(card);
            // Re-render
            this.renderWeekBoard();
            this.updateCardsCount();
        }
    },

    // Add new card manually
    addCard(dayIndex) {
        const newCard = {
            id: `card-${Date.now()}`,
            day: dayIndex,
            time: '18:00',
            platform: 'Instagram',
            contentType: 'תוכן חדש',
            format: 'תמונה בודדת',
            idea: 'הכניסי את הרעיון שלך כאן...',
            goal: 'אירוסין'
        };

        this.currentWeek[dayIndex].cards.push(newCard);
        this.renderWeekBoard();
        this.updateCardsCount();
    },

    // Delete card
    deleteCard(cardId, dayIndex) {
        if (confirm('למחוק כרטיס זה?')) {
            this.currentWeek[dayIndex].cards = this.currentWeek[dayIndex].cards.filter(c => c.id !== cardId);
            this.renderWeekBoard();
            this.updateCardsCount();
        }
    },

    // Update card field
    updateCardField(cardId, dayIndex, field, value) {
        const card = this.currentWeek[dayIndex].cards.find(c => c.id === cardId);
        if (card) {
            card[field] = value;
        }
    },

    // Update cards count display
    updateCardsCount() {
        const total = this.currentWeek.reduce((sum, day) => sum + day.cards.length, 0);
        const countEl = document.getElementById('cards-count');
        if (countEl) {
            countEl.textContent = `${total} כרטיסי תוכן`;
        }
    },

    // Regenerate plan
    async regeneratePlan() {
        if (confirm('⚠️ פעולה זו תמחק את התוכנית הנוכחית ותיצור תוכנית חדשה. להמשיך?')) {
            this.showSetup();
        }
    }
};

// Make globally accessible
window.SocialPlanning = SocialPlanning;

// Side Menu Functions
function openSideMenu() {
    const menu = document.getElementById('side-menu');
    const overlay = document.getElementById('menu-overlay');
    if (menu) menu.classList.remove('translate-x-full');
    if (overlay) overlay.classList.remove('hidden');
}

function closeSideMenu() {
    const menu = document.getElementById('side-menu');
    const overlay = document.getElementById('menu-overlay');
    if (menu) menu.classList.add('translate-x-full');
    if (overlay) overlay.classList.add('hidden');
}

async function switchPageWithMenu(pageName) {
    closeSideMenu();
    await switchPage(pageName);
}

window.openSideMenu = openSideMenu;
window.closeSideMenu = closeSideMenu;
window.switchPageWithMenu = switchPageWithMenu;

document.addEventListener('DOMContentLoaded', init);

