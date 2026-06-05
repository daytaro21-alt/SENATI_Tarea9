/* ═══════════════════════════════════════════════════════════════════════════
   CLASIFICADOR DE TRÁMITES — Frontend Logic
   Upload → classify → render result → history (SQLite DB) → catalog
   ═══════════════════════════════════════════════════════════════════════════ */

// ─── STATE ────────────────────────────────────────────────────────────────────
const state = {
    file: null,
    loading: false,
    historyCount: 0,
};

// ─── DOM ─────────────────────────────────────────────────────────────────────
const dropZone          = document.getElementById('dropZone');
const fileInput         = document.getElementById('fileInput');
const fileInfoBar       = document.getElementById('fileInfoBar');
const fileInfoName      = document.getElementById('fileInfoName');
const fileInfoSize      = document.getElementById('fileInfoSize');
const fileTypeIcon      = document.getElementById('fileTypeIcon');
const fileRemoveBtn     = document.getElementById('fileRemoveBtn');
const btnAnalyze        = document.getElementById('btnAnalyze');
const btnLabel          = document.getElementById('btnLabel');
const btnSpinner        = document.getElementById('btnSpinner');

const resultEmpty       = document.getElementById('resultEmpty');
const resultBody        = document.getElementById('resultBody');
const priorityBadgeLg   = document.getElementById('priorityBadgeLg');
const priorityText      = document.getElementById('priorityText');
const resultTypeValue   = document.getElementById('resultTypeValue');
const scoreNumber       = document.getElementById('scoreNumber');
const scoreFill         = document.getElementById('scoreFill');
const scoreTrack        = document.getElementById('scoreTrack');
const breakBase         = document.getElementById('breakBase');
const breakType         = document.getElementById('breakType');
const breakAge          = document.getElementById('breakAge');
const routingOfficeIcon = document.getElementById('routingOfficeIcon');
const routingOfficeName = document.getElementById('routingOfficeName');
const ageBonusCard      = document.getElementById('ageBonusCard');
const ageDesc           = document.getElementById('ageDesc');
const ageBonusBadge     = document.getElementById('ageBonusBadge');
const excerptText       = document.getElementById('excerptText');

const historyEmpty      = document.getElementById('historyEmpty');
const historyTableWrap   = document.getElementById('historyTableWrap');
const historyBody       = document.getElementById('historyBody');

const toast             = document.getElementById('toast');
const toastIcon         = document.getElementById('toastIcon');
const toastMsg          = document.getElementById('toastMsg');
const toastClose        = document.getElementById('toastClose');

// Operator panel DOM elements
const btnOperatorToggle     = document.getElementById('btnOperatorToggle');
const operatorDrawer        = document.getElementById('operatorDrawer');
const operatorDrawerOverlay = document.getElementById('operatorDrawerOverlay');
const btnOperatorClose      = document.getElementById('btnOperatorClose');
const operatorDocList       = document.getElementById('operatorDocList');

// Document details modal DOM elements
const docDetailsModal        = document.getElementById('docDetailsModal');
const docDetailsModalOverlay = document.getElementById('docDetailsModalOverlay');
const btnDetailsClose        = document.getElementById('btnDetailsClose');
const modalIcon              = document.getElementById('modalIcon');
const modalTitle             = document.getElementById('modal-title');
const modalSubtitle          = document.getElementById('modalSubtitle');
const detailYear             = document.getElementById('detailYear');
const detailSize             = document.getElementById('detailSize');
const detailTimestamp        = document.getElementById('detailTimestamp');
const detailScoreNum         = document.getElementById('detailScoreNum');
const detailBase             = document.getElementById('detailBase');
const detailTypeBonus        = document.getElementById('detailTypeBonus');
const detailAgeBonus         = document.getElementById('detailAgeBonus');
const detailOffice           = document.getElementById('detailOffice');
const detailPriority         = document.getElementById('detailPriority');
const detailSimilarityList   = document.getElementById('detailSimilarityList');
const detailFullText         = document.getElementById('detailFullText');
const btnCopyText            = document.getElementById('btnCopyText');

// ─── FILE SELECTION ──────────────────────────────────────────────────────────

dropZone.addEventListener('click', () => fileInput.click());

dropZone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        fileInput.click();
    }
});

fileInput.addEventListener('change', (e) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
});

fileRemoveBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    clearFile();
});

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', (e) => {
    if (!dropZone.contains(e.relatedTarget)) {
        dropZone.classList.remove('drag-over');
    }
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const f = e.dataTransfer?.files?.[0];
    if (!f) return;
    const lower = f.name.toLowerCase();
    if (!lower.endsWith('.pdf') && !lower.endsWith('.docx')) {
        showToast('Solo se aceptan archivos PDF o DOCX.', 'error');
        return;
    }
    setFile(f);
});

function setFile(file) {
    state.file = file;
    const lower = file.name.toLowerCase();
    const isPdf = lower.endsWith('.pdf');

    fileInfoName.textContent = file.name;
    fileInfoSize.textContent = formatSize(file.size);
    fileTypeIcon.textContent = isPdf ? '📕' : '📘';

    fileInfoBar.classList.remove('hidden');
    btnAnalyze.disabled = false;
    btnLabel.textContent = '🔍  Analizar documento';
    btnAnalyze.classList.remove('loading');
}

function clearFile() {
    state.file = null;
    fileInput.value = '';
    fileInfoBar.classList.add('hidden');
    btnAnalyze.disabled = true;
    btnLabel.textContent = 'Selecciona un archivo primero';
    btnAnalyze.classList.remove('loading');
}

// ─── ANALYZE ─────────────────────────────────────────────────────────────────

btnAnalyze.addEventListener('click', analyze);

async function analyze() {
    if (!state.file || state.loading) return;

    state.loading = true;
    setButtonLoading(true);

    const formData = new FormData();
    formData.append('file', state.file);

    try {
        const response = await fetch('/api/classify', {
            method: 'POST',
            body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || `Error del servidor (${response.status})`);
        }

        renderResult(data);
        await loadHistory();
        showToast(`✅ Clasificado como: ${data.tramite_type}`, 'success');

    } catch (err) {
        const msg = err.message?.includes('fetch')
            ? 'No se pudo conectar con el servidor. ¿Está corriendo el backend?'
            : err.message || 'Error desconocido.';
        showToast(`Error: ${msg}`, 'error');
    } finally {
        state.loading = false;
        setButtonLoading(false);
    }
}

function setButtonLoading(loading) {
    if (loading) {
        btnLabel.textContent = 'Analizando documento...';
        btnSpinner.classList.remove('hidden');
        btnAnalyze.disabled = true;
        btnAnalyze.classList.add('loading');
    } else {
        btnLabel.textContent = state.file ? '🔍  Analizar documento' : 'Selecciona un archivo primero';
        btnSpinner.classList.add('hidden');
        btnAnalyze.disabled = !state.file;
        btnAnalyze.classList.remove('loading');
    }
}

// ─── RENDER RESULT ────────────────────────────────────────────────────────────

function renderResult(data) {
    resultEmpty.classList.add('hidden');
    resultBody.classList.remove('hidden');

    priorityBadgeLg.className = 'priority-badge-lg';
    const priorityClass = {
        'CRÍTICA':    'is-critica',
        'IMPORTANTE': 'is-importante',
        'RUTINARIO':  'is-rutinario',
    }[data.priority] || 'is-rutinario';
    priorityBadgeLg.classList.add(priorityClass);
    priorityText.textContent = data.priority;

    resultTypeValue.textContent = data.tramite_type;

    routingOfficeIcon.textContent = data.office_icon;
    routingOfficeName.textContent = data.office;

    const sb = data.score_breakdown;
    breakBase.textContent = `Base: ${sb.base}`;
    breakType.textContent = `Tipo: +${sb.type_bonus}`;
    breakAge.textContent  = `Antigüedad: +${sb.age_bonus}`;

    scoreFill.style.width = '0%';
    scoreNumber.innerHTML = `0<span class="score-max">/100</span>`;
    scoreTrack.setAttribute('aria-valuenow', data.score);

    requestAnimationFrame(() => {
        setTimeout(() => {
            scoreFill.style.width = `${data.score}%`;
        }, 60);
        animateCounter(0, data.score, 900, (v) => {
            scoreNumber.innerHTML = `${v}<span class="score-max">/100</span>`;
        });
    });

    ageDesc.textContent = data.age_description || 'Sin información de fecha';
    ageBonusBadge.textContent = `+${data.age_bonus} pts`;
    ageBonusCard.style.opacity = data.age_bonus > 0 ? '1' : '0.55';

    const raw = data.text_excerpt || '';
    excerptText.textContent = raw.length > 320
        ? raw.substring(0, 320) + '…'
        : (raw || 'No disponible');
}

function animateCounter(from, to, durationMs, callback) {
    const start = performance.now();
    function step(now) {
        const elapsed = now - start;
        const t = Math.min(elapsed / durationMs, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        callback(Math.round(from + (to - from) * eased));
        if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
}

// ─── PERSISTENT DATABASE HISTORY ──────────────────────────────────────────────

async function loadHistory() {
    try {
        const res = await fetch('/api/history');
        if (!res.ok) return;
        const documents = await res.json();
        state.historyCount = documents.length;
        renderHistoryTable(documents);
    } catch (e) {
        console.warn('No se pudo cargar el historial:', e.message);
    }
}

function renderHistoryTable(documents) {
    if (!documents || documents.length === 0) {
        historyEmpty.classList.remove('hidden');
        historyTableWrap.classList.add('hidden');
        historyBody.innerHTML = '';
        return;
    }

    historyEmpty.classList.add('hidden');
    historyTableWrap.classList.remove('hidden');
    historyBody.innerHTML = '';

    documents.forEach((doc, idx) => {
        const time = formatTimestamp(doc.timestamp);
        const editedBadge = doc.edited ? ' <span class="doc-card-edited-badge" style="margin-left:4px">Modificado</span>' : '';
        const badgeHtml = `<span class="badge badge-${doc.color}">${doc.priority}${editedBadge}</span>`;
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${documents.length - idx}</td>
            <td title="${escapeHtml(doc.filename)}">${escapeHtml(truncateFilename(doc.filename, 20))}</td>
            <td>${escapeHtml(doc.tramite_type)}</td>
            <td>${badgeHtml}</td>
            <td><strong>${doc.score}</strong>/100</td>
            <td>${escapeHtml(doc.office_icon + ' ' + doc.office)}</td>
            <td style="font-variant-numeric:tabular-nums">${time}</td>
            <td style="text-align: center;">
                <button class="btn-delete-history" title="Eliminar documento">🗑️</button>
            </td>
        `;
        tr.querySelector('.btn-delete-history').addEventListener('click', (e) => {
            e.stopPropagation();
            deleteDocument(doc.id, doc.filename);
        });
        historyBody.appendChild(tr);
    });
}

// ─── OPERATOR DRAWER LOGIC ───────────────────────────────────────────────────

const OFFICE_ICONS = {
    "Oficina de Registro Civil": "⚖️",
    "Oficina de Protección Familiar": "🛡️",
    "Gerencia de Salud Municipal": "🏥",
    "Gerencia de Transportes": "🚗",
    "Gerencia de Urbanismo y Obras": "🏗️",
    "Gerencia de Desarrollo Económico": "🏪",
    "Mesa de Partes General": "📋",
    "Gerencia de Rentas": "💰",
    "Gerencia de Catastro": "🗺️"
};

const COLOR_CLASS_MAP = {
    "CRÍTICA": "critica",
    "IMPORTANTE": "importante",
    "RUTINARIO": "rutinario"
};

const PRIORITY_LEVELS = {
    "CRÍTICA": 3,
    "IMPORTANTE": 2,
    "RUTINARIO": 1
};

const BASE_SCORES = { "CRÍTICA": 80, "IMPORTANTE": 50, "RUTINARIO": 20 };
const TYPE_BONUSES = { "CRÍTICA": 10, "IMPORTANTE": 5, "RUTINARIO": 2 };

function openOperatorDrawer() {
    operatorDrawer.classList.remove('hidden');
    operatorDrawerOverlay.classList.remove('hidden');
    loadOperatorPanelDocs();
}

function closeOperatorDrawer() {
    operatorDrawer.classList.add('hidden');
    operatorDrawerOverlay.classList.add('hidden');
}

function openDetailsModal(doc) {
    docDetailsModal.classList.remove('hidden');
    docDetailsModalOverlay.classList.remove('hidden');
    
    // Fill text & header info
    modalIcon.textContent = doc.filename.toLowerCase().endsWith('.pdf') ? '📕' : '📘';
    modalTitle.textContent = doc.tramite_type;
    modalSubtitle.textContent = doc.filename;
    
    // Info General
    detailYear.textContent = doc.document_year ? doc.document_year : 'Sin fecha detectada';
    detailSize.textContent = formatSize(doc.file_size || 0);
    
    // Date formatting (timestamp)
    let processedTime = '—';
    try {
        if (doc.timestamp) {
            const date = new Date(doc.timestamp);
            processedTime = date.toLocaleString('es-PE');
        }
    } catch (e) {
        console.error(e);
    }
    detailTimestamp.textContent = processedTime;
    
    // Urgencia (IA)
    detailScoreNum.textContent = doc.score;
    const sb = doc.score_breakdown || {};
    detailBase.textContent = sb.base !== undefined ? sb.base : '0';
    detailTypeBonus.textContent = sb.type_bonus !== undefined ? `+${sb.type_bonus}` : '+0';
    detailAgeBonus.textContent = sb.age_bonus !== undefined ? `+${sb.age_bonus}` : '+0';
    
    // Enrutamiento
    detailOffice.textContent = `${doc.office_icon || '📋'} ${doc.office}`;
    detailPriority.textContent = doc.priority;
    
    // Similitud Coseno (Cálculos de la IA)
    detailSimilarityList.innerHTML = '';
    const alternatives = doc.alternatives || [];
    if (alternatives.length === 0) {
        detailSimilarityList.innerHTML = '<div style="font-size:0.75rem; color:var(--text-light)">No hay alternativas registradas.</div>';
    } else {
        alternatives.forEach(alt => {
            const item = document.createElement('div');
            item.className = 'similarity-item';
            item.innerHTML = `
                <div class="similarity-info">
                    <span class="similarity-name" title="${escapeHtml(alt.name)}">${escapeHtml(alt.name)}</span>
                    <span class="similarity-pct">${alt.similarity}%</span>
                </div>
                <div class="similarity-bar-container">
                    <div class="similarity-bar-fill" style="width: 0%"></div>
                </div>
            `;
            detailSimilarityList.appendChild(item);
            
            // Animar el ancho de la barra
            requestAnimationFrame(() => {
                setTimeout(() => {
                    const fill = item.querySelector('.similarity-bar-fill');
                    if (fill) fill.style.width = `${alt.similarity}%`;
                }, 50);
            });
        });
    }
    
    // Full text
    detailFullText.textContent = doc.full_text || 'Sin texto extraído disponible.';
    
    // Clipboard setup
    btnCopyText.textContent = '📋 Copiar';
    btnCopyText.onclick = () => {
        navigator.clipboard.writeText(doc.full_text || '').then(() => {
            btnCopyText.textContent = '✅ Copiado';
            setTimeout(() => {
                btnCopyText.textContent = '📋 Copiar';
            }, 2000);
        }).catch(err => {
            showToast('Error al copiar texto: ' + err.message, 'error');
        });
    };
}

function closeDetailsModal() {
    docDetailsModal.classList.add('hidden');
    docDetailsModalOverlay.classList.add('hidden');
}

async function deleteDocument(id, filename) {
    if (!confirm(`¿Estás seguro de que querés eliminar el archivo "${filename}"?`)) {
        return;
    }
    try {
        const res = await fetch(`/api/documents/${id}`, {
            method: 'DELETE',
        });
        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.detail || `Error del servidor (${res.status})`);
        }
        showToast(`✅ Archivo "${filename}" eliminado correctamente.`, 'success');
        
        closeDetailsModal();
        await loadHistory();
        if (!operatorDrawer.classList.contains('hidden')) {
            await loadOperatorPanelDocs();
        }
    } catch (err) {
        showToast(`Error al eliminar: ${err.message}`, 'error');
    }
}

btnOperatorToggle.addEventListener('click', openOperatorDrawer);
btnOperatorClose.addEventListener('click', closeOperatorDrawer);
operatorDrawerOverlay.addEventListener('click', closeOperatorDrawer);

btnDetailsClose.addEventListener('click', closeDetailsModal);
docDetailsModalOverlay.addEventListener('click', closeDetailsModal);
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeDetailsModal();
    }
});

async function loadOperatorPanelDocs() {
    try {
        const res = await fetch('/api/history');
        if (!res.ok) throw new Error('Error de conexión');
        const documents = await res.json();
        renderOperatorPanelList(documents);
    } catch (e) {
        operatorDocList.innerHTML = `<div class="operator-empty-state">Error al cargar historial: ${e.message}</div>`;
    }
}

function renderOperatorPanelList(documents) {
    if (!documents || documents.length === 0) {
        operatorDocList.innerHTML = `<div class="operator-empty-state">No hay documentos procesados aún.</div>`;
        return;
    }

    operatorDocList.innerHTML = '';
    documents.forEach(doc => {
        const card = document.createElement('div');
        card.className = `operator-doc-card ${doc.edited ? 'is-edited' : ''}`;
        
        const time = formatTimestamp(doc.timestamp);
        const editedBadge = doc.edited ? '<span class="doc-card-edited-badge">Modificado</span>' : '';
        
        let officeOptions = '';
        for (const office of Object.keys(OFFICE_ICONS)) {
            const selected = doc.office === office ? 'selected' : '';
            officeOptions += `<option value="${office}" ${selected}>${office}</option>`;
        }

        let priorityOptions = '';
        for (const prio of ["CRÍTICA", "IMPORTANTE", "RUTINARIO"]) {
            const selected = doc.priority === prio ? 'selected' : '';
            priorityOptions += `<option value="${prio}" ${selected}>${prio}</option>`;
        }

        card.innerHTML = `
            <div class="doc-card-header" style="position: relative; padding-right: 32px;">
                <p class="doc-card-filename" title="${escapeHtml(doc.filename)}">${escapeHtml(truncateFilename(doc.filename, 28))}</p>
                ${editedBadge}
                <button class="btn-card-delete" data-id="${doc.id}" title="Eliminar documento" aria-label="Eliminar documento" style="position: absolute; right: 0; top: 0; background: transparent; border: none; cursor: pointer; font-size: 1rem; color: var(--text-light); transition: color var(--t-fast), transform var(--t-fast); padding: 4px;">
                    🗑️
                </button>
            </div>
            <p class="doc-card-meta">Procesado a las ${time} &nbsp;·&nbsp; Score: <strong>${doc.score}</strong>/100</p>
            
            <div class="doc-card-form">
                <div class="form-group">
                    <label for="prio-${doc.id}">Prioridad</label>
                    <select class="form-select" id="prio-${doc.id}">
                        ${priorityOptions}
                    </select>
                </div>
                <div class="form-group">
                    <label for="office-${doc.id}">Destinación</label>
                    <select class="form-select" id="office-${doc.id}">
                        ${officeOptions}
                    </select>
                </div>
                <button class="btn-card-open" data-id="${doc.id}" style="grid-column: span 1;">
                    👁️ Abrir
                </button>
                <button class="btn-card-save" data-id="${doc.id}" style="grid-column: span 1;">
                    💾 Guardar
                </button>
            </div>
        `;
        
        card.querySelector('.btn-card-open').addEventListener('click', () => {
            openDetailsModal(doc);
        });

        card.querySelector('.btn-card-delete').addEventListener('click', (e) => {
            e.stopPropagation();
            deleteDocument(doc.id, doc.filename);
        });

        card.querySelector('.btn-card-save').addEventListener('click', async (e) => {
            const btn = e.currentTarget;
            const docId = btn.dataset.id;
            const newPriority = document.getElementById(`prio-${docId}`).value;
            const newOffice = document.getElementById(`office-${docId}`).value;
            
            btn.disabled = true;
            btn.textContent = 'Guardando...';
            
            // Recalcular el score sumando el age_bonus actual
            const baseScore = BASE_SCORES[newPriority];
            const typeBonus = TYPE_BONUSES[newPriority];
            const ageBonus = doc.score_breakdown?.age_bonus || 0;
            const newScore = Math.min(100, baseScore + typeBonus + ageBonus);
            
            const payload = {
                priority: newPriority,
                priority_level: PRIORITY_LEVELS[newPriority],
                office: newOffice,
                office_icon: OFFICE_ICONS[newOffice],
                color: COLOR_CLASS_MAP[newPriority],
                score: newScore
            };
            
            try {
                const putRes = await fetch(`/api/documents/${docId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                
                if (!putRes.ok) throw new Error('Error del servidor');
                
                showToast('Documento re-enrutado correctamente.', 'success');
                
                // Recargar historial público y el propio panel
                await loadHistory();
                await loadOperatorPanelDocs();
                
            } catch (err) {
                showToast(`Error al actualizar: ${err.message}`, 'error');
                btn.disabled = false;
                btn.textContent = '💾 Guardar';
            }
        });

        operatorDocList.appendChild(card);
    });
}

// ─── TABS ─────────────────────────────────────────────────────────────────────

document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

function switchTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach((b) => {
        const active = b.dataset.tab === tabId;
        b.classList.toggle('active', active);
        b.setAttribute('aria-selected', String(active));
    });
    document.querySelectorAll('.tab-pane').forEach((p) => {
        p.classList.toggle('active', p.id === `tab-${tabId}`);
    });
}

// ─── CATALOG ──────────────────────────────────────────────────────────────────

const COLOR_CLASS = {
    'CRÍTICA':    'critica',
    'IMPORTANTE': 'importante',
    'RUTINARIO':  'rutinario',
};

async function loadCatalog() {
    try {
        const res = await fetch('/api/catalog');
        if (!res.ok) return;
        const catalog = await res.json();

        const grids = {
            'CRÍTICA':    document.getElementById('catalogCritica'),
            'IMPORTANTE': document.getElementById('catalogImportante'),
            'RUTINARIO':  document.getElementById('catalogRutinario'),
        };

        // Limpiar grids por si se vuelve a llamar
        Object.values(grids).forEach(g => { if (g) g.innerHTML = ''; });

        for (const [name, info] of Object.entries(catalog)) {
            const grid = grids[info.priority];
            if (!grid) continue;

            const cls = COLOR_CLASS[info.priority] || 'rutinario';
            const div = document.createElement('div');
            div.className = 'catalog-item';
            div.innerHTML = `
                <div class="catalog-item-header">
                    <span class="catalog-item-icon" aria-hidden="true">${info.office_icon}</span>
                    <p class="catalog-item-name">${escapeHtml(name)}</p>
                </div>
                <p class="catalog-item-office">${escapeHtml(info.office)}</p>
                <span class="badge badge-${cls}" style="margin-top:6px">${info.priority}</span>
            `;
            grid.appendChild(div);
        }
    } catch (e) {
        console.warn('Could not load catalog:', e.message);
    }
}

loadCatalog();

// ─── SERVER STATUS ────────────────────────────────────────────────────────────

async function checkHealth() {
    const statusEl = document.getElementById('serverStatus');
    try {
        const res = await fetch('/health', { signal: AbortSignal.timeout(3000) });
        if (!res.ok) throw new Error('not ok');
        statusEl.innerHTML = '<span class="status-dot"></span><span class="status-label">Sistema en línea</span>';
    } catch {
        statusEl.style.background = 'rgba(239,68,68,0.2)';
        statusEl.style.borderColor = 'rgba(239,68,68,0.4)';
        statusEl.innerHTML = '<span style="color:#FCA5A5">⚠️ Sin conexión</span>';
    }
}

checkHealth();

// ─── TOAST ────────────────────────────────────────────────────────────────────

let toastTimer = null;

function showToast(msg, type = 'info') {
    const icons = { error: '⚠️', success: '✅', info: 'ℹ️' };
    toastIcon.textContent = icons[type] || 'ℹ️';
    toastMsg.textContent = msg;

    toast.className = 'toast';
    if (type === 'error')   toast.classList.add('error-toast');
    if (type === 'success') toast.classList.add('success-toast');
    toast.classList.remove('hidden');

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.add('hidden'), type === 'error' ? 6000 : 3500);
}

toastClose.addEventListener('click', () => {
    toast.classList.add('hidden');
    clearTimeout(toastTimer);
});

// ─── UTILITIES ────────────────────────────────────────────────────────────────

function formatSize(bytes) {
    if (bytes < 1024)            return `${bytes} B`;
    if (bytes < 1024 * 1024)     return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function truncateFilename(name, max) {
    if (name.length <= max) return name;
    const dot = name.lastIndexOf('.');
    if (dot > 0) {
        const ext  = name.substring(dot);
        const base = name.substring(0, dot);
        return base.substring(0, max - ext.length - 3) + '…' + ext;
    }
    return name.substring(0, max - 3) + '…';
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function formatTimestamp(isoStr) {
    try {
        const date = new Date(isoStr);
        return date.toLocaleTimeString('es-PE', {
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
    } catch {
        return '—';
    }
}

// Cargar historial inicializado desde base de datos
loadHistory();
