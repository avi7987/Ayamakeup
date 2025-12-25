/**
 * CRM System for Beauty Business
 * Version: 9.0 - Database Edition
 * Date: 25.12.2025
 */

// Configuration
const CONFIG = {
    API_BASE_URL: 'https://ayamakeup-production.up.railway.app/api',
    STORAGE_KEYS: {
        CLIENTS: 'crm_clients_v3',
        LEADS: 'crm_leads_v3'
    },
    MONTHS: ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'],
    LEAD_STAGES: [
        {id: 'new', title: 'ליד חדש'},
        {id: 'contact', title: 'במגע'},
        {id: 'negotiation', title: 'במשא ומתן'},
        {id: 'offer', title: 'בהצעה'},
        {id: 'done', title: 'נסגר'},
        {id: 'archive', title: 'בארכיון'}
    ]
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
                
                // Convert to booleans
                this.clients = this.clients.map(c => ({...c, isBride: Boolean(c.isBride)}));
                this.leads = this.leads.map(l => ({...l, isBride: Boolean(l.isBride)}));
                
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
    
    getFilteredClients(monthName) {
        if (monthName === 'ALL') return this.clients;
        const months = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
        const monthIndex = months.indexOf(monthName);
        if (monthIndex === -1) return this.clients;
        
        return this.clients.filter(c => {
            const date = new Date(c.date);
            return date.getMonth() === monthIndex;
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
        // Hide all pages
        ['home', 'entry', 'leads', 'stats'].forEach(id => {
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
            HomeView.update();
        }
        if (pageName === 'leads') LeadsView.render();
        if (pageName === 'stats') StatsView.update();
        
        // Scroll to top
        window.scrollTo(0, 0);
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
            // Add to local state
            State.clients.push(savedClient);
            // Update home view to reflect new data
            console.log('🔄 מעדכן תצוגת דף הבית...');
            HomeView.update();
            
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
            HomeView.update();
            
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
            HomeView.update();
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
        const data = {
            id: Date.now(),
            status: 'new',
            name: document.getElementById('lead-name').value.trim(),
            phone: document.getElementById('lead-phone').value.trim(),
            source: document.getElementById('lead-source').value.trim(),
            service: document.getElementById('lead-service').value.trim(),
            eventDate: document.getElementById('lead-event-date').value,
            location: document.getElementById('lead-location').value.trim(),
            isBride: document.getElementById('lead-is-bride').checked
        };
        
        if (!data.name || !data.phone) {
            alert('מלא את השדות החובה');
            return;
        }
        
        btn.innerText = "שומר...";
        btn.disabled = true;
        
        try {
            await API.addLead(data);
            State.leads.push(data);
            
            ModalManager.close('modal-new-lead');
            LeadsView.render();
            alert('?£?ש?ף ???ץ???? ?ס?פ???£?ק?פ');
            
            // Clear form
            document.getElementById('lead-name').value = '';
            document.getElementById('lead-phone').value = '';
            document.getElementById('lead-source').value = '';
            document.getElementById('lead-service').value = '';
            document.getElementById('lead-event-date').value = '';
            document.getElementById('lead-location').value = '';
            document.getElementById('lead-is-bride').checked = false;
        } catch (error) {
            alert("???ע?ש?נ?פ ?ס?פ?ץ?????¬ ?£?ש?ף: " + error.message);
        }
        
        btn.innerText = "?????ץ?¿ ?£?ש?ף";
        btn.disabled = false;
    },
    
    async updateStatus(leadId, newStatus) {
        try {
            await API.updateLeadStatus(leadId, newStatus);
            
            const lead = State.leads.find(l => l.id === leadId);
            if (lead) {
                lead.status = newStatus;
            }
        } catch (error) {
            console.error('Failed to update lead status:', error);
        }
    },
    
    async delete(id) {
        if (!confirm('?£???ק?ץ?? ?נ?¬ ?פ?£?ש?ף?')) return;
        
        try {
            await API.deleteLead(id);
            State.leads = State.leads.filter(l => l.id !== id);
            LeadsView.render();
        } catch (error) {
            alert("???ע?ש?נ?פ ?ס???ק?ש???פ: " + error.message);
        }
    },
    
    view(id) {
        const lead = State.leads.find(l => l.id === id);
        if (!lead) return;
        
        document.getElementById('view-name').innerText = lead.name;
        document.getElementById('view-phone').innerText = lead.phone;
        document.getElementById('view-source').innerText = lead.source || '-';
        document.getElementById('view-service').innerText = lead.service || '-';
        document.getElementById('view-date').innerText = lead.eventDate || '?£?נ ?????ס??';
        document.getElementById('view-location').innerText = lead.location || '-';
        document.getElementById('view-tag-bride').classList.toggle('hidden', !lead.isBride);
        
        const whatsappLink = `https://wa.me/972${lead.phone.replace(/[^0-9]/g, '').replace(/^0/, '')}`;
        document.getElementById('view-wa-link').href = whatsappLink;
        
        ModalManager.open('modal-view-lead');
    }
};

// Views
const LeadsView = {
    render() {
        const board = document.getElementById('kanban-board');
        
        board.innerHTML = CONFIG.LEAD_STAGES.map(stage => `
            <div class="kanban-col">
                <h3 class="font-bold mb-4 text-purple-900 border-b pb-2 text-center text-sm">${stage.title}</h3>
                <div class="kanban-list space-y-3" data-status="${stage.id}">
                    ${this.renderLeadsForStage(stage.id)}
                </div>
            </div>
        `).join('');
        
        this.initDragAndDrop();
    },
    
    renderLeadsForStage(stageId) {
        const leads = State.leads.filter(l => (l.status || 'new') === stageId);
        
        return leads.map(lead => `
            <div class="lead-card text-right" data-id="${lead.id}">
                <div class="flex justify-between mb-1">
                    <span class="font-bold text-gray-800 text-sm">${lead.name}</span>
                    <span class="source-tag">${lead.source || '?¢?£?£?ש'}</span>
                </div>
                <div class="text-[10px] text-gray-400 mb-2">${lead.service || ''}</div>
                <div class="flex gap-2 border-t pt-2 mt-1">
                    <button onclick="viewLead(${lead.id})" class="text-[10px] bg-purple-50 text-purple-600 px-2 py-1 rounded font-bold">הצג פרטים</button>
                    <button onclick="deleteLead(${lead.id})" class="text-[10px] text-red-300 mr-auto">מחק</button>
                </div>
            </div>
        `).join('');
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
                    const leadId = parseInt(evt.item.getAttribute('data-id'));
                    const newStatus = evt.to.getAttribute('data-status');
                    await LeadsManager.updateStatus(leadId, newStatus);
                }
            });
        });
    }
};

const HomeView = {
    update() {
        console.log('🏠 מעדכן דף הבית - סה"כ לקוחות:', State.clients.length);
        // Load goals - always show section even if goals not set
        const goals = JSON.parse(localStorage.getItem('stride_goals') || '{}');
        console.log('🎯 יעדים:', goals);
        
        // Always show goals section
        document.getElementById('goals-section').classList.remove('hidden');
        
        // If no goals set, show zeros
        if (goals.income || goals.brides) {
            // Calculate yearly totals
            const now = new Date();
            const thisYear = now.getFullYear();
            const yearlyClients = State.clients.filter(c => {
                const date = new Date(c.date);
                return date.getFullYear() === thisYear;
            });
            
            console.log(`📊 לקוחות השנה: ${yearlyClients.length}`);
            
            // Income progress
            const totalIncome = yearlyClients.reduce((sum, c) => sum + (c.price || c.amount || 0), 0);
            const incomeGoal = goals.income || 0;
            const incomePercent = incomeGoal > 0 ? Math.min(100, Math.round((totalIncome / incomeGoal) * 100)) : 0;
            const incomeRemaining = Math.max(0, incomeGoal - totalIncome);
            
            document.getElementById('income-current').innerText = `₪${totalIncome.toLocaleString()}`;
            document.getElementById('income-goal').innerText = `₪${incomeGoal.toLocaleString()}`;
            document.getElementById('income-percentage').innerText = `${incomePercent}%`;
            document.getElementById('income-progress').style.width = `${incomePercent}%`;
            
            if (incomePercent >= 100) {
                document.getElementById('income-remaining').innerHTML = '🎉 <strong>יעד הושג!</strong> מזל טוב!';
            } else {
                document.getElementById('income-remaining').innerHTML = `נותרו <strong>₪${incomeRemaining.toLocaleString()}</strong> להשגת היעד`;
            }
            
            // Brides progress - check both isBride field AND notes
            const totalBrides = yearlyClients.filter(c => c.isBride || c.notes?.includes('כלה')).length;
            console.log(`👰 כלות השנה: ${totalBrides} (מתוך ${yearlyClients.length} לקוחות)`);
            const bridesGoal = goals.brides || 0;
            const bridesPercent = bridesGoal > 0 ? Math.min(100, Math.round((totalBrides / bridesGoal) * 100)) : 0;
            const bridesRemaining = Math.max(0, bridesGoal - totalBrides);
            
            document.getElementById('brides-current').innerText = totalBrides;
            document.getElementById('brides-goal').innerText = bridesGoal;
            document.getElementById('brides-percentage').innerText = `${bridesPercent}%`;
            document.getElementById('brides-progress').style.width = `${bridesPercent}%`;
            
            if (bridesPercent >= 100) {
                document.getElementById('brides-remaining').innerHTML = '🎉 <strong>יעד הושג!</strong> מזל טוב!';
            } else {
                document.getElementById('brides-remaining').innerHTML = `נותרו <strong>${bridesRemaining} כלות</strong> להשגת היעד`;
            }
        } else {
            // No goals set - show message to set goals
            document.getElementById('income-current').innerText = '₪0';
            document.getElementById('income-goal').innerText = 'לא הוגדר';
            document.getElementById('income-percentage').innerText = '0%';
            document.getElementById('income-progress').style.width = '0%';
            document.getElementById('income-remaining').innerHTML = 'הגדר יעד בהגדרות ⚙️';
            
            document.getElementById('brides-current').innerText = '0';
            document.getElementById('brides-goal').innerText = 'לא הוגדר';
            document.getElementById('brides-percentage').innerText = '0%';
            document.getElementById('brides-progress').style.width = '0%';
            document.getElementById('brides-remaining').innerHTML = 'הגדר יעד בהגדרות ⚙️';
        }
    }
};

const StatsView = {
    render() {
        this.update();
    },
    
    update() {
        const filterVal = document.getElementById('stats-month-filter').value;
        const filtered = State.getFilteredClients(filterVal);
        
        this.updateSummary(filtered, filterVal);
        this.updateChart(filterVal, filtered);
    },
    
    updateSummary(filtered, filterVal) {
        const totalIncome = filtered.reduce((sum, client) => sum + (client.price || client.amount || 0), 0);
        const bridesCount = filtered.filter(c => c.isBride || c.notes?.includes('כלה')).length;
        const totalCount = filtered.length;
        
        const periodText = filterVal === 'ALL' ? 'סה"כ שנתי' : `חודש ${filterVal}`;
        document.getElementById('sum-total').innerHTML = `<div class="text-3xl font-bold text-purple-700">${totalIncome.toLocaleString()} ₪</div><div class="text-xs text-gray-500 mt-1">${periodText}</div>`;
        document.getElementById('sum-brides').innerHTML = `<div class="text-3xl font-bold text-pink-600">${bridesCount}</div><div class="text-xs text-gray-500 mt-1">כלות ${filterVal === 'ALL' ? 'בשנה' : 'בחודש'}</div>`;
        document.getElementById('sum-count').innerHTML = `<div class="text-3xl font-bold text-blue-600">${totalCount}</div><div class="text-xs text-gray-500 mt-1">עסקאות ${filterVal === 'ALL' ? 'בשנה' : 'בחודש'}</div>`;
    },
    
    updateChart(filterVal, filtered) {
        const isYearView = filterVal === 'ALL';
        const months = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
        
        let labels, incomeData, bridesData;
        
        if (isYearView) {
            labels = months;
            incomeData = months.map((_, idx) => {
                return State.clients
                    .filter(c => {
                        const date = new Date(c.date);
                        return date.getMonth() === idx;
                    })
                    .reduce((sum, c) => sum + (c.price || c.amount || 0), 0);
            });
            bridesData = months.map((_, idx) => {
                return State.clients
                    .filter(c => {
                        const date = new Date(c.date);
                        return date.getMonth() === idx && (c.isBride || c.notes?.includes('כלה'));
                    })
                    .length;
            });
        } else {
            labels = [filterVal];
            incomeData = [filtered.reduce((sum, c) => sum + (c.price || c.amount || 0), 0)];
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
                backgroundColor: 'rgba(147, 51, 234, 0.7)',
                borderColor: '#9333ea',
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
                borderColor: '#db2777',
                backgroundColor: 'rgba(219, 39, 119, 0.1)',
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
                        font: { size: 16, weight: 'bold' }
                    },
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    tooltip: {
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
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'הכנסות (₪)'
                        },
                        ticks: {
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
        const filtered = State.getFilteredClients(filterVal);
        const tbody = document.getElementById('manage-tbody');
        
        tbody.innerHTML = filtered
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .map(client => {
                const clientId = client._id || client.id;
                const dateOnly = client.date ? client.date.split('T')[0] : client.date;
                const brideIcon = client.isBride ? '👰' : '-';
                return `
                <tr class="border-b hover:bg-gray-50 text-right">
                    <td class="p-3">
                        <input type="checkbox" class="row-sel" data-id="${clientId}" onchange="checkBulkVisibility()">
                    </td>
                    <td class="p-3 text-xs text-gray-500">${dateOnly}</td>
                    <td class="p-3 font-bold">${client.name}</td>
                    <td class="p-3 text-sm text-gray-600">${client.service || '-'}</td>
                    <td class="p-3 text-purple-600 font-bold">${client.price || client.amount} ₪</td>
                    <td class="p-3 text-xs text-gray-600">${client.payment || 'מזומן'}</td>
                    <td class="p-3 text-center">${brideIcon}</td>
                    <td class="p-3 flex gap-2">
                        <button onclick="startEdit('${clientId}')" class="text-blue-500 font-bold text-xs bg-blue-50 px-2 py-1 rounded">ערוך</button>
                        <button onclick="deleteRow('${clientId}')" class="text-red-500 font-bold text-xs bg-red-50 px-2 py-1 rounded">מחק</button>
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
        if (!confirm('?£???ק?ץ?? ?נ?¬ ?¢?£ ?פ???ץ?¿?ץ?¬ ?????ס?ק?¿?ץ?')) return;
        
        const ids = Array.from(document.querySelectorAll('.row-sel:checked'))
            .map(cb => parseInt(cb.dataset.id));
        
        try {
            await API.bulkDeleteClients(ids);
            State.clients = State.clients.filter(c => !ids.includes(c.id));
            this.open();
            StatsView.update();
        } catch (error) {
            alert("???ע?ש?נ?פ ?ס???ק?ש???פ: " + error.message);
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
            const monthData = State.getFilteredClients(filterVal);
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
            
            const total = monthClients.reduce((sum, c) => sum + (c.price || c.amount || 0), 0);
            const count = monthClients.length;
            const brides = monthClients.filter(c => c.isBride).length;
            
            yearlyTotal += total;
            yearlyCount += count;
            yearlyBrides += brides;
            
            // Count payment methods
            monthClients.forEach(c => {
                const payment = c.payment || 'מזומן';
                paymentMethods[payment] = (paymentMethods[payment] || 0) + (c.price || c.amount || 0);
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
        const total = clients.reduce((sum, c) => sum + (c.price || c.amount || 0), 0);
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
                client.price || client.amount || 0,
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

// Global Functions (for onclick handlers in HTML)
window.switchPage = async (page) => await Navigation.switchPage(page);
window.openModal = (id) => ModalManager.open(id);
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
window.saveGoals = () => {
    const income = parseInt(document.getElementById('goal-income').value) || 0;
    const brides = parseInt(document.getElementById('goal-brides').value) || 0;
    
    if (income <= 0 && brides <= 0) {
        alert('נא להזין לפחות יעד אחד');
        return;
    }
    
    const goals = { income, brides };
    localStorage.setItem('stride_goals', JSON.stringify(goals));
    
    ModalManager.close('modal-settings');
    HomeView.update();
    
    alert('✅ היעדים נשמרו בהצלחה!');
};
window.loadGoalsToModal = () => {
    const goals = JSON.parse(localStorage.getItem('stride_goals') || '{}');
    document.getElementById('goal-income').value = goals.income || '';
    document.getElementById('goal-brides').value = goals.brides || '';
};

// Initialize Application
window.onload = async () => {
    // Show loading indicator
    console.log('מאתחל CRM...');
    
    await State.init();
    
    // Initialize month filter
    const filter = document.getElementById('stats-month-filter');
    const currentMonth = CONFIG.MONTHS[new Date().getMonth()];
    filter.innerHTML = CONFIG.MONTHS
        .map(month => `<option value="${month}" ${month === currentMonth ? 'selected' : ''}>${month}</option>`)
        .join('') + `<option value="ALL">הכל (שנתי)</option>`;
    
    // Set today's date
    document.getElementById('inc-date').valueAsDate = new Date();
    
    // Initial render - Show home page by default
    switchPage('home');
    
    console.log('✅ CRM Ready!');
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

// Modal functions
window.openModal = (id) => document.getElementById(id).style.display = 'flex';
window.closeModal = (id) => document.getElementById(id).style.display = 'none';

// Initialize app
async function init() {
    console.log(' Initializing CRM...');
    await State.init();
    
    const filter = document.getElementById('stats-month-filter');
    const currentMonth = CONFIG.MONTHS[new Date().getMonth()];
    filter.innerHTML = CONFIG.MONTHS
        .map(month => `<option value="${month}" ${month === currentMonth ? 'selected' : ''}>${month}</option>`)
        .join('') + `<option value="ALL">הצג הכל</option>`;
    
    document.getElementById('inc-date').valueAsDate = new Date();
    LeadsView.render();
    console.log(' CRM Ready!');
}

document.addEventListener('DOMContentLoaded', init);
