document.addEventListener('DOMContentLoaded', function() {
    // Investment Form Handler
    document.getElementById('investmentForm').addEventListener('submit', function(e) {
        e.preventDefault();
        calculateInvestment();
    });

    // Loan Form Handler
    document.getElementById('loanForm').addEventListener('submit', function(e) {
        e.preventDefault();
        calculateLoan();
    });

    // Update notary fees amount when purchase price or rate changes
    document.getElementById('purchasePrice').addEventListener('input', function() {
        updateNotaryFees();
        updateLoanAmount();
    });
    document.getElementById('notaryFeesRate').addEventListener('input', function() {
        updateNotaryFees();
        updateLoanAmount();
    });
    document.getElementById('personalDeposit').addEventListener('input', updateLoanAmount);
});

function updateNotaryFees() {
    const purchasePrice = parseFloat(document.getElementById('purchasePrice').value) || 0;
    const notaryFeesRate = parseFloat(document.getElementById('notaryFeesRate').value) || 8.0;
    const notaryFees = purchasePrice * (notaryFeesRate / 100);
    
    const notaryFeesElement = document.getElementById('notaryFeesAmount');
    if (purchasePrice > 0) {
        notaryFeesElement.textContent = `Montant des frais de notaire : ${notaryFees.toLocaleString('fr-FR')} €`;
    } else {
        notaryFeesElement.textContent = '';
    }
    return notaryFees;
}

function updateLoanAmount() {
    const purchasePrice = parseFloat(document.getElementById('purchasePrice').value) || 0;
    const notaryFees = updateNotaryFees();
    const personalDeposit = parseFloat(document.getElementById('personalDeposit').value) || 0;
    
    const totalCost = purchasePrice + notaryFees;
    const loanAmount = Math.max(0, totalCost - personalDeposit);
    
    document.getElementById('loanAmount').value = Math.round(loanAmount);
    
    // Update loan summary
    const loanSummary = document.getElementById('loanSummary');
    const loanSummaryContent = document.getElementById('loanSummaryContent');
    
    if (totalCost > 0) {
        const depositPercentage = (personalDeposit / totalCost) * 100;
        loanSummaryContent.innerHTML = `
            <p>Coût total: ${totalCost.toLocaleString('fr-FR')} €</p>
            <p>Apport: ${personalDeposit.toLocaleString('fr-FR')} € (${depositPercentage.toFixed(1)}%)</p>
            <p>Montant du prêt: ${loanAmount.toLocaleString('fr-FR')} €</p>
        `;
        loanSummary.style.display = 'block';
    } else {
        loanSummary.style.display = 'none';
    }
}

function calculateMonthlyCharges() {
    const rentalIncome = parseFloat(document.getElementById('rentalIncome').value) || 0;
    const managementFees = (parseFloat(document.getElementById('managementFees').value) || 0) * rentalIncome / 100;
    const propertyTax = (parseFloat(document.getElementById('propertyTax').value) || 0) / 12; // Convert annual to monthly
    const insurance = parseFloat(document.getElementById('insurance').value) || 0;
    const maintenanceProvision = (parseFloat(document.getElementById('maintenanceProvision').value) || 0) * rentalIncome / 100;
    const condoFees = parseFloat(document.getElementById('condoFees').value) || 0;
    const otherCharges = parseFloat(document.getElementById('otherCharges').value) || 0;

    return {
        managementFees,
        propertyTax,
        insurance,
        maintenanceProvision,
        condoFees,
        otherCharges,
        total: managementFees + propertyTax + insurance + maintenanceProvision + condoFees + otherCharges
    };
}

async function calculateInvestment() {
    const purchasePrice = parseFloat(document.getElementById('purchasePrice').value);
    const notaryFeesRate = parseFloat(document.getElementById('notaryFeesRate').value) || 8.0;
    const rentalIncome = parseFloat(document.getElementById('rentalIncome').value);
    const charges = calculateMonthlyCharges();
    
    const data = {
        purchase_price: purchasePrice,
        notary_fees_rate: notaryFeesRate / 100,
        rental_income: rentalIncome,
        expenses: {
            management_fees: charges.managementFees,
            property_tax: charges.propertyTax * 12, // Send annual amount
            insurance: charges.insurance,
            maintenance: charges.maintenanceProvision,
            condo_fees: charges.condoFees,
            other: charges.otherCharges,
            total_monthly: charges.total
        },
        tax_regime: document.getElementById('taxRegime').value
    };

    try {
        const response = await fetch('/api/calculate-investment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();
        if (result.success) {
            updateInvestmentResults(result.data);
        } else {
            showError(result.error);
        }
    } catch (error) {
        showError('Une erreur est survenue lors du calcul');
    }
}

async function calculateLoan() {
    const loanAmount = parseFloat(document.getElementById('loanAmount').value);
    const interestRate = parseFloat(document.getElementById('interestRate').value) / 100;
    const loanTerm = parseInt(document.getElementById('loanTerm').value);
    const personalDeposit = parseFloat(document.getElementById('personalDeposit').value);
    
    const data = {
        loan_amount: loanAmount,
        interest_rate: interestRate,
        term_years: loanTerm,
        personal_deposit: personalDeposit
    };

    try {
        const response = await fetch('/api/calculate-loan', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();
        if (result.success) {
            updateLoanResults(result.data);
        } else {
            showError(result.error);
        }
    } catch (error) {
        showError('Une erreur est survenue lors du calcul du prêt');
    }
}

function updateInvestmentResults(data) {
    // Update financial summary
    const summaryHtml = `
        <div class="table-responsive">
            <table class="table table-sm">
                <tbody>
                    <tr>
                        <td>Prix d'achat</td>
                        <td>${data.purchase_costs.purchase_price.toLocaleString('fr-FR')} €</td>
                    </tr>
                    <tr>
                        <td>Frais de notaire</td>
                        <td>${data.purchase_costs.notary_fees.toLocaleString('fr-FR')} €</td>
                    </tr>
                    <tr>
                        <td>Coût total acquisition</td>
                        <td>${data.purchase_costs.total_cost.toLocaleString('fr-FR')} €</td>
                    </tr>
                    <tr class="table-info">
                        <td>Cash-flow mensuel</td>
                        <td>${data.monthly_cashflow.toLocaleString('fr-FR')} €</td>
                    </tr>
                    <tr>
                        <td>Cash-flow annuel</td>
                        <td>${data.annual_cashflow.toLocaleString('fr-FR')} €</td>
                    </tr>
                    <tr>
                        <td>Rentabilité (ROI)</td>
                        <td>${data.roi.toFixed(2)}%</td>
                    </tr>
                    <tr>
                        <td>Revenu imposable (${data.tax_impact.regime})</td>
                        <td>${data.tax_impact.taxable_income.toLocaleString('fr-FR')} €</td>
                    </tr>
                </tbody>
            </table>
        </div>
    `;
    
    document.getElementById('financialSummary').innerHTML = summaryHtml;

    // Create expense breakdown chart
    const expenseLabels = {
        management_fees: 'Frais de gestion',
        property_tax: 'Taxe foncière',
        insurance: 'Assurance PNO',
        maintenance: 'Provision travaux',
        condo_fees: 'Charges copropriété',
        other: 'Autres charges'
    };

    const expenses = data.expense_breakdown;
    const expenseValues = [];
    const expenseNames = [];

    for (const [key, value] of Object.entries(expenses)) {
        if (key !== 'total_monthly' && value > 0) {
            expenseValues.push(value);
            expenseNames.push(expenseLabels[key]);
        }
    }

    // Create cash flow chart
    const cashflowTrace = {
        type: 'waterfall',
        name: 'Cash Flow',
        orientation: 'v',
        measure: [
            'absolute', 'relative', 'relative', 'relative', 'relative', 'relative', 'total'
        ],
        x: ['Loyer', 'Frais de gestion', 'Taxe foncière', 'Assurance', 'Travaux', 'Charges copro', 'Cash Flow'],
        y: [
            data.rental_income,
            -expenses.management_fees,
            -expenses.property_tax,
            -expenses.insurance,
            -expenses.maintenance,
            -expenses.condo_fees,
            data.monthly_cashflow
        ],
        connector: {
            line: {
                color: 'rgb(63, 63, 63)'
            }
        },
        decreasing: {
            marker: {color: '#FF7F7F'}
        },
        increasing: {
            marker: {color: '#7FBF7F'}
        },
        totals: {
            marker: {color: '#4A90E2'}
        }
    };

    const cashflowLayout = {
        title: 'Décomposition du Cash Flow Mensuel',
        showlegend: false,
        xaxis: {
            type: 'category'
        },
        yaxis: {
            title: 'Euros (€)'
        }
    };

    Plotly.newPlot('cashflowChart', [cashflowTrace], cashflowLayout);

    // Create expense breakdown pie chart
    const expenseTrace = {
        type: 'pie',
        values: expenseValues,
        labels: expenseNames,
        textinfo: 'label+percent',
        textposition: 'outside',
        hole: 0.4
    };

    const expenseLayout = {
        title: 'Répartition des Charges',
        showlegend: true,
        legend: {
            orientation: 'h',
            y: -0.2
        }
    };

    Plotly.newPlot('amortizationChart', [expenseTrace], expenseLayout);
}

function updateLoanResults(data) {
    // Update loan summary
    const loanSummaryContent = document.getElementById('loanSummaryContent');
    loanSummaryContent.innerHTML = `
        <div class="table-responsive">
            <table class="table table-sm">
                <tbody>
                    <tr>
                        <td>Mensualité</td>
                        <td>${data.monthly_payment.toLocaleString('fr-FR')} €</td>
                    </tr>
                    <tr>
                        <td>Coût total du crédit</td>
                        <td>${data.total_interest.toLocaleString('fr-FR')} €</td>
                    </tr>
                    <tr>
                        <td>Coût total de l'opération</td>
                        <td>${data.total_cost.toLocaleString('fr-FR')} €</td>
                    </tr>
                    <tr>
                        <td>Remboursement annuel</td>
                        <td>${data.annual_payment.toLocaleString('fr-FR')} €</td>
                    </tr>
                </tbody>
            </table>
        </div>
    `;

    // Create amortization schedule chart
    const schedule = data.amortization_schedule;
    const years = Array.from({length: schedule.length}, (_, i) => i + 1);
    
    const principalTrace = {
        name: 'Capital remboursé',
        x: years,
        y: schedule.map(entry => entry.total_principal),
        type: 'scatter',
        fill: 'tonexty',
        stackgroup: 'one',
        line: {color: '#4CAF50'}
    };
    
    const interestTrace = {
        name: 'Intérêts payés',
        x: years,
        y: schedule.map(entry => entry.total_interest),
        type: 'scatter',
        fill: 'tonexty',
        stackgroup: 'one',
        line: {color: '#FF5252'}
    };
    
    const layout = {
        title: 'Tableau d\'Amortissement',
        xaxis: {
            title: 'Mois',
            dtick: 12
        },
        yaxis: {
            title: 'Euros (€)',
            tickformat: ',.0f'
        },
        showlegend: true,
        legend: {
            x: 0,
            y: 1.1,
            orientation: 'h'
        }
    };
    
    Plotly.newPlot('amortizationChart', [principalTrace, interestTrace], layout);
}

function createCashflowChart(data) {
    const trace = {
        x: ['Revenus', 'Charges', 'Cash-flow'],
        y: [data.monthly_cashflow + data.expenses, data.expenses, data.monthly_cashflow],
        type: 'bar',
        marker: {
            color: ['#28a745', '#dc3545', '#007bff']
        }
    };

    const layout = {
        title: 'Analyse du Cash-flow Mensuel',
        yaxis: {
            title: 'Euros (€)'
        }
    };

    Plotly.newPlot('cashflowChart', [trace], layout);
}

function createAmortizationChart(schedule) {
    const trace1 = {
        x: schedule.map(item => item.payment_num),
        y: schedule.map(item => item.principal),
        name: 'Principal',
        type: 'scatter'
    };

    const trace2 = {
        x: schedule.map(item => item.payment_num),
        y: schedule.map(item => item.interest),
        name: 'Intérêts',
        type: 'scatter'
    };

    const layout = {
        title: 'Tableau d\'Amortissement',
        xaxis: {
            title: 'Numéro de paiement'
        },
        yaxis: {
            title: 'Euros (€)'
        }
    };

    Plotly.newPlot('amortizationChart', [trace1, trace2], layout);
}

function showError(message) {
    // You could enhance this with a proper error display component
    alert(message);
}
