let currentUserData = [];
let isAuthReady = false;

window.showToast = function(message, type = 'info') {
    const container = document.getElementById('notificationContainer');
    if (!container) return;

    const toastHTML = `
        <div class="toast align-items-center text-white bg-${type} border-0" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="d-flex">
                <div class="toast-body">${message}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        </div>`;
    
    const toastElement = $(toastHTML);
    container.append(toastElement[0]);
    
    const toast = new bootstrap.Toast(toastElement[0], { delay: 5000 });
    toast.show();

    toastElement.on('hidden.bs.toast', function () {
        $(this).remove();
    });
};

window.enableTools = function() {
    $('.disabled-for-auth').removeClass('disabled-for-auth opacity-50')
        .removeAttr('title')
        .filter('[data-bs-target="#leadManageModal"]').attr('data-bs-toggle', 'modal'); 
    $('#quickNoteFab').removeClass('d-none'); 
    $('#googleSignInButtonContainer').addClass('d-none');
    $('#userProfileDisplay').removeClass('d-none');
    isAuthReady = true;
};

window.disableTools = function() {
    $('.tool-card').each(function() {
        const card = $(this);
        const h3 = card.find('h3').text().trim();
        
        if (h3 === 'Lead Data Management' ) {
            card.addClass('disabled-for-auth opacity-50')
                .removeAttr('data-bs-toggle')
                .attr('title', 'Login required to use this tool.');
        }
    });
    $('#quickNoteFab').addClass('d-none'); 
    $('#googleSignInButtonContainer').removeClass('d-none');
    $('#userProfileDisplay').addClass('d-none');
    isAuthReady = false;
};

function numberToIndianWords(n) {
    if (n === 0) return "Zero";
    const a = ['', 'one ', 'two ', 'three ', 'four ', 'five ', 'six ', 'seven ', 'eight ', 'nine ', 'ten ', 'eleven ', 'twelve ', 'thirteen ', 'fourteen ', 'fifteen ', 'sixteen ', 'seventeen ', 'eighteen ', 'nineteen '];
    const b = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
    function inWords(num) {
        if ((num = num.toString()).length > 9) return 'overflow';
        let n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
        if (!n) return;
        let str = '';
        str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'crore ' : '';
        str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'lakh ' : '';
        str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'thousand ' : '';
        str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'hundred ' : '';
        str += (n[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) : '';
        return str.trim();
    }
    return inWords(n).toUpperCase();
}

function renderQuickNotes(notes) {
    const container = $('#savedNotesContainer');
    container.empty();
    
    if (notes.length === 0) {
        container.append('<p class="text-center text-muted small mb-0">No saved notes.</p>');
        return;
    }

    notes.forEach(note => {
        const noteElement = $(`
            <div class="alert alert-light border d-flex justify-content-between align-items-start mb-2 py-2 pe-1" role="alert">
                <div class="me-auto small" style="overflow-wrap: break-word;">
                    <strong><span class="material-symbols-outlined fs-6" style="vertical-align: sub;">edit_note</span> ${note.DateAdded}:</strong> ${note.Note}
                </div>
                <button type="button" class="btn-close btn-sm delete-note-btn" data-key="${note.RTDBKey}" aria-label="Delete note"></button>
            </div>
        `);
        container.append(noteElement);
    });

    $('.delete-note-btn').off('click').on('click', async function() {
        if (!confirm("Delete this note?")) return;
        const rtdbKey = $(this).data('key');
        const success = await window.deleteQuickNote(rtdbKey);
        if (success) {
            window.loadAndRenderQuickNotes();
        }
    });
}

window.loadAndRenderQuickNotes = async function() {
    const notes = await window.fetchQuickNotes();
    renderQuickNotes(notes);
};

async function handleSaveClick() {
    const rtdbKey = $('#editLeadRtdbKey').val().trim();
    if (!rtdbKey) {
        return window.showToast("Error: Cannot find lead key to update.", 'danger');
    }

    const $saveButton = $('#saveLeadChanges');
    $saveButton.prop('disabled', true).html('<span class="spinner-border spinner-border-sm me-1"></span> Saving...');

    const updatedFields = {
        MobileNumber: $('#editMobileNumber').val().trim(),
        LeadFor: $('#editLeadFor').val(),
        LeadBy: $('#editLeadBy').val().trim() || 'N/A',
        LastContact: $('#editLastContact').val(),
        Remark: $('#editRemark').val().trim() || 'N/A',
    };

    if (!updatedFields.MobileNumber) {
        $saveButton.prop('disabled', false).text('Save Changes');
        return window.showToast("Mobile Number is required.", 'warning');
    }

    try {
        const success = await window.saveEditedLead(rtdbKey, updatedFields);
        if (success) {
            bootstrap.Modal.getInstance(document.getElementById('leadEditModal')).hide();
            await window.loadAndRenderData();
        } else {
            window.showToast("Failed to update lead. Please try again.", 'danger');
        }
    } catch (err) {
        console.error("Error while saving lead:", err);
        window.showToast("Unexpected error during update.", 'danger');
    } finally {
        $saveButton.prop('disabled', false).text('Save Changes');
    }
}

$('#saveLeadChanges').off('click').on('click', handleSaveClick);

function handleEditClick() {
    const key = $(this).data('key');
    const lead = currentUserData.find(l => l.RTDBKey === key);
    
    if (!lead) return window.showToast("Lead data not found.", 'danger');
    
    $('#editLeadRtdbKey').val(key);
    $('#editCustomerName').val(lead.CustomerName).prop('disabled', true);
    $('#editMobileNumber').val(lead.MobileNumber);
    $('#editLeadFor').val(lead.LeadFor);
    $('#editLeadBy').val(lead.LeadBy);
    $('#editLastContact').val(lead.LastContact);
    $('#editRemark').val(lead.Remark);
    
    const editModal = new bootstrap.Modal(document.getElementById('leadEditModal'));
    editModal.show();
}

async function handleInlineSave(rtdbKey, field, value, element) {
    if (!rtdbKey) return window.showToast("Missing lead ID for update.", 'danger');
    if (!isAuthReady) return window.showToast("Please log in to update data.", 'danger');

    const updateObject = { [field]: value };
    const $element = $(element);
    $element.prop('disabled', true);
    
    try {
        const success = await window.saveEditedLead(rtdbKey, updateObject);
        if (success) {
            $element.removeClass('is-invalid is-valid').addClass('is-valid');
            setTimeout(() => $element.removeClass('is-valid'), 2000);
            await window.loadAndRenderData(false); 
        } else {
            $element.removeClass('is-valid is-invalid').addClass('is-invalid');
        }
    } catch (error) {
        console.error("Inline save error:", error);
        $element.removeClass('is-valid is-invalid').addClass('is-invalid');
    } finally {
        $element.prop('disabled', false);
    }
}

function filterLeads(searchTerm) {
    if (!currentUserData) return [];

    const lowerCaseSearch = searchTerm.toLowerCase();

    if (!lowerCaseSearch) {
        return currentUserData;
    }

    return currentUserData.filter(lead => {
        return (lead.CustomerName && lead.CustomerName.toLowerCase().includes(lowerCaseSearch)) ||
               (lead.MobileNumber && lead.MobileNumber.toLowerCase().includes(lowerCaseSearch)) ||
               (lead.LeadFor && lead.LeadFor.toLowerCase().includes(lowerCaseSearch)) ||
               (lead.Remark && lead.Remark.toLowerCase().includes(lowerCaseSearch));
    });
}

function renderLeadsTable(dataToRender) {
  const tableBody = $('#notesTable tbody');
  tableBody.empty();

  const data = dataToRender || currentUserData;

  if (!data || data.length === 0) {
    tableBody.append('<tr><td colspan="11" class="text-center text-muted">No lead data found.</td></tr>');
    return;
  }

  data.sort((a, b) => new Date(b.DateAdded) - new Date(a.DateAdded));

  data.forEach((row, index) => {
    const rtdbKey = row.RTDBKey || '';
    const {
      CustomerName = '',
      MobileNumber = '-',
      LeadFor = '-',
      LeadBy = '-',
      LastContact = '',
      Remark = '-',
      DateAdded = '',
      LastEdited = 'N/A',
    } = row;

    const callButton = (MobileNumber && MobileNumber.length > 5)
      ? `<a href="tel:${MobileNumber}" class="btn btn-sm btn-info text-white me-1" title="Call ${CustomerName}">
           <span class="material-symbols-outlined fs-6">call</span>
         </a>`
      : `<button class="btn btn-sm btn-secondary me-1" disabled title="No phone number">
           <span class="material-symbols-outlined fs-6">call</span>
         </button>`;
         
    const editButton = `<button class="btn btn-sm btn-warning edit-btn me-1" data-key="${rtdbKey}" title="Edit All Details">
           <span class="material-symbols-outlined fs-6">edit</span>
         </button>`;
         
    const remarkInput = `<textarea class="form-control form-control-sm lead-inline-edit" data-key="${rtdbKey}" data-field="Remark" rows="1" style="min-width: 150px; white-space: normal;">${Remark}</textarea>`;
    const contactInput = `<input type="date" class="form-control form-control-sm lead-inline-edit" data-key="${rtdbKey}" data-field="LastContact" value="${LastContact}" style="min-width: 140px;">`;


    const rowMarkup = `
      <tr>
        <td class="small">${index + 1}</td>
        <td class="small">${CustomerName}</td>
        <td class="small">${MobileNumber}</td>
        <td class="small">${LeadFor}</td>
        <td class="small">${LeadBy}</td>
        <td>${contactInput}</td>
        <td>${remarkInput}</td>
        <td class="small">${DateAdded}</td>
        <td class="small">${LastEdited}</td>
        <td>${callButton}</td>
        <td>
          ${editButton}
          <button class="btn btn-sm btn-danger delete-btn" data-key="${rtdbKey}" title="Delete Lead">
            <span class="material-symbols-outlined fs-6">delete</span>
          </button>
        </td>
      </tr>
    `;

    tableBody.append(rowMarkup);
  });

  $('.delete-btn').off('click').on('click', async function () {
    const key = $(this).data('key');
    if (!key) return window.showToast("Missing record ID.", 'danger');

    if (confirm("⚠️ Are you sure you want to delete this lead? This cannot be undone.")) {
      const success = await window.deleteSheetDBRow(key);
      if (success) await window.loadAndRenderData();
    }
  });
  
  $('.edit-btn').off('click').on('click', handleEditClick);
  
  $('.lead-inline-edit').off('change').on('change', function() {
    const $this = $(this);
    const key = $this.data('key');
    const field = $this.data('field');
    const value = $this.val().trim() || 'N/A'; 
    handleInlineSave(key, field, value, this);
  });
}

window.loadAndRenderData = async function(showLoadToast = true) {
  if (showLoadToast) window.showToast("Loading lead data...", 'info');
  currentUserData = await window.fetchSheetDBData();
  $('#leadSearchInput').val('');
  renderLeadsTable(currentUserData);
  if (showLoadToast) window.showToast(`✅ Loaded ${currentUserData.length} leads.`, 'success');
};

const DENOMINATIONS = [500, 200, 100, 50, 20, 10, 5, 2, 1];

function calculateTotalAmount() {
    let grandTotal = 0;
    
    $('#denominationTallyBody .note-count-input').each(function() {
        const count = parseInt($(this).val()) || 0;
        const noteValue = parseInt($(this).data('value'));
        const rowTotal = count * noteValue;
        grandTotal += rowTotal;
        $(this).closest('tr').find('.row-amount-display').text(rowTotal.toLocaleString('en-IN'));
    });

    $('#grandTotalDisplay').html(`₹${grandTotal.toLocaleString('en-IN')}`);
}

function initializeDenominationTable() {
    const tbody = $('#denominationTallyBody');
    tbody.empty();

    DENOMINATIONS.forEach(noteValue => {
        const type = (noteValue >= 10) ? 'Note' : 'Coin';
        
        const row = `
            <tr>
                <td>₹${noteValue} <span class="badge bg-secondary">${type}</span></td>
                <td class="text-center">
                    <input type="number" 
                           class="form-control form-control-sm text-center note-count-input" 
                           data-value="${noteValue}" 
                           min="0" 
                           value="0" 
                           style="width: 70px; margin: 0 auto;"
                           aria-label="Count for ₹${noteValue}">
                </td>
                <td class="text-end fw-bold row-amount-display">0</td>
            </tr>
        `;
        tbody.append(row);
    });
    
    $('.note-count-input').off('input').on('input', calculateTotalAmount);
    calculateTotalAmount(); 
}

$('#denominationModal').on('show.bs.modal', function () {
    initializeDenominationTable();
});

let emiChart;

function calculateEMI(P, R, N) {
    if (R === 0) return P / N;
    const ratePowerN = Math.pow(1 + R, N);
    const emi = (P * R * ratePowerN) / (ratePowerN - 1);
    return isFinite(emi) ? emi : 0;
}

function updateEMICalculator() {
    const principal = parseFloat($('#principalInput').val()) || 0;
    const years = parseFloat($('#timeInput').val()) || 0;
    const annualRate = parseFloat($('#rateSlider').val()) || 0;

    $('#rateDisplay').text(`${annualRate.toFixed(2)}%`);
    
    const monthlyRate = annualRate / (12 * 100); 
    const months = years * 12;

    let monthlyEMI = 0;
    let totalPayment = 0;
    let totalInterest = 0;
    
    if (principal > 0 && years > 0) {
        monthlyEMI = calculateEMI(principal, monthlyRate, months);
        totalPayment = monthlyEMI * months;
        totalInterest = totalPayment - principal;
    }

    const formatCurrency = (amount) => `₹${Math.round(amount).toLocaleString('en-IN')}`;

    $('#outputEMI').text(formatCurrency(monthlyEMI));
    $('#outputTotalInterest').text(formatCurrency(totalInterest));
    $('#outputTotalPayment').text(formatCurrency(totalPayment));

    updateEMIPieChart(principal, totalInterest);
}

function updateEMIPieChart(principal, totalInterest) {
    const ctx = document.getElementById('emiPieChart').getContext('2d');
    const principalRounded = Math.round(principal);
    const totalInterestRounded = Math.round(totalInterest);
    const dataValues = [principalRounded, totalInterestRounded];
    const dataLabels = [`Principal (${principalRounded.toLocaleString('en-IN')})`, `Interest (${totalInterestRounded.toLocaleString('en-IN')})`];
    
    const chartConfig = {
        type: 'pie',
        data: {
            labels: dataLabels,
            datasets: [{
                data: dataValues,
                backgroundColor: ['#198754', '#dc3545'],
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        boxWidth: 15
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed !== null) {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((context.parsed / total) * 100).toFixed(1) + '%';
                                label += percentage;
                            }
                            return label;
                        }
                    }
                }
            }
        }
    };

    if (emiChart) {
        emiChart.data.datasets[0].data = dataValues;
        emiChart.data.labels = dataLabels;
        emiChart.update();
    } else {
        emiChart = new Chart(ctx, chartConfig);
    }
}

    if (!window.isFirebaseAuthComplete && !window.firebase.auth.currentUser) {
        if (typeof window.disableTools === 'function') window.disableTools();
    }

    $('#noteEntryForm').on('submit', async function (e) {
        e.preventDefault();
        if (!isAuthReady) return window.showToast("Please log in to submit data.", 'danger');

        const leadData = {
            CustomerName: $('#customerName').val().trim(),
            MobileNumber: $('#mobileNumber').val().trim(),
            LeadFor: $('#leadFor').val(),
            LeadBy: $('#leadBy').val().trim() || 'N/A',
            LastContact: $('#lastContact').val(),
            Remark: $('#remark').val().trim() || 'N/A',
        };

        const success = await window.saveLeadEntry(leadData);
        if (success) {
            $('#noteEntryForm')[0].reset();
            bootstrap.Modal.getInstance(document.getElementById('leadEntryModal')).hide();
            await window.loadAndRenderData();
        }
    });

    $('#quickNoteForm').on('submit', async function (e) {
        e.preventDefault();
        if (!isAuthReady) return window.showToast("Please log in to save a note.", 'danger');

        const noteText = $('#noteTextarea').val().trim();

        if (!noteText) {
            window.showToast("Note cannot be empty.", 'warning');
            return;
        }

        const success = await window.saveQuickNote(noteText);

        if (success) {
            $('#noteTextarea').val('');
            await window.loadAndRenderQuickNotes(); 
            window.showToast("Note saved and updated.", 'success');
        }
    });

    $('#addLeadFromManageBtn').on('click', function () {
        $('#leadManageModal').modal('hide'); 
        const leadEntryModal = new bootstrap.Modal(document.getElementById('leadEntryModal'));
        leadEntryModal.show();
    });
    
    $('#leadSearchInput').on('input', function() {
        const searchTerm = $(this).val();
        const filteredData = filterLeads(searchTerm); 
        renderLeadsTable(filteredData);
    });

    $('#digitInput').on('input', function () {
        const value = parseInt($(this).val());
        const output = $('#spellingOutput');
        if (isNaN(value)) output.text('Enter a valid number.');
        else if (value < 0) output.text('Negative numbers not supported.');
        else output.text(numberToIndianWords(value));
    });
    
    $('.emi-calc-input').on('input', updateEMICalculator);

    $('#emiCalculatorModal').on('shown.bs.modal', updateEMICalculator);


let deferredPrompt = null;
const installBanner = document.getElementById('installBanner');
const installButton = document.getElementById('installButton');

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('./service-worker.js');
      console.log('Service Worker registered with scope:', registration.scope);
    } catch (err) {
      console.error('Service Worker registration failed:', err);
    }
  });
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;

  if (installBanner) {
    installBanner.classList.remove('d-none');
    installBanner.classList.add('d-flex', 'align-items-center', 'justify-content-between');
  }
});

if (installButton) {
  installButton.addEventListener('click', async () => {
    if (!deferredPrompt) {
      return;
    }

    if (installBanner) installBanner.classList.add('d-none');

    deferredPrompt.prompt();

    try {
      const { outcome } = await deferredPrompt.userChoice;
      console.log(outcome === 'accepted'
        ? 'User accepted the PWA installation'
        : 'User dismissed the PWA installation');
    } catch (err) {
      console.error('Error during PWA installation:', err);
    }

    deferredPrompt = null;
  });
}

window.addEventListener('appinstalled', () => {
  if (installBanner) installBanner.classList.add('d-none');
});
