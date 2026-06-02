// Initialize transaction database array or fetch existing device memory
let transactions = JSON.parse(localStorage.getItem('pro_transactions')) || [];
let myChart = null;

function updateUI() {
    const list = document.getElementById('list');
    const balance = document.getElementById('balance');
    const totalExpenseText = document.getElementById('totalExpense');
    const currentMonth = document.getElementById('monthFilter').value;
    
    list.innerHTML = '';
    
    // Filter out data belonging ONLY to the currently selected calendar month
    const monthlyData = transactions.filter(t => t.month === currentMonth);

    let netBalance = 0;
    let totalExpense = 0;

    // Category calculation map buckets
    let categories = { Housing: 0, Food: 0, Transport: 0, Leisure: 0, Savings: 0 };

    monthlyData.forEach((t) => {
        netBalance += t.amount;
        
        if (t.amount < 0) {
            totalExpense += Math.abs(t.amount);
            if (categories[t.category] !== undefined) {
                categories[t.category] += Math.abs(t.amount);
            }
        } else if (t.category === "Savings") {
            categories["Savings"] += t.amount;
        }

        // Render clean tracking list items
        const li = document.createElement('li');
        li.className = `flex justify-between py-2 text-sm items-center`;
        li.innerHTML = `
            <div>
                <p class="font-semibold text-emerald-950">${t.desc}</p>
                <p class="text-xs text-emerald-600/70">${t.category}</p>
            </div>
            <span class="font-bold ${t.amount < 0 ? 'text-red-500' : 'text-emerald-600'}">
                ${t.amount < 0 ? '-' : '+'}$${Math.abs(t.amount).toFixed(2)}
            </span>
        `;
        list.appendChild(li);
    });

    // Update monetary textual metric boards
    balance.innerText = `$${netBalance.toFixed(2)}`;
    balance.className = `text-xl font-bold ${netBalance < 0 ? 'text-red-600' : 'text-emerald-600'}`;
    totalExpenseText.innerText = `$${totalExpense.toFixed(2)}`;

    // Sync state storage data locally
    localStorage.setItem('pro_transactions', JSON.stringify(transactions));

    // Render dynamic green-themed pie chart
    renderChart(categories, totalExpense);

    // Fire rules-based automated financial guidance engine
    generateAISuggestions(netBalance, totalExpense, categories);
}

function addTransaction() {
    const desc = document.getElementById('desc').value;
    const amount = parseFloat(document.getElementById('amount').value);
    const category = document.getElementById('category').value;
    const currentMonth = document.getElementById('monthFilter').value;

    if (!desc || isNaN(amount)) return alert('Please input valid textual description and numerical balances.');

    transactions.push({ desc, amount, category, month: currentMonth, id: Date.now() });
    
    document.getElementById('desc').value = '';
    document.getElementById('amount').value = '';
    
    updateUI();
}

function renderChart(categoryData, totalExpense) {
    const ctx = document.getElementById('categoryChart').getContext('2d');
    
    if (myChart) { myChart.destroy(); }

    const labelsWithPercentages = [];
    const chartValues = [];

    Object.keys(categoryData).forEach(cat => {
        const val = categoryData[cat];
        if (val > 0) {
            // Calculate slice percentage allocation matching current expense caps
            const pct = totalExpense > 0 ? ((val / totalExpense) * 100).toFixed(0) : 0;
            labelsWithPercentages.push(`${cat} (${pct}%)`);
            chartValues.push(val);
        }
    });

    myChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labelsWithPercentages,
            datasets: [{
                data: chartValues,
                backgroundColor: [
                    '#022c22', // Housing (Darkest Emerald/Forest)
                    '#065f46', // Food (Deep Emerald)
                    '#0f766e', // Transport (Teal Green)
                    '#10b981', // Leisure (Bright Green)
                    '#6ee7b7'  // Savings (Soft Mint)
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
                    labels: { boxWidth: 10, font: { size: 10 } }
                } 
            },
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

function generateAISuggestions(balance, expenses, cats) {
    const aiConsole = document.getElementById('aiConsole');
    aiConsole.innerHTML = '';

    let insights = [];

    if (balance < 0) {
        insights.push({
            type: 'danger',
            title: 'Deficit Alert',
            text: 'Your expenditures outpaced income this cycle. Cut leisure activities by 20% immediately.'
        });
    }

    if (expenses > 0 && (cats.Leisure / expenses) > 0.20) {
        insights.push({
            type: 'warning',
            title: 'High Leisure Spending',
            text: `Leisure devours ${(cats.Leisure / expenses * 100).toFixed(0)}% of expenses. Consider cooking home meals.`
        });
    }

    let standardIncome = balance + expenses; 
    if (standardIncome > 0 && (cats.Savings / standardIncome) < 0.20) {
        insights.push({
            type: 'info',
            title: 'Optimize Wealth Allocation',
            text: 'You allocated less than 20% to savings. Aim to automate a deposit of $50 into savings next week.'
        });
    }

    if (insights.length === 0) {
        insights.push({
            type: 'success',
            title: 'Excellent Capital Health',
            text: 'No optimization anomalies detected. Your allocations match standard benchmark targets.'
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
        div.innerHTML = `<p class="font-bold mb-0.5">💡 ${item.title}</p><p>${item.text}</p>`;
        aiConsole.appendChild(div);
    });
}

// Start
updateUI();
