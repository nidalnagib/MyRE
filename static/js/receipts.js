document.addEventListener('DOMContentLoaded', function() {
    // Load saved landlord info from localStorage
    const landlordName = localStorage.getItem('landlordName');
    const landlordAddress = localStorage.getItem('landlordAddress');
    if (landlordName) document.getElementById('landlordName').value = landlordName;
    if (landlordAddress) document.getElementById('landlordAddress').value = landlordAddress;

    // Address validation function
    function validateAddress(address) {
        // Clean up the address
        address = address.trim();
        const lines = address.split(/\r?\n/).map(line => line.trim()).filter(line => line);

        // Check if we have at least 2 lines
        if (lines.length < 2) {
            return {
                valid: false,
                message: 'L\'adresse doit contenir au moins deux lignes (rue et code postal/ville)'
            };
        }

        // Check if the last line contains a postal code
        const lastLine = lines[lines.length - 1];
        const postalCodeMatch = lastLine.match(/^\d{5}\s+[A-Za-zÀ-ÿ\s-]+$/);
        
        if (!postalCodeMatch) {
            return {
                valid: false,
                message: 'La dernière ligne doit contenir un code postal (5 chiffres) suivi de la ville'
            };
        }

        return { valid: true };
    }

    // Add validation to address fields
    ['landlordAddress', 'propertyAddress'].forEach(fieldId => {
        const field = document.getElementById(fieldId);
        field.addEventListener('input', function() {
            const result = validateAddress(this.value);
            this.setCustomValidity(result.valid ? '' : result.message);
            
            // Update visual feedback
            if (this.value.trim()) {
                if (result.valid) {
                    this.classList.remove('is-invalid');
                    this.classList.add('is-valid');
                } else {
                    this.classList.remove('is-valid');
                    this.classList.add('is-invalid');
                }
            } else {
                this.classList.remove('is-valid', 'is-invalid');
            }
        });
    });

    // Set default payment date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('paymentDate').value = today;

    // Handle form submission
    document.getElementById('rentReceiptForm').addEventListener('submit', async function(e) {
        e.preventDefault();

        // Validate addresses before submission
        const landlordAddress = document.getElementById('landlordAddress').value;
        const propertyAddress = document.getElementById('propertyAddress').value;
        
        const landlordAddressValid = validateAddress(landlordAddress);
        const propertyAddressValid = validateAddress(propertyAddress);

        if (!landlordAddressValid.valid || !propertyAddressValid.valid) {
            alert('Veuillez vérifier le format des adresses:\n\n' +
                  (!landlordAddressValid.valid ? '- ' + landlordAddressValid.message + '\n' : '') +
                  (!propertyAddressValid.valid ? '- ' + propertyAddressValid.message : ''));
            return;
        }

        // Save landlord info to localStorage
        localStorage.setItem('landlordName', document.getElementById('landlordName').value);
        localStorage.setItem('landlordAddress', document.getElementById('landlordAddress').value);

        // Collect charges if any
        const chargeInputs = document.querySelectorAll('.charge-row');
        const charges = {};
        chargeInputs.forEach(row => {
            const description = row.querySelector('.charge-description').value;
            const amount = parseFloat(row.querySelector('.charge-amount').value);
            if (description && !isNaN(amount)) {
                charges[description] = amount;
            }
        });

        // Get period (keep as YYYY-MM)
        const period = document.getElementById('period').value;

        // Prepare form data
        const formData = {
            landlord_name: document.getElementById('landlordName').value,
            landlord_address: landlordAddress,
            tenant_name: document.getElementById('tenantName').value,
            property_address: propertyAddress,
            rent_amount: parseFloat(document.getElementById('rentAmount').value),
            payment_date: document.getElementById('paymentDate').value,
            period: period,
            charges: Object.keys(charges).length > 0 ? charges : null
        };

        try {
            const response = await fetch('/api/receipts/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            // Handle PDF download
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `quittance_${formData.period.replace('-', '_')}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();

        } catch (error) {
            console.error('Error:', error);
            alert('Une erreur est survenue lors de la génération de la quittance: ' + error.message);
        }
    });

    // Handle adding new charges
    document.getElementById('addCharge').addEventListener('click', function() {
        const container = document.getElementById('chargesContainer');
        const chargeRow = document.createElement('div');
        chargeRow.className = 'charge-row row mb-2';
        chargeRow.innerHTML = `
            <div class="col-7">
                <input type="text" class="form-control charge-description" placeholder="Description de la charge" required>
            </div>
            <div class="col-4">
                <input type="number" class="form-control charge-amount" step="0.01" placeholder="Montant" required>
            </div>
            <div class="col-1">
                <button type="button" class="btn btn-outline-danger btn-sm remove-charge">×</button>
            </div>
        `;
        container.appendChild(chargeRow);

        // Add remove handler
        chargeRow.querySelector('.remove-charge').addEventListener('click', function() {
            chargeRow.remove();
        });
    });
});
