let currentUser = localStorage.getItem('mme_logged_user') || null;
let transactions = JSON.parse(localStorage.getItem('pro_transactions')) || [];
let myChart = null;

function formatCurrency(value) {
    return `$${Number(value || 0).toFixed(2)}`;
}

function saveTransactions() {
    localStorage.setItem('pro_transactions', JSON.stringify(transactions));
}

function generateMonthOptionsIfNeeded() {
    const monthSelect = document.getElementById('monthFilter');

    if (!monthSelect) {
        return;
    }

    if (monthSelect.options.length > 0) {
        return;
    }

    const today = new Date();

    for (let i = -6; i <= 6; i++) {
        const date = new Date(today.getFullYear(), today.getMonth() + i, 1);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');

        const option = document.createElement('option');
        option.value = `${year}-${month}`;
        option.textContent = date.toLocaleString('default', {
            month: 'long',
            year: 'numeric'
        });

        if (i === 0) {
            option.selected = true;
        }

        monthSelect.appendChild(option);
    }

    monthSelect.addEventListener('change', updateUI);
}

function getSelectedMonth() {
    const monthFilter = document.getElementById('monthFilter');

    if (monthFilter && monthFilter.value) {
        return monthFilter.value;
    }

    return new Date().toISOString().substring(0, 7);
}

function migrateOldTransactions() {
    if (!currentUser) {
        return;
    }

    let changed = false;

    transactions = transactions.map(transaction => {
        if (!transaction.owner) {
            changed = true;
            return {
                ...transaction,
                owner: currentUser
            };
        }

        return transaction;
    });

    if (changed) {
        saveTransactions();
    }
}

function checkAuth() {
    if (!currentUser) {
        window.location.href = './index.html';
        return;
    }

    migrateOldTransactions();
    generateMonthOptionsIfNeeded();
    updateUI();
}

function addTransaction() {
    if (!currentUser) {
        window.location.href = './index.html';
        return;
    }

    const descInput = document.getElementById('desc');
    const amountInput = document.getElementById('amount');
    const categoryInput = document.getElementById('category');

    if (!descInput || !amountInput || !categoryInput) {
        alert('Budget form elements are missing. Please check your HTML IDs.');
        return;
    }

    const desc = descInput.value.trim();
    const amount = parseFloat(amountInput.value);
    const category = categoryInput.value;
    const currentMonth = getSelectedMonth();

    if (!desc || isNaN(amount)) {
        alert('Please input a valid description and amount.');
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

    descInput.value = '';
    amountInput.value = '';

    updateUI();
}

function deleteTransaction(transactionId) {
    if (!confirm('Delete this transaction?')) {
        return;
    }

    transactions = transactions.filter(transaction => transaction.id !== transactionId);
    saveTransactions();
    updateUI();
}

function updateUI() {
    if (!currentUser) {
        return;
    }

    const list = document.getElementById('list');
    const balance = document.getElementById('balance');
    const totalExpenseText = document.getElementById('totalExpense');

    if (!list || !balance || !totalExpenseText) {
        console.error('Missing one or more required budgeting elements: list, balance, totalExpense.');
        return;
    }

    const currentMonth = getSelectedMonth();

    list.innerHTML = '';

    const monthlyData = transactions.filter(transaction =>
        transaction.owner === currentUser &&
        transaction.month === currentMonth
    );

    let netBalance = 0;
    let totalExpense = 0;
    let totalIncome = 0;

    const categories = {
        Housing: 0,
        Food: 0,
        Transport: 0,
        Leisure: 0,
        Savings: 0
    };

    if (monthlyData.length === 0) {
        const emptyItem = document.createElement('li');
        emptyItem.className = 'text-sm text-gray-500 text-center py-4';
        emptyItem.textContent = 'No transactions logged for this month yet.';
        list.appendChild(emptyItem);
    }

    monthlyData.forEach(transaction => {
        const amount = Number(transaction.amount || 0);

        netBalance += amount;

        if (amount < 0) {
            totalExpense += Math.abs(amount);

            if (categories[transaction.category] !== undefined) {
                categories[transaction.category] += Math.abs(amount);
            }
        } else {
            if (transaction.category === 'Income') {
                totalIncome += amount;
            }

            if (transaction.category === 'Savings') {
                categories.Savings += amount;
            }
        }

        const li = document.createElement('li');
        li.className = 'flex justify-between py-2 text-sm items-center hover:bg-gray-50 px-2 rounded';

        const leftDiv = document.createElement('div');

        const desc = document.createElement('p');
        desc.className = 'font-semibold text-emerald-950';
        desc.textContent = transaction.desc;

        const category = document.createElement('p');
        category.className = 'text-xs text-emerald-600/70';
        category.textContent = transaction.category;

        leftDiv.appendChild(desc);
        leftDiv.appendChild(category);

        const rightDiv = document.createElement('div');
        rightDiv.className = 'flex items-center space-x-2';

        const amountText = document.createElement('span');
        amountText.className = `font-bold ${amount < 0 ? 'text-red-500' : 'text-emerald-600'}`;
        amountText.textContent = `${amount < 0 ? '-' : '+'}${formatCurrency(Math.abs(amount))}`;

        const deleteButton = document.createElement('button');
        deleteButton.className = 'ml-2 p-1 bg-red-100 hover:bg-red-200 text-red-600 rounded text-xs font-bold transition';
        deleteButton.textContent = '✕';
        deleteButton.onclick = function () {
            deleteTransaction(transaction.id);
        };

        rightDiv.appendChild(amountText);
        rightDiv.appendChild(deleteButton);

        li.appendChild(leftDiv);
        li.appendChild(rightDiv);

        list.appendChild(li);
    });

    balance.textContent = formatCurrency(netBalance);
    balance.className = `text-xl font-bold ${netBalance < 0 ? 'text-red-600' : 'text-emerald-600'}`;

    totalExpenseText.textContent = formatCurrency(totalExpense);

    renderChart(categories, totalExpense);
    generateAISuggestions(netBalance, totalExpense, totalIncome, categories);
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

    const labels = [];
    const values = [];

    Object.keys(categoryData).forEach(category => {
        const value = categoryData[category];

        if (value > 0) {
            const percentage = totalExpense > 0
                ? ((value / totalExpense) * 100).toFixed(0)
                : 0;

            labels.push(`${category} (${percentage}%)`);
            values.push(value);
        }
    });

    if (labels.length === 0) {
        labels.push('No Expenses');
        values.push(1);
    }

    myChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels,
            datasets: [{
                data: values,
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

    if (!aiConsole) {
        return;
    }

    aiConsole.innerHTML = '';

    const insights = [];

    if (balance < 0) {
        insights.push({
            type: 'danger',
            title: 'Deficit Alert',
            text: 'Your expenses are higher than your income this month. Review flexible spending categories first.'
        });
    }

    if (expenses > 0 && cats.Leisure / expenses > 0.20) {
        insights.push({
            type: 'warning',
            title: 'High Leisure Spending',
            text: `Leisure spending is ${(cats.Leisure / expenses * 100).toFixed(0)}% of expenses. Consider setting a monthly entertainment limit.`
        });
    }

    if (income > 0 && cats.Savings / income < 0.20) {
        insights.push({
            type: 'info',
            title: 'Savings Opportunity',
            text: 'Savings are below 20% of income this month. Consider increasing savings if your budget allows.'
        });
    }

    if (expenses > 0 && cats.Food / expenses > 0.30) {
        insights.push({
            type: 'warning',
            title: 'Food Spending Check',
            text: `Food spending is ${(cats.Food / expenses * 100).toFixed(0)}% of expenses.`
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

window.addEventListener('DOMContentLoaded', checkAuth);
