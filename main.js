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

    // Initial centering
    const cx = window.innerWidth / 2 - 400; // Roughly center
    const cy = window.innerHeight / 2 - 300;
    state.offset = { x: cx, y: cy };
    renderCanvas();
};
