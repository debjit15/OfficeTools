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

window.googleLogin = async function() {
    if (!window.firebase || !window.firebase.auth || !window.firebase.signInWithPopup) {
        window.showToast("Authentication services are not initialized. Check Firebase module script.", 'danger');
        return;
    }
    
    try {
        window.showToast("Opening Google Sign-In...", 'info');
        // Use the signInWithPopup method from the Firebase SDK
        const result = await window.firebase.signInWithPopup(
            window.firebase.auth, 
            window.firebase.googleProvider
        );
        // The onAuthStateChanged listener handles the rest
    } catch (error) {
        // Handle common errors like popup being closed by the user
        if (error.code === 'auth/popup-closed-by-user') {
            window.showToast("Sign-in window closed.", 'warning');
        } else {
            console.error("Firebase Sign-In Error:", error);
            window.showToast(`Sign-in failed: ${error.message}`, 'danger');
        }
    }
};

// --- AUTHENTICATION & UI TOGGLE FUNCTIONS ---

function enableTools() {
    // Enable relevant tool cards
    $('.disabled-for-auth').removeClass('disabled-for-auth opacity-50')
        .removeAttr('title')
        .filter('[data-bs-target="#leadManageModal"]').attr('data-bs-toggle', 'modal'); 
        
    // Show the Floating Action Button (FAB)
    $('#quickNoteFab').removeClass('d-none'); 
    
    // Hide the Sign-In button and show the User Profile
    $('#googleSignInButtonContainer').addClass('d-none');
    $('#userProfileDisplay').removeClass('d-none');

    isAuthReady = true;
}

function disableTools() {
    // Disable access to all required tools
    $('.tool-card').each(function() {
        const card = $(this);
        const h3 = card.find('h3').text().trim();
        
        if (h3 === 'Lead Data Management' ) {
            card.addClass('disabled-for-auth opacity-50')
                .removeAttr('data-bs-toggle')
                .attr('title', 'Login required to use this tool.');
        }
    });
    
    // Hide the FAB
    $('#quickNoteFab').addClass('d-none'); 

    // Show the Sign-In button and hide the User Profile
    $('#googleSignInButtonContainer').removeClass('d-none');
    $('#userProfileDisplay').addClass('d-none');
    
    isAuthReady = false;
}

window.firebaseAuthSuccessHandler = function(user) {
    if (!user) { 
        user = firebase.auth.currentUser; 
    }

    // Determine display values
    const fallbackLogo = './Assets/icons/icon-256x256.png'; // your app logo
    const defaultPhoto = './Assets/icons/icon-256x256.png';
    const photoURL = user.photoURL || defaultPhoto;
    const displayName = user.displayName || 'User';
    const email = user.email || 'N/A';

    // Save to Local Storage
    localStorage.setItem('userDisplayName', displayName);
    localStorage.setItem('userPhotoURL', photoURL);
    localStorage.setItem('userEmail', email);

    // Apply to Navbar and Modal
    const $userPhoto = $('#userPhoto');
    const $modalUserPhoto = $('#modalUserPhoto');

    $userPhoto.attr('src', photoURL);
    $modalUserPhoto.attr('src', photoURL);

    // If image fails to load, use fallback logo
    $userPhoto.on('error', function() {
        $(this).attr('src', fallbackLogo);
    });

    $modalUserPhoto.on('error', function() {
        $(this).attr('src', fallbackLogo);
    });

    $('#userName').text(displayName);
    $('#modalUserName').text(displayName);
    $('#modalUserEmail').text(email);

    enableTools();
    
    window.showToast(`Welcome, ${displayName}!`, 'success');

    // Bind modal render logic
    $('#leadManageModal')
        .off('shown.bs.modal')
        .on('shown.bs.modal', loadAndRenderData);

    $('#quickNoteModal')
        .off('shown.bs.modal')
        .on('shown.bs.modal', loadAndRenderQuickNotes);
};

window.firebaseAuthRequiredHandler = function() {
   // disableTools();
};

window.signOutUser = async function() {
    try {
        await firebase.auth.signOut();
        window.FIREBASE_USER_UID = null;
        window.isFirebaseAuthComplete = false;
        
        // REMOVE USER DATA FROM LOCAL STORAGE
        localStorage.removeItem('userDisplayName');
        localStorage.removeItem('userPhotoURL');
        localStorage.removeItem('userEmail');
        // -----------------------------

        window.firebaseAuthRequiredHandler();
        $('#notesTable tbody').empty();
        window.showToast("You have been signed out.", 'info');
    } catch (error) {
        window.showToast("Sign-out failed. Please try again.", 'danger');
    }
};


// --- TOOL-SPECIFIC LOGIC (Lead Management, Quick Note, Spelling) ---

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

async function fetchQuickNotes() {
    if (!window.FIREBASE_USER_UID || !window.RTDB) { return []; }
    try {
        const path = `datatable/${window.FIREBASE_USER_UID}/quicknotes`;
        const notesRef = firebase.database.ref(window.RTDB, path);
        
        const snapshot = await firebase.database.get(notesRef);
        const data = snapshot.val();
        
        if (!data) { return []; }

        return Object.keys(data).map(key => ({
            ...data[key],
            RTDBKey: key, 
        })).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)); 

    } catch (error) {
        window.showToast(`Failed to load quick notes: ${error.message}`, 'danger');
        return [];
    }
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

    // Attach delete handler
    $('.delete-note-btn').off('click').on('click', async function() {
        if (!confirm("Delete this note?")) return;
        const rtdbKey = $(this).data('key');
        const success = await deleteQuickNote(rtdbKey);
        if (success) {
            loadAndRenderQuickNotes(); // Refresh list after deletion
        }
    });
}

async function deleteQuickNote(rtdbKey) {
    if (!window.FIREBASE_USER_UID || !window.RTDB) {
        window.showToast("Cannot delete data. User not authenticated.", 'danger');
        return false;
    }

    try {
        const path = `datatable/${window.FIREBASE_USER_UID}/quicknotes/${rtdbKey}`;
        const noteRef = firebase.database.ref(window.RTDB, path);
        await firebase.database.remove(noteRef);
        
        window.showToast("Note deleted successfully!", 'success');
        return true;
    } catch (error) {
        window.showToast(`Failed to delete note: ${error.message}`, 'danger');
        return false;
    }
}

async function loadAndRenderQuickNotes() {
    const notes = await fetchQuickNotes();
    renderQuickNotes(notes);
}

async function saveQuickNote(noteText) {
    if (!window.FIREBASE_USER_UID || !window.RTDB) {
        window.showToast("Cannot save note. User not authenticated.", 'danger');
        return false;
    }

    const path = `datatable/${window.FIREBASE_USER_UID}/quicknotes`;
    const timestamp = new Date().toLocaleString();

    const dataToSend = {
        Note: noteText,
        DateAdded: timestamp,
        timestamp: firebase.database.serverTimestamp(),
    };

    try {
        const notesRef = firebase.database.ref(window.RTDB, path);
        await firebase.database.push(notesRef, dataToSend);

        window.showToast("Quick Note saved successfully!", 'success');
        return true;
    } catch (error) {
        window.showToast(`Failed to save note: ${error.message}`, 'danger');
        return false;
    }
}

// ==========================
// 🔹 FIREBASE LEAD FUNCTIONS
// ==========================

async function fetchSheetDBData() {
  if (!window.FIREBASE_USER_UID || !window.RTDB) return [];

  try {
    const path = `datatable/${window.FIREBASE_USER_UID}/tabledata`;
    const userLeadsRef = firebase.database.ref(window.RTDB, path);
    const snapshot = await firebase.database.get(userLeadsRef);
    const data = snapshot.val();

    if (!data) return [];

    return Object.keys(data).map(key => ({
      ...data[key],
      RTDBKey: key,
    }));

  } catch (error) {
    console.error("❌ Fetch Error:", error);
    window.showToast(`Failed to load lead data: ${error.message}`, 'danger');
    return [];
  }
}

async function saveLeadEntry(leadData) {
  if (!window.FIREBASE_USER_UID || !window.RTDB) {
    window.showToast("Cannot save data. User not authenticated.", 'danger');
    return false;
  }

  const path = `datatable/${window.FIREBASE_USER_UID}/tabledata`;
  const dataToSend = {
    ...leadData,
    DateAdded: new Date().toLocaleString(),
    timestamp: firebase.database.serverTimestamp(),
  };

  try {
    const userLeadsRef = firebase.database.ref(window.RTDB, path);
    await firebase.database.push(userLeadsRef, dataToSend);
    window.showToast("✅ Lead entry saved successfully!", 'success');
    return true;
  } catch (error) {
    console.error("❌ Save Error:", error);
    window.showToast(`Failed to save lead: ${error.message}`, 'danger');
    return false;
  }
}

async function deleteSheetDBRow(rtdbKey) {
  if (!window.FIREBASE_USER_UID || !window.RTDB) {
    window.showToast("Cannot delete data. User not authenticated.", 'danger');
    return false;
  }

  try {
    const path = `datatable/${window.FIREBASE_USER_UID}/tabledata/${rtdbKey}`;
    const leadRef = firebase.database.ref(window.RTDB, path);
    await firebase.database.remove(leadRef);

    window.showToast("🗑️ Lead deleted successfully!", 'success');
    return true;
  } catch (error) {
    console.error("❌ Delete Error:", error);
    window.showToast(`Failed to delete lead: ${error.message}`, 'danger');
    return false;
  }
}

// ==========================
// 🔹 TABLE RENDER FUNCTION
// ==========================

function renderLeadsTable() {
  const tableBody = $('#notesTable tbody');
  tableBody.empty();

  if (!currentUserData || currentUserData.length === 0) {
    tableBody.append('<tr><td colspan="10" class="text-center text-muted">No lead data found.</td></tr>');
    return;
  }

  // Sort by DateAdded descending
  currentUserData.sort((a, b) => new Date(b.DateAdded) - new Date(a.DateAdded));

  currentUserData.forEach((row, index) => {
    const rtdbKey = row.RTDBKey || '';
    const {
      CustomerName = '',
      MobileNumber = '-',
      LeadFor = '-',
      LeadBy = '-',
      LastContact = '',
      Remark = '-',
      DateAdded = '',
    } = row;

    const callButton = (MobileNumber && MobileNumber.length > 5)
      ? `<a href="tel:${MobileNumber}" class="btn btn-sm btn-info text-white" title="Call ${CustomerName}">
           <span class="material-symbols-outlined fs-6">call</span>
         </a>`
      : `<button class="btn btn-sm btn-secondary" disabled title="No phone number">
           <span class="material-symbols-outlined fs-6">call</span>
         </button>`;

    const rowMarkup = `
      <tr>
        <td>${index + 1}</td>
        <td>${CustomerName}</td>
        <td>${MobileNumber}</td>
        <td>${LeadFor}</td>
        <td>${LeadBy}</td>
        <td>${LastContact}</td>
        <td>${Remark}</td>
        <td>${DateAdded}</td>
        <td>${callButton}</td>
        <td>
          <button class="btn btn-sm btn-danger delete-btn" data-key="${rtdbKey}" title="Delete Lead">
            <span class="material-symbols-outlined fs-6">delete</span>
          </button>
        </td>
      </tr>
    `;

    tableBody.append(rowMarkup);
  });

  // Delete event listener
  $('.delete-btn').off('click').on('click', async function () {
    const key = $(this).data('key');
    if (!key) return window.showToast("Missing record ID.", 'danger');

    if (confirm("⚠️ Are you sure you want to delete this lead? This cannot be undone.")) {
      const success = await deleteSheetDBRow(key);
      if (success) await loadAndRenderData();
    }
  });
}

// ==========================
// 🔹 LOAD + INIT FUNCTION
// ==========================

async function loadAndRenderData() {
  window.showToast("Loading lead data...", 'info');
  currentUserData = await fetchSheetDBData();
  renderLeadsTable();
  window.showToast(`✅ Loaded ${currentUserData.length} leads.`, 'success');
}

// ==========================
// 🔹 DOCUMENT READY EVENTS
// ==========================

$(document).ready(function () {
  // Disable tools if not authenticated
  if (!window.isFirebaseAuthComplete && !firebase.auth.currentUser) {
    if (typeof disableTools === 'function') disableTools();
  }

  // 🔸 Lead Entry Form Submit
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

    const success = await saveLeadEntry(leadData);
    if (success) {
      $('#noteEntryForm')[0].reset();
      bootstrap.Modal.getInstance(document.getElementById('leadEntryModal')).hide();
      await loadAndRenderData();
    }
  });
  
  // 🆕 🔸 QUICK NOTE FORM SUBMIT - Added to match new HTML
  $('#quickNoteForm').on('submit', async function (e) {
    e.preventDefault();
    if (!isAuthReady) return window.showToast("Please log in to save a note.", 'danger');

    const noteText = $('#noteTextarea').val().trim();

    if (!noteText) {
      window.showToast("Note cannot be empty.", 'warning');
      return;
    }

    const success = await saveQuickNote(noteText);

    if (success) {
      // Clear the textarea after saving
      $('#noteTextarea').val('');
      
      // Reload and render the notes list inside the modal immediately
      await loadAndRenderQuickNotes(); 
      window.showToast("Note saved and updated.", 'success');
    }
  });


  // 🔸 "Add Lead" from Manage Modal
  $('#addLeadFromManageBtn').on('click', function () {
    bootstrap.Modal.getInstance(document.getElementById('leadManageModal')).hide();
    const leadEntryModal = new bootstrap.Modal(document.getElementById('leadEntryModal'));
    leadEntryModal.show();
  });

  // 🔸 Number to Indian words converter (if applicable)
  $('#digitInput').on('input', function () {
    const value = parseInt($(this).val());
    const output = $('#spellingOutput');
    if (isNaN(value)) output.text('Enter a valid number.');
    else if (value < 0) output.text('Negative numbers not supported.');
    else output.text(numberToIndianWords(value));
  });
});


const DENOMINATIONS = [500, 200, 100, 50, 20, 10, 5, 2, 1];

/**
 * Calculates the total amount based on the counts entered in the table inputs.
 */
function calculateTotalAmount() {
    let grandTotal = 0;
    
    // Iterate over all input fields with the class 'note-count-input'
    $('#denominationTallyBody .note-count-input').each(function() {
        const count = parseInt($(this).val()) || 0;
        // The data-value attribute stores the denomination (e.g., 500, 100)
        const noteValue = parseInt($(this).data('value'));
        
        const rowTotal = count * noteValue;
        grandTotal += rowTotal;
        
        // Update the individual row amount display
        $(this).closest('tr').find('.row-amount-display').text(rowTotal.toFixed(0));
    });

    // Update the final grand total display
    $('#grandTotalDisplay').html(`₹${grandTotal.toLocaleString('en-IN')}`);
}

/**
 * Initializes the table rows with input fields for each denomination.
 */
function initializeDenominationTable() {
    const tbody = $('#denominationTallyBody');
    tbody.empty(); // Clear any previous rows

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
    
    // Attach the change listener to all newly created input fields
    $('.note-count-input').on('input', calculateTotalAmount);
    
    // Initial calculation when the table is loaded
    calculateTotalAmount(); 
}

// Event listener to initialize the table when the modal is shown
$('#denominationModal').on('show.bs.modal', function () {
    initializeDenominationTable();
});


// =======================================================
// 6. PROFESSIONAL LOAN/EMI CALCULATOR
// =======================================================
let emiChart; // Variable to hold the Chart.js instance

/**
 * The core EMI formula: EMI = [P x R x (1+R)^N] / [(1+R)^N-1]
 * @param {number} P Principal loan amount
 * @param {number} R Monthly interest rate (decimal)
 * @param {number} N Total number of months
 */
function calculateEMI(P, R, N) {
    if (R === 0) return P / N; // Simple division if interest is zero
    
    // (1+R)^N
    const ratePowerN = Math.pow(1 + R, N);
    
    // EMI formula
    const emi = (P * R * ratePowerN) / (ratePowerN - 1);
    
    return isFinite(emi) ? emi : 0;
}

/**
 * Updates all calculations and the pie chart.
 */
function updateEMICalculator() {
    // 1. Get Inputs
    const principal = parseFloat($('#principalInput').val()) || 0;
    const years = parseFloat($('#timeInput').val()) || 0;
    const annualRate = parseFloat($('#rateSlider').val()) || 0;

    // Display rate from slider
    $('#rateDisplay').text(`${annualRate.toFixed(2)}%`);
    
    // Convert to monthly rate (R_m) and total months (N)
    const monthlyRate = annualRate / (12 * 100); 
    const months = years * 12;

    let monthlyEMI = 0;
    let totalPayment = 0;
    let totalInterest = 0;
    
    if (principal > 0 && years > 0) {
        // 2. Calculate Core Values
        monthlyEMI = calculateEMI(principal, monthlyRate, months);
        totalPayment = monthlyEMI * months;
        totalInterest = totalPayment - principal;
    }

    // 3. Update Output Fields (Formatting as currency for clarity)
    const formatCurrency = (amount) => `₹${Math.round(amount).toLocaleString('en-IN')}`;

    $('#outputEMI').text(formatCurrency(monthlyEMI));
    $('#outputTotalInterest').text(formatCurrency(totalInterest));
    $('#outputTotalPayment').text(formatCurrency(totalPayment));

    // 4. Update Pie Chart
    updateEMIPieChart(principal, totalInterest);
}

/**
 * Initializes or updates the Chart.js Pie Chart.
 */
function updateEMIPieChart(principal, totalInterest) {
    const ctx = document.getElementById('emiPieChart').getContext('2d');
    
    // Data values
    const dataValues = [principal, totalInterest];
    
    // Data labels
    const dataLabels = [`Principal (${principal.toLocaleString('en-IN')})`, `Interest (${totalInterest.toLocaleString('en-IN')})`];
    
    // Chart Configuration
    const chartConfig = {
        type: 'pie',
        data: {
            labels: dataLabels,
            datasets: [{
                data: dataValues,
                backgroundColor: ['#198754', '#dc3545'], // Success (Green) for Principal, Danger (Red) for Interest
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
                            // Show percentage in the tooltip
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

    // Initialize or Update the chart
    if (emiChart) {
        // If chart exists, update its data
        emiChart.data.datasets[0].data = dataValues;
        emiChart.data.labels = dataLabels;
        emiChart.update();
    } else {
        // Otherwise, create a new chart instance
        emiChart = new Chart(ctx, chartConfig);
    }
}

// 5. Attach Event Listeners
$(document).ready(function() {
    // Attach the calculation function to all relevant input fields and the slider
    $('.emi-calc-input').on('input', updateEMICalculator);

    // Initial calculation when the modal is first shown
    $('#emiCalculatorModal').on('shown.bs.modal', function () {
        // Ensure initial values are used for calculation and chart drawing
        updateEMICalculator(); 
    });
});


if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('./service-worker.js');
      console.log('✅ Service Worker registered with scope:', registration.scope);
    } catch (err) {
      console.error('❌ Service Worker registration failed:', err);
    }
  });
}

let deferredPrompt = null;

// Elements
const installBanner = document.getElementById('installBanner');
const installButton = document.getElementById('installButton');

// Listen for beforeinstallprompt event
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault(); // Stop automatic prompt
  deferredPrompt = e;

  // Show custom install banner
  if (installBanner) {
    installBanner.classList.remove('d-none');
    installBanner.classList.add('d-flex', 'align-items-center', 'justify-content-between');
  }

  console.log('📲 beforeinstallprompt event captured');
});

// Handle install button click
if (installButton) {
  installButton.addEventListener('click', async () => {
    if (!deferredPrompt) {
      console.warn('⚠️ Install prompt not available yet.');
      return;
    }

    // Hide banner before showing native prompt
    if (installBanner) installBanner.classList.add('d-none');

    // Show native install prompt
    deferredPrompt.prompt();

    try {
      const { outcome } = await deferredPrompt.userChoice;
      console.log(outcome === 'accepted'
        ? '✅ User accepted the PWA installation'
        : '❌ User dismissed the PWA installation');
    } catch (err) {
      console.error('❌ Error during PWA installation:', err);
    }

    // Reset prompt
    deferredPrompt = null;
  });
}

// Optional: Handle appinstalled event
window.addEventListener('appinstalled', () => {
  console.log('📦 PWA installed successfully');
  if (installBanner) installBanner.classList.add('d-none');
});
