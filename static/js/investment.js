// Investment Calculator Functions
function calculateInvestment() {
    const purchasePrice = parseFloat(document.getElementById('purchase_price').value) || 0;
    const rentalIncome = parseFloat(document.getElementById('rental_income').value) || 0;
    const taxRegime = document.getElementById('tax_regime').value;
    const taxBracket = parseFloat(document.getElementById('tax_bracket').value) || 30;
    const notaryFeesRate = parseFloat(document.getElementById('notary_fees_rate').value) || 0.08;
    
    // Gather all expenses
    const expenses = {
        management_fees: parseFloat(document.getElementById('management_fees').value) || 0,
        property_tax: parseFloat(document.getElementById('property_tax').value) || 0,
        insurance: parseFloat(document.getElementById('insurance').value) || 0,
        maintenance: parseFloat(document.getElementById('maintenance').value) || 0,
        condo_fees: parseFloat(document.getElementById('condo_fees').value) || 0,
        other: parseFloat(document.getElementById('other_expenses').value) || 0
    };
    
    // Calculate total monthly expenses
    expenses.total_monthly = Object.values(expenses).reduce((a, b) => a + b, 0);
    
    // Get loan information if available
    const loanAmount = parseFloat(document.getElementById('loan_amount').value) || 0;
    const interestRate = parseFloat(document.getElementById('interest_rate').value) || 0;
    const loanTerm = parseFloat(document.getElementById('loan_term').value) || 0;
    
    // Calculate monthly loan payment and interest
    let monthlyLoanPayment = 0;
    let monthlyInterest = 0;
    
    if (loanAmount > 0 && interestRate > 0 && loanTerm > 0) {
        const monthlyRate = interestRate / 100 / 12;
        const numPayments = loanTerm * 12;
        monthlyLoanPayment = (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
                            (Math.pow(1 + monthlyRate, numPayments) - 1);
        monthlyInterest = calculateMonthlyInterest(loanAmount, interestRate);
    }
    
    // Prepare data for API call
    const data = {
        purchase_price: purchasePrice,
        rental_income: rentalIncome,
        expenses: expenses,
        tax_regime: taxRegime,
        tax_bracket: taxBracket,
        notary_fees_rate: notaryFeesRate,
        loan_interest: monthlyInterest
    };
    
    // Make API call
    fetch('/api/calculate-investment', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(result => {
        if (result.error) {
            showError(result.error);
            return;
        }
        displayResults(result);
        updateCharts(result);
    })
    .catch(error => {
        showError('Une erreur est survenue lors du calcul: ' + error);
    });
}

function displayResults(result) {
    // Display purchase costs
    document.getElementById('total_cost').textContent = formatCurrency(result.purchase_costs.total_cost);
    document.getElementById('notary_fees').textContent = formatCurrency(result.purchase_costs.notary_fees);
    
    // Display cashflow information
    document.getElementById('monthly_cashflow').textContent = formatCurrency(result.monthly_cashflow);
    document.getElementById('after_tax_monthly_cashflow').textContent = formatCurrency(result.after_tax_monthly_cashflow);
    document.getElementById('annual_cashflow').textContent = formatCurrency(result.annual_cashflow);
    document.getElementById('after_tax_annual_cashflow').textContent = formatCurrency(result.after_tax_annual_cashflow);
    
    // Display ROI
    document.getElementById('roi').textContent = formatPercentage(result.roi);
    document.getElementById('after_tax_roi').textContent = formatPercentage(result.after_tax_roi);
    
    // Display tax impact
    document.getElementById('taxable_income').textContent = formatCurrency(result.tax_impact.taxable_income);
    document.getElementById('income_tax').textContent = formatCurrency(result.tax_impact.income_tax);
    document.getElementById('social_charges').textContent = formatCurrency(result.tax_impact.social_charges);
    document.getElementById('total_tax').textContent = formatCurrency(result.tax_impact.total_tax);
    document.getElementById('effective_tax_rate').textContent = formatPercentage(result.tax_impact.effective_tax_rate);
}

function updateCharts(result) {
    // Update Expense Breakdown Chart
    const expenseLabels = {
        management_fees: 'Frais de gestion',
        property_tax: 'Taxe foncière',
        insurance: 'Assurance',
        maintenance: 'Entretien',
        condo_fees: 'Charges copropriété',
        other: 'Autres charges'
    };
    
    const expenseData = Object.entries(result.expense_breakdown)
        .filter(([key]) => key !== 'total_monthly')
        .map(([key, value]) => ({
            name: expenseLabels[key] || key,
            value: value
        }));
    
    // Create expense pie chart
    const expenseChart = new Chart(document.getElementById('expense-chart'), {
        type: 'pie',
        data: {
            labels: expenseData.map(item => item.name),
            datasets: [{
                data: expenseData.map(item => item.value),
                backgroundColor: [
                    '#FF6384',
                    '#36A2EB',
                    '#FFCE56',
                    '#4BC0C0',
                    '#9966FF',
                    '#FF9F40'
                ]
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Répartition des charges mensuelles'
                }
            }
        }
    });
    
    // Create cashflow waterfall chart
    const cashflowData = [
        { name: 'Revenus locatifs', value: result.rental_income },
        { name: 'Charges', value: -result.expense_breakdown.total_monthly },
        { name: 'Impôts', value: -(result.tax_impact.total_tax / 12) },
        { name: 'Cash-flow net', value: result.after_tax_monthly_cashflow }
    ];
    
    const cashflowChart = new Chart(document.getElementById('cashflow-chart'), {
        type: 'bar',
        data: {
            labels: cashflowData.map(item => item.name),
            datasets: [{
                data: cashflowData.map(item => item.value),
                backgroundColor: [
                    '#36A2EB',
                    '#FF6384',
                    '#FFCE56',
                    '#4BC0C0'
                ]
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Décomposition du cash-flow mensuel'
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// Utility functions
function formatCurrency(value) {
    return new Intl.NumberFormat('fr-FR', { 
        style: 'currency', 
        currency: 'EUR' 
    }).format(value);
}

function formatPercentage(value) {
    return new Intl.NumberFormat('fr-FR', { 
        style: 'percent',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value / 100);
}

function calculateMonthlyInterest(loanAmount, annualRate) {
    return (loanAmount * (annualRate / 100)) / 12;
}

function showError(message) {
    const errorDiv = document.getElementById('error-message');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 5000);
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    // Initialize tax regime dropdown
    fetch('/api/tax-regimes')
        .then(response => response.json())
        .then(data => {
            const taxRegimeSelect = document.getElementById('tax_regime');
            data.regimes.forEach(regime => {
                const option = document.createElement('option');
                option.value = regime.id;
                option.textContent = `${regime.name} - ${regime.description}`;
                taxRegimeSelect.appendChild(option);
            });
            
            // Add note about social charges
            document.getElementById('social-charges-note').textContent = 
                `Note: Les prélèvements sociaux de ${data.social_charges_rate}% seront automatiquement ajoutés.`;
        });
    
    // Add event listeners for real-time calculations
    const inputs = document.querySelectorAll('input[type="number"], select');
    inputs.forEach(input => {
        input.addEventListener('change', calculateInvestment);
    });
});
