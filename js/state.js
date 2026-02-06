// ============================================================================
// STATE & HISTORY
// ============================================================================

function loadStateFromStorage() {
    try {
        state.notes = JSON.parse(localStorage.getItem('ethnography-notes')) || [];
        state.groups = JSON.parse(localStorage.getItem('ethnography-groups')) || [];
        state.relations = JSON.parse(localStorage.getItem('ethnography-relations')) || [];
        state.outlineOrder = JSON.parse(localStorage.getItem('ethnography-order')) || {};
    } catch (e) {
        console.error('Storage load error', e);
    }
}

function saveData() {
    localStorage.setItem('ethnography-notes', JSON.stringify(state.notes));
    localStorage.setItem('ethnography-groups', JSON.stringify(state.groups));
    localStorage.setItem('ethnography-relations', JSON.stringify(state.relations));
    localStorage.setItem('ethnography-order', JSON.stringify(state.outlineOrder));
}

function initializeDefaultData() {
    if (state.notes.length === 0 && state.groups.length === 0) {
        state.notes = [{ id: 1, title: "ノート 1", content: "これは最初のノートです。ドラッグして動かしたり、ダブルクリックで編集できます。", x: 400, y: 150, color: 'blue', collapsed: false }];
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
