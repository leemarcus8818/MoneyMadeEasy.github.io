// Initialize transaction database array or fetch existing device memory
let transactions = JSON.parse(localStorage.getItem('pro_transactions')) || [];
let myChart = null;

function updateUI() {
    const list = document.getElementById('list');
    const balance = document.getElementById('balance');
    const totalExpenseText = document.getElementById('totalExpense');
    const currentMonth = document.getElementById('monthFilter').value; // e.g. "2026-06"
    
    list.innerHTML = '';
    
    // 1. Filter out data belonging ONLY to the currently selected calendar month
    const monthlyData = transactions.filter(t => t.month === currentMonth);

    let netBalance = 0;
    let totalExpense = 0;

    // Category calculation map buckets
    let categories = { Housing: 0, Food: 0, Transport: 0, Leisure: 0, Savings: 0 };

    monthlyData.forEach((t, index) => {
        netBalance += t.amount;
        
        if (t.amount < 0) {
            totalExpense += Math.abs(t.amount);
            if (categories[t.category] !== undefined) {
                categories[t.category] += Math.abs(t.amount);
            }
        } else if (t.category === "Savings") {
            // Treat explicit transfers to savings asset class as investment allocation
            categories["Savings"] += t.amount;
        }

        // Render clean tracking list items
        const li = document.createElement('li');
        li.className = `flex justify-between py-2 text-sm items-center`;
        li.innerHTML = `
            <div>
                <p class="font-semibold text-gray-800">${t.desc}</p>
                <p class="text-xs text-gray-400">${t.category}</p>
            </div>
            <span class="font-bold ${t.amount < 0 ? 'text-red-500' : 'text-green-500'}">
                ${t.amount < 0 ? '-' : '+'}$${Math.abs(t.amount).toFixed(2)}
            </span>
        `;
        list.appendChild(li);
    });

    // Update monetary textual metric boards
    balance.innerText = `$${netBalance.toFixed(2)}`;
    balance.className = `text-xl font-bold ${netBalance < 0 ? 'text-red-600' : 'text-green-600'}`;
    totalExpenseText.innerText = `$${totalExpense.toFixed(2)}`;

    // Sync state storage data locally
    localStorage.setItem('pro_transactions', JSON.stringify(transactions));

    // 2. Render dynamic category visualization graph
    renderChart(categories);

    // 3. Fire rules-based automated financial guidance engine
    generateAISuggestions(netBalance, totalExpense, categories);
}

function addTransaction() {
    const desc = document.getElementById('desc').value;
    const amount = parseFloat(document.getElementById('amount').value);
    const category = document.getElementById('category').value;
    const currentMonth = document.getElementById('monthFilter').value;

    if (!desc || isNaN(amount)) return alert('Please input valid textual description and numerical balances.');

    // Append metadata structural nodes
    transactions.push({ desc, amount, category, month: currentMonth, id: Date.now() });
    
    // Clear forms 
    document.getElementById('desc').value = '';
    document.getElementById('amount').value = '';
    
    updateUI();
}

function renderChart(categoryData) {
    const ctx = document.getElementById('categoryChart').getContext('2d');
    
    // Destroy previous instance to prevent chart flicker bugs on update loops
    if (myChart) { myChart.destroy(); }

    myChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(categoryData),
            datasets: [{
                data: Object.values(categoryData),
                backgroundColor: ['#f87171', '#fbbf24', '#34d399', '#60a5fa', '#c084fc'],
                borderWidth: 2
            }]
        },
        options: {
            plugins: { legend: { display: false } },
            cutout: '70%'
        }
    });
}

function generateAISuggestions(balance, expenses, cats) {
    const aiConsole = document.getElementById('aiConsole');
    aiConsole.innerHTML = '';

    let insights = [];

    // Rule 1: General Deficit warning
    if (balance < 0) {
        insights.push({
            type: 'danger',
            title: 'Deficit Alert',
            text: 'Your expenditures outpaced income this cycle. Cut leisure activities by 20% immediately.'
        });
    }

    // Rule 2: Overspending on Leisure/Entertainment 
    if (expenses > 0 && (cats.Leisure / expenses) > 0.20) {
        insights.push({
            type: 'warning',
            title: 'High Leisure Spending',
            text: `Leisure devours ${(cats.Leisure / expenses * 100).toFixed(0)}% of expenses. Consider cooking home meals or canceling unused subscriptions.`
        });
    }

    // Rule 3: Golden 50/30/20 Rule checks for savings
    let standardIncome = balance + expenses; 
    if (standardIncome > 0 && (cats.Savings / standardIncome) < 0.20) {
        insights.push({
            type: 'info',
            title: 'Optimize Wealth Allocation',
            text: 'You allocated less than 20% to savings. Aim to automate a deposit of $50 into savings next week.'
        });
    }

    // Default clean state response fallback
    if (insights.length === 0) {
        insights.push({
            type: 'success',
            title: 'Excellent Capital Health',
            text: 'No optimization anomalies detected. Your allocations match standard benchmark targets.'
        });
    }

    // Generate beautiful visual cards for each AI suggestion output node
    insights.forEach(item => {
        const div = document.createElement('div');
        const colors = {
            danger: 'bg-red-50 border-red-200 text-red-800',
            warning: 'bg-amber-50 border-amber-200 text-amber-800',
            info: 'bg-blue-50 border-blue-200 text-blue-800',
            success: 'bg-green-50 border-green-200 text-green-800'
        };
        
        div.className = `p-3 rounded-xl border ${colors[item.type] || 'bg-gray-50'} text-xs`;
        div.innerHTML = `<p class="font-bold mb-0.5">💡 ${item.title}</p><p>${item.text}</p>`;
        aiConsole.appendChild(div);
    });
}

// Initial engine bootstrap load orchestration
updateUI();
