import numpy as np

class LoanCalculator:
    def __init__(self):
        pass
        
    def calculate_monthly_payment(self, principal, annual_rate, years):
        """Calculate monthly mortgage payment"""
        monthly_rate = annual_rate / 12
        num_payments = years * 12
        
        if monthly_rate == 0:
            return principal / num_payments
            
        monthly_payment = principal * (monthly_rate * (1 + monthly_rate)**num_payments) / \
                         ((1 + monthly_rate)**num_payments - 1)
        return monthly_payment
    
    def generate_amortization_schedule(self, principal, annual_rate, years):
        """Generate complete amortization schedule"""
        monthly_rate = annual_rate / 12
        num_payments = years * 12
        monthly_payment = self.calculate_monthly_payment(principal, annual_rate, years)
        
        schedule = []
        remaining_balance = principal
        total_interest = 0
        total_principal = 0
        
        for payment_num in range(1, num_payments + 1):
            if monthly_rate == 0:
                interest_payment = 0
                principal_payment = monthly_payment
            else:
                interest_payment = remaining_balance * monthly_rate
                principal_payment = monthly_payment - interest_payment
            
            remaining_balance = max(0, remaining_balance - principal_payment)
            total_interest += interest_payment
            total_principal += principal_payment
            
            schedule.append({
                'payment_num': payment_num,
                'payment': float(monthly_payment),
                'principal': float(principal_payment),
                'interest': float(interest_payment),
                'remaining_balance': float(remaining_balance),
                'total_interest': float(total_interest),
                'total_principal': float(total_principal)
            })
        
        return schedule
    
    def calculate_loan_metrics(self, params):
        """Calculate comprehensive loan metrics"""
        try:
            loan_amount = float(params.get('loan_amount', 0))
            interest_rate = float(params.get('interest_rate', 0))
            term_years = int(params.get('term_years', 30))
            
            if loan_amount <= 0 or term_years <= 0:
                raise ValueError("Loan amount and term must be positive")
                
            monthly_payment = self.calculate_monthly_payment(loan_amount, interest_rate, term_years)
            schedule = self.generate_amortization_schedule(loan_amount, interest_rate, term_years)
            
            # Get the last entry of the schedule for total interest
            total_interest = schedule[-1]['total_interest'] if schedule else 0
            
            return {
                'monthly_payment': float(monthly_payment),
                'total_interest': float(total_interest),
                'total_cost': float(loan_amount + total_interest),
                'annual_payment': float(monthly_payment * 12),
                'term_years': term_years,
                'interest_rate': interest_rate,
                'loan_amount': loan_amount,
                'amortization_schedule': schedule
            }
            
        except Exception as e:
            raise ValueError(f"Error in loan calculation: {str(e)}")
