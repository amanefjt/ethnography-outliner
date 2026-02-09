// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

window.onload = () => {
    console.log("Main.js: window.onload fired");
    DOM.canvasContainer = document.getElementById('canvas-container');
    DOM.canvas = document.getElementById('canvas');
    DOM.canvasView = document.getElementById('canvas-view');
    DOM.outlinerView = document.getElementById('outliner-view');
    DOM.outlineList = document.getElementById('outline-list');
    DOM.viewToggle = document.getElementById('view-toggle');
    DOM.addNoteBtn = document.getElementById('add-note');
    DOM.addGroupBtn = document.getElementById('add-group');
    DOM.noteModal = document.getElementById('note-modal');
    DOM.noteInput = document.getElementById('note-input');
    DOM.noteTitleInput = document.getElementById('note-title-input');
    DOM.saveNoteBtn = document.getElementById('save-note');
    DOM.cancelNoteBtn = document.getElementById('cancel-note');
    DOM.rearrangeBtn = document.getElementById('rearrange');
    DOM.zoomInBtn = document.getElementById('zoom-in');
    DOM.zoomOutBtn = document.getElementById('zoom-out');
    DOM.importBtn = document.getElementById('import-text');
    DOM.importModal = document.getElementById('import-modal');
    DOM.importInput = document.getElementById('import-input');
    DOM.saveImportBtn = document.getElementById('save-import');
    DOM.cancelImportBtn = document.getElementById('cancel-import');
    DOM.viewModal = document.getElementById('view-modal');
    DOM.viewTitle = document.getElementById('view-title');
    DOM.viewBody = document.getElementById('view-body');
    DOM.closeViewBtn = document.getElementById('close-view');
    DOM.undoBtn = document.getElementById('undo');
    DOM.redoBtn = document.getElementById('redo');

    // Project Management
    DOM.projectBtn = document.getElementById('btn-project');
    DOM.projectModal = document.getElementById('project-modal');
    DOM.closeProjectBtn = document.getElementById('btn-close-project');
    DOM.createProjectBtn = document.getElementById('btn-create-project');
    DOM.projectListContainer = document.getElementById('project-list-container');
    DOM.newProjectNameInput = document.getElementById('new-project-name');
    DOM.currentProjectName = document.getElementById('current-project-name');

    // AI Proposal
    DOM.aiProposalModal = document.getElementById('ai-proposal-modal');
    DOM.aiProposalTitle = document.getElementById('ai-proposal-title');
    DOM.aiProposalReason = document.getElementById('ai-proposal-reason');
    DOM.aiProposalContent = document.getElementById('ai-proposal-content');
    DOM.rejectProposalBtn = document.getElementById('btn-reject-proposal');
    DOM.acceptProposalBtn = document.getElementById('btn-accept-proposal');

    // Confirm Modal - 削除確認モーダルのDOM初期化
    DOM.confirmModal = document.getElementById('confirm-modal');
    DOM.confirmMessage = document.getElementById('confirm-message');

    loadStateFromStorage();

    // Data Sanitization
    try {
        sanitizeData();
    } catch (e) {
        console.error('Data sanitization failed:', e);
    }


    initializeDefaultData();

    try {
        renderCanvas();
    } catch (e) {
        console.error('Fatal error in renderCanvas:', e);
    }

    // Ensure event listeners are attached even if render fails
    setupEventListeners();

    // Initial centering (Zoom to Fit)
    zoomToFit();
};

function sanitizeData() {
    // 1. Remove notes with invalid IDs or IDs that match known corrupted data
    const badNoteIds = ['1770460392938'];
    if (state.notes) {
        state.notes = state.notes.filter(n => {
            if (!n || !n.id) return false;
            // String comparison for ID
            if (badNoteIds.some(badId => String(n.id) === String(badId))) {
                console.warn('Removing corrupted note during sanitize:', n.id);
                return false;
            }
            return true;
        });

        // 2. Fix NaN coordinates
        state.notes.forEach(n => {
            if (typeof n.x !== 'number' || isNaN(n.x)) n.x = 0;
            if (typeof n.y !== 'number' || isNaN(n.y)) n.y = 0;
        });
    }

    if (state.groups) {
        // 3. Fix NaN coordinates for groups
        state.groups.forEach(g => {
            if (typeof g.x !== 'number' || isNaN(g.x)) g.x = 0;
            if (typeof g.y !== 'number' || isNaN(g.y)) g.y = 0;
            if (typeof g.width !== 'number' || isNaN(g.width)) g.width = 300;
            if (typeof g.height !== 'number' || isNaN(g.height)) g.height = 300;
        });
    }

    // Save sanitized state
    saveData();
}



function zoomToFit() {
    const items = [...state.notes, ...state.groups.filter(g => !g.groupId)];
    if (items.length === 0) {
        state.offset = { x: window.innerWidth / 2 - 400, y: window.innerHeight / 2 - 300 };
        state.zoom = 1;
        renderCanvas();
        return;
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    items.forEach(it => {
        minX = Math.min(minX, it.x);
        minY = Math.min(minY, it.y);
        maxX = Math.max(maxX, it.x + (it.width || 400));
        maxY = Math.max(maxY, it.y + (it.height || 300));
    });

    const padding = 100;
    const w = maxX - minX + padding * 2;
    const h = maxY - minY + padding * 2;
    const screenW = window.innerWidth;
    const screenH = window.innerHeight;

    const scaleX = screenW / w;
    const scaleY = screenH / h;
    let zoom = Math.min(scaleX, scaleY);
    zoom = Math.min(Math.max(0.1, zoom), 1.5); // Cap zoom

    state.zoom = zoom;
    // Center the content
    // Center the content
    state.offset.x = (screenW - w * zoom) / 2 - minX * zoom + padding * zoom;
    state.offset.y = (screenH - h * zoom) / 2 - minY * zoom + padding * zoom;

    console.log('zoomToFit calculated:', {
        minX, minY, maxX, maxY,
        w, h, screenW, screenH,
        zoom, offset: state.offset
    });

    renderCanvas();
}
