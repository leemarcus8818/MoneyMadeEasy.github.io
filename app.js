/* MoneyMadeEasy shared utilities */
const MME = {
    STORAGE_KEYS: {
        user: 'mme_logged_user',
        transactions: 'pro_transactions',
        investments: 'pro_investments',
        snapshots: 'pro_asset_snapshots',
        apiKey: 'finnhub_api_key'
    },
    get currentUser() {
        return localStorage.getItem(this.STORAGE_KEYS.user) || null;
    },
    loadJSON(key, fallback = []) {
        try { return JSON.parse(localStorage.getItem(key)) || fallback; }
        catch { return fallback; }
    },
    saveJSON(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    },
    formatCurrency(value, currency = 'HKD') {
        return new Intl.NumberFormat('en-HK', {
            style: 'currency',
            currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(Number(value || 0));
    },
    formatSignedCurrency(value, currency = 'HKD') {
        const amount = Number(value || 0);
        return `${amount >= 0 ? '+' : '-'}${this.formatCurrency(Math.abs(amount), currency)}`;
    },
    clampPercent(value) {
        return Math.min(100, Math.max(0, Number(value || 0)));
    },
    requireAuth() {
        if (!this.currentUser) {
            window.location.href = './login.html';
            return false;
        }
        const greeting = document.getElementById('userGreeting');
        if (greeting) greeting.textContent = this.currentUser;
        return true;
    },
    logout() {
        localStorage.removeItem(this.STORAGE_KEYS.user);
        window.location.href = './login.html';
    },
    createElement(tag, className = '', textContent) {
        const element = document.createElement(tag);
        if (className) element.className = className;
        if (textContent !== undefined) element.textContent = textContent;
        return element;
    },
    getTransactions() {
        return this.loadJSON(this.STORAGE_KEYS.transactions, []);
    },
    saveTransactions(transactions) {
        this.saveJSON(this.STORAGE_KEYS.transactions, transactions);
    },
    getInvestments() {
        return this.loadJSON(this.STORAGE_KEYS.investments, []);
    },
    saveInvestments(investments) {
        this.saveJSON(this.STORAGE_KEYS.investments, investments);
    },
    getSnapshots() {
        return this.loadJSON(this.STORAGE_KEYS.snapshots, []);
    },
    saveSnapshots(snapshots) {
        this.saveJSON(this.STORAGE_KEYS.snapshots, snapshots);
    },
    getUserTransactions() {
        return this.getTransactions().filter(t => t.owner === this.currentUser);
    },
    getUserInvestments() {
        return this.getInvestments().filter(i => i.owner === this.currentUser);
    },
    migrateLegacyOwners() {
        const user = this.currentUser;
        if (!user) return;
        let transactions = this.getTransactions();
        let investments = this.getInvestments();
        let changedTransactions = false;
        let changedInvestments = false;
        transactions = transactions.map(item => {
            if (!item.owner) { changedTransactions = true; return { ...item, owner: user }; }
            return item;
        });
        investments = investments.map(item => {
            if (!item.owner) { changedInvestments = true; return { ...item, owner: user }; }
            return item;
        });
        if (changedTransactions) this.saveTransactions(transactions);
        if (changedInvestments) this.saveInvestments(investments);
    },
    populateMonthFilter(onChange) {
        const monthSelect = document.getElementById('monthFilter');
        if (!monthSelect) return;
        monthSelect.innerHTML = '';
        const today = new Date();
        for (let i = -6; i <= 6; i++) {
            const date = new Date(today.getFullYear(), today.getMonth() + i, 1);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const option = document.createElement('option');
            option.value = `${year}-${month}`;
            option.textContent = date.toLocaleString('en-HK', { month: 'long', year: 'numeric' });
            if (i === 0) option.selected = true;
            monthSelect.appendChild(option);
        }
        if (onChange) monthSelect.addEventListener('change', onChange);
    },
    selectedMonth() {
        return document.getElementById('monthFilter')?.value || new Date().toISOString().substring(0, 7);
    },
    calculateTransactionTotals(monthlyData) {
        const categories = { Housing: 0, Food: 0, Transport: 0, Leisure: 0, Savings: 0 };
        let netBalance = 0, totalExpense = 0, totalIncome = 0;
        monthlyData.forEach(transaction => {
            const amount = Number(transaction.amount || 0);
            netBalance += amount;
            if (amount < 0) {
                totalExpense += Math.abs(amount);
                if (categories[transaction.category] !== undefined) categories[transaction.category] += Math.abs(amount);
            } else {
                if (transaction.category === 'Income') totalIncome += amount;
                if (transaction.category === 'Savings') categories.Savings += amount;
            }
        });
        return { netBalance, totalExpense, totalIncome, categories };
    },
    exportData() {
        const data = {
            app: 'MoneyMadeEasy',
            version: '2.0',
            user: this.currentUser,
            transactions: this.getTransactions(),
            investments: this.getInvestments(),
            assetSnapshots: this.getSnapshots(),
            exportedAt: new Date().toISOString()
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `moneymadeeasy-backup-${new Date().toISOString().slice(0, 10)}.json`;
        link.click();
        URL.revokeObjectURL(url);
    },
    importData(event) {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const data = JSON.parse(reader.result);
                if (Array.isArray(data.transactions)) this.saveTransactions(data.transactions);
                if (Array.isArray(data.investments)) this.saveInvestments(data.investments);
                if (Array.isArray(data.assetSnapshots)) this.saveSnapshots(data.assetSnapshots);
                alert('Data imported successfully. The page will reload.');
                window.location.reload();
            } catch {
                alert('Import failed. Please select a valid MoneyMadeEasy backup JSON file.');
            }
        };
        reader.readAsText(file);
    },
    clearLocalData() {
        if (!confirm('Clear transactions, investments, snapshots, and API key for this browser? This cannot be undone.')) return;
        localStorage.removeItem(this.STORAGE_KEYS.transactions);
        localStorage.removeItem(this.STORAGE_KEYS.investments);
        localStorage.removeItem(this.STORAGE_KEYS.snapshots);
        localStorage.removeItem(this.STORAGE_KEYS.apiKey);
        window.location.reload();
    }
};
window.MME = MME;
window.handleLogout = () => MME.logout();
window.exportMoneyMadeEasyData = () => MME.exportData();
window.importMoneyMadeEasyData = (event) => MME.importData(event);
window.clearMoneyMadeEasyData = () => MME.clearLocalData();
