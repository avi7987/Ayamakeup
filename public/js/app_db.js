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
    MONTHS: ["?ש???ץ?נ?¿", "???ס?¿?ץ?נ?¿", "???¿??", "?נ???¿?ש?£", "???נ?ש", "?ש?ץ???ש", "?ש?ץ?£?ש", "?נ?ץ?ע?ץ???ר", "?????ר???ס?¿", "?נ?ץ???ר?ץ?ס?¿", "???ץ?ס???ס?¿", "?ף?????ס?¿"],
    LEAD_STAGES: [
        {id: 'new', title: '?ƒזץ ?ק?ף??'},
        {id: 'contact', title: '?ƒף? ?????¿'},
        {id: 'negotiation', title: '?ƒ?¥ ???ץ"??'},
        {id: 'offer', title: '?ƒף£ ?פ?????פ'},
        {id: 'done', title: '?£ו ?????ע?¿'},
        {id: 'archive', title: '?ƒףב ?נ?¿?¢?ש?ץ?ƒ'}
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
            // Try to load from database
            const [clientsRes, leadsRes] = await Promise.all([
                fetch(`${CONFIG.API_BASE_URL}/clients`),
                fetch(`${CONFIG.API_BASE_URL}/leads`)
            ]);
            
            if (clientsRes.ok && leadsRes.ok) {
                this.clients = await clientsRes.json();
                this.leads = await leadsRes.json();
                
                // Convert SQLite integers to booleans
                this.clients = this.clients.map(c => ({...c, isBride: Boolean(c.isBride)}));
                this.leads = this.leads.map(l => ({...l, isBride: Boolean(l.isBride)}));
                
                console.log('?£ו Data loaded from database');
            } else {
                // Fallback to localStorage
                this.loadFromStorage();
                console.log('?ת???ן Using localStorage data');
            }
        } catch (error) {
            console.error('Failed to connect to database, using localStorage:', error);
            this.loadFromStorage();
        }
    },
    
    loadFromStorage() {
        this.clients = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.CLIENTS)) || [];
        this.leads = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.LEADS)) || [];
    },
    
    saveToStorage() {
        localStorage.setItem(CONFIG.STORAGE_KEYS.CLIENTS, JSON.stringify(this.clients));
        localStorage.setItem(CONFIG.STORAGE_KEYS.LEADS, JSON.stringify(this.leads));
    },
    
    getFilteredClients(month) {
        if (month === 'ALL') return this.clients;
        return this.clients.filter(c => c.month === month);
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
                throw new Error(`API error: ${response.statusText}`);
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
    switchPage(pageName) {
        // Hide all pages
        ['entry', 'leads', 'stats'].forEach(id => {
            document.getElementById('page-' + id).classList.add('hidden');
        });
        
        // Show selected page
        document.getElementById('page-' + pageName).classList.remove('hidden');
        
        // Update nav buttons
        document.querySelectorAll('.nav-button').forEach(btn => {
            btn.classList.remove('active');
        });
        document.getElementById('nav-' + pageName).classList.add('active');
        
        // Trigger page-specific initialization
        if (pageName === 'leads') LeadsView.render();
        if (pageName === 'stats') StatsView.update();
    }
};

const ModalManager = {
    open(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'flex';
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
            id: Date.now(),
            name: nameInput.value.trim(),
            amount: parseFloat(amountInput.value),
            date: dateInput.value,
            service: serviceInput.value.trim(),
            paymentMethod: paymentSelect.value,
            isBride: isBrideCheck.checked,
            month: CONFIG.MONTHS[new Date(dateInput.value).getMonth()]
        };
        
        if (!data.name || isNaN(data.amount)) {
            alert('???£?נ ???¥ ?ץ???¢?ץ?¥');
            return;
        }
        
        btn.innerText = "???ץ???¿... ?ן?";
        btn.disabled = true;
        
        try {
            await API.addClient(data);
            State.clients.push(data);
            State.saveToStorage();
            
            alert('?פ???????פ ???????¿?פ ?ס?פ???£?ק?פ!');
            nameInput.value = '';
            amountInput.value = '';
            serviceInput.value = '';
            isBrideCheck.checked = false;
        } catch (error) {
            alert("???ע?ש?נ?פ ?ס?????ש?¿?פ: " + error.message);
        }
        
        btn.innerText = "?????ץ?¿ ?סDB";
        btn.disabled = false;
    },
    
    async update(id) {
        const btn = document.getElementById('btn-edit-save');
        const data = {
            name: document.getElementById('edit-name').value,
            amount: parseFloat(document.getElementById('edit-amount').value),
            service: document.getElementById('edit-service').value,
            date: document.getElementById('edit-date').value,
            isBride: document.getElementById('edit-isbride').checked,
            month: CONFIG.MONTHS[new Date(document.getElementById('edit-date').value).getMonth()]
        };
        
        btn.innerText = "?????ף?¢?ƒ... ?ן?";
        btn.disabled = true;
        
        try {
            await API.updateClient(id, data);
            
            const index = State.clients.findIndex(c => c.id === id);
            if (index !== -1) {
                State.clients[index] = { ...State.clients[index], ...data };
                State.saveToStorage();
            }
            
            ModalManager.close('modal-edit-row');
            ManageView.open();
            StatsView.update();
        } catch (error) {
            alert("???ע?ש?נ?פ ?ס???ף?¢?ץ?ƒ: " + error.message);
        }
        
        btn.innerText = "?????ץ?¿ ???ש???ץ?ש?ש?¥";
        btn.disabled = false;
    },
    
    async delete(id) {
        if (!confirm('?£???ק?ץ?? ?נ?¬ ?פ???????פ?')) return;
        
        try {
            await API.deleteClient(id);
            State.clients = State.clients.filter(c => c.id !== id);
            State.saveToStorage();
            ManageView.open();
            StatsView.update();
        } catch (error) {
            alert("???ע?ש?נ?פ ?ס???ק?ש???פ: " + error.message);
        }
    },
    
    startEdit(id) {
        const client = State.clients.find(c => c.id === id);
        if (!client) return;
        
        document.getElementById('edit-id').value = client.id;
        document.getElementById('edit-name').value = client.name;
        document.getElementById('edit-amount').value = client.amount;
        document.getElementById('edit-service').value = client.service || '';
        document.getElementById('edit-date').value = client.date;
        document.getElementById('edit-isbride').checked = client.isBride || false;
        
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
            alert('???¥ ?ץ?ר?£???ץ?ƒ ?ק?ץ?ס?פ');
            return;
        }
        
        btn.innerText = "???ץ???¿...";
        btn.disabled = true;
        
        try {
            await API.addLead(data);
            State.leads.push(data);
            State.saveToStorage();
            
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
                State.saveToStorage();
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
            State.saveToStorage();
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
                    <button onclick="viewLead(${lead.id})" class="text-[10px] bg-purple-50 text-purple-600 px-2 py-1 rounded font-bold">?ƒסב??ן ???¿?ר?ש?¥</button>
                    <button onclick="deleteLead(${lead.id})" class="text-[10px] text-red-300 mr-auto">???ק??</button>
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

const StatsView = {
    update() {
        const filterVal = document.getElementById('stats-month-filter').value;
        const filtered = State.getFilteredClients(filterVal);
        
        this.updateSummary(filtered);
        this.updateChart(filterVal, filtered);
    },
    
    updateSummary(filtered) {
        const totalIncome = filtered.reduce((sum, client) => sum + client.amount, 0);
        const bridesCount = filtered.filter(c => c.isBride).length;
        const totalCount = filtered.length;
        
        document.getElementById('sum-total').innerText = totalIncome.toLocaleString() + ' ?ג¬';
        document.getElementById('sum-brides').innerText = bridesCount;
        document.getElementById('sum-count').innerText = totalCount;
    },
    
    updateChart(filterVal, filtered) {
        const labels = filterVal === 'ALL' ? CONFIG.MONTHS : [filterVal];
        const data = filterVal === 'ALL' 
            ? CONFIG.MONTHS.map(month => 
                State.clients
                    .filter(c => c.month === month)
                    .reduce((sum, c) => sum + c.amount, 0)
              )
            : [filtered.reduce((sum, c) => sum + c.amount, 0)];
        
        if (State.chart) {
            State.chart.destroy();
        }
        
        State.chart = new Chart(document.getElementById('incomeChart'), {
            data: {
                labels,
                datasets: [
                    { 
                        type: 'bar', 
                        label: '?פ?¢?????ץ?¬ ?ג¬', 
                        data, 
                        backgroundColor: '#9333ea', 
                        borderRadius: 8 
                    },
                    { 
                        type: 'line', 
                        label: '???ע???פ', 
                        data, 
                        borderColor: '#db2777', 
                        tension: 0.3 
                    }
                ]
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false 
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
            .map(client => `
                <tr class="border-b hover:bg-gray-50 text-right">
                    <td class="p-3">
                        <input type="checkbox" class="row-sel" data-id="${client.id}" onchange="checkBulkVisibility()">
                    </td>
                    <td class="p-3 text-xs text-gray-500">${client.date}</td>
                    <td class="p-3 font-bold">${client.name}</td>
                    <td class="p-3 text-sm text-gray-600">${client.service || '-'}</td>
                    <td class="p-3 text-purple-600 font-bold">${client.amount} ?ג¬</td>
                    <td class="p-3 flex gap-2">
                        <button onclick="startEdit(${client.id})" class="text-blue-500 font-bold text-xs bg-blue-50 px-2 py-1 rounded">???¿?ץ?ת</button>
                        <button onclick="deleteRow(${client.id})" class="text-red-500 font-bold text-xs bg-red-50 px-2 py-1 rounded">???ק??</button>
                    </td>
                </tr>
            `).join('');
        
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
        btn.innerText = `???ק?? ${checked.length} ???ץ?¿?ץ?¬`;
    },
    
    async bulkDelete() {
        if (!confirm('?£???ק?ץ?? ?נ?¬ ?¢?£ ?פ???ץ?¿?ץ?¬ ?????ס?ק?¿?ץ?')) return;
        
        const ids = Array.from(document.querySelectorAll('.row-sel:checked'))
            .map(cb => parseInt(cb.dataset.id));
        
        try {
            await API.bulkDeleteClients(ids);
            State.clients = State.clients.filter(c => !ids.includes(c.id));
            State.saveToStorage();
            this.open();
            StatsView.update();
        } catch (error) {
            alert("???ע?ש?נ?פ ?ס???ק?ש???פ: " + error.message);
        }
    }
};

// Migration Tool
const MigrationTool = {
    async migrateFromLocalStorage() {
        if (!confirm('?£?פ???ס?ש?¿ ?נ?¬ ?¢?£ ?פ???¬?ץ???ש?¥ ??-localStorage ?£?????ף ?פ???¬?ץ???ש?¥?')) return;
        
        const clients = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.CLIENTS)) || [];
        const leads = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.LEADS)) || [];
        
        if (clients.length === 0 && leads.length === 0) {
            alert('?נ?ש?ƒ ???¬?ץ???ש?¥ ?ס-localStorage ?£?פ???ס?¿?פ');
            return;
        }
        
        try {
            const result = await API.migrateData(clients, leads);
            alert(result.message);
            await State.init();
            LeadsView.render();
            StatsView.update();
        } catch (error) {
            alert('???ע?ש?נ?פ ?ס?פ???ס?¿?¬ ???¬?ץ???ש?¥: ' + error.message);
        }
    }
};

// Global Functions (for onclick handlers in HTML)
window.switchPage = (page) => Navigation.switchPage(page);
window.openModal = (id) => ModalManager.open(id);
window.closeModal = (id) => ModalManager.close(id);
window.saveIncome = () => IncomeManager.save();
window.addLead = () => LeadsManager.add();
window.viewLead = (id) => LeadsManager.view(id);
window.deleteLead = (id) => LeadsManager.delete(id);
window.openManageModal = () => ManageView.open();
window.startEdit = (id) => IncomeManager.startEdit(id);
window.submitEdit = () => {
    const id = parseInt(document.getElementById('edit-id').value);
    IncomeManager.update(id);
};
window.deleteRow = (id) => IncomeManager.delete(id);
window.toggleSelectAll = (checkbox) => ManageView.toggleSelectAll(checkbox);
window.checkBulkVisibility = () => ManageView.checkBulkVisibility();
window.bulkDelete = () => ManageView.bulkDelete();
window.updateStats = () => StatsView.update();
window.migrateData = () => MigrationTool.migrateFromLocalStorage();

// Initialize Application
window.onload = async () => {
    // Show loading indicator
    console.log('?ƒתא Initializing CRM...');
    
    await State.init();
    
    // Initialize month filter
    const filter = document.getElementById('stats-month-filter');
    const currentMonth = CONFIG.MONTHS[new Date().getMonth()];
    filter.innerHTML = CONFIG.MONTHS
        .map(month => `<option value="${month}" ${month === currentMonth ? 'selected' : ''}>${month}</option>`)
        .join('') + `<option value="ALL">?ƒףט ?????¬?ש</option>`;
    
    // Set today's date
    document.getElementById('inc-date').valueAsDate = new Date();
    
    // Initial render
    LeadsView.render();
    
    console.log('?£ו CRM Ready!');
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
