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

        // Calculate monthly loan payment and interest if applicable
        let monthlyLoanPayment = 0;
        let monthlyInterest = 0;
        if (loanAmount > 0 && interestRate > 0 && loanTerm > 0) {
            const monthlyRate = interestRate / 1200; // Convert annual rate to monthly
            const numPayments = loanTerm * 12;
            monthlyLoanPayment = (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
                                (Math.pow(1 + monthlyRate, numPayments) - 1);
            monthlyInterest = loanAmount * monthlyRate;
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
            tax_regime: taxRegime,
            tax_bracket: taxBracket,
            loan_interest: monthlyInterest
        };

        // Calculate loan metrics
        const loanData = {
            loan_amount: loanAmount,
            interest_rate: interestRate / 100,
            term_years: loanTerm,
            personal_deposit: personalDeposit,
            monthly_payment: monthlyLoanPayment
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

        if (!investmentResponse.ok || !investmentResult.success) {
            throw new Error(investmentResult.error || 'Investment calculation failed');
        }
        if (!loanResponse.ok || !loanResult.success) {
            throw new Error(loanResult.error || 'Loan calculation failed');
        }

        updateResults(investmentResult.data, loanResult.data);
        document.getElementById('results').style.display = 'block'

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
    
    // Create all charts
    createAmortizationChart(loanData.amortization_schedule);
    createEquityChart(loanData, investmentData);
    createTaxImpactChart(investmentData);
    createReturnMetricsChart(investmentData, loanData);
    createExpensesChart(investmentData.expense_breakdown);
    createCashflowChart(investmentData, loanData);
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
                    <tr class="table-primary">
                        <td><strong>Rentabilité Totale (ROI)</strong></td>
                        <td><strong>${data.roi?.toFixed(2) || 0}%</strong></td>
                    </tr>
                    <tr class="table-light">
                        <td colspan="2"><strong>Détail de la rentabilité</strong></td>
                    </tr>
                    <tr>
                        <td style="padding-left: 2rem;">ROI Cash-flow</td>
                        <td>${data.roi_breakdown?.cash_flow?.toFixed(2) || 0}%</td>
                    </tr>
                    <tr>
                        <td style="padding-left: 2rem;">ROI Remboursement capital</td>
                        <td>${data.roi_breakdown?.principal_paydown?.toFixed(2) || 0}%</td>
                    </tr>
                    <tr>
                        <td style="padding-left: 2rem;">ROI Plus-value</td>
                        <td>${data.roi_breakdown?.appreciation?.toFixed(2) || 0}%</td>
                    </tr>
                    <tr>
                        <td style="padding-left: 2rem;">ROI Avantages fiscaux</td>
                        <td>${data.roi_breakdown?.tax_benefits?.toFixed(2) || 0}%</td>
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
    createExpensesChart(data.expense_breakdown);
}

function createExpensesChart(monthlyCharges) {
    // Create expense breakdown pie chart
    const expenseValues = [];
    const expenseNames = [];
    
    for (const [key, value] of Object.entries(monthlyCharges)) {
        if (key !== 'total' && value > 0) {
            expenseValues.push(value);
            expenseNames.push(key);
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
        title: {
            text: 'Répartition des Charges',
            font: { size: 16 }
        },
        showlegend: true,
        legend: {
            orientation: 'h',
            y: -0.2
        },
        margin: { t: 40, b: 80, l: 40, r: 40 },
        height: 400,
        autosize: true
    };

    Plotly.newPlot('expensesChart', [expenseTrace], expenseLayout);
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
        mode: 'lines',
        line: { color: '#4CAF50' }
    };
    
    const interestTrace = {
        name: 'Intérêts payés',
        x: years,
        y: schedule.map(entry => entry?.total_interest || 0),
        type: 'scatter',
        mode: 'lines',
        line: { color: '#FF5252' }
    };
    
    const layout = {
        title: {
            text: 'Tableau d\'Amortissement',
            font: { size: 16 }
        },
        xaxis: {
            title: 'Mois',
            dtick: 12
        },
        yaxis: {
            title: 'Montant (€)',
            tickformat: ',.0f'
        },
        showlegend: true,
        legend: {
            x: 0,
            y: 1.1,
            orientation: 'h'
        },
        margin: { t: 60, b: 40, l: 60, r: 40 },
        height: 400,
        autosize: true
    };
    
    Plotly.newPlot('amortizationChart', [principalTrace, interestTrace], layout);
}

function createCashflowChart(investmentData, loanData) {
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
        text: filteredItems.map(item => Math.abs(item.value).toLocaleString('fr-FR') + ' €'),
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
        title: {
            text: 'Décomposition du Cash-flow Mensuel',
            font: { size: 16 }
        },
        xaxis: {
            type: 'category',
            tickangle: -45
        },
        yaxis: {
            title: 'Euros (€)',
            tickformat: ',.0f'
        },
        showlegend: false,
        margin: { t: 40, b: 80, l: 60, r: 40 },
        height: 400,
        autosize: true
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

function createEquityChart(loanData, investmentData) {
    const purchasePrice = investmentData.purchase_costs.purchase_price;
    const appreciationRate = parseFloat(document.getElementById('appreciationRate').value) / 100 || 0.02;
    const years = loanData.term_years;
    const loanAmount = loanData.loan_amount;
    const schedule = loanData.amortization_schedule;
    
    // Create yearly data points from 0 to loan term
    const xValues = Array.from({length: years + 1}, (_, i) => i);
    
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
        title: {
            text: 'Évolution des Fonds Propres',
            font: { size: 16 }
        },
        xaxis: {
            title: 'Années',
            tickformat: 'd',
            range: [0, years],
            dtick: Math.ceil(years / 10)  // Show about 10 ticks on x-axis
        },
        yaxis: {
            title: 'Montant (€)',
            tickformat: ',.0f',
            range: [0, Math.max(...propertyValues)]
        },
        showlegend: true,
        legend: {
            x: 0,
            y: 1
        },
        margin: { t: 40, b: 60, l: 80, r: 40 },
        height: 400,
        autosize: true
    };
    
    Plotly.newPlot('equityChart', data, layout);
}

function createTaxImpactChart(investmentData) {
    const taxData = investmentData.tax_impact;
    
    const data = [{
        values: [
            taxData.income_tax,
            taxData.social_charges,
            taxData.taxable_income - taxData.total_tax
        ],
        labels: [
            'Impôt sur le revenu',
            'Prélèvements sociaux',
            'Revenu net après impôts'
        ],
        type: 'pie',
        marker: {
            colors: ['#e74c3c', '#f39c12', '#2ecc71']
        }
    }];
    
    const layout = {
        title: {
            text: 'Répartition de l\'Impact Fiscal Annuel',
            font: { size: 16 }
        },
        showlegend: true,
        legend: {
            x: 0,
            y: 1
        }
    };
    
    Plotly.newPlot('taxChart', data, layout);
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
        title: {
            text: 'Évolution des Métriques de Rentabilité',
            font: { size: 16 }
        },
        xaxis: {
            title: 'Années',
            tickformat: 'd'
        },
        yaxis: {
            title: 'Pourcentage (%)',
            tickformat: ',.1f'
        },
        showlegend: true,
        legend: {
            x: 0,
            y: 1
        }
    };
    
    Plotly.newPlot('returnMetricsChart', data, layout);
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
