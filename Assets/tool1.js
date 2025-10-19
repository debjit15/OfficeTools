// Global Firebase references will be set in the index.html script block.
// window.firebase, window.FIREBASE_USER_UID, window.RTDB

window.googleLogin = async function() {
    if (!window.firebase || !window.firebase.auth || !window.firebase.signInWithPopup) {
        window.showToast("Authentication services are not initialized. Check Firebase module script.", 'danger');
        return;
    }
    
    try {
        window.showToast("Opening Google Sign-In...", 'info');
        await window.firebase.signInWithPopup(
            window.firebase.auth, 
            window.firebase.googleProvider
        );
    } catch (error) {
        if (error.code === 'auth/popup-closed-by-user') {
            window.showToast("Sign-in window closed.", 'warning');
        } else {
            console.error("Firebase Sign-In Error:", error);
            window.showToast(`Sign-in failed: ${error.message}`, 'danger');
        }
    }
};

window.signOutUser = async function() {
    try {
        await window.firebase.auth.signOut(); 
        window.FIREBASE_USER_UID = null;
        // isFirebaseAuthComplete status is updated via auth listener in index.html
        localStorage.clear();
        window.firebaseAuthRequiredHandler();
        $('#notesTable tbody').empty();
        window.showToast("You have been signed out.", 'info');
    } catch (error) {
        window.showToast("Sign-out failed. Please try again.", 'danger');
    }
};

window.firebaseAuthSuccessHandler = function(user) {
    if (!user) { 
        user = window.firebase.auth.currentUser; 
    }

    const fallbackLogo = './Assets/icons/icon-256x256.png';
    const photoURL = user.photoURL || fallbackLogo;
    const displayName = user.displayName || 'User';
    const email = user.email || 'N/A';

    localStorage.setItem('userDisplayName', displayName);
    localStorage.setItem('userPhotoURL', photoURL);
    localStorage.setItem('userEmail', email);

    // Update UI elements (defined in tool.js)
    window.enableTools(); 

    // Update profile display
    const $userPhoto = $('#userPhoto');
    const $modalUserPhoto = $('#modalUserPhoto');

    $userPhoto.attr('src', photoURL).off('error').on('error', function() { $(this).attr('src', fallbackLogo); });
    $modalUserPhoto.attr('src', photoURL).off('error').on('error', function() { $(this).attr('src', fallbackLogo); });

    $('#userName').text(displayName);
    $('#modalUserName').text(displayName);
    $('#modalUserEmail').text(email);

    window.showToast(`Welcome back, ${displayName}!`, 'success');

    // Load data only when a modal is fully shown to improve performance
    $('#leadManageModal').off('shown.bs.modal').on('shown.bs.modal', window.loadAndRenderData);
    $('#quickNoteModal').off('shown.bs.modal').on('shown.bs.modal', window.loadAndRenderQuickNotes);
};

window.firebaseAuthRequiredHandler = function() {
    // Disable tools UI (defined in tool.js)
    window.disableTools(); 
};

// --- RTDB Fetch Functions ---

window.fetchQuickNotes = async function() {
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
};

window.fetchSheetDBData = async function() {
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
};

// --- RTDB Save/Update/Delete Functions ---

window.saveQuickNote = async function(noteText) {
    if (!window.FIREBASE_USER_UID || !window.RTDB) {
        window.showToast("Cannot save note. User not authenticated.", 'danger');
        return false;
    }

    const path = `datatable/${window.FIREBASE_USER_UID}/quicknotes`;
    const timestamp = new Date().toLocaleString();

    const dataToSend = {
        Note: noteText,
        DateAdded: timestamp,
        timestamp: window.firebase.database.serverTimestamp(),
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
};

window.deleteQuickNote = async function(rtdbKey) {
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
};

window.saveLeadEntry = async function(leadData) {
  if (!window.FIREBASE_USER_UID || !window.RTDB) {
    window.showToast("Cannot save data. User not authenticated.", 'danger');
    return false;
  }

  const path = `datatable/${window.FIREBASE_USER_UID}/tabledata`;
  const dataToSend = {
    ...leadData,
    DateAdded: new Date().toLocaleString(),
    LastEdited: 'N/A',
    timestamp: window.firebase.database.serverTimestamp(),
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
};

window.saveEditedLead = async function(rtdbKey, updatedData) {
    if (!window.FIREBASE_USER_UID || !window.RTDB) {
        window.showToast("Cannot update data. User not authenticated or RTDB object missing.", 'danger');
        return false;
    }

    const { ref, update } = window.firebase.database; 

    const path = `datatable/${window.FIREBASE_USER_UID}/tabledata/${rtdbKey}`;
    
    const dataToUpdate = {
        ...updatedData,
        LastEdited: new Date().toLocaleString(),
    };

    try {
        const leadRef = ref(window.RTDB, path);
        await update(leadRef, dataToUpdate);
        
        window.showToast("✏️ Lead updated successfully!", 'success');
        return true;
    } catch (error) {
        console.error("❌ Update Error:", error);
        window.showToast(`Failed to update lead: ${error.message}`, 'danger');
        return false;
    }
};

window.deleteSheetDBRow = async function(rtdbKey) {
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
};

// --- Form Submissions ---

$('#noteEntryForm').on('submit', async function (e) {
    e.preventDefault();
    // Auth check is implicitly handled by saveLeadEntry, but keep client side validation
    if (!window.FIREBASE_USER_UID) return window.showToast("Please log in to submit data.", 'danger');

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
    if (!window.FIREBASE_USER_UID) return window.showToast("Please log in to save a note.", 'danger');

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


// --- PWA Service Worker ---

let deferredPrompt = null;
const installBanner = document.getElementById('installBanner');
const installButton = document.getElementById('installButton');

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('./service-worker.js');
      // console.log('Service Worker registered with scope:', registration.scope);
    } catch (err) {
      // console.error('Service Worker registration failed:', err);
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
      await deferredPrompt.userChoice;
      // console.log(outcome === 'accepted' ? 'User accepted' : 'User dismissed');
    } catch (err) {
      console.error('Error during PWA installation:', err);
    }

    deferredPrompt = null;
  });
}

window.addEventListener('appinstalled', () => {
  if (installBanner) installBanner.classList.add('d-none');
});
