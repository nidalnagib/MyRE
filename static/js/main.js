// Format number function using French locale
function formatNumber(value) {
    return new Intl.NumberFormat('fr-FR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
        style: 'decimal'
    }).format(value || 0) + ' €';
}

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
        const taxRegime = document.getElementById('taxRegime').value;
        const taxBracket = parseFloat(document.getElementById('taxBracket').value);

        // Validate required fields
        if (!purchasePrice || !rentalIncome) {
            showError('Veuillez remplir tous les champs obligatoires');
            return;
        }

        // Calculate loan amount
        const totalPurchaseCost = purchasePrice * (1 + notaryFeesRate / 100);
        const loanAmount = totalPurchaseCost - personalDeposit;
        
        // Get loan data
        const interestRate = parseFloat(document.getElementById('interestRate').value) || 0;
        const loanTerm = parseInt(document.getElementById('loanTerm').value) || 25;

        // First get loan calculation
        const loanResponse = await fetch('/api/calculate-loan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                loan_amount: loanAmount,
                interest_rate: interestRate / 100,
                term_years: loanTerm,
                personal_deposit: personalDeposit
            })
        });
        const loanResult = await loanResponse.json();

        if (!loanResponse.ok || !loanResult.success) {
            throw new Error(loanResult.error || 'Loan calculation failed');
        }

        // Then include loan data in investment calculation
        const investmentResponse = await fetch('/api/calculate-investment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
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
                tax_regime: taxRegime,
                tax_bracket: taxBracket,
                loan_data: {
                    term_years: loanResult.data.term_years,
                    interest_rate: loanResult.data.interest_rate,
                    monthly_payment: loanResult.data.monthly_payment,
                    amortization_schedule: loanResult.data.amortization_schedule || []
                }
            })
        });
        const investmentResult = await investmentResponse.json();

        if (!investmentResponse.ok || !investmentResult.success) {
            throw new Error(investmentResult.error || 'Investment calculation failed');
        }

        console.log('Investment Result:', investmentResult);
        console.log('Loan Result:', loanResult);
        // Add debug logging for tax data
        console.log('Tax Data:', investmentResult.data.yearly_tax_data);

        updateResults(investmentResult.data, loanResult.data);
        document.getElementById('results').style.display = 'block';
        document.getElementById('results').scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
        console.error('Error:', error);
        showError('Une erreur est survenue lors des calculs: ' + error.message);
    }
}

function updateResults(investmentData, loanData) {
    console.log('Updating results with:', { investmentData, loanData });

    // Update loan results with loan data
    updateLoanResults(loanData);
    
    // Update investment results
    updateInvestmentResults({ investmentData, loanData });

    // Create all charts
    createAmortizationChart(loanData.amortization_schedule);
    createEquityChart(loanData, investmentData);
    createTaxImpactChart(investmentData);
    createReturnMetricsChart(investmentData, loanData);
    createExpensesChart(investmentData.expense_breakdown);
    createCashflowChart(investmentData, loanData);
}

function updateLoanResults(data) {
    // Update loan summary
    const loanSummaryContent = document.getElementById('loanSummaryContent');
    
    loanSummaryContent.innerHTML = `
        <div class="loan-details mb-3">
            <p class="mb-2">Mensualité: ${formatNumber(data.monthly_payment)}</p>
            <p class="mb-2">Remboursement annuel: ${formatNumber(data.monthly_payment * 12)}</p>
            <p class="mb-2"><strong>Total des intérêts: ${formatNumber(data.total_interest)}</strong></p>
            <p class="mb-2"><strong>Coût total de l'opération: ${formatNumber(data.total_cost)}</strong></p>
        </div>
    `;

    // Show the loan summary div
    document.getElementById('loanSummary').style.display = 'block';

    // Create amortization schedule chart if we have schedule data
    if (data.amortization_schedule && data.amortization_schedule.length > 0) {
        createAmortizationChart(data.amortization_schedule);
    }
}

function updateInvestmentResults({ investmentData, loanData }) {
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
                    <tr>
                        <td>Impôts mensuels</td>
                        <td>-${(investmentData.tax_impact?.total_tax / 12)?.toLocaleString('fr-FR') || 0} €</td>
                    </tr>
                    <tr class="table-success">
                        <td><strong>Cash Flow Net</strong></td>
                        <td><strong>${(investmentData.after_tax_monthly_cashflow - (loanData.monthly_payment || 0))?.toLocaleString('fr-FR') || 0} €</strong></td>
                    </tr>
                    <tr class="table-info">
                        <td colspan="2"><strong>Impact Fiscal Annuel</strong></td>
                    </tr>
                    <tr>
                        <td>Revenu imposable</td>
                        <td>${investmentData.tax_impact?.taxable_income?.toLocaleString('fr-FR') || 0} €</td>
                    </tr>
                    <tr>
                        <td>Impôt sur le revenu</td>
                        <td>${investmentData.tax_impact?.income_tax?.toLocaleString('fr-FR') || 0} €</td>
                    </tr>
                    <tr>
                        <td>Prélèvements sociaux</td>
                        <td>${investmentData.tax_impact?.social_charges?.toLocaleString('fr-FR') || 0} €</td>
                    </tr>
                    <tr>
                        <td>Total impôts</td>
                        <td>${investmentData.tax_impact?.total_tax?.toLocaleString('fr-FR') || 0} €</td>
                    </tr>
                    <tr>
                        <td>Taux effectif d'imposition</td>
                        <td>${investmentData.tax_impact?.effective_tax_rate?.toFixed(2) || 0}%</td>
                    </tr>
                    <tr class="table-info">
                        <td colspan="2"><strong>Rentabilité</strong></td>
                    </tr>
                    <tr>
                        <td>ROI Brut</td>
                        <td>${investmentData.roi?.toFixed(2) || 0}%</td>
                    </tr>
                    <tr>
                        <td>ROI Net</td>
                        <td>${investmentData.after_tax_roi?.toFixed(2) || 0}%</td>
                    </tr>
                    <tr class="table-light">
                        <td colspan="2"><strong>Détail de la rentabilité</strong></td>
                    </tr>
                    <tr>
                        <td style="padding-left: 2rem;">ROI Cash-flow</td>
                        <td>${investmentData.roi_breakdown?.cash_flow?.toFixed(2) || 0}%</td>
                    </tr>
                    <tr>
                        <td style="padding-left: 2rem;">ROI Remboursement capital</td>
                        <td>${investmentData.roi_breakdown?.principal_paydown?.toFixed(2) || 0}%</td>
                    </tr>
                    <tr>
                        <td style="padding-left: 2rem;">ROI Plus-value</td>
                        <td>${investmentData.roi_breakdown?.appreciation?.toFixed(2) || 0}%</td>
                    </tr>
                    <tr>
                        <td style="padding-left: 2rem;">ROI Avantages fiscaux</td>
                        <td>${investmentData.roi_breakdown?.tax_benefits?.toFixed(2) || 0}%</td>
                    </tr>
                </tbody>
            </table>
        </div>
    `;
    
    document.getElementById('financialSummary').innerHTML = summaryHtml;

    // Create expense breakdown chart
    createExpensesChart(investmentData.expense_breakdown);
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
    const depositPercentage = totalCost > 0 ? (personalDeposit / totalCost) * 100 : 0;
    
    document.getElementById('loanAmount').value = Math.round(loanAmount);
    
    // Update loan details
    const loanSummary = document.getElementById('loanSummary');
    const loanDetailsContent = document.getElementById('loanDetailsContent');
    
    if (totalCost > 0) {
        loanDetailsContent.innerHTML = `
            <div class="loan-details mb-3">
                <p class="mb-2">Coût total: ${formatNumber(totalCost)}</p>
                <p class="mb-2">Apport: ${formatNumber(personalDeposit)} (${depositPercentage.toFixed(1)}%)</p>
                <p class="mb-2">Montant du prêt: ${formatNumber(loanAmount)}</p>
            </div>
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


function createExpensesChart(monthlyCharges) {
    // Create expense breakdown pie chart
    const expenseValues = [];
    const expenseNames = [];
    
    const expenseLabels = {
        management_fees: 'Frais de gestion',
        property_tax: 'Taxe foncière',
        insurance: 'Assurance',
        maintenance: 'Entretien',
        condo_fees: 'Charges copropriété',
        other: 'Autres charges'
    };
    
    for (const [key, value] of Object.entries(monthlyCharges)) {
        if (key !== 'total' && key !== 'total_monthly' && value > 0) {  
            expenseValues.push(value);
            expenseNames.push(expenseLabels[key] || key);
        }
    }

    const expenseTrace = {
        type: 'pie',
        values: expenseValues,
        labels: expenseNames,
        textinfo: 'label+percent',
        textposition: 'outside',
        hole: 0.4
    };

    const expenseLayout = {
        showlegend: true,
        legend: {
            orientation: 'h',
            y: -0.2
        },
        margin: { t: 20, b: 80, l: 40, r: 40 },
        height: 400,
        width: null,
        autosize: true,
        responsive: true
    };

    const config = {
        responsive: true,
        displayModeBar: false,
        displaylogo: false
    };

    Plotly.newPlot('expensesChart', [expenseTrace], expenseLayout, config);
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

function createCashflowChart(investmentData, loanData) {
    // Format number function using French locale
    const formatNumber = (value) => {
        return new Intl.NumberFormat('fr-FR', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
            style: 'decimal'
        }).format(Math.abs(value)) + ' €';
    };

    // Prepare data for waterfall chart
    const items = [
        { name: 'Loyer', value: investmentData.rental_income, color: '#28a745' },  // Green for income
        { name: 'Frais de gestion', value: -investmentData.expense_breakdown.management_fees, color: '#dc3545' },
        { name: 'Taxe foncière', value: -investmentData.expense_breakdown.property_tax, color: '#dc3545' },
        { name: 'Assurance', value: -investmentData.expense_breakdown.insurance, color: '#dc3545' },
        { name: 'Provision travaux', value: -investmentData.expense_breakdown.maintenance, color: '#dc3545' },
        { name: 'Charges copro', value: -investmentData.expense_breakdown.condo_fees, color: '#dc3545' },
        { name: 'Autres charges', value: -investmentData.expense_breakdown.other, color: '#dc3545' },
        { name: 'Mensualité prêt', value: -loanData.monthly_payment, color: '#ffc107' },  // Yellow for loan
        { name: 'Cash-flow net', value: investmentData.after_tax_monthly_cashflow, color: '#007bff' }  // Blue for result
    ];

    // Filter out items with zero value
    const filteredItems = items.filter(item => item.value !== 0);

    const trace = {
        type: 'waterfall',
        name: "Cash Flow",
        orientation: "v",
        measure: filteredItems.map((_, i) => i === filteredItems.length - 1 ? "total" : "relative"),
        x: filteredItems.map(item => item.name),
        textposition: "outside",
        text: filteredItems.map(item => formatNumber(item.value)),
        y: filteredItems.map(item => item.value),
        connector: {
            line: {
                color: "rgb(63, 63, 63)"
            }
        },
        decreasing: { marker: { color: "#dc3545" } },  // Red for expenses
        increasing: { marker: { color: "#28a745" } },  // Green for income
        totals: { marker: { color: "#007bff" } }      // Blue for total
    };

    const layout = {
        xaxis: {
            type: 'category',
            tickangle: -45
        },
        yaxis: {
            title: 'Euros (€)',
            tickformat: ' ,.0f',  // Space before comma for French thousands separator
            automargin: true,
            hoverformat: ' ,.0f €'  // Consistent hover format
        },
        showlegend: false,
        margin: { t: 20, b: 80, l: 40, r: 40 },
        height: 400,
        width: null,
        autosize: true,
        responsive: true
    };

    const config = {
        responsive: true,
        displayModeBar: false,
        displaylogo: false,
        modeBarButtons: [['zoom2d', 'pan2d', 'resetScale2d', 'toImage']]
    };

    Plotly.newPlot('cashflowChart', [trace], layout, config);
}

function createTaxImpactChart(investmentData) {
    // Validate input data
    if (!investmentData || !investmentData.yearly_tax_data || !Array.isArray(investmentData.yearly_tax_data)) {
        console.error('Invalid investment data for tax impact chart:', investmentData);
        return;
    }

    const yearlyData = investmentData.yearly_tax_data;
    const regime = investmentData.tax_regime;  // Get tax regime from response
    console.log('Creating tax impact chart with regime:', regime);  // Debug log
    
    // Prepare data arrays
    const years = yearlyData.map(d => d.year);
    const annualRentalIncome = yearlyData.map(d => investmentData.rental_income * 12); // Convert monthly to annual
    
    const data = [];
    
    // Add rental income bar (positive)
    data.push({
        x: years,
        y: annualRentalIncome,
        name: 'Revenu Locatif',
        type: 'bar',
        marker: { color: '#2ecc71' }  // Green
    });
    
    if (regime === 'reel') {
        // Add deduction bars for Régime Réel (negative)
        const expensesDeduction = yearlyData.map(d => -d.expenses_deduction);
        const interestDeduction = yearlyData.map(d => -d.interest_deduction);
        const depreciationDeduction = yearlyData.map(d => -d.depreciation_deduction);

        // Only add bars if they have non-zero values
        if (expensesDeduction.some(v => v !== 0)) {
            data.push({
                x: years,
                y: expensesDeduction,
                name: 'Charges',
                type: 'bar',
                marker: { color: '#e74c3c' }  // Red
            });
        }

        if (interestDeduction.some(v => v !== 0)) {
            data.push({
                x: years,
                y: interestDeduction,
                name: 'Intérêts',
                type: 'bar',
                marker: { color: '#3498db' }  // Blue
            });
        }

        if (depreciationDeduction.some(v => v !== 0)) {
            data.push({
                x: years,
                y: depreciationDeduction,
                name: 'Amortissements',
                type: 'bar',
                marker: { color: '#f1c40f' }  // Yellow
            });
        }
    } else {
        // Add single flat deduction bar for Micro-BIC (negative)
        const flatDeduction = annualRentalIncome.map(income => -income * 0.5);  // 50% flat deduction
        data.push({
            x: years,
            y: flatDeduction,
            name: 'Abattement 50%',
            type: 'bar',
            marker: { color: '#e74c3c' }  // Red
        });
    }
    
    // Add taxable income line
    data.push({
        x: years,
        y: yearlyData.map(d => d.taxable_income),
        name: 'Revenu Net Imposable',
        type: 'scatter',
        mode: 'lines+markers',
        line: { color: '#8e44ad', width: 3 },  // Purple
        marker: { size: 8 }
    });
    
    // Add total tax line
    data.push({
        x: years,
        y: yearlyData.map(d => d.total_tax),
        name: 'Impôts Totaux',
        type: 'scatter',
        mode: 'lines+markers',
        line: { color: '#e67e22', width: 3 },  // Orange
        marker: { size: 8 }
    });
    
    // Add effective tax rate line on secondary axis
    data.push({
        x: years,
        y: yearlyData.map(d => d.effective_tax_rate),
        name: 'Taux Effectif (%)',
        type: 'scatter',
        yaxis: 'y2',
        mode: 'lines+markers',
        line: { color: '#16a085', width: 3, dash: 'dot' },  // Turquoise
        marker: { size: 8 }
    });
    
    const layout = {
        barmode: 'relative',
        showlegend: true,
        legend: {
            orientation: 'h',
            y: -0.2
        },
        margin: { t: 20, b: 80, l: 40, r: 40 },
        height: 400,
        width: null,
        autosize: true,
        responsive: true,
        yaxis: {
            title: 'Montant (€)',
            tickformat: ',.0f',
            side: 'left'
        },
        yaxis2: {
            title: 'Taux Effectif (%)',
            tickformat: ',.1f',
            overlaying: 'y',
            side: 'right',
            rangemode: 'tozero'
        }
    };
    
    const config = {
        responsive: true,
        displayModeBar: false,
        displaylogo: false,
        modeBarButtons: [['zoom2d', 'pan2d', 'resetScale2d', 'toImage']]
    };
    
    try {
        Plotly.newPlot('taxChart', data, layout, config);
    } catch (error) {
        console.error('Error creating tax impact chart:', error);
    }
}

function createReturnMetricsChart(investmentData, loanData) {
    const years = loanData.term_years;
    const xValues = Array.from({length: years}, (_, i) => i + 1);
    
    // Calculate metrics over time
    const cashOnCash = xValues.map(() => 
        (investmentData.after_tax_annual_cashflow / loanData.personal_deposit) * 100
    );
    
    const totalROI = xValues.map(year => 
        investmentData.after_tax_roi + (2 * year) // Adding 2% appreciation per year
    );
    
    const data = [
        {
            x: xValues,
            y: cashOnCash,
            name: 'Cash-on-Cash Return',
            type: 'scatter',
            mode: 'lines',
            line: { color: '#3498db' }
        },
        {
            x: xValues,
            y: totalROI,
            name: 'ROI Total (avec appréciation)',
            type: 'scatter',
            mode: 'lines',
            line: { color: '#2ecc71' }
        }
    ];
    
    const layout = {
        showlegend: true,
        legend: {
            orientation: 'h',
            y: -0.2
        },
        margin: { t: 20, b: 80, l: 40, r: 40 },
        height: 400,
        width: null,
        autosize: true,
        responsive: true,
        xaxis: {
            title: 'Années',
            tickformat: 'd',
            automargin: true
        },
        yaxis: {
            title: 'Pourcentage (%)',
            tickformat: ',.1f',
            automargin: true
        }
    };

    const config = {
        responsive: true,
        displayModeBar: false,
        displaylogo: false
    };

    Plotly.newPlot('returnMetricsChart', data, layout, config);
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
        showlegend: true,
        legend: {
            orientation: 'h',
            y: -0.2
        },
        margin: { t: 20, b: 80, l: 40, r: 40 },
        height: 400,
        width: null,
        autosize: true,
        responsive: true,
        xaxis: {
            title: 'Numéro de paiement',
            automargin: true
        },
        yaxis: {
            title: 'Euros (€)',
            automargin: true,
            tickformat: ',.0f'
        }
    };

    const config = {
        responsive: true,
        displayModeBar: false,
        displaylogo: false
    };

    Plotly.newPlot('amortizationChart', [trace1, trace2], layout, config);
}

function createEquityChart(loanData, investmentData) {
    const purchasePrice = investmentData.purchase_costs.purchase_price;
    const appreciationRate = parseFloat(document.getElementById('appreciationRate').value) / 100 || 0.02;
    const years = loanData.term_years;
    const loanAmount = loanData.loan_amount;
    const schedule = loanData.amortization_schedule;
    
    // Create yearly data points from 0 to loan term
    const xValues = Array.from({length: years}, (_, i) => i);
    
    // Calculate property value with appreciation for each year
    const propertyValues = xValues.map(year => 
        purchasePrice * Math.pow(1 + appreciationRate, year)
    );
    
    // Get remaining loan balance at each year
    // Start with initial loan amount, then add yearly balances
    const yearlyData = schedule.filter(entry => entry.payment_num % 12 === 0);
    const loanBalance = [loanAmount, ...yearlyData.slice(0, years).map(entry => entry.remaining_balance)];
    
    // Calculate equity (property value - loan balance)
    const equity = propertyValues.map((value, index) => 
        value - (loanBalance[index] || 0)  // Use 0 if balance undefined (loan fully paid)
    );
    
    const data = [
        {
            x: xValues,
            y: propertyValues,
            name: 'Valeur du bien',
            type: 'scatter',
            mode: 'lines',
            line: { color: '#2ecc71' }
        },
        {
            x: xValues,
            y: loanBalance,
            name: 'Solde du prêt',
            type: 'scatter',
            mode: 'lines',
            line: { color: '#e74c3c' }
        },
        {
            x: xValues,
            y: equity,
            name: 'Fonds propres',
            type: 'scatter',
            mode: 'lines',
            line: { color: '#3498db' }
        }
    ];
    
    const layout = {
        showlegend: true,
        legend: {
            orientation: 'h',
            y: -0.2
        },
        margin: { t: 20, b: 80, l: 40, r: 40 },
        height: 400,
        width: null,
        autosize: true,
        responsive: true,
        xaxis: {
            title: 'Années',
            tickformat: 'd',
            range: [0, years],
            dtick: Math.ceil(years / 10),
            automargin: true
        },
        yaxis: {
            title: 'Montant (€)',
            tickformat: ',.0f',
            range: [0, Math.max(...propertyValues)],
            automargin: true
        }
    };

    const config = {
        responsive: true,
        displayModeBar: false,
        displaylogo: false
    };

    Plotly.newPlot('equityChart', data, layout, config);
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
