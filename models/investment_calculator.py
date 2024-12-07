class InvestmentCalculator:
    def __init__(self):
        self.tax_regimes = {
            'micro_bic': {'rate': 0.5},  # 50% abattement
            'reel': {'rate': 1.0}  # Pas d'abattement, charges réelles
        }
        
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
    
    def calculate_tax_impact(self, rental_income, expenses, regime='micro_bic'):
        """Calculate taxable income based on tax regime"""
        annual_rental_income = rental_income * 12
        
        if regime == 'micro_bic':
            taxable_income = annual_rental_income * (1 - self.tax_regimes['micro_bic']['rate'])
        else:  # régime réel
            annual_expenses = {
                'management_fees': expenses.get('management_fees', 0) * 12,
                'property_tax': expenses.get('property_tax', 0),  # Already annual
                'insurance': expenses.get('insurance', 0) * 12,
                'maintenance': expenses.get('maintenance', 0) * 12,
                'condo_fees': expenses.get('condo_fees', 0) * 12,
                'other': expenses.get('other', 0) * 12
            }
            total_annual_expenses = sum(annual_expenses.values())
            taxable_income = annual_rental_income - total_annual_expenses
            
        return {
            'taxable_income': taxable_income,
            'regime': regime
        }
    
    def project_capital_gains(self, purchase_price, annual_appreciation_rate, years):
        """Project property value and capital gains"""
        future_value = purchase_price * (1 + annual_appreciation_rate) ** years
        capital_gains = future_value - purchase_price
        return {
            'future_value': future_value,
            'capital_gains': capital_gains
        }
    
    def analyze_investment(self, params):
        """Comprehensive investment analysis with detailed expenses"""
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
        
        tax_impact = self.calculate_tax_impact(
            params['rental_income'],
            params['expenses'],
            params.get('tax_regime', 'micro_bic')
        )
        
        capital_gains = self.project_capital_gains(
            params['purchase_price'],
            params.get('appreciation_rate', 0.02),
            params.get('investment_period', 10)
        )
        
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
            'annual_cashflow': annual_cashflow,
            'roi': roi,
            'tax_impact': tax_impact,
            'capital_gains': capital_gains,
            'expense_breakdown': expense_breakdown
        }
