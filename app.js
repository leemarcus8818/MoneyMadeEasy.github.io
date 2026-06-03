// Initialize local data
let currentUser = localStorage.getItem('mme_logged_user') || null;
let transactions = JSON.parse(localStorage.getItem('pro_transactions')) || [];
let assetSnapshots = JSON.parse(localStorage.getItem('pro_asset_snapshots')) || [];
let myChart = null;

function formatCurrency(value) {
    return `$${Number(value || 0).toFixed(2)}`;
}

function formatSignedCurrency(value) {
    const amount = Number(value || 0);
    return `${amount >= 0 ? '+' : ''}$${amount.toFixed(2)}`;
}

function saveTransactions() {
    localStorage.setItem('pro_transactions', JSON.stringify(transactions));
}

function saveAssetSnapshots() {
    localStorage.setItem('pro_asset_snapshots', JSON.stringify(assetSnapshots));
}

function checkAuth() {
    if (!currentUser) {
        window.location.href = './index.html';
        return;
    }

    updateUI();
}

function getSelectedMonth() {
    return document.getElementById('monthFilter').value;
}

function getUserTransactions() {
    return transactions.filter(t => t.owner === currentUser);
}

function getMonthlyTransactions(month) {
    return transactions.filter(t =>
        t.owner === currentUser &&
        t.month === month
    );
}

function calculateMonthTotals(monthlyData) {
    let netBalance = 0;
    let totalExpense = 0;
    let totalIncome = 0;

    let categories = {
        Housing: 0,
        Food: 0,
        Transport: 0,
        Leisure: 0,
        Savings: 0
    };

    monthlyData.forEach(t => {
        netBalance += Number(t.amount || 0);

        if (t.amount < 0) {
            totalExpense += Math.abs(t.amount);

            if (categories[t.category] !== undefined) {
                categories[t.category] += Math.abs(t.amount);
            }
        } else {
            if (t.category === 'Income') {
                totalIncome += t.amount;
            }

            if (t.category === 'Savings') {
                categories.Savings += t.amount;
            }
        }
    });

    return {
        netBalance,
        totalExpense,
        totalIncome,
        categories
    };
}

function calculateCumulativeLiquidAssets(month) {
    const userTransactions = getUserTransactions();

    return userTransactions
        .filter(t => t.month <= month)
        .reduce((total, t) => total + Number(t.amount || 0), 0);
}

function getOrCreateAssetSnapshot(month, endingAssets, monthNet) {
    let snapshot = assetSnapshots.find(snapshot =>
        snapshot.owner === currentUser &&
        snapshot.month === month
    );

    if (!snapshot) {
        snapshot = {
            id: Date.now(),
            owner: currentUser,
            month,
            beginningAssets: endingAssets - monthNet,
            endingAssets,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        assetSnapshots.push(snapshot);
    } else {
        snapshot.endingAssets = endingAssets;
        snapshot.updatedAt = new Date().toISOString();
    }

    saveAssetSnapshots();
    return snapshot;
}

function updateAssetSnapshotFromBudget(month, netBalance) {
    const endingLiquidAssets = calculateCumulativeLiquidAssets(month);

    // Budgeting page only knows liquid assets.
    // Dashboard can later add investment assets on top.
    getOrCreateAssetSnapshot(month, endingLiquidAssets, netBalance);
}

function updateUI() {
    if (!currentUser) {
        return;
    }

    const list = document.getElementById('list');
    const balance = document.getElementById('balance');
    const totalExpenseText = document.getElementById('totalExpense');
    const currentMonth = getSelectedMonth();

    list.innerHTML = '';

    const monthlyData = getMonthlyTransactions(currentMonth);
    const {
        netBalance,
        totalExpense,
        totalIncome,
        categories
    } = calculateMonthTotals(monthlyData);

    if (monthlyData.length === 0) {
        const emptyItem = document.createElement('li');
        emptyItem.className = 'text-sm text-gray-500 text-center py-4';
        emptyItem.textContent = 'No transactions logged for this month yet.';
        list.appendChild(emptyItem);
    }

    monthlyData.forEach(t => {
        const li = document.createElement('li');
        li.className = 'flex justify-between py-2 text-sm items-center hover:bg-gray-50 px-2 rounded';

        const leftDiv = document.createElement('div');

        const desc = document.createElement('p');
        desc.className = 'font-semibold text-emerald-950';
        desc.textContent = t.desc;

        const category = document.createElement('p');
        category.className = 'text-xs text-emerald-600/70';
        category.textContent = t.category;

        leftDiv.appendChild(desc);
        leftDiv.appendChild(category);

        const rightDiv = document.createElement('div');
        rightDiv.className = 'flex items-center space-x-2';

        const amount = document.createElement('span');
        amount.className = `font-bold ${t.amount < 0 ? 'text-red-500' : 'text-emerald-600'}`;
        amount.textContent = `${t.amount < 0 ? '-' : '+'}${formatCurrency(Math.abs(t.amount))}`;

        const deleteButton = document.createElement('button');
        deleteButton.className = 'ml-2 p-1 bg-red-100 hover:bg-red-200 text-red-600 rounded text-xs font-bold transition';
        deleteButton.textContent = '✕';
        deleteButton.onclick = () => deleteTransaction(t.id);

        rightDiv.appendChild(amount);
        rightDiv.appendChild(deleteButton);

        li.appendChild(leftDiv);
        li.appendChild(rightDiv);

        list.appendChild(li);
    });

    balance.textContent = formatCurrency(netBalance);
    balance.className = `text-xl font-bold ${netBalance < 0 ? 'text-red-600' : 'text-emerald-600'}`;

    totalExpenseText.textContent = formatCurrency(totalExpense);

    saveTransactions();

    updateAssetSnapshotFromBudget(currentMonth, netBalance);
    renderChart(categories, totalExpense);
    generateAISuggestions(netBalance, totalExpense, totalIncome, categories);
}

function addTransaction() {
    if (!currentUser) {
        window.location.href = './index.html';
        return;
    }

    const desc = document.getElementById('desc').value.trim();
    const amount = parseFloat(document.getElementById('amount').value);
    const category = document.getElementById('category').value;
    const currentMonth = getSelectedMonth();

    if (!desc || isNaN(amount)) {
        alert('Please input a valid description and amount.');
        return;
    }

    if (!currentMonth) {
        alert('Please select a month.');
        return;
    }

    const transaction = {
        id: Date.now(),
        desc,
        amount,
        category,
        month: currentMonth,
        owner: currentUser,
        date: new Date().toISOString()
    };

    transactions.push(transaction);
    saveTransactions();

    document.getElementById('desc').value = '';
    document.getElementById('amount').value = '';

    updateUI();
}

function deleteTransaction(transactionId) {
    if (!confirm('Delete this transaction?')) {
        return;
    }

    transactions = transactions.filter(t => t.id !== transactionId);
    saveTransactions();
    updateUI();
}

function renderChart(categoryData, totalExpense) {
    const chartCanvas = document.getElementById('categoryChart');

    if (!chartCanvas) {
        return;
    }

    const ctx = chartCanvas.getContext('2d');

    if (myChart) {
        myChart.destroy();
    }

    const labelsWithPercentages = [];
    const chartValues = [];

    Object.keys(categoryData).forEach(cat => {
        const val = categoryData[cat];

        if (val > 0) {
            const pct = totalExpense > 0 ? ((val / totalExpense) * 100).toFixed(0) : 0;
            labelsWithPercentages.push(`${cat} (${pct}%)`);
            chartValues.push(val);
        }
    });

    if (chartValues.length === 0) {
        labelsWithPercentages.push('No Expenses');
        chartValues.push(1);
    }

    myChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labelsWithPercentages,
            datasets: [{
                data: chartValues,
                backgroundColor: [
                    '#022c22',
                    '#065f46',
                    '#0f766e',
                    '#10b981',
                    '#6ee7b7'
                ],
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        boxWidth: 10,
                        font: {
                            size: 10
                        }
                    }
                }
            },
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

function generateAISuggestions(balance, expenses, income, cats) {
    const aiConsole = document.getElementById('aiConsole');
    aiConsole.innerHTML = '';

    let insights = [];

    if (balance < 0) {
        insights.push({
            type: 'danger',
            title: 'Deficit Alert',
            text: 'Your expenses are higher than your income this month. Review flexible spending categories first.'
        });
    }

    if (expenses > 0 && (cats.Leisure / expenses) > 0.20) {
        insights.push({
            type: 'warning',
            title: 'High Leisure Spending',
            text: `Leisure spending is ${(cats.Leisure / expenses * 100).toFixed(0)}% of expenses. Consider setting a monthly entertainment limit.`
        });
    }

    if (income > 0 && (cats.Savings / income) < 0.20) {
        insights.push({
            type: 'info',
            title: 'Savings Opportunity',
            text: 'Savings are below 20% of income this month. Consider increasing automatic savings if your budget allows.'
        });
    }

    if (expenses > 0 && cats.Food / expenses > 0.30) {
        insights.push({
            type: 'warning',
            title: 'Food Spending Check',
            text: `Food spending is ${(cats.Food / expenses * 100).toFixed(0)}% of expenses. Review dining out or grocery habits.`
        });
    }

    if (insights.length === 0) {
        insights.push({
            type: 'success',
            title: 'Healthy Monthly Budget',
            text: 'No major budget issues detected for this month.'
        });
    }

    insights.forEach(item => {
        const div = document.createElement('div');

        const colors = {
            danger: 'bg-red-50 border-red-200 text-red-800',
            warning: 'bg-amber-50 border-amber-200 text-amber-800',
            info: 'bg-emerald-50 border-emerald-200 text-emerald-800',
            success: 'bg-emerald-950 text-emerald-100 border-emerald-900'
        };

        div.className = `p-3 rounded-xl border ${colors[item.type] || 'bg-gray-50'} text-xs`;

        const title = document.createElement('p');
        title.className = 'font-bold mb-0.5';
        title.textContent = `💡 ${item.title}`;

        const text = document.createElement('p');
        text.textContent = item.text;

        div.appendChild(title);
        div.appendChild(text);

        aiConsole.appendChild(div);
    });
}

// Start
window.addEventListener('DOMContentLoaded', checkAuth);
