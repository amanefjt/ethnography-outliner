// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

window.onload = () => {
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

    loadStateFromStorage();
    initializeDefaultData();
    renderCanvas();
    setupEventListeners();

    // Initial centering (Zoom to Fit)
    zoomToFit();
};

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
    state.offset.x = (screenW - w * zoom) / 2 - minX * zoom + padding * zoom;
    state.offset.y = (screenH - h * zoom) / 2 - minY * zoom + padding * zoom;

    renderCanvas();
}
