// Mobile App Logic

// Global State
let mobileCurrentDate = new Date('2025-12-29T12:00:00');

// Mock Templates (in a real app, these would come from backend/settings)
const formTemplates = {
    'wartung_gas': {
        title: 'Wartung Gastherme',
        description: '- Brenner gereinigt\n- Zündelektroden geprüft\n- Druckausgleichsbehälter geprüft\n- Abgasmessung durchgeführt',
        materials: '1x Dichtungssatz A\n1x Zündelektrode Typ B'
    },
    'bad_sani': {
        title: 'Badsanierung Rohbau',
        description: '- Alte Leitungen entfernt\n- Schlitze gestemmt\n- Abflussleitungen DN50 verlegt\n- Spülkasten montiert',
        materials: '5m HT-Rohr DN50\n4x Bogen 45°\n1x GIS-Modul WC'
    },
    'heizung_stoerung': {
        title: 'Störungsbehebung Heizung',
        description: '- Fehlerspeicher ausgelesen (Fehler F4)\n- Pumpe gängig gemacht\n- Anlage entlüftet\n- Probelauf erfolgreich',
        materials: 'Kleinmaterial'
    }
};

document.addEventListener('DOMContentLoaded', () => {
    // Current Page Detection
    if (document.getElementById('next-job-card')) {
        populateMobileDashboard();
    }
    if (document.getElementById('schedule-list')) {
        initScheduleHelper();
    }

    // Auto-Init Signatures if standard Canvas present
    const canvasList = document.querySelectorAll('canvas.signature-canvas');
    canvasList.forEach(canvas => {
        new SignaturePad(canvas);
    });
});

/* --- SIGNATURE PAD LOGIC --- */
class SignaturePad {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.isDrawing = false;

        // Resize canvas to match display size (prevent pixelation)
        this.resize();
        window.addEventListener('resize', () => this.resize());

        // Events
        this.canvas.addEventListener('mousedown', (e) => this.start(e));
        this.canvas.addEventListener('mousemove', (e) => this.draw(e));
        this.canvas.addEventListener('mouseup', () => this.stop());
        this.canvas.addEventListener('mouseout', () => this.stop());

        this.canvas.addEventListener('touchstart', (e) => this.start(e), { passive: false });
        this.canvas.addEventListener('touchmove', (e) => this.draw(e), { passive: false });
        this.canvas.addEventListener('touchend', () => this.stop());
    }

    resize() {
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
    }

    getPos(e) {
        const rect = this.canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    }

    start(e) {
        e.preventDefault();
        this.isDrawing = true;
        const pos = this.getPos(e);
        this.ctx.beginPath();
        this.ctx.moveTo(pos.x, pos.y);
    }

    draw(e) {
        if (!this.isDrawing) return;
        e.preventDefault();
        const pos = this.getPos(e);
        this.ctx.lineTo(pos.x, pos.y);
        this.ctx.stroke();
    }

    stop() {
        this.isDrawing = false;
    }

    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
}

// Global helper to clear a specific canvas by ID substring
window.clearSignature = function (padId) {
    const canvas = document.querySelector(`#${padId} canvas`);
    // Re-initialize or just clear rect if we had access to the instance. 
    // For simplicity, we just clear context.
    if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
};


/* --- TEMPLATE LOGIC --- */
window.applyTemplate = function (selectElement) {
    const key = selectElement.value;
    if (!key || !formTemplates[key]) return;

    const tpl = formTemplates[key];

    // Find fields (Assuming standardised IDs for the Work Report page)
    const title = document.getElementById('report-title'); // "Kunde/Projekt" input often doubles as title context
    const order = document.getElementById('report-order'); // NEW: Specific Order field
    const desc = document.getElementById('report-desc');
    const mat = document.getElementById('report-materials');

    // Confirm override
    if (desc && desc.value.length > 5 && !confirm('Vorhandenen Text überschreiben?')) return;

    if (desc) desc.value = tpl.description;
    if (mat) mat.value = tpl.materials;
    if (order) order.value = tpl.title; // Auto-fill Order field with template title
    // if (title) title.value = tpl.title; // Keep Project/Customer separate
};

/* --- DICTATION LOGIC --- */
window.startDictation = function (fieldId) {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        alert('Diktierfunktion wird in diesem Browser nicht unterstützt. Bitte nutzen Sie Google Chrome oder Safari.');
        return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.lang = 'de-DE';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    const field = document.getElementById(fieldId);
    if (!field) return;

    // Visual feedback (simple placeholder change or border)
    const originalPlaceholder = field.placeholder;
    field.placeholder = 'Sprechen Sie jetzt...';
    field.style.borderColor = 'var(--accent-color)';

    recognition.start();

    recognition.onresult = function (event) {
        const transcript = event.results[0][0].transcript;
        // Append text if not empty, handling spacing
        if (field.value.trim().length > 0) {
            field.value += ' ' + transcript;
        } else {
            field.value = transcript;
        }
    };

    recognition.onspeechend = function () {
        recognition.stop();
        field.placeholder = originalPlaceholder;
        field.style.borderColor = '';
    };

    recognition.onerror = function (event) {
        console.error('Speech recognition error', event.error);
        field.placeholder = originalPlaceholder;
        field.style.borderColor = '';
        if (event.error === 'not-allowed') {
            alert('Bitte erlauben Sie den Zugriff auf das Mikrofon.');
        }
    };
};

/* --- SHARED HELPER FOR A4 CONTENT --- */
window.generateA4HTML = function () {
    // 1. Gather Data (Duplicate logic for safety/independence)
    // We try to get values from standard IDs.
    const order = document.getElementById('report-order')?.value || '-';
    const title = document.getElementById('report-title')?.value || '-';
    const date = document.querySelector('input[type="date"]')?.value || new Date().toLocaleDateString('de-DE');
    const desc = document.getElementById('report-desc')?.value || '-';
    const mat = document.getElementById('report-materials')?.value || '-';

    // Time input hunting
    let time = '-';
    const labels = document.querySelectorAll('.form-label');
    for (let l of labels) {
        if (l.textContent.includes('Arbeitszeit')) {
            const input = l.nextElementSibling;
            if (input) time = input.value;
            break;
        }
    }

    // Signatures
    const canvasCustomer = document.querySelector('#pad-customer canvas');
    const canvasTech = document.querySelector('#pad-technician canvas');
    const sigCustomerData = canvasCustomer ? canvasCustomer.toDataURL() : '';
    const sigTechData = canvasTech ? canvasTech.toDataURL() : '';

    const today = new Date().toLocaleDateString('de-DE');

    return `
        <div class="a4-page">
            <div class="a4-header">
                <div>
                    <div class="a4-title">Arbeitsnachweis</div>
                    <div style="margin-top:5px; font-weight:600;">Handwerker GmbH & Co. KG</div>
                </div>
                <div class="a4-meta">
                    Datum: ${date}<br>
                    Dokument-Nr: ${Math.floor(Math.random() * 10000) + 1000}
                </div>
            </div>

            <div class="a4-section">
                <span class="a4-label">Auftrag / Tätigkeit</span>
                <div class="a4-value" style="font-weight: bold;">${order}</div>
            </div>

            <div class="a4-section">
                <span class="a4-label">Kunde / Projekt</span>
                <div class="a4-value">${title}</div>
            </div>

            <div class="a4-section" style="border: 1px solid #eee; padding: 10px; background: #f9f9f9;">
                <span class="a4-label">Beschreibung der durchgeführten Arbeiten</span>
                <div class="a4-value" style="min-height: 100px;">${desc}</div>
            </div>

            <div class="a4-section">
                <span class="a4-label">Verwendetes Material</span>
                <div class="a4-value">${mat}</div>
            </div>

            <div class="a4-section">
                <span class="a4-label">Arbeitszeit</span>
                <div class="a4-value">${time} Stunden</div>
            </div>

            <div class="a4-signatures">
                <div class="a4-sig-box">
                    <div style="height: 80px; display: flex; align-items: flex-end;">
                        ${sigCustomerData ? `<img src="${sigCustomerData}" class="a4-sig-img" alt="Unterschrift Kunde">` : '<div style="color:#ccc; font-style:italic; padding-bottom:5px;">Keine Unterschrift</div>'}
                    </div>
                    <div class="a4-label" style="border-top: 1px solid #333; margin-top:5px;">Unterschrift Auftraggeber</div>
                </div>
                
                <div class="a4-sig-box">
                    <div style="height: 80px; display: flex; align-items: flex-end;">
                        ${sigTechData ? `<img src="${sigTechData}" class="a4-sig-img" alt="Unterschrift Techniker">` : '<div style="color:#ccc; font-style:italic; padding-bottom:5px;">Keine Unterschrift</div>'}
                    </div>
                    <div class="a4-label" style="border-top: 1px solid #333; margin-top:5px;">Unterschrift Handwerker</div>
                </div>
            </div>
            
            <div style="margin-top: 50px; font-size: 10px; color: #999; text-align: center;">
                Dieses Dokument wurde digital erstellt und ist auch ohne Unterschrift gültig (AGB beachten).<br>
                Generiert am ${today}
            </div>
        </div>
    `;
};

/* --- PREVIEW LOGIC --- */
/* --- PREVIEW LOGIC --- */
window.showA4Preview = function (docTitle) {
    // 1. Gather Data
    const order = document.getElementById('report-order')?.value || '-';
    const title = document.getElementById('report-title')?.value || '-';
    const date = document.querySelector('input[type="date"]')?.value || new Date().toLocaleDateString('de-DE');
    const desc = document.getElementById('report-desc')?.value || '-';
    const mat = document.getElementById('report-materials')?.value || '-';
    // Work time input doesn't have an ID in previous step, let's try to find it or defaulting
    // Ideally we should have added an ID. Assuming it's the 3rd input type=number or similar.
    // Let's use a querySelector for the input in the "Arbeitszeit" row.
    // Finding input after label "Arbeitszeit (Std)"
    let time = '-';
    const labels = document.querySelectorAll('.form-label');
    for (let l of labels) {
        if (l.textContent.includes('Arbeitszeit')) {
            const input = l.nextElementSibling;
            if (input) time = input.value;
            break;
        }
    }

    // 2. Capture Signatures
    const canvasCustomer = document.querySelector('#pad-customer canvas');
    const canvasTech = document.querySelector('#pad-technician canvas');

    // Check if not empty (simple check) -- relying on if user drew something.
    // We can use toDataURL.
    const sigCustomerData = canvasCustomer ? canvasCustomer.toDataURL() : '';
    const sigTechData = canvasTech ? canvasTech.toDataURL() : '';

    // 3. Build HTML
    const overlay = document.createElement('div');
    overlay.className = 'a4-preview-overlay';

    const today = new Date().toLocaleDateString('de-DE');

    overlay.innerHTML = `
        <div class="print-controls">
            <button class="btn-print-action" onclick="window.print()">
                <i class="fas fa-print"></i> Drucken / PDF
            </button>
            <button class="btn-close-preview" onclick="closeA4Preview(this)">
                <i class="fas fa-times"></i> Schließen
            </button>
        </div>

        <div class="a4-page">
            <div class="a4-header">
                <div>
                    <div class="a4-title">Arbeitsnachweis</div>
                    <div style="margin-top:5px; font-weight:600;">Handwerker GmbH & Co. KG</div>
                </div>
                <div class="a4-meta">
                    Datum: ${date}<br>
                    Dokument-Nr: ${Math.floor(Math.random() * 10000) + 1000}
                </div>
            </div>

            <div class="a4-section">
                <span class="a4-label">Auftrag / Tätigkeit</span>
                <div class="a4-value" style="font-weight: bold;">${order}</div>
            </div>

            <div class="a4-section">
                <span class="a4-label">Kunde / Projekt</span>
                <div class="a4-value">${title}</div>
            </div>

            <div class="a4-section" style="border: 1px solid #eee; padding: 10px; background: #f9f9f9;">
                <span class="a4-label">Beschreibung der durchgeführten Arbeiten</span>
                <div class="a4-value" style="min-height: 100px;">${desc}</div>
            </div>

            <div class="a4-section">
                <span class="a4-label">Verwendetes Material</span>
                <div class="a4-value">${mat}</div>
            </div>

            <div class="a4-section">
                <span class="a4-label">Arbeitszeit</span>
                <div class="a4-value">${time} Stunden</div>
            </div>

            <div class="a4-signatures">
                <div class="a4-sig-box">
                    <div style="height: 80px; display: flex; align-items: flex-end;">
                        ${sigCustomerData ? `<img src="${sigCustomerData}" class="a4-sig-img" alt="Unterschrift Kunde">` : '<div style="color:#ccc; font-style:italic; padding-bottom:5px;">Keine Unterschrift</div>'}
                    </div>
                    <div class="a4-label" style="border-top: 1px solid #333; margin-top:5px;">Unterschrift Auftraggeber</div>
                </div>
                
                <div class="a4-sig-box">
                     <div style="height: 80px; display: flex; align-items: flex-end;">
                        ${sigTechData ? `<img src="${sigTechData}" class="a4-sig-img" alt="Unterschrift Techniker">` : '<div style="color:#ccc; font-style:italic; padding-bottom:5px;">Keine Unterschrift</div>'}
                    </div>
                    <div class="a4-label" style="border-top: 1px solid #333; margin-top:5px;">Unterschrift Handwerker</div>
                </div>
            </div>
            
            <div style="margin-top: 50px; font-size: 10px; color: #999; text-align: center;">
                Dieses Dokument wurde digital erstellt und ist auch ohne Unterschrift gültig (AGB beachten).<br>
                Generiert am ${today}
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
};

window.closeA4Preview = function (btn) {
    const overlay = btn.closest('.a4-preview-overlay');
    if (overlay) {
        overlay.remove();
    }
};

window.saveDocument = async function () {
    const btn = document.querySelector('.btn-sign');
    if (btn) btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Speichern...';

    // 1. Gather Data
    const order = document.getElementById('report-order')?.value || 'Unbekannt';
    const title = document.getElementById('report-title')?.value || 'Kunde'; // Doubles as Customer Name usually
    const date = document.querySelector('input[type="date"]')?.value || new Date().toISOString().split('T')[0];

    // Generate PDF (DOM Attachment Fix)
    const element = document.createElement('div');
    element.innerHTML = generateA4HTML();

    // IMPORTANT: Append to body so html2canvas can render it.
    // Use z-index to hide instead of far-off positioning to be safe.
    element.style.position = 'absolute';
    element.style.left = '0';
    element.style.top = '0';
    element.style.zIndex = '-1000';
    document.body.appendChild(element);

    // PDF Config
    const opt = {
        margin: 0,
        filename: 'document.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    let pdfBase64 = null;

    try {
        console.log("Starting PDF generation...");

        // Timeout Promise: Rejects after 5 seconds
        const timeout = new Promise((_, reject) => {
            setTimeout(() => reject(new Error("PDF generation timed out")), 5000);
        });

        // Race: Whichever finishes first wins
        pdfBase64 = await Promise.race([
            html2pdf().set(opt).from(element).output('datauristring'),
            timeout
        ]);

        console.log("PDF generated. Length: " + (pdfBase64 ? pdfBase64.length : 'null'));
    } catch (e) {
        console.error("PDF Generation failed or timed out:", e);
        // We proceed without PDF, so the user doesn't lose data
    } finally {
        if (document.body.contains(element)) {
            document.body.removeChild(element);
        }
    }

    // 2. Prepare Data Object
    const docData = {
        title: title, // Customer/Project
        order_name: order,
        date: date,
        type: 'Arbeitsnachweis',
        content: {
            // Store PDF Data here
            pdf_data: pdfBase64,

            desc: document.getElementById('report-desc')?.value || '',
            materials: document.getElementById('report-materials')?.value || '',
            time: document.querySelector('input[type="number"]')?.value || '',
            signatures: {
                customer: document.querySelector('#pad-customer canvas')?.toDataURL() || '',
                technician: document.querySelector('#pad-technician canvas')?.toDataURL() || ''
            }
        },
        desc: document.getElementById('report-desc')?.value || '',
        materials: document.getElementById('report-materials')?.value || '',
        time: document.querySelector('input[type="number"]')?.value || '', // weak selector, but matches current form
        signatures: {
            customer: document.querySelector('#pad-customer canvas')?.toDataURL() || '',
            technician: document.querySelector('#pad-technician canvas')?.toDataURL() || ''
        }
    },
        created_at: new Date().toISOString()
};

// 3. Save to Supabase (documents table)
if (window.supa) {
    try {
        const { data, error } = await window.supa
            .from('documents')
            .insert([docData]);

        if (error) throw error;
        console.log('Document saved to Supabase');
    } catch (err) {
        console.error('Supabase save failed:', err);
        alert('Fehler beim Speichern in der Cloud. Speichere lokal...');
        saveToLocal(docData);
    }
} else {
    saveToLocal(docData);
}

alert('Dokument erfolgreich gespeichert!');
window.location.href = 'documents.html';
};

function saveToLocal(docData) {
    const existing = JSON.parse(localStorage.getItem('offline_docs') || '[]');
    existing.push(docData);
    localStorage.setItem('offline_docs', JSON.stringify(existing));
}

// Load Documents for Mobile List
async function loadMobileDocuments() {
    const list = document.getElementById('completed-docs-list');
    if (!list) return;

    let docs = [];

    // Fetch from Supabase
    if (window.supa) {
        try {
            const { data, error } = await window.supa
                .from('documents')
                .select('*')
                .eq('type', 'Arbeitsnachweis')
                .order('date', { ascending: false });

            if (data) docs = data;
        } catch (err) {
            console.error('Fetch docs error:', err);
        }
    }

    // Merge Local (Offline) Docs
    const localDocs = JSON.parse(localStorage.getItem('offline_docs') || '[]');
    // Simple merge (could duplicate if synced, but for now ok)
    docs = [...docs, ...localDocs];

    // Deduplicate by loose ID/content check if needed, mainly date+title
    // Sort logic (Newest first)
    docs.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Render
    if (docs.length === 0) {
        list.innerHTML = `<div style="text-align: center; padding: 20px; color: var(--text-muted);">Keine Dokumente gefunden.</div>`;
        return;
    }

    list.innerHTML = '';
    docs.forEach(doc => {
        const dateObj = new Date(doc.date);
        const dateStr = dateObj.toLocaleDateString('de-DE');

        const item = document.createElement('div');
        item.className = 'task-item';
        item.innerHTML = `
            <div style="width: 40px; height: 40px; background: rgba(80, 227, 194, 0.1); border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-right: 15px; color: var(--accent-color);">
                <i class="fas fa-file-invoice"></i>
            </div>
            <div style="flex: 1;">
                <div style="font-weight: 500;">${doc.title}</div>
                <div style="font-size: 0.8rem; color: var(--text-muted);">${doc.order_name} | ${dateStr}</div>
            </div>
            <div style="margin-left: auto; color: var(--text-muted);">
                <i class="fas fa-download"></i>
            </div>
        `;
        // Click to mock open/download
        item.onclick = () => alert(`Öffne Dokument:\n${doc.order_name}\n${dateStr}`);
        list.appendChild(item);
    });
}

// Auto-call on Documents page
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('completed-docs-list')) {
        loadMobileDocuments();
    }
});


/* --- EXISTING DASHBOARD & SCHEDULE LOGIC --- */
/* --- DATA FETCHING & UI UPDATES --- */

// Helper to fetch jobs assigned to the current user
async function fetchMyJobs() {
    if (!window.supa) return [];

    try {
        const { data: { session } } = await window.supa.auth.getSession();
        if (!session) return [];

        const userId = session.user.id;
        console.log('Fetching jobs for user:', userId);

        // Fetch jobs where assignments.user_id == current user
        // Using inner join to filter
        const { data, error } = await window.supa
            .from('jobs')
            .select('*, job_assignments!inner(user_id)')
            .eq('job_assignments.user_id', userId)
            .eq('status', 'geplant');

        if (error) {
            console.error('Error fetching my jobs:', error);
            return [];
        }

        return data.map(j => ({
            id: j.id,
            title: j.title,
            customer: 'Kunde ' + (j.customer_id ? j.customer_id.substring(0, 6) : '?'),
            start: j.planned_start,
            end: j.planned_end,
            status: j.status,
            type: j.description || 'Standard',
            description: j.description
        }));

    } catch (err) {
        console.error('Fetch exception:', err);
        return [];
    }
}

async function populateMobileDashboard() {
    let jobs = [];
    const currentUserId = 'u1'; // Placeholder if we don't have user object yet, but checkAuth handles session.

    // FETCH DATA
    if (window.supa) {
        try {
            const { data: { session } } = await window.supa.auth.getSession();
            const userEmail = session ? session.user.email : '';

            // We need to match user to employee ID if possible, or just show all for now?
            // For simplicity in this step, let's fetch ALL planned jobs sorted by start time.
            // In a real app we would filter by 'assigned_to'.

            const { data, error } = await window.supa
                .from('jobs')
                .select('*')
                .eq('status', 'geplant')
                .order('planned_start', { ascending: true });

            if (!error && data) {
                jobs = data.map(j => ({
                    id: j.id,
                    title: j.title,
                    customer: 'Kunde', // Placeholder or fetch
                    start: j.planned_start,
                    end: j.planned_end,
                    status: j.status,
                    type: j.description || 'Standard',
                    assigned_to: ['u1'] // dummy
                }));
            }
        } catch (err) {
            console.error('Mobile fetch error:', err);
        }
    }

    // Fallback if no real data
    if (jobs.length === 0 && window.mockData) {
        jobs = window.mockData.jobs.filter(j => j.assigned_to.includes(currentUserId) && j.status !== 'offen');
        jobs.sort((a, b) => new Date(a.start) - new Date(b.start));
    }

    const nextJob = jobs.find(j => new Date(j.end || j.start) > new Date());
    const container = document.getElementById('next-job-card');

    if (nextJob) {
        const startTime = nextJob.start ? new Date(nextJob.start).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : '--:--';
        const endTime = nextJob.end ? new Date(nextJob.end).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : '--:--';
        container.innerHTML = `
            <div class="card-title">${nextJob.title}</div>
            <div class="card-subtitle" style="margin-bottom: 10px;">
                <i class="fas fa-clock"></i> ${startTime} - ${endTime} <br>
                <i class="fas fa-map-marker-alt"></i> ${nextJob.customer || 'Kunde'}
            </div>
            <div class="status-badge status-planned">Geplant</div>
            <button style="display: block; width: 100%; padding: 12px; background-color: var(--primary-color); color: white; border: none; border-radius: 8px; margin-top: 15px; font-weight: 500;">Zum Auftrag</button>
        `;
    } else {
        container.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 10px;">Keine anstehenden Aufträge.</div>`;
    }
}

/* --- CALENDAR VIEW LOGIC --- */

let currentMobileView = 'day'; // day, week, month, year

function initScheduleHelper() {
    // Add Event Listeners for View Switcher
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Update UI
            document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');

            // Update State
            currentMobileView = e.target.getAttribute('data-view');
            populateSchedule();
        });
    });

    document.getElementById('prev-day').addEventListener('click', () => changeDate(-1));
    document.getElementById('next-day').addEventListener('click', () => changeDate(1));

    // Set to Today initially
    mobileCurrentDate = new Date();
    populateSchedule();
}

function changeDate(delta) {
    // Delta depends on view
    if (currentMobileView === 'day') {
        mobileCurrentDate.setDate(mobileCurrentDate.getDate() + delta);
    } else if (currentMobileView === 'week') {
        mobileCurrentDate.setDate(mobileCurrentDate.getDate() + (delta * 7));
    } else if (currentMobileView === 'month') {
        mobileCurrentDate.setMonth(mobileCurrentDate.getMonth() + delta);
    } else if (currentMobileView === 'year') {
        mobileCurrentDate.setFullYear(mobileCurrentDate.getFullYear() + delta);
    }
    populateSchedule();
}

async function populateSchedule() {
    const container = document.getElementById('schedule-list');
    const dateDisplay = document.getElementById('current-date-display');
    if (!container || !dateDisplay) return;

    // Loading State
    container.innerHTML = '<div style="text-align:center; padding: 20px;">Lade...</div>';

    // Fetch Jobs (Optimization: could fetch range based on view)
    let jobs = await fetchMyJobs();
    if (jobs.length === 0 && window.mockData && !window.supa) jobs = window.mockData.jobs;

    // Render based on View
    if (currentMobileView === 'day') {
        renderDayView(container, dateDisplay, jobs);
    } else if (currentMobileView === 'week') {
        renderWeekView(container, dateDisplay, jobs);
    } else if (currentMobileView === 'month') {
        renderMonthView(container, dateDisplay, jobs);
    } else if (currentMobileView === 'year') {
        renderYearView(container, dateDisplay, jobs);
    }
}

/* --- RENDER FUNCTIONS --- */

function renderDayView(container, dateDisplay, jobs) {
    const options = { weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit' };
    dateDisplay.innerText = mobileCurrentDate.toLocaleDateString('de-DE', options);

    const selectedDateStr = mobileCurrentDate.toISOString().split('T')[0];

    // Filter for Selected Date
    const dailyJobs = jobs.filter(j => j.start && j.start.startsWith(selectedDateStr));

    if (dailyJobs.length === 0) {
        container.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 40px;">
            <i class="fas fa-calendar-times" style="font-size: 2rem; margin-bottom: 10px; color: #eee;"></i><br>
            Keine Aufträge für diesen Tag.
        </div>`;
        return;
    }

    // Build Timeline (08:00 - 18:00)
    let html = '<div class="timeline-container">';
    for (let i = 8; i <= 18; i++) {
        const hour = String(i).padStart(2, '0') + ':00';
        const jobsInHour = dailyJobs.filter(job => new Date(job.start).getHours() === i);

        html += `
            <div class="time-slot">
                <div class="time-label">${hour}</div>
                ${jobsInHour.length > 0 ? '<div class="timeline-point"></div>' : ''}
                ${jobsInHour.map(job => {
            const timeEnd = job.end ? new Date(job.end).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : '??:??';
            let borderCol = job.type && job.type.includes('Wartung') ? 'var(--accent-color)' : 'var(--primary-color)';
            return `
                    <div class="timeline-event" style="border-left-color: ${borderCol}">
                        <div style="font-weight: 600; margin-bottom: 4px;">${job.title}</div>
                        <div style="font-size: 0.85rem; color: var(--text-muted);">
                            <i class="fas fa-clock"></i> Bis ${timeEnd} <br>
                            <i class="fas fa-map-marker-alt"></i> ${job.customer}
                        </div>
                    </div>`;
        }).join('')}
            </div>`;
    }
    html += '</div>';
    container.innerHTML = html;
}

function renderWeekView(container, dateDisplay, jobs) {
    // Calculate start of week (Monday)
    const startOfWeek = new Date(mobileCurrentDate);
    const day = startOfWeek.getDay() || 7; // Get current day number, make Sunday (0) -> 7
    if (day !== 1) startOfWeek.setHours(-24 * (day - 1));

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    dateDisplay.innerText = `KW ${getWeekNumber(mobileCurrentDate)}`;

    let html = '<div style="padding-bottom: 20px;">';

    // Loop 7 days
    for (let i = 0; i < 7; i++) {
        const loopDate = new Date(startOfWeek);
        loopDate.setDate(startOfWeek.getDate() + i);
        const dateStr = loopDate.toISOString().split('T')[0];
        const dayJobs = jobs.filter(j => j.start && j.start.startsWith(dateStr));

        const isToday = new Date().toISOString().split('T')[0] === dateStr;

        html += `
        <div class="week-day-row" style="${isToday ? 'border: 1px solid var(--primary-color);' : ''}">
            <div class="week-day-header">
                <span>${loopDate.toLocaleDateString('de-DE', { weekday: 'long' })}</span>
                <span>${loopDate.getDate()}.${loopDate.getMonth() + 1}.</span>
            </div>
            `;

        if (dayJobs.length === 0) {
            html += `<div style="font-size: 0.8rem; color: #ccc;">Frei / Keine Termine</div>`;
        } else {
            dayJobs.forEach(job => {
                const timeStart = new Date(job.start).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
                const timeEnd = job.end ? new Date(job.end).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : '';
                let borderCol = job.type && job.type.includes('Wartung') ? 'var(--accent-color)' : 'var(--primary-color)';

                html += `
                <div style="margin-top: 5px; padding: 8px; background: #f8f9fa; border-radius: 6px; border-left: 3px solid ${borderCol};">
                    <div style="font-weight: 600; font-size: 0.9rem;">${job.title}</div>
                    <div style="font-size: 0.8rem; color: var(--text-muted);">
                        <i class="fas fa-clock"></i> ${timeStart} - ${timeEnd} | ${job.customer}
                    </div>
                </div>`;
            });
        }
        html += `</div>`;
    }
    html += '</div>';
    container.innerHTML = html;
}

function renderMonthView(container, dateDisplay, jobs) {
    const year = mobileCurrentDate.getFullYear();
    const month = mobileCurrentDate.getMonth(); // 0-indexed

    dateDisplay.innerText = mobileCurrentDate.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });

    // Days in month
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayIndex = new Date(year, month, 1).getDay() || 7; // 1 (Mon) - 7 (Sun)

    let html = `
    <div class="calendar-grid">
        <div class="calendar-day-header">Mo</div>
        <div class="calendar-day-header">Di</div>
        <div class="calendar-day-header">Mi</div>
        <div class="calendar-day-header">Do</div>
        <div class="calendar-day-header">Fr</div>
        <div class="calendar-day-header">Sa</div>
        <div class="calendar-day-header">So</div>
    `;

    // Empty slots before first day
    for (let i = 1; i < firstDayIndex; i++) {
        html += `<div class="calendar-day empty"></div>`;
    }

    // Days
    for (let d = 1; d <= daysInMonth; d++) {
        const loopDate = new Date(year, month, d, 12, 0, 0); // Noon to avoid timezone shifts
        const dateStr = loopDate.toISOString().split('T')[0];
        const isToday = new Date().toISOString().split('T')[0] === dateStr;
        const hasJob = jobs.some(j => j.start && j.start.startsWith(dateStr));

        html += `
        <div class="calendar-day ${isToday ? 'today' : ''}" onclick="selectDateFromMonth('${dateStr}')">
            <span>${d}</span>
            ${hasJob ? '<div class="has-events-dot"></div>' : ''}
        </div>`;
    }

    html += `</div>`;

    // Legend or list below? Maybe just the grid is enough for overview
    html += `<div style="text-align: center; margin-top: 15px; color: var(--text-muted); font-size: 0.8rem;">Tippen für Details</div>`;

    container.innerHTML = html;
}

function renderYearView(container, dateDisplay, jobs) {
    const year = mobileCurrentDate.getFullYear();
    dateDisplay.innerText = String(year);

    const months = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
    const currentMonthIndex = new Date().getMonth();
    const isCurrentYear = new Date().getFullYear() === year;

    let html = `<div class="year-grid">`;

    months.forEach((m, index) => {
        const isCurrent = isCurrentYear && index === currentMonthIndex;
        html += `
        <div class="year-month ${isCurrent ? 'current-month' : ''}" onclick="selectMonthFromYear(${index})">
            ${m}
        </div>`;
    });

    html += `</div>`;
    container.innerHTML = html;
}

// Helpers for Navigation
window.selectDateFromMonth = function (dateStr) {
    mobileCurrentDate = new Date(dateStr);
    currentMobileView = 'day';
    updateViewButtons();
    populateSchedule();
};

window.selectMonthFromYear = function (monthIndex) {
    mobileCurrentDate.setMonth(monthIndex);
    currentMobileView = 'month';
    updateViewButtons();
    populateSchedule();
};

function updateViewButtons() {
    document.querySelectorAll('.view-btn').forEach(btn => {
        if (btn.getAttribute('data-view') === currentMobileView) btn.classList.add('active');
        else btn.classList.remove('active');
    });
}

function getWeekNumber(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    var weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return weekNo;
}
