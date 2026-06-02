// Load data from browser local storage, or start empty
let transactions = JSON.parse(localStorage.getItem('transactions')) || [];

function updateUI() {
    const list = document.getElementById('list');
    const balance = document.getElementById('balance');

    list.innerHTML = '';
    let total = 0;

    transactions.forEach((t, index) => {
        total += t.amount;
        const li = document.createElement('li');
        li.className = `flex justify-between py-2 ${t.amount < 0 ? 'text-red-600' : 'text-green-600'}`;
        li.innerHTML = `<span>${t.desc}</span> <span>${t.amount < 0 ? '' : '+'}$${t.amount.toFixed(2)}</span>`;
        list.appendChild(li);
    });

    balance.innerText = `$${total.toFixed(2)}`;
    localStorage.setItem('transactions', JSON.stringify(transactions));
}

function addTransaction() {
    const desc = document.getElementById('desc').value;
    const amount = parseFloat(document.getElementById('amount').value);

    if (!desc || isNaN(amount)) return alert('Please enter valid details');

    transactions.push({ desc, amount });
    updateUI();

    document.getElementById('desc').value = '';
    document.getElementById('amount').value = '';
}

// Initial load
updateUI();
