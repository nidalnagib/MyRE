from flask import Flask, render_template, jsonify, request
from logging.config import dictConfig
import os
import logging
from models.investment_calculator import InvestmentCalculator
from models.loan_calculator import LoanCalculator

# Configure logging
dictConfig({
    'version': 1,
    'formatters': {'default': {
        'format': '[%(asctime)s] %(levelname)s in %(module)s: %(message)s',
    }},
    'handlers': {'wsgi': {
        'class': 'logging.StreamHandler',
        'stream': 'ext://flask.logging.wsgi_errors_stream',
        'formatter': 'default'
    }},
    'root': {
        'level': 'INFO',
        'handlers': ['wsgi']
    }
})

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-key-change-in-production')

# Initialize calculators
investment_calculator = InvestmentCalculator()
loan_calculator = LoanCalculator()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/calculate-investment', methods=['POST'])
def calculate_investment():
    try:
        data = request.get_json()
        app.logger.info(f"Investment calculation request: {data}")
        
        result = investment_calculator.analyze_investment(data)
        app.logger.info(f"Investment calculation result: {result}")
        
        return jsonify({
            'success': True,
            'data': result
        })
    except Exception as e:
        app.logger.error(f"Error in calculate_investment: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Une erreur est survenue lors du calcul'
        }), 500

@app.route('/api/calculate-loan', methods=['POST'])
def calculate_loan():
    try:
        data = request.get_json()
        app.logger.info(f"Loan calculation request: {data}")
        
        result = loan_calculator.calculate_loan_metrics(data)
        app.logger.info(f"Loan calculation result: {result}")
        
        return jsonify({
            'success': True,
            'data': result
        })
    except Exception as e:
        app.logger.error(f"Error in calculate_loan: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Une erreur est survenue lors du calcul du prêt'
        }), 500

if __name__ == '__main__':
    # Create logs directory if it doesn't exist
    os.makedirs('logs', exist_ok=True)
    app.run(debug=True)
