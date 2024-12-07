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
        
        return {
            'purchase_costs': purchase_costs,
            'monthly_cashflow': monthly_cashflow,
            'after_tax_monthly_cashflow': after_tax_monthly_cashflow,
            'annual_cashflow': annual_cashflow,
            'after_tax_annual_cashflow': after_tax_monthly_cashflow * 12,
            'roi': roi,
            'after_tax_roi': self.calculate_roi(after_tax_monthly_cashflow * 12, purchase_costs['total_cost']),
            'tax_impact': tax_impact,
            'expense_breakdown': expense_breakdown,
            'rental_income': params['rental_income']
        }
