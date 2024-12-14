# -*- coding: utf-8 -*-
from models.rent_receipt import RentReceipt
import os
import sys

# Force UTF-8 encoding for Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

def test_receipt_generation():
    # Initialize receipt generator
    template_path = os.path.join('static', 'modele_quittance_de_loyer.docx')
    receipt_generator = RentReceipt(template_path)

    # Test data with explicit Unicode characters
    test_data = {
        'landlord_name': 'Jean-François Dupont',
        'landlord_address': '123 Avenue des Champs-Élysées\n75008 Paris',
        'tenant_name': 'Marie-Thérèse Martin',
        'property_address': '45 Rue de la République\n69001 Lyon',
        'rent_amount': 850.50,
        'payment_date': '2024-12-14',
        'period': '2024-12',
        'charges': {
            'Eau': 35.40,
            'Électricité': 45.60,
            'Ordures ménagères': 15.00
        }
    }

    # Generate receipt
    pdf_path = receipt_generator.generate_receipt(
        landlord_name=test_data['landlord_name'],
        landlord_address=test_data['landlord_address'],
        tenant_name=test_data['tenant_name'],
        property_address=test_data['property_address'],
        rent_amount=test_data['rent_amount'],
        payment_date=test_data['payment_date'],
        period=test_data['period'],
        charges=test_data['charges']
    )

    print(f"Receipt generated at: {pdf_path}")
    return pdf_path

def test_city_extraction():
    template_path = os.path.join('static', 'modele_quittance_de_loyer.docx')
    receipt_generator = RentReceipt(template_path)

    # Test different address formats
    addresses = [
        ('123 Avenue des Champs-Élysées\n75008 Paris', 'Paris'),
        ('45 Rue de la République\n69001 Lyon', 'Lyon'),
        ('1 Place de la Mairie\n13100 Aix-en-Provence', 'Aix-en-Provence'),
        ('Single Line Address', 'Single Line Address'),  # Fallback case
    ]

    for address, expected_city in addresses:
        city = receipt_generator.extract_city_from_address(address)
        print(f"Address: {address}")
        print(f"Extracted city: {city}")
        print(f"Expected city: {expected_city}")
        print("---")

if __name__ == '__main__':
    test_city_extraction()
    test_receipt_generation()
