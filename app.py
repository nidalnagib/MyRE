from flask import Flask, render_template, jsonify, request, send_file
from logging.config import dictConfig
import os
import logging
import sys
from models.investment_calculator import InvestmentCalculator
from models.loan_calculator import LoanCalculator
from models.rent_receipt import RentReceipt

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

# Force UTF-8 encoding for Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-key-change-in-production')

# Initialize calculators
investment_calculator = InvestmentCalculator()
loan_calculator = LoanCalculator()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/receipts')
def receipts():
    return render_template('receipts.html')

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

@app.route('/api/receipts/generate', methods=['POST'])
def generate_receipt():
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['landlord_name', 'landlord_address', 'tenant_name', 
                         'property_address', 'rent_amount', 'payment_date', 'period']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400

        # Create generated_receipts directory if it doesn't exist
        receipts_dir = os.path.join(app.static_folder, 'generated_receipts')
        os.makedirs(receipts_dir, exist_ok=True)

        # Initialize receipt generator with template
        template_path = os.path.join(app.static_folder, 'modele_quittance_de_loyer.docx')
        if not os.path.exists(template_path):
            return jsonify({'error': 'Template file not found'}), 500

        receipt_generator = RentReceipt(template_path)

        try:
            # Generate receipt
            pdf_path = receipt_generator.generate_receipt(
                landlord_name=data['landlord_name'],
                landlord_address=data['landlord_address'],
                tenant_name=data['tenant_name'],
                property_address=data['property_address'],
                rent_amount=float(data['rent_amount']),
                payment_date=data['payment_date'],
                period=data['period'],
                charges=data.get('charges')
            )

            # Send the file
            return send_file(pdf_path, as_attachment=True)

        except Exception as e:
            app.logger.error(f"Error in receipt generation: {str(e)}")
            return jsonify({'error': f'Error generating receipt: {str(e)}'}), 500

    except Exception as e:
        app.logger.error(f"Error in request handling: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # Create logs directory if it doesn't exist
    os.makedirs('logs', exist_ok=True)
    app.run(debug=True)
