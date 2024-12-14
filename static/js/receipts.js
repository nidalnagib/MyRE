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

    // Handle form submission from preview
    const generateFromPreviewButton = document.getElementById('generateFromPreview');
    const rentReceiptForm = document.getElementById('rentReceiptForm');

    generateFromPreviewButton.addEventListener('click', async function(e) {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }

        const formData = {
            landlord_name: document.getElementById('landlordName').value.trim(),
            landlord_address: document.getElementById('landlordAddress').value.trim(),
            tenant_name: document.getElementById('tenantName').value.trim(),
            property_address: document.getElementById('propertyAddress').value.trim(),
            rent_amount: document.getElementById('rentAmount').value.trim(),
            payment_date: document.getElementById('paymentDate').value.trim(),
            period: document.getElementById('period').value.trim(),
            charges: getChargesData()
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
                throw new Error(errorData.error || 'Error generating receipt');
            }

            const data = await response.json();
            
            // Close the preview modal
            const previewModal = bootstrap.Modal.getInstance(document.getElementById('previewModal'));
            previewModal.hide();

            // Download the generated PDF
            if (data.pdf_path) {
                window.location.href = `/download/${encodeURIComponent(data.pdf_path)}`;
            } else {
                throw new Error('No PDF path returned from server');
            }

        } catch (error) {
            console.error('Error generating PDF:', error);
            showError(error.message);
        }
    });

    // Prevent default form submission
    rentReceiptForm.addEventListener('submit', function(e) {
        e.preventDefault();
        generateFromPreviewButton.click(); // Trigger the preview button click
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

    // Preview functionality
    const previewButton = document.getElementById('previewButton');
    const previewModal = new bootstrap.Modal(document.getElementById('previewModal'));

    previewButton.addEventListener('click', async function(e) {
        e.preventDefault();
        
        // Validate form before preview
        if (!validateForm()) {
            return;
        }

        // Log form data for debugging
        console.log('Form elements:', {
            landlordName: document.getElementById('landlordName'),
            landlordAddress: document.getElementById('landlordAddress'),
            tenantName: document.getElementById('tenantName'),
            propertyAddress: document.getElementById('propertyAddress'),
            rentAmount: document.getElementById('rentAmount'),
            paymentDate: document.getElementById('paymentDate'),
            period: document.getElementById('period')
        });

        const formData = {
            landlord_name: document.getElementById('landlordName').value.trim(),
            landlord_address: document.getElementById('landlordAddress').value.trim(),
            tenant_name: document.getElementById('tenantName').value.trim(),
            property_address: document.getElementById('propertyAddress').value.trim(),
            rent_amount: document.getElementById('rentAmount').value.trim(),
            payment_date: document.getElementById('paymentDate').value.trim(),
            period: document.getElementById('period').value.trim(),
            charges: getChargesData()
        };

        // Log the collected data
        console.log('Sending data to server:', formData);

        try {
            const response = await fetch('/api/receipts/format', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error formatting receipt');
            }

            const data = await response.json();
            console.log('Received data from server:', data);
            updatePreviewModal(data);
            previewModal.show();

        } catch (error) {
            console.error('Error in preview:', error);
            showError(error.message);
        }
    });

    function validateForm() {
        // Get all required fields
        const requiredFields = [
            { id: 'landlordName', label: 'Nom du propriétaire' },
            { id: 'landlordAddress', label: 'Adresse du propriétaire' },
            { id: 'tenantName', label: 'Nom du locataire' },
            { id: 'propertyAddress', label: 'Adresse du bien' },
            { id: 'rentAmount', label: 'Montant du loyer' },
            { id: 'paymentDate', label: 'Date de paiement' },
            { id: 'period', label: 'Période' }
        ];

        let isValid = true;
        const errors = [];

        // Check each required field
        requiredFields.forEach(field => {
            const element = document.getElementById(field.id);
            if (!element) {
                console.error(`Element with id ${field.id} not found`);
                isValid = false;
                return;
            }
            const value = element.value.trim();
            
            if (!value) {
                isValid = false;
                errors.push(`${field.label} est requis`);
                element.classList.add('is-invalid');
            } else {
                element.classList.remove('is-invalid');
            }
        });

        // Validate rent amount is a valid number
        const rentAmountElement = document.getElementById('rentAmount');
        if (rentAmountElement) {
            const rentAmount = rentAmountElement.value.trim();
            if (rentAmount && isNaN(parseFloat(rentAmount))) {
                isValid = false;
                errors.push('Le montant du loyer doit être un nombre valide');
                rentAmountElement.classList.add('is-invalid');
            }
        }

        // Validate charges if present
        const chargesContainer = document.getElementById('chargesContainer');
        if (chargesContainer) {
            const chargeRows = chargesContainer.getElementsByClassName('charge-row');
            Array.from(chargeRows).forEach((row, index) => {
                const descriptionInput = row.querySelector('[name="charge_description[]"]');
                const amountInput = row.querySelector('[name="charge_amount[]"]');

                if (!descriptionInput || !amountInput) return;

                const description = descriptionInput.value.trim();
                const amount = amountInput.value.trim();

                if (description && !amount) {
                    isValid = false;
                    errors.push(`Montant manquant pour la charge ${index + 1}`);
                    amountInput.classList.add('is-invalid');
                } else if (!description && amount) {
                    isValid = false;
                    errors.push(`Description manquante pour la charge ${index + 1}`);
                    descriptionInput.classList.add('is-invalid');
                } else if (amount && isNaN(parseFloat(amount))) {
                    isValid = false;
                    errors.push(`Le montant de la charge ${index + 1} doit être un nombre valide`);
                    amountInput.classList.add('is-invalid');
                } else {
                    descriptionInput.classList.remove('is-invalid');
                    amountInput.classList.remove('is-invalid');
                }
            });
        }

        // Show errors if any
        if (!isValid) {
            showError(errors.join('<br>'));
        }

        return isValid;
    }

    function showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'alert alert-danger alert-dismissible fade show mt-3';
        errorDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        const form = document.querySelector('form');
        form.insertBefore(errorDiv, form.firstChild);

        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }

    function updatePreviewModal(data) {
        console.log('Updating preview modal with data:', data);
        
        const updateElement = (id, value) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value || '';
            } else {
                console.warn(`Element not found: ${id}`);
            }
        };

        // Update all preview fields with formatted data
        updateElement('preview-city', data.city);
        updateElement('preview-date', data.formatted_date);
        updateElement('preview-landlord-name', data.landlord_name);
        updateElement('preview-landlord-name-2', data.landlord_name);
        updateElement('preview-landlord-address', data.landlord_address);
        updateElement('preview-tenant-name', data.tenant_name);
        updateElement('preview-tenant-name-2', data.tenant_name);
        updateElement('preview-tenant-address', data.property_address);
        updateElement('preview-property-address', data.property_address);
        updateElement('preview-rent-amount', data.rent_amount);
        updateElement('preview-rent-amount-letters', data.rent_amount_letters);
        updateElement('preview-period', data.period);

        // Handle charges if present
        const chargesSection = document.getElementById('preview-charges-section');
        const chargesList = document.getElementById('preview-charges-list');
        
        if (data.charges && data.charges.length > 0) {
            if (chargesSection) chargesSection.style.display = 'block';
            if (chargesList) {
                chargesList.innerHTML = data.charges.map(charge => 
                    `<p>${charge.description}: ${charge.amount} €</p>`
                ).join('');
            }
            
            updateElement('preview-total-charges', data.total_charges);
            updateElement('preview-total-charges-letters', data.total_charges_letters);
        } else {
            if (chargesSection) chargesSection.style.display = 'none';
        }

        updateElement('preview-total-amount', data.total_amount);
        updateElement('preview-total-amount-letters', data.total_amount_letters);
    }

    function getChargesData() {
        const charges = [];
        const chargesContainer = document.getElementById('chargesContainer');
        
        if (!chargesContainer) {
            console.warn('Charges container not found');
            return charges;
        }

        const chargeRows = chargesContainer.getElementsByClassName('charge-row');
        if (!chargeRows || chargeRows.length === 0) {
            return charges;
        }

        Array.from(chargeRows).forEach(row => {
            const descriptionInput = row.querySelector('[name="charge_description[]"]');
            const amountInput = row.querySelector('[name="charge_amount[]"]');

            if (!descriptionInput || !amountInput) {
                console.warn('Charge inputs not found in row');
                return;
            }

            const description = descriptionInput.value.trim();
            const amount = amountInput.value.trim();
            
            if (description && amount && !isNaN(parseFloat(amount))) {
                charges.push({
                    description: description,
                    amount: parseFloat(amount)
                });
            }
        });
        
        return charges;
    }
});
