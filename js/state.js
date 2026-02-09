// ============================================================================
// STATE & HISTORY
// ============================================================================

// Project Management
state.currentProject = localStorage.getItem('ethnography-current-project') || 'default';

function getProjectList() {
    try {
        return JSON.parse(localStorage.getItem('ethnography-project-list')) || ['default'];
    } catch (e) { return ['default']; }
}

function addProjectToList(name) {
    const list = getProjectList();
    if (!list.includes(name)) {
        list.push(name);
        localStorage.setItem('ethnography-project-list', JSON.stringify(list));
    }
}

function saveCurrentProject() {
    const p = state.currentProject;
    localStorage.setItem(`ethnography_${p}_notes`, JSON.stringify(state.notes));
    localStorage.setItem(`ethnography_${p}_groups`, JSON.stringify(state.groups));
    localStorage.setItem(`ethnography_${p}_relations`, JSON.stringify(state.relations));
    localStorage.setItem(`ethnography_${p}_order`, JSON.stringify(state.outlineOrder));
    localStorage.setItem('ethnography-current-project', p);
    addProjectToList(p);
}

function loadStateFromStorage() {
    // Reset state first to prevent data leak if load fails
    state.notes = [];
    state.groups = [];
    state.relations = [];
    state.outlineOrder = {};

    try {
        const p = state.currentProject;
        console.log(`[State] Loading project: ${p}`);

        const n = localStorage.getItem(`ethnography_${p}_notes`);
        const g = localStorage.getItem(`ethnography_${p}_groups`);
        const r = localStorage.getItem(`ethnography_${p}_relations`);
        const o = localStorage.getItem(`ethnography_${p}_order`);

        if (n) state.notes = JSON.parse(n);
        if (g) state.groups = JSON.parse(g);
        if (r) state.relations = JSON.parse(r);
        if (o) state.outlineOrder = JSON.parse(o);

        // Fallback for migration (if default is empty but old keys exist)
        if (p === 'default' && state.notes.length === 0 && localStorage.getItem('ethnography-notes')) {
            console.log('[State] Migrating legacy default data');
            const oldNotes = localStorage.getItem('ethnography-notes');
            if (oldNotes) {
                state.notes = JSON.parse(oldNotes) || [];
                state.groups = JSON.parse(localStorage.getItem('ethnography-groups')) || [];
                state.relations = JSON.parse(localStorage.getItem('ethnography-relations')) || [];
                state.outlineOrder = JSON.parse(localStorage.getItem('ethnography-order')) || {};
            }
        }
    } catch (e) {
        console.error('Storage load error', e);
        // Ensure state is clean if error
        state.notes = [];
        state.groups = [];
        state.relations = [];
    }
}

function saveData() {
    saveCurrentProject();
}

function createNewProject(name) {
    saveCurrentProject(); // Save old project first
    state.currentProject = name;
    state.notes = [];
    state.groups = [];
    state.relations = [];
    state.outlineOrder = {};
    state.history = { past: [], future: [] }; // Reset history
    saveCurrentProject(); // Initialize new one
    initializeDefaultData(); // Add default note if needed
    renderCanvas();
}

function switchProject(name) {
    saveCurrentProject();
    state.currentProject = name;
    localStorage.setItem('ethnography-current-project', name);
    loadStateFromStorage();
    state.history = { past: [], future: [] }; // Reset history
    renderCanvas();
    renderOutline();
}

function initializeDefaultData() {
    if (state.notes.length === 0 && state.groups.length === 0) {
        state.notes = [{ id: 1, title: "新規プロジェクト", content: "新しいプロジェクトへようこそ。", x: window.innerWidth / 2 - 150, y: window.innerHeight / 2 - 100, color: 'blue', collapsed: false }];
    }
}

function pushHistory() {
    const snapshot = JSON.stringify({
        notes: state.notes,
        groups: state.groups,
        relations: state.relations,
        outlineOrder: state.outlineOrder
    });
    if (state.history.past.length > 0 && state.history.past[state.history.past.length - 1] === snapshot) return;
    state.history.past.push(snapshot);
    if (state.history.past.length > 50) state.history.past.shift();
    state.history.future = [];
    updateUndoRedoButtons();
}

function undo() {
    if (state.history.past.length === 0) return;
    const current = JSON.stringify({ notes: state.notes, groups: state.groups, relations: state.relations, outlineOrder: state.outlineOrder });
    state.history.future.push(current);
    const prev = JSON.parse(state.history.past.pop());
    restoreState(prev);
    updateUndoRedoButtons();
    saveData();
    renderCanvas();
}

function redo() {
    if (state.history.future.length === 0) return;
    const current = JSON.stringify({ notes: state.notes, groups: state.groups, relations: state.relations, outlineOrder: state.outlineOrder });
    state.history.past.push(current);
    const next = JSON.parse(state.history.future.pop());
    restoreState(next);
    updateUndoRedoButtons();
    saveData();
    renderCanvas();
}

function restoreState(s) {
    state.notes = s.notes;
    state.groups = s.groups;
    state.relations = s.relations || [];
    state.outlineOrder = s.outlineOrder || {};
}

function updateUndoRedoButtons() {
    if (DOM.undoBtn) DOM.undoBtn.disabled = state.history.past.length === 0;
    if (DOM.redoBtn) DOM.redoBtn.disabled = state.history.future.length === 0;
}
