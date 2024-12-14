from docxtpl import DocxTemplate
from docx2pdf import convert
import os
from datetime import datetime
from typing import Dict, Optional
import locale
import sys
import pythoncom
import re

class RentReceipt:
    # Mapping for French number words
    UNITS = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf']
    TENS = ['', 'dix', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt']
    THOUSANDS = ['', 'mille', 'million', 'milliard']

    # French month names
    MONTHS_FR = {
        1: 'janvier',
        2: 'février',
        3: 'mars',
        4: 'avril',
        5: 'mai',
        6: 'juin',
        7: 'juillet',
        8: 'août',
        9: 'septembre',
        10: 'octobre',
        11: 'novembre',
        12: 'décembre'
    }

    def __init__(self, template_path: str):
        self.template_path = template_path
        if not os.path.exists(template_path):
            raise FileNotFoundError(f"Template file not found: {template_path}")
        
        # Force UTF-8 encoding for Windows
        if sys.platform == 'win32':
            sys.stdout.reconfigure(encoding='utf-8')
        
        # Load template with explicit encoding
        self.doc = DocxTemplate(template_path)

    def number_to_french_words(self, number: float) -> str:
        """Convert a number to French words"""
        def _under_thousand(n):
            if n == 0:
                return ''
            elif n < 20:
                return self.UNITS[n]
            elif n < 100:
                tens, units = divmod(n, 10)
                if tens == 7 or tens == 9:
                    link = '-et-' if units == 1 else '-'
                    return f"{self.TENS[tens]}{link}{self.UNITS[10+units]}" if units < 7 else f"{self.TENS[tens]}-{self.UNITS[units]}"
                elif tens == 8 and units == 0:
                    return 'quatre-vingts'
                else:
                    link = '-et-' if units == 1 and tens != 8 else '-'
                    return f"{self.TENS[tens]}{link if units else ''}{self.UNITS[units]}"
            else:
                hundreds, rest = divmod(n, 100)
                if hundreds == 1:
                    return f"cent{' ' + _under_thousand(rest) if rest else ''}"
                else:
                    return f"{self.UNITS[hundreds]}-cent{('s' if rest == 0 and hundreds > 1 else '') + (' ' + _under_thousand(rest) if rest else '')}"

        def _split_by_thousands(n):
            if n == 0:
                return ['0']
            result = []
            while n:
                n, r = divmod(n, 1000)
                result.append(str(r))
            return result[::-1]

        if number == 0:
            return 'zéro'

        # Handle the integer part
        integer_part = int(number)
        parts = _split_by_thousands(integer_part)
        words = []

        for i, part in enumerate(parts):
            part_num = int(part)
            if part_num:
                if part_num == 1 and len(parts) - i - 1 == 1:  # Special case for 1000
                    words.append(self.THOUSANDS[len(parts) - i - 1])
                else:
                    words.append(_under_thousand(part_num))
                    if len(parts) - i - 1 > 0:
                        thou = self.THOUSANDS[len(parts) - i - 1]
                        if part_num > 1 and thou == 'million':
                            thou += 's'
                        words.append(thou)

        # Handle decimal part (centimes)
        decimal_part = round((number - integer_part) * 100)
        result = ' '.join(w for w in words if w)

        if decimal_part:
            cent_word = 'centime' if decimal_part == 1 else 'centimes'
            result += f" euros et {_under_thousand(decimal_part)} {cent_word}"
        else:
            result += " euros"

        return result

    def format_date(self, date_str: str) -> str:
        """Format date string from yyyy-mm-dd to dd/mm/yyyy"""
        date_obj = datetime.strptime(date_str, '%Y-%m-%d')
        return date_obj.strftime('%d/%m/%Y')

    def format_period(self, period_str: str) -> str:
        """Format period string from yyyy-mm to 'Month Year'"""
        date_obj = datetime.strptime(period_str + '-01', '%Y-%m-%d')
        month_num = date_obj.month
        year = date_obj.year
        return f"{self.MONTHS_FR[month_num]} {year}"

    def extract_city_from_address(self, address: str) -> str:
        """Extract city from a French address format using smart parsing"""
        import re

        # Remove extra spaces and normalize line endings
        address = address.strip().replace('\r\n', '\n')
        
        # Common patterns for French addresses
        patterns = [
            # Pattern 1: "12345 City" or "12345 City Cedex"
            r'(?P<postal>\d{5})\s+(?P<city>[A-Za-zÀ-ÿ\s-]+?)(?:\s+Cedex\s*\d*)?$',
            
            # Pattern 2: "12345 City-Name" (with hyphen)
            r'(?P<postal>\d{5})\s+(?P<city>[A-Za-zÀ-ÿ]+(?:[- ][A-Za-zÀ-ÿ]+)*)',
            
            # Pattern 3: Last line with just city
            r'^(?P<city>[A-Za-zÀ-ÿ]+(?:[- ][A-Za-zÀ-ÿ]+)*)$'
        ]

        # Try each pattern on the last line of the address
        lines = address.split('\n')
        if not lines:
            return ""

        last_line = lines[-1].strip()
        
        for pattern in patterns:
            match = re.search(pattern, last_line)
            if match:
                city = match.group('city').strip()
                # Capitalize each word
                return ' '.join(word.capitalize() for word in city.split())

        # Fallback: return the last line if no pattern matches
        return last_line.strip()

    def parse_address(self, address: str) -> Dict[str, str]:
        """Parse a French address into components"""
        import re

        # Normalize line endings and clean up spaces
        address = address.strip().replace('\r\n', '\n')
        lines = [line.strip() for line in address.split('\n') if line.strip()]

        if not lines:
            return {
                'street': '',
                'postal_code': '',
                'city': ''
            }

        result = {
            'street': '',
            'postal_code': '',
            'city': ''
        }

        # If we have at least two lines, assume last line is postal code + city
        if len(lines) >= 2:
            result['street'] = '\n'.join(lines[:-1])
            last_line = lines[-1]
            
            # Try to match postal code and city
            match = re.search(r'(\d{5})\s+(.+)', last_line)
            if match:
                result['postal_code'] = match.group(1)
                result['city'] = match.group(2)
            else:
                # If no match, assume it's just a city
                result['city'] = last_line

        else:
            # Single line address
            # Try to match "street, postal city" format
            match = re.search(r'(.+?),\s*(\d{5})\s+(.+)', lines[0])
            if match:
                result['street'] = match.group(1)
                result['postal_code'] = match.group(2)
                result['city'] = match.group(3)
            else:
                # Just store as street if no clear format
                result['street'] = lines[0]

        # Clean up city (remove CEDEX and normalize case)
        if result['city']:
            result['city'] = re.sub(r'\s+CEDEX\s*\d*$', '', result['city'], flags=re.IGNORECASE)
            result['city'] = ' '.join(word.capitalize() for word in result['city'].split())

        return result

    def format_receipt_data(self,
                          landlord_name: str,
                          landlord_address: str,
                          tenant_name: str,
                          property_address: str,
                          rent_amount: float,
                          payment_date: str,
                          period: str,
                          charges: Optional[Dict[str, float]] = None) -> Dict:
        """Format receipt data without generating PDF"""
        # Calculate total amount
        total_amount = rent_amount
        if charges:
            total_amount += sum(charges.values())

        # Parse addresses
        landlord_address_components = self.parse_address(landlord_address)
        property_address_components = self.parse_address(property_address)

        # Format the data
        formatted_data = {
            'landlord': {
                'name': landlord_name,
                'address': landlord_address,
                'city': landlord_address_components['city'],
                'postal_code': landlord_address_components['postal_code'],
                'street': landlord_address_components['street']
            },
            'tenant': {
                'name': tenant_name,
                'address': property_address,
                'city': property_address_components['city'],
                'postal_code': property_address_components['postal_code'],
                'street': property_address_components['street']
            },
            'payment': {
                'date': self.format_date(payment_date),
                'period': self.format_period(period),
                'rent_amount': f"{rent_amount:.2f} €",
                'rent_amount_letters': self.number_to_french_words(rent_amount),
                'total_amount': f"{total_amount:.2f} €",
                'total_amount_letters': self.number_to_french_words(total_amount)
            }
        }

        if charges:
            total_charges = sum(charges.values())
            formatted_charges = [
                {
                    'description': desc,
                    'amount': f"{amount:.2f} €",
                    'amount_letters': self.number_to_french_words(amount)
                }
                for desc, amount in charges.items()
            ]
            formatted_data['charges'] = {
                'items': formatted_charges,
                'total': f"{total_charges:.2f} €",
                'total_letters': self.number_to_french_words(total_charges)
            }

        return formatted_data

    def generate_receipt(self,
                        landlord_name: str,
                        landlord_address: str,
                        tenant_name: str,
                        property_address: str,
                        rent_amount: float,
                        payment_date: str,
                        period: str,
                        charges: Optional[Dict[str, float]] = None) -> str:
        """Generate a rent receipt PDF"""
        # Initialize COM for Windows
        if sys.platform == 'win32':
            pythoncom.CoInitialize()
        
        try:
            # Format the data
            formatted_data = self.format_receipt_data(
                landlord_name=landlord_name,
                landlord_address=landlord_address,
                tenant_name=tenant_name,
                property_address=property_address,
                rent_amount=rent_amount,
                payment_date=payment_date,
                period=period,
                charges=charges
            )

            # Prepare context for docxtpl
            context = {
                'landlord_name': formatted_data['landlord']['name'],
                'landlord_address': formatted_data['landlord']['address'],
                'landlord_city': formatted_data['landlord']['city'],
                'tenant_name': formatted_data['tenant']['name'],
                'property_address': formatted_data['tenant']['address'],
                'rent_amount': formatted_data['payment']['rent_amount'],
                'rent_amount_letters': formatted_data['payment']['rent_amount_letters'],
                'payment_date': formatted_data['payment']['date'],
                'period': formatted_data['payment']['period'],
                'total_amount': formatted_data['payment']['total_amount'],
                'total_amount_letters': formatted_data['payment']['total_amount_letters']
            }

            if charges:
                context.update({
                    'charges': formatted_data['charges']['items'],
                    'total_charges': formatted_data['charges']['total'],
                    'total_charges_letters': formatted_data['charges']['total_letters']
                })

            # Create output directory if it doesn't exist
            output_dir = os.path.join(os.path.dirname(self.template_path), 'generated_receipts')
            os.makedirs(output_dir, exist_ok=True)

            # Generate unique filename
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            docx_path = os.path.join(output_dir, f'receipt_{timestamp}.docx')
            pdf_path = os.path.join(output_dir, f'receipt_{timestamp}.pdf')

            # Render the template
            self.doc.render(context)
            self.doc.save(docx_path)

            # Convert to PDF
            convert(docx_path, pdf_path)

            # Clean up the temporary docx file
            os.remove(docx_path)

            return pdf_path

        finally:
            # Uninitialize COM
            if sys.platform == 'win32':
                pythoncom.CoUninitialize()
