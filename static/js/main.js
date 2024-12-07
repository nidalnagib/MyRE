document.addEventListener('DOMContentLoaded', function() {
    // Calculate button handler
    document.getElementById('calculateButton').addEventListener('click', calculateAll);

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

async function calculateAll() {
    try {
        // Get investment data
        const purchasePrice = parseFloat(document.getElementById('purchasePrice').value);
        const notaryFeesRate = parseFloat(document.getElementById('notaryFeesRate').value) || 8.0;
        const rentalIncome = parseFloat(document.getElementById('rentalIncome').value);
        const charges = calculateMonthlyCharges();
        const personalDeposit = parseFloat(document.getElementById('personalDeposit').value) || 0;

        // Calculate loan amount
        const totalPurchaseCost = purchasePrice * (1 + notaryFeesRate / 100);
        const loanAmount = totalPurchaseCost - personalDeposit;
        
        // Get loan data
        const interestRate = parseFloat(document.getElementById('interestRate').value) || 0;
        const loanTerm = parseInt(document.getElementById('loanTerm').value) || 25;

        // Validate required fields
        if (!purchasePrice || !rentalIncome) {
            showError('Veuillez remplir tous les champs obligatoires');
            return;
        }

        // Calculate investment metrics
        const investmentData = {
            purchase_price: purchasePrice,
            notary_fees_rate: notaryFeesRate / 100,
            rental_income: rentalIncome,
            expenses: {
                management_fees: charges.managementFees,
                property_tax: charges.propertyTax,
                insurance: charges.insurance,
                maintenance: charges.maintenanceProvision,
                condo_fees: charges.condoFees,
                other: charges.otherCharges,
                total_monthly: charges.total
            },
            tax_regime: document.getElementById('taxRegime').value
        };

        // Calculate loan metrics
        const loanData = {
            loan_amount: loanAmount,
            interest_rate: interestRate / 100,
            term_years: loanTerm,
            personal_deposit: personalDeposit
        };

        console.log('Investment Data sent:', investmentData);
        console.log('Loan Data sent:', loanData);

        // Make API calls in parallel
        const [investmentResponse, loanResponse] = await Promise.all([
            fetch('/api/calculate-investment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(investmentData)
            }),
            fetch('/api/calculate-loan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(loanData)
            })
        ]);

        const investmentResult = await investmentResponse.json();
        const loanResult = await loanResponse.json();

        console.log('Investment Result:', investmentResult);
        console.log('Loan Result:', loanResult);

        if (!investmentResponse.ok) throw new Error(investmentResult.error || 'Investment calculation failed');
        if (!loanResponse.ok) throw new Error(loanResult.error || 'Loan calculation failed');

        if (investmentResult.success && loanResult.success) {
            updateResults(investmentResult.data, loanResult.data);
            document.getElementById('results').style.display = 'block';
        } else {
            throw new Error('Calculation failed');
        }
    } catch (error) {
        console.error('Error:', error);
        showError('Une erreur est survenue lors des calculs: ' + error.message);
    }
}

function updateResults(investmentData, loanData) {
    console.log('Updating results with:', { investmentData, loanData });

    // Update financial summary
    const summaryHtml = `
        <div class="table-responsive">
            <table class="table table-sm">
                <tbody>
                    <tr class="table-info">
                        <td colspan="2"><strong>Acquisition</strong></td>
                    </tr>
                    <tr>
                        <td>Prix d'achat</td>
                        <td>${investmentData.purchase_costs?.purchase_price?.toLocaleString('fr-FR') || 0} €</td>
                    </tr>
                    <tr>
                        <td>Frais de notaire</td>
                        <td>${investmentData.purchase_costs?.notary_fees?.toLocaleString('fr-FR') || 0} €</td>
                    </tr>
                    <tr>
                        <td>Apport personnel</td>
                        <td>${loanData.personal_deposit?.toLocaleString('fr-FR') || 0} €</td>
                    </tr>
                    <tr>
                        <td>Montant du prêt</td>
                        <td>${loanData.loan_amount?.toLocaleString('fr-FR') || 0} €</td>
                    </tr>
                    <tr class="table-info">
                        <td colspan="2"><strong>Cash Flow Mensuel</strong></td>
                    </tr>
                    <tr>
                        <td>Loyer</td>
                        <td>${investmentData.rental_income?.toLocaleString('fr-FR') || 0} €</td>
                    </tr>
                    <tr>
                        <td>Charges</td>
                        <td>-${investmentData.expense_breakdown?.total_monthly?.toLocaleString('fr-FR') || 0} €</td>
                    </tr>
                    <tr>
                        <td>Mensualité du prêt</td>
                        <td>-${loanData.monthly_payment?.toLocaleString('fr-FR') || 0} €</td>
                    </tr>
                    <tr class="table-success">
                        <td><strong>Cash Flow Net</strong></td>
                        <td><strong>${(investmentData.monthly_cashflow - (loanData.monthly_payment || 0))?.toLocaleString('fr-FR') || 0} €</strong></td>
                    </tr>
                    <tr class="table-info">
                        <td colspan="2"><strong>Rentabilité</strong></td>
                    </tr>
                    <tr>
                        <td>ROI Brut</td>
                        <td>${investmentData.roi?.toFixed(2) || 0}%</td>
                    </tr>
                    <tr>
                        <td>ROI Net (après prêt)</td>
                        <td>${((investmentData.monthly_cashflow - (loanData.monthly_payment || 0)) * 12 / investmentData.purchase_costs?.total_cost * 100)?.toFixed(2) || 0}%</td>
                    </tr>
                </tbody>
            </table>
        </div>
    `;
    
    document.getElementById('financialSummary').innerHTML = summaryHtml;

    // Create expense breakdown pie chart
    const expenseLabels = {
        management_fees: 'Frais de gestion',
        property_tax: 'Taxe foncière',
        insurance: 'Assurance PNO',
        maintenance: 'Provision travaux',
        condo_fees: 'Charges copropriété',
        other: 'Autres charges'
    };

    const expenses = investmentData.expense_breakdown || {};
    const expenseValues = [];
    const expenseNames = [];

    for (const [key, value] of Object.entries(expenses)) {
        if (key !== 'total_monthly' && value > 0) {
            expenseValues.push(value);
            expenseNames.push(expenseLabels[key] || key);
        }
    }

    // Create cash flow waterfall chart
    const cashflowTrace = {
        type: 'waterfall',
        name: 'Cash Flow',
        orientation: 'v',
        measure: [
            'absolute', 'relative', 'relative', 'relative', 'relative', 'relative', 'relative', 'total'
        ],
        x: ['Loyer', 'Frais de gestion', 'Taxe foncière', 'Assurance', 'Travaux', 'Charges copro', 'Crédit', 'Cash Flow Net'],
        y: [
            investmentData.rental_income || 0,
            -(expenses.management_fees || 0),
            -(expenses.property_tax || 0),
            -(expenses.insurance || 0),
            -(expenses.maintenance || 0),
            -(expenses.condo_fees || 0),
            -(loanData.monthly_payment || 0),
            (investmentData.monthly_cashflow - (loanData.monthly_payment || 0)) || 0
        ],
        connector: {
            line: {color: 'rgb(63, 63, 63)'}
        },
        decreasing: {marker: {color: '#FF7F7F'}},
        increasing: {marker: {color: '#7FBF7F'}},
        totals: {marker: {color: '#4A90E2'}}
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

    // Create amortization chart
    const schedule = loanData.amortization_schedule || [];
    const months = Array.from({length: schedule.length}, (_, i) => i + 1);
    
    const principalTrace = {
        name: 'Capital remboursé',
        x: months,
        y: schedule.map(entry => entry?.total_principal || 0),
        type: 'scatter',
        fill: 'tonexty',
        stackgroup: 'one',
        line: {color: '#4CAF50'}
    };
    
    const interestTrace = {
        name: 'Intérêts payés',
        x: months,
        y: schedule.map(entry => entry?.total_interest || 0),
        type: 'scatter',
        fill: 'tonexty',
        stackgroup: 'one',
        line: {color: '#FF5252'}
    };
    
    const amortizationLayout = {
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

    // Plot all charts
    Plotly.newPlot('cashflowChart', [cashflowTrace], cashflowLayout);
    
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

    Plotly.newPlot('chargesChart', [expenseTrace], expenseLayout);
    Plotly.newPlot('amortizationChart', [principalTrace, interestTrace], amortizationLayout);
}

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
    const managementFeesRate = parseFloat(document.getElementById('managementFees').value) || 0;
    const propertyTax = parseFloat(document.getElementById('propertyTax').value) || 0;
    const insurance = parseFloat(document.getElementById('insurance').value) || 0;
    const maintenanceRate = parseFloat(document.getElementById('maintenanceProvision').value) || 0;
    const condoFees = parseFloat(document.getElementById('condoFees').value) || 0;
    const otherCharges = parseFloat(document.getElementById('otherCharges').value) || 0;
    const rentalIncome = parseFloat(document.getElementById('rentalIncome').value) || 0;

    const managementFees = (managementFeesRate / 100) * rentalIncome;
    const maintenanceProvision = (maintenanceRate / 100) * rentalIncome;

    const total = managementFees + (propertyTax / 12) + insurance + maintenanceProvision + condoFees + otherCharges;

    return {
        managementFees,
        propertyTax,
        insurance,
        maintenanceProvision,
        condoFees,
        otherCharges,
        total
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
            property_tax: charges.propertyTax,
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
                        <td>${data.purchase_costs.purchase_price?.toLocaleString('fr-FR') || 0} €</td>
                    </tr>
                    <tr>
                        <td>Frais de notaire</td>
                        <td>${data.purchase_costs.notary_fees?.toLocaleString('fr-FR') || 0} €</td>
                    </tr>
                    <tr>
                        <td>Coût total acquisition</td>
                        <td>${data.purchase_costs.total_cost?.toLocaleString('fr-FR') || 0} €</td>
                    </tr>
                    <tr class="table-info">
                        <td>Cash-flow mensuel</td>
                        <td>${data.monthly_cashflow?.toLocaleString('fr-FR') || 0} €</td>
                    </tr>
                    <tr>
                        <td>Cash-flow annuel</td>
                        <td>${data.annual_cashflow?.toLocaleString('fr-FR') || 0} €</td>
                    </tr>
                    <tr>
                        <td>Rentabilité (ROI)</td>
                        <td>${data.roi?.toFixed(2) || 0}%</td>
                    </tr>
                    <tr>
                        <td>Revenu imposable (${data.tax_impact.regime})</td>
                        <td>${data.tax_impact.taxable_income?.toLocaleString('fr-FR') || 0} €</td>
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

    const expenses = data.expense_breakdown || {};
    const expenseValues = [];
    const expenseNames = [];

    for (const [key, value] of Object.entries(expenses)) {
        if (key !== 'total_monthly' && value > 0) {
            expenseValues.push(value);
            expenseNames.push(expenseLabels[key] || key);
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
            data.rental_income || 0,
            -(expenses.management_fees || 0),
            -(expenses.property_tax || 0),
            -(expenses.insurance || 0),
            -(expenses.maintenance || 0),
            -(expenses.condo_fees || 0),
            data.monthly_cashflow || 0
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
                        <td>${data.monthly_payment?.toLocaleString('fr-FR') || 0} €</td>
                    </tr>
                    <tr>
                        <td>Coût total du crédit</td>
                        <td>${data.total_interest?.toLocaleString('fr-FR') || 0} €</td>
                    </tr>
                    <tr>
                        <td>Coût total de l'opération</td>
                        <td>${data.total_cost?.toLocaleString('fr-FR') || 0} €</td>
                    </tr>
                    <tr>
                        <td>Remboursement annuel</td>
                        <td>${data.annual_payment?.toLocaleString('fr-FR') || 0} €</td>
                    </tr>
                </tbody>
            </table>
        </div>
    `;

    // Create amortization schedule chart
    const schedule = data.amortization_schedule || [];
    const years = Array.from({length: schedule.length}, (_, i) => i + 1);
    
    const principalTrace = {
        name: 'Capital remboursé',
        x: years,
        y: schedule.map(entry => entry?.total_principal || 0),
        type: 'scatter',
        fill: 'tonexty',
        stackgroup: 'one',
        line: {color: '#4CAF50'}
    };
    
    const interestTrace = {
        name: 'Intérêts payés',
        x: years,
        y: schedule.map(entry => entry?.total_interest || 0),
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
    const errorDiv = document.getElementById('errorMessage') || createErrorDiv();
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 5000);
}

function createErrorDiv() {
    const errorDiv = document.createElement('div');
    errorDiv.id = 'errorMessage';
    errorDiv.className = 'alert alert-danger';
    errorDiv.style.position = 'fixed';
    errorDiv.style.top = '20px';
    errorDiv.style.right = '20px';
    errorDiv.style.zIndex = '1000';
    document.body.appendChild(errorDiv);
    return errorDiv;
}
