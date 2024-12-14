from flask import Flask, render_template, jsonify, request, send_file, send_from_directory
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

        # Initialize receipt generator with template
        template_path = os.path.join(app.static_folder, 'modele_quittance_de_loyer.docx')
        if not os.path.exists(template_path):
            return jsonify({'error': 'Template file not found'}), 500

        receipt_generator = RentReceipt(template_path)

        try:
            # Generate the receipt
            pdf_path = receipt_generator.generate_receipt(
                landlord_name=data['landlord_name'],
                landlord_address=data['landlord_address'],
                tenant_name=data['tenant_name'],
                property_address=data['property_address'],
                rent_amount=float(data['rent_amount']),
                payment_date=data['payment_date'],
                period=data['period'],
                charges={charge['description']: float(charge['amount']) for charge in data.get('charges', [])} if data.get('charges') else None
            )

            # Get the relative path for download
            relative_path = os.path.relpath(pdf_path, app.static_folder)
            return jsonify({'pdf_path': relative_path})

        except Exception as e:
            app.logger.error(f"Error in receipt generation: {str(e)}")
            return jsonify({'error': f'Error generating receipt: {str(e)}'}), 500

    except Exception as e:
        app.logger.error(f"Error in request handling: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/download/<path:filename>')
def download_file(filename):
    try:
        # Ensure the file exists and is within the static folder
        file_path = os.path.join(app.static_folder, filename)
        if not os.path.exists(file_path):
            return jsonify({'error': 'File not found'}), 404

        directory = os.path.dirname(file_path)
        return send_from_directory(directory, os.path.basename(file_path), as_attachment=True)
    except Exception as e:
        app.logger.error(f"Error in file download: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/receipts/format', methods=['POST'])
def format_receipt():
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['landlord_name', 'landlord_address', 'tenant_name', 
                         'property_address', 'rent_amount', 'payment_date', 'period']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400

        # Initialize receipt generator with template
        template_path = os.path.join(app.static_folder, 'modele_quittance_de_loyer.docx')
        if not os.path.exists(template_path):
            return jsonify({'error': 'Template file not found'}), 500

        receipt_generator = RentReceipt(template_path)

        try:
            # Format receipt data
            formatted_data = receipt_generator.format_receipt_data(
                landlord_name=data['landlord_name'],
                landlord_address=data['landlord_address'],
                tenant_name=data['tenant_name'],
                property_address=data['property_address'],
                rent_amount=float(data['rent_amount']),
                payment_date=data['payment_date'],
                period=data['period'],
                charges={charge['description']: float(charge['amount']) for charge in data.get('charges', [])} if data.get('charges') else None
            )

            # Flatten the data structure for the frontend
            response_data = {
                'city': formatted_data['landlord']['city'],
                'formatted_date': formatted_data['payment']['date'],
                'landlord_name': formatted_data['landlord']['name'],
                'landlord_address': formatted_data['landlord']['address'],
                'tenant_name': formatted_data['tenant']['name'],
                'property_address': formatted_data['tenant']['address'],
                'rent_amount': formatted_data['payment']['rent_amount'],
                'rent_amount_letters': formatted_data['payment']['rent_amount_letters'],
                'period': formatted_data['payment']['period'],
                'total_amount': formatted_data['payment']['total_amount'],
                'total_amount_letters': formatted_data['payment']['total_amount_letters']
            }

            # Add charges if present
            if 'charges' in formatted_data:
                response_data.update({
                    'charges': [
                        {
                            'description': charge['description'],
                            'amount': charge['amount']
                        }
                        for charge in formatted_data['charges']['items']
                    ],
                    'total_charges': formatted_data['charges']['total'],
                    'total_charges_letters': formatted_data['charges']['total_letters']
                })

            return jsonify(response_data)

        except Exception as e:
            app.logger.error(f"Error in receipt formatting: {str(e)}")
            return jsonify({'error': f'Error formatting receipt: {str(e)}'}), 500

    except Exception as e:
        app.logger.error(f"Error in request handling: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # Create logs directory if it doesn't exist
    os.makedirs('logs', exist_ok=True)
    app.run(debug=True)
