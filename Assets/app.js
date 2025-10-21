// ------------------- Diary Data -------------------
let diaryEntries = {}; // Stored as { "YYYY-MM-DD": "Entry text..." }
let currentDate = new Date(); 
let pageDates = [];

// ------------------- Quill Editor Setup -------------------
const quill = new Quill('#editor-container', {
    theme: 'snow',
    placeholder: 'Write your diary entry here...'
});

// ------------------- Page Rendering -------------------
function formatDate(date) {
    return date.toISOString().split("T")[0];
}

function renderPage(dateStr) {
    const entryContent = document.getElementById("pagedEntryContent");
    entryContent.classList.add("page-flip", "next");

    setTimeout(() => {
        entryContent.innerHTML = diaryEntries[dateStr] 
            ? `<p class="today-entry">${diaryEntries[dateStr]}</p>` 
            : `<p class="text-center text-muted today-entry">No entry for this date.</p>`;
        entryContent.classList.remove("page-flip", "next", "prev");
    }, 200);

    document.getElementById("pagedEntryDate").textContent = new Date(dateStr).toDateString();

    // Update page info
    pageDates = Object.keys(diaryEntries).sort();
    const pageIndex = pageDates.indexOf(dateStr) + 1 || 0;
    document.getElementById("pageInfo").textContent = `Page ${pageIndex} of ${pageDates.length}`;
    
    // Enable/disable nav buttons
    document.getElementById("prevPageBtn").disabled = pageIndex <= 1;
    document.getElementById("nextPageBtn").disabled = pageIndex >= pageDates.length || pageIndex === 0;
}

// ------------------- Navigation Buttons -------------------
document.getElementById("prevPageBtn").addEventListener("click", () => {
    const idx = pageDates.indexOf(formatDate(currentDate));
    if(idx > 0) {
        currentDate = new Date(pageDates[idx - 1]);
        renderPage(formatDate(currentDate));
    }
});

document.getElementById("nextPageBtn").addEventListener("click", () => {
    const idx = pageDates.indexOf(formatDate(currentDate));
    if(idx < pageDates.length - 1) {
        currentDate = new Date(pageDates[idx + 1]);
        renderPage(formatDate(currentDate));
    }
});

// ------------------- Calendar -------------------
function generateCalendar(month, year) {
    const calendarGrid = document.getElementById("calendarGrid");
    calendarGrid.innerHTML = "";
    
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month+1, 0).getDate();
    const todayStr = formatDate(new Date());

    // Empty cells
    for(let i=0; i<firstDay; i++) calendarGrid.innerHTML += `<div class="calendar-day empty"></div>`;

    for(let d=1; d<=daysInMonth; d++){
        const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const isToday = dateStr === todayStr;
        const hasEntry = diaryEntries[dateStr] ? true : false;

        calendarGrid.innerHTML += `<div class="calendar-day ${isToday ? 'today' : ''} ${hasEntry ? 'has-entry' : ''}" 
            onclick="goToDate('${dateStr}')">${d}</div>`;
    }

    document.getElementById("currentMonthYear").textContent = `${new Date(year, month).toLocaleString('default', { month: 'long' })} ${year}`;
}

function goToDate(dateStr) {
    currentDate = new Date(dateStr);
    renderPage(dateStr);
    const calendarModal = bootstrap.Modal.getInstance(document.getElementById('calendarModal'));
    calendarModal.hide();
}

// Calendar navigation
document.getElementById("prevMonthBtn").addEventListener("click", () => {
    let month = currentDate.getMonth() - 1;
    let year = currentDate.getFullYear();
    if(month < 0){ month = 11; year--; }
    generateCalendar(month, year);
});
document.getElementById("nextMonthBtn").addEventListener("click", () => {
    let month = currentDate.getMonth() + 1;
    let year = currentDate.getFullYear();
    if(month > 11){ month = 0; year++; }
    generateCalendar(month, year);
});

// ------------------- Save Entry -------------------
document.getElementById("saveEntryBtn").addEventListener("click", () => {
    const content = quill.root.innerHTML.trim();
    if(!content) return alert("Entry cannot be empty.");
    const dateStr = formatDate(currentDate);
    diaryEntries[dateStr] = content;

    renderPage(dateStr);
    generateCalendar(currentDate.getMonth(), currentDate.getFullYear());
    const editorModal = bootstrap.Modal.getInstance(document.getElementById('editorModal'));
    editorModal.hide();
    quill.setContents([{ insert: '\n' }]); // Clear editor
    updateSummary();
});

// ------------------- Summary -------------------
function updateSummary() {
    const summaryList = document.getElementById("diarySummaryList");
    summaryList.innerHTML = "";

    const sortedDates = Object.keys(diaryEntries).sort();
    if(sortedDates.length === 0) {
        summaryList.innerHTML = `<li class="list-group-item text-center text-muted">No entries this year.</li>`;
        return;
    }

    sortedDates.forEach(dateStr => {
        const li = document.createElement("li");
        li.className = "list-group-item";
        li.innerHTML = `<strong>${new Date(dateStr).toDateString()}:</strong> ${diaryEntries[dateStr].replace(/<[^>]*>?/gm, '').substring(0,50)}...`;
        li.style.cursor = "pointer";
        li.addEventListener("click", () => {
            goToDate(dateStr);
            const summaryModal = bootstrap.Modal.getInstance(document.getElementById('summaryModal'));
            summaryModal.hide();
        });
        summaryList.appendChild(li);
    });
}

// ------------------- Theme Switching -------------------
document.querySelectorAll(".color-option").forEach(el => {
    el.addEventListener("click", () => {
        document.body.className = "theme-" + el.dataset.theme;
        document.querySelectorAll(".color-option").forEach(e=>e.classList.remove("active"));
        el.classList.add("active");
    });
});

// ------------------- Edit Button -------------------
document.getElementById("goToEditBtn").addEventListener("click", () => {
    const dateStr = formatDate(currentDate);
    const content = diaryEntries[dateStr] || "";
    quill.root.innerHTML = content;
    const editorModal = new bootstrap.Modal(document.getElementById('editorModal'));
    editorModal.show();
});

// ------------------- Initialize -------------------
renderPage(formatDate(currentDate));
generateCalendar(currentDate.getMonth(), currentDate.getFullYear());
updateSummary();