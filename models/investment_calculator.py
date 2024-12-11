class InvestmentCalculator:
    def __init__(self):
        self.tax_regimes = {
            'micro_bic': {'rate': 0.5},  # 50% abattement
            'reel': {'rate': 1.0}  # Pas d'abattement, charges réelles
        }
        self.social_charges_rate = 0.172  # 17.2% prélèvements sociaux
        
    def calculate_purchase_costs(self, purchase_price, notary_fees_rate=0.08):
        """Calculate total purchase costs including notary fees"""
        notary_fees = purchase_price * notary_fees_rate
        return {
            'purchase_price': purchase_price,
            'notary_fees': notary_fees,
            'total_cost': purchase_price + notary_fees
        }
    
    def calculate_monthly_cashflow(self, rental_income, expenses):
        """Calculate monthly cash flow with detailed expenses"""
        total_expenses = expenses.get('total_monthly', 0)
        return rental_income - total_expenses
    
    def calculate_roi(self, annual_cashflow, total_investment):
        """Calculate Return on Investment"""
        if total_investment == 0:
            return 0
        return (annual_cashflow / total_investment) * 100
    
    def calculate_depreciation(self, purchase_price, notary_fees):
        """Calculate annual depreciation amounts"""
        building_value = purchase_price * 0.8  # Assume 80% of price is building
        land_value = purchase_price * 0.2      # Assume 20% of price is land
        
        return {
            'building': building_value * 0.02,  # 2% annual depreciation for building
            'notary_fees': notary_fees * 0.02,  # 2% annual depreciation for notary fees
            'furniture': purchase_price * 0.1 * 0.2,  # 20% depreciation on 10% furniture value
            'total': (building_value * 0.02) + (notary_fees * 0.02) + (purchase_price * 0.1 * 0.2)
        }
    
    def calculate_tax_impact(self, rental_income, expenses, regime='micro_bic', tax_bracket=30, loan_interest=0):
        """Calculate taxable income and tax amount based on regime and tax bracket"""
        annual_rental_income = rental_income * 12
        tax_bracket_rate = tax_bracket / 100
        
        if regime == 'micro_bic':
            # Micro-BIC: 50% flat-rate deduction
            taxable_income = annual_rental_income * (1 - self.tax_regimes['micro_bic']['rate'])
            
        else:  # régime réel
            annual_expenses = {
                'management_fees': expenses.get('management_fees', 0) * 12,
                'property_tax': expenses.get('property_tax', 0),  # Already annual
                'insurance': expenses.get('insurance', 0) * 12,
                'maintenance': expenses.get('maintenance', 0) * 12,
                'condo_fees': expenses.get('condo_fees', 0) * 12,
                'other': expenses.get('other', 0) * 12,
                'loan_interest': loan_interest * 12
            }
            
            # Calculate depreciation
            depreciation = self.calculate_depreciation(
                expenses.get('purchase_price', 0),
                expenses.get('notary_fees', 0)
            )
            
            total_annual_expenses = sum(annual_expenses.values()) + depreciation['total']
            taxable_income = max(0, annual_rental_income - total_annual_expenses)
        
        # Calculate taxes
        income_tax = taxable_income * tax_bracket_rate
        social_charges = taxable_income * self.social_charges_rate
        total_tax = income_tax + social_charges
        
        return {
            'taxable_income': taxable_income,
            'income_tax': income_tax,
            'social_charges': social_charges,
            'total_tax': total_tax,
            'tax_rate': tax_bracket,
            'regime': regime,
            'effective_tax_rate': (total_tax / annual_rental_income * 100) if annual_rental_income > 0 else 0
        }
    
    def calculate_yearly_tax_impact(self, rental_income, expenses, loan_data, regime='micro_bic', tax_bracket=30):
        """Calculate tax impact for each year of the investment, considering decreasing interest payments"""
        tax_bracket_rate = tax_bracket / 100
        yearly_tax_data = []
        
        # Calculate constant yearly depreciation
        depreciation = self.calculate_depreciation(
            expenses.get('purchase_price', 0),
            expenses.get('notary_fees', 0)
        )
        yearly_depreciation = depreciation['total']
        
        # Get yearly expenses (excluding loan interest)
        yearly_expenses = {
            'management_fees': expenses.get('management_fees', 0) * 12,
            'property_tax': expenses.get('property_tax', 0),  # Already annual
            'insurance': expenses.get('insurance', 0) * 12,
            'maintenance': expenses.get('maintenance', 0) * 12,
            'condo_fees': expenses.get('condo_fees', 0) * 12,
            'other': expenses.get('other', 0) * 12
        }
        constant_yearly_expenses = sum(yearly_expenses.values())
        annual_rental_income = rental_income * 12
        
        if regime == 'micro_bic':
            # Micro-BIC: flat 50% deduction, same every year
            for year in range(loan_data['term_years']):
                taxable_income = annual_rental_income * (1 - self.tax_regimes['micro_bic']['rate'])
                income_tax = taxable_income * tax_bracket_rate
                social_charges = taxable_income * self.social_charges_rate
                
                yearly_tax_data.append({
                    'year': year + 1,
                    'taxable_income': taxable_income,
                    'income_tax': income_tax,
                    'social_charges': social_charges,
                    'total_tax': income_tax + social_charges,
                    'deductions': annual_rental_income * self.tax_regimes['micro_bic']['rate'],
                    'effective_tax_rate': ((income_tax + social_charges) / annual_rental_income * 100) if annual_rental_income > 0 else 0
                })
        else:  # régime réel
            # Get yearly interest payments from amortization schedule
            yearly_interest = []
            current_year_interest = 0
            payment_num = 0
            
            for entry in loan_data['amortization_schedule']:
                current_year_interest += entry['interest']
                payment_num += 1
                
                if payment_num % 12 == 0:
                    yearly_interest.append(current_year_interest)
                    current_year_interest = 0
            
            # Calculate tax impact for each year
            for year in range(loan_data['term_years']):
                # Total deductions for this year
                year_interest = yearly_interest[year] if year < len(yearly_interest) else 0
                total_deductions = (
                    constant_yearly_expenses +
                    yearly_depreciation +
                    year_interest
                )
                
                # Calculate taxable income (can't be negative in real life)
                taxable_income = max(0, annual_rental_income - total_deductions)
                income_tax = taxable_income * tax_bracket_rate
                social_charges = taxable_income * self.social_charges_rate
                
                yearly_tax_data.append({
                    'year': year + 1,
                    'taxable_income': taxable_income,
                    'income_tax': income_tax,
                    'social_charges': social_charges,
                    'total_tax': income_tax + social_charges,
                    'deductions': total_deductions,
                    'interest_deduction': year_interest,
                    'depreciation_deduction': yearly_depreciation,
                    'expenses_deduction': constant_yearly_expenses,
                    'effective_tax_rate': ((income_tax + social_charges) / annual_rental_income * 100) if annual_rental_income > 0 else 0
                })
        
        return yearly_tax_data
    
    def calculate_total_roi(self, params, annual_cashflow, total_investment, loan_data=None):
        """Calculate comprehensive Return on Investment including all components"""
        # 1. Cash Flow Return (already annualized)
        cash_flow_roi = (annual_cashflow / total_investment) * 100 if total_investment > 0 else 0
        
        # 2. Equity Return
        equity_components = {
            'principal_paydown': 0,
            'appreciation': 0
        }
        
        if loan_data:
            # Calculate principal paydown (equity buildup through mortgage payments)
            annual_principal_paid = loan_data.get('annual_principal_payment', 0)
            equity_components['principal_paydown'] = (annual_principal_paid / total_investment) * 100
            
        # Calculate appreciation return
        appreciation_rate = params.get('appreciation_rate', 2.0) / 100  # Default 2% if not specified
        annual_appreciation = params['purchase_price'] * appreciation_rate
        equity_components['appreciation'] = (annual_appreciation / total_investment) * 100
        
        # 3. Tax Benefits
        tax_benefits = 0
        if params.get('tax_regime') == 'reel':
            # Include depreciation benefit
            depreciation = self.calculate_depreciation(params['purchase_price'], 
                                                     total_investment - params['purchase_price'])
            tax_bracket = params.get('tax_bracket', 30) / 100
            annual_tax_savings = depreciation['total'] * tax_bracket
            tax_benefits = (annual_tax_savings / total_investment) * 100
        
        # Calculate Total ROI
        total_roi = {
            'cash_flow_roi': cash_flow_roi,
            'equity_roi': equity_components['principal_paydown'] + equity_components['appreciation'],
            'tax_benefits_roi': tax_benefits,
            'total_roi': cash_flow_roi + equity_components['principal_paydown'] + 
                        equity_components['appreciation'] + tax_benefits,
            'components': {
                'cash_flow': cash_flow_roi,
                'principal_paydown': equity_components['principal_paydown'],
                'appreciation': equity_components['appreciation'],
                'tax_benefits': tax_benefits
            }
        }
        
        return total_roi

    def analyze_investment(self, params):
        """Comprehensive investment analysis with detailed expenses and tax impact"""
        purchase_costs = self.calculate_purchase_costs(
            params['purchase_price'],
            params.get('notary_fees_rate', 0.08)
        )
        
        monthly_cashflow = self.calculate_monthly_cashflow(
            params['rental_income'],
            params['expenses']
        )
        
        annual_cashflow = monthly_cashflow * 12
        roi = self.calculate_roi(annual_cashflow, purchase_costs['total_cost'])
        
        # Calculate tax impact with loan interest if available
        tax_impact = self.calculate_tax_impact(
            params['rental_income'],
            {**params['expenses'], 
             'purchase_price': params['purchase_price'],
             'notary_fees': purchase_costs['notary_fees']},
            params.get('tax_regime', 'micro_bic'),
            params.get('tax_bracket', 30),
            params.get('loan_interest', 0)
        )
        
        # Calculate after-tax monthly cashflow
        monthly_tax_impact = tax_impact['total_tax'] / 12
        after_tax_monthly_cashflow = monthly_cashflow - monthly_tax_impact
        
        # Calculate expense breakdown
        monthly_expenses = params['expenses']
        expense_breakdown = {
            'management_fees': monthly_expenses.get('management_fees', 0),
            'property_tax': monthly_expenses.get('property_tax', 0) / 12,  # Convert to monthly
            'insurance': monthly_expenses.get('insurance', 0),
            'maintenance': monthly_expenses.get('maintenance', 0),
            'condo_fees': monthly_expenses.get('condo_fees', 0),
            'other': monthly_expenses.get('other', 0),
            'total_monthly': monthly_expenses.get('total_monthly', 0)
        }
        
        # Calculate year-by-year tax impact
        yearly_tax_data = self.calculate_yearly_tax_impact(
            params['rental_income'],
            {**params['expenses'], 
             'purchase_price': params['purchase_price'],
             'notary_fees': purchase_costs['notary_fees']},
            params.get('loan_data', {'term_years': 20, 'amortization_schedule': []}),
            params.get('tax_regime', 'micro_bic'),
            params.get('tax_bracket', 30)
        )
        
        # Calculate total ROI with all components
        total_roi = self.calculate_total_roi(
            params,
            annual_cashflow,
            purchase_costs['total_cost'],
            params.get('loan_data')
        )
        
        return {
            'purchase_costs': purchase_costs,
            'monthly_cashflow': monthly_cashflow,
            'after_tax_monthly_cashflow': after_tax_monthly_cashflow,
            'annual_cashflow': annual_cashflow,
            'after_tax_annual_cashflow': after_tax_monthly_cashflow * 12,
            'roi': total_roi['total_roi'],
            'roi_breakdown': total_roi['components'],
            'after_tax_roi': self.calculate_roi(after_tax_monthly_cashflow * 12, purchase_costs['total_cost']),
            'tax_impact': tax_impact,
            'yearly_tax_data': yearly_tax_data,  # Include year-by-year tax data
            'expense_breakdown': expense_breakdown,
            'rental_income': params['rental_income'],
            'tax_regime': params.get('tax_regime', 'micro_bic')  # Include tax regime in response
        }
