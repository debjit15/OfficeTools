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
        window.isFirebaseAuthComplete = false;
        localStorage.removeItem('userDisplayName');
        localStorage.removeItem('userPhotoURL');
        localStorage.removeItem('userEmail');
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

    const $userPhoto = $('#userPhoto');
    const $modalUserPhoto = $('#modalUserPhoto');

    $userPhoto.attr('src', photoURL);
    $modalUserPhoto.attr('src', photoURL);

    const handleError = function() {
        $(this).attr('src', fallbackLogo);
    };

    $userPhoto.off('error').on('error', handleError);
    $modalUserPhoto.off('error').on('error', handleError);

    $('#userName').text(displayName);
    $('#modalUserName').text(displayName);
    $('#modalUserEmail').text(email);

    window.enableTools();
    window.showToast(`Welcome, ${displayName}!`, 'success');

    $('#leadManageModal').off('shown.bs.modal').on('shown.bs.modal', window.loadAndRenderData);
    $('#quickNoteModal').off('shown.bs.modal').on('shown.bs.modal', window.loadAndRenderQuickNotes);
};

window.firebaseAuthRequiredHandler = function() {
    window.disableTools();
};

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
