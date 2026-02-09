// ============================================================================
// INTERACTIONS & EVENTS (V7 - Debug Capture)
// ============================================================================

console.log('interactions.js v7 loaded');

// ============================================================================
// SETUP
// ============================================================================

function setupEventListeners() {
    console.log("setupEventListeners (Refactored v7 - Capture) START");
    // Canvas Events (Delegation)
    if (DOM.canvasContainer) {
        DOM.canvasContainer.addEventListener('mousedown', handleMouseDown);
        DOM.canvasContainer.addEventListener('wheel', handleWheel, { passive: false });
    }

    window.addEventListener('resize', () => { renderCanvas(); });
    window.addEventListener('keydown', handleKeydown);
    // window.addEventListener('keyup', handleKeyup); // Disabled: handler missing
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    // -----------------------------------------------------------------------
    // CENTRALIZED CLICK DELEGATION (CAPTURE PHASE)
    // -----------------------------------------------------------------------
    window.addEventListener('click', (e) => {
        console.log('DEBUG: Window Capture Click detected on:', e.target.tagName, e.target.className, e.target.id);

        const target = e.target;

        // Helper to find closest button/element with specific ID or Action
        const btn = target.closest('button');
        const actionBtn = target.closest('[data-action]');

        if (btn) console.log('DEBUG: Closest button found:', btn.id);

        // 1. ID-based Actions (Main Toolbar & Dialog Buttons)
        if (btn && btn.id) {
            console.log('DEBUG: Processing ID action:', btn.id);
            switch (btn.id) {
                // Main Toolbar
                case 'add-note':
                    openDialog('note-dialog', () => {
                        console.log('DEBUG: Opening note dialog callback');
                        DOM.noteTitleInput.value = '';
                        DOM.noteInput.value = '';
                        setTimeout(() => DOM.noteInput.focus(), 100);
                    });
                    return;
                case 'import-text':
                    openDialog('import-dialog');
                    return;
                case 'btn-project':
                    openProjectModal();
                    return;
                case 'view-toggle':
                    toggleView();
                    return;

                // Note Dialog
                case 'save-note': e.preventDefault(); saveNote(); return;
                case 'cancel-note': e.preventDefault(); closeDialog('note-dialog'); return;

                // Import Dialog
                case 'save-import': handleImport(); return;
                case 'cancel-import': closeDialog('import-dialog'); return;

                // View modal
                case 'close-view': closeDialog('view-dialog'); return;

                // Project Modal
                case 'btn-close-project': closeDialog('project-dialog'); return;
                case 'btn-create-project': handleCreateProject(); return;

                // AI & Settings
                case 'btn-reject-proposal': DOM.aiProposalModal.close(); return;
                case 'btn-accept-proposal': acceptProposal(); return;
                case 'btn-close-settings': closeDialog('settings-dialog'); return;
                case 'btn-save-settings': saveSettings(); return;
                case 'btn-ai-result-close': closeDialog('ai-result-dialog'); return;

                // Canvas Controls
                case 'zoom-in': applyZoom(0.1, DOM.canvasContainer.clientWidth / 2, DOM.canvasContainer.clientHeight / 2); return;
                case 'zoom-out': applyZoom(-0.1, DOM.canvasContainer.clientWidth / 2, DOM.canvasContainer.clientHeight / 2); return;
                case 'undo': undo(); return;
                case 'redo': redo(); return;
            }
        }

        // 2. Data-Action Buttons (Note Actions, Context Bar)
        if (actionBtn) {
            handleGlobalAction(actionBtn, e);
            return;
        }

        // 3. Toggle Settings (if standard ID not used)
        if (target.closest('#btn-settings')) {
            openDialog('settings-dialog');
            return;
        }
    }, true); // Enable Capture Phase

    console.log("setupEventListeners (Refactored v7 - Capture) END");
}

function toggleView() {
    const isCanvas = DOM.canvasView.classList.contains('active');
    if (isCanvas) {
        DOM.canvasView.classList.remove('active');
        DOM.outlinerView.classList.add('active');
        renderOutline();
    } else {
        DOM.outlinerView.classList.remove('active');
        DOM.canvasView.classList.add('active');
        renderCanvas();
    }
}

// ===========================================================================
// DIALOG HELPERS
// ===========================================================================

function openDialog(id, callback) {
    console.log('openDialog called for:', id);
    const dialog = document.getElementById(id);
    if (dialog) {
        dialog.showModal();
        if (callback) callback();
    } else {
        console.error('Dialog not found:', id);
    }
}

function closeDialog(id) {
    const dialog = document.getElementById(id);
    if (dialog) dialog.close();
}

function showConfirmModal(message, callback) {
    if (window.confirm(message)) {
        callback();
    }
}

// ===========================================================================
// PROJECT MANAGEMENT
// ===========================================================================

function openProjectModal() {
    const dialog = document.getElementById('project-dialog');
    if (!dialog) return;

    const listEl = document.getElementById('project-list-container');
    if (listEl) {
        listEl.innerHTML = '';
        const projects = getProjectList();
        projects.forEach(p => {
            const div = document.createElement('div');
            div.className = 'project-item';
            div.style.padding = '12px';
            div.style.cursor = 'pointer';
            div.style.borderBottom = '1px solid var(--border-color)';
            div.style.display = 'flex';
            div.style.justifyContent = 'space-between';
            div.style.alignItems = 'center';

            if (p === state.currentProject) {
                div.style.fontWeight = 'bold';
                div.style.backgroundColor = '#f0f9ff';
            }

            const nameSpan = document.createElement('span');
            nameSpan.textContent = p;
            nameSpan.onclick = (e) => {
                e.stopPropagation();
                if (p !== state.currentProject) {
                    switchProject(p);
                    dialog.close();
                }
            };

            div.appendChild(nameSpan);

            // Delete button for projects
            if (p !== 'default') {
                const delBtn = document.createElement('button');
                delBtn.innerHTML = '<i data-lucide="trash-2"></i>';
                delBtn.className = 'action-btn'; // reuse class
                delBtn.style.width = '32px';
                delBtn.style.height = '32px';
                delBtn.onclick = (e) => {
                    e.stopPropagation();
                    if (confirm(`プロジェクト "${p}" を削除しますか？\nこの操作は取り消せません。`)) {
                        deleteProject(p);
                        openProjectModal(); // Refresh
                    }
                };
                div.appendChild(delBtn);
            }

            listEl.appendChild(div);
        });
        lucide.createIcons();
    }

    const input = document.getElementById('new-project-name');
    if (input) input.value = '';
    dialog.showModal();
}

function handleCreateProject() {
    const input = document.getElementById('new-project-name');
    const name = input.value.trim();
    if (name) {
        createNewProject(name);
        closeDialog('project-dialog');
    }
}

// ===========================================================================
// GLOBAL EVENT DELEGATION ACTIONS
// ===========================================================================

function handleGlobalAction(actionBtn, e) {
    const action = actionBtn.dataset.action;
    const id = actionBtn.dataset.id;
    console.log('Global Action:', action, id);

    switch (action) {
        case 'toggle-collapse':
            toggleCollapse(id, e);
            break;
        case 'rename-group':
            actionBtn.focus();
            break;
        case 'item-color':
            cycleColor(id, actionBtn.closest('.note-card') ? 'note' : 'group');
            break;
        case 'item-delete':
            deleteItem(id, actionBtn.closest('.note-card') ? 'note' : 'group');
            break;
        case 'ctx-color':
            state.selectedIds.forEach(sid => {
                const item = state.notes.find(n => n.id == sid) || state.groups.find(g => g.id == sid);
                if (item) rotateColor(item);
            });
            break;
        case 'ctx-connect':
            state.connectingSource = [...state.selectedIds];
            state.selectedIds = [];
            DOM.canvasContainer.style.cursor = 'crosshair';
            renderCanvas();
            break;
        case 'ctx-delete':
            deleteItem(state.selectedIds, 'multi');
            break;
        case 'ctx-ai-naming':
            const selectedItems = state.selectedIds.map(sid => state.notes.find(n => n.id == sid) || state.groups.find(g => g.id == sid)).filter(Boolean);
            AIFeatures.generateSummaryProposal(selectedItems);
            break;
    }
}

function toggleCollapse(id, e) {
    if (e) e.stopPropagation();

    // Check note
    const n = state.notes.find(x => x.id == id);
    if (n) {
        n.collapsed = !n.collapsed;
        saveData();
        renderCanvas();
        return;
    }

    // Check group
    const g = state.groups.find(x => x.id == id);
    if (g) {
        g.collapsed = !g.collapsed;
        saveData();
        renderCanvas();
    }
}

function handleMouseDown(e) {
    if (e.target.closest('button') || e.target.tagName === 'INPUT' || e.target.closest('dialog')) return;

    currentMouseCanvasPos = getCanvasPos(e); // Start pos
    const isSpace = e.code === 'Space' || e.button === 1;

    // 1. Pan Canvas (Space or Middle Click or BG click)
    if (isSpace || (e.button === 0 && e.target === DOM.canvasContainer)) {
        state.isDragging = true;
        state.dragType = 'canvas';
        state.dragStart = { x: e.clientX, y: e.clientY };
        DOM.canvasContainer.style.cursor = 'grabbing';

        // Deselect if clicking background
        if (e.target === DOM.canvasContainer) {
            state.selectedIds = [];
            renderContextBar();
            renderCanvas();
        }
        return;
    }

    // 2. Click on Item (Note/Group)
    const itemEl = e.target.closest('.note-card, .group-card');
    if (itemEl && e.button === 0) {
        const id = itemEl.dataset.id;
        const type = itemEl.dataset.type; // 'note' or 'group'

        // Handle Multi-selection
        if (e.metaKey || e.ctrlKey) {
            const numericId = type === 'note' ? Number(id) : id;
            if (state.selectedIds.includes(numericId)) {
                state.selectedIds = state.selectedIds.filter(sid => sid != numericId);
            } else {
                state.selectedIds.push(numericId);
            }
        } else {
            // Single selection (if not already selected)
            const numericId = type === 'note' ? Number(id) : id;
            if (!state.selectedIds.includes(numericId)) {
                state.selectedIds = [numericId];
            }
        }

        renderContextBar();
        renderCanvas(); // Update visuals

        // Prepare Dragging
        state.isDragging = true;
        state.dragType = type; // 'note' or 'group'
        state.dragItem = type === 'note' ? state.notes.find(n => n.id == id) : state.groups.find(g => g.id == id);

        if (state.dragItem) {
            state.dragOffset.x = currentMouseCanvasPos.x - state.dragItem.x;
            state.dragOffset.y = currentMouseCanvasPos.y - state.dragItem.y;

            // Bring to front
            if (type === 'note') {
                state.notes = state.notes.filter(n => n.id != id);
                state.notes.push(state.dragItem);
            }
        }
        return;
    }

    // 3. Connection Mode Check
    if (state.connectingSource && e.button === 0) {
        const targetEl = e.target.closest('.note-card, .group-card');
        if (targetEl) {
            finishConnection(targetEl.dataset.id, targetEl.dataset.type);
        }
        state.connectingSource = null;
        DOM.canvasContainer.style.cursor = 'default';
        renderCanvas();
    }
}

function finishConnection(targetId, type) {
    const pid = type === 'group' ? targetId : parseInt(targetId);
    const sources = Array.isArray(state.connectingSource) ? state.connectingSource : [state.connectingSource];
    let added = false;

    if (sources.some(srcId => srcId != pid)) {
        pushHistory();
        sources.forEach(srcId => {
            if (srcId != pid) {
                state.relations.push({
                    source: srcId,
                    target: pid,
                    id: Date.now() + Math.random(),
                    dash: CONSTANTS.DASH_PATTERNS[Math.floor(Math.random() * CONSTANTS.DASH_PATTERNS.length)]
                });
                added = true;
            }
        });
        if (added) saveData();
    }
}

// ===========================================================================
// CONTEXT BAR
// ===========================================================================

function renderContextBar() {
    const bar = document.getElementById('context-bar');
    if (!bar) return;

    if (state.selectedIds.length === 0) {
        bar.classList.remove('active');
        return;
    }

    bar.classList.add('active');

    const count = state.selectedIds.length;

    let html = `
        <div class="ctx-info">${count} 選択中</div>
        <button class="ctx-btn" data-action="ctx-color" title="色変更"><i data-lucide="palette"></i></button>
        <button class="ctx-btn" data-action="ctx-connect" title="関係付け"><i data-lucide="link"></i></button>
    `;

    if (count > 1) {
        html += `
             <button class="ctx-btn ai-action" data-action="ctx-ai-naming" title="AIでグループ化"><i data-lucide="bot"></i></button>
        `;
    }

    html += `
        <div class="ctx-divider"></div>
        <button class="ctx-btn delete" data-action="ctx-delete" title="削除"><i data-lucide="trash-2"></i></button>
    `;

    bar.innerHTML = html;
    lucide.createIcons();
}

function startResize(e, item, edge) {
    e.stopPropagation();
    e.preventDefault();

    state.isDragging = true;
    state.dragType = 'resize';
    state.dragItem = item;
    state.resizeEdge = edge;

    const handleMouseMove = (moveEvent) => {
        if (!state.isDragging || state.dragType !== 'resize') return;

        requestAnimationFrame(() => {
            const pos = getCanvasPos(moveEvent);
            const item = state.dragItem;
            const edge = state.resizeEdge;

            if (!item || !edge) return;

            const mouseX = pos.x;
            const mouseY = pos.y;

            let newX = item.x;
            let newY = item.y;
            let newW = item.width || (typeof item.id === 'string' ? 400 : 300);
            let newH = item.height || (typeof item.id === 'string' ? 300 : 150);

            const minW = 100;
            const minH = 50;

            if (edge.includes('e')) {
                newW = Math.max(minW, mouseX - item.x);
            }
            if (edge.includes('w')) {
                const right = item.x + newW;
                newX = mouseX;
                newW = Math.max(minW, right - newX);
            }
            if (edge.includes('s')) {
                newH = Math.max(minH, mouseY - item.y);
            }
            if (edge.includes('n')) {
                const bottom = item.y + newH;
                newY = mouseY;
                newH = Math.max(minH, bottom - newY);
            }

            item.x = newX;
            item.width = newW;
            item.y = newY;
            item.height = newH;

            renderCanvas();
        });
    };

    const handleMouseUp = () => {
        if (state.dragType === 'resize') {
            cleanupEmptyGroups();
            saveData();
        }
        state.isDragging = false;
        state.dragType = null;
        state.dragItem = null;

        document.body.removeEventListener('mousemove', handleMouseMove);
        document.body.removeEventListener('mouseup', handleMouseUp);
        DOM.canvasContainer.style.cursor = 'default';
    };

    document.body.addEventListener('mousemove', handleMouseMove);
    document.body.addEventListener('mouseup', handleMouseUp);
}

function moveGroupAndChildren(groupId, dx, dy) {
    state.notes.filter(n => n.groupId === groupId).forEach(n => { n.x += dx; n.y += dy; });
    state.groups.filter(g => g.groupId === groupId).forEach(g => { g.x += dx; g.y += dy; moveGroupAndChildren(g.id, dx, dy); });
}

function updateGroupBounds(gid) {
}

function addGroup() {
    pushHistory();
    const p = findEmptyPosition(currentMouseCanvasPos.x, currentMouseCanvasPos.y, 400, 300);
    const g = { id: 'g' + Date.now(), title: "", x: p.x, y: p.y, width: 400, height: 300, collapsed: false, groupId: null };
    state.groups.push(g);
    renderCanvas(); saveData();
}

function saveNote() {
    const t = DOM.noteTitleInput.value.trim();
    const c = DOM.noteInput.value.trim();
    if (!c && !t) return;
    pushHistory();

    const centerX = (window.innerWidth / 2 - state.offset.x) / state.zoom;
    const centerY = (window.innerHeight / 2 - state.offset.y) / state.zoom;

    const p = findEmptyPosition(centerX - 150, centerY - 75, 300, 150);

    const n = { id: Date.now(), title: t, content: c, x: p.x, y: p.y, width: CONSTANTS.NOTE_WIDTH, height: CONSTANTS.NOTE_HEIGHT, color: 'slate', collapsed: false };
    state.notes.push(n);
    renderCanvas(); saveData(); closeDialog('note-dialog');
}

function handleKeydown(e) {
    if (e.key === ' ' && !state.isDragging) { DOM.canvasContainer.style.cursor = 'grab'; }
    if ((e.metaKey || e.ctrlKey) && e.key === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
    if ((e.metaKey || e.ctrlKey) && e.key === 'y') { e.preventDefault(); redo(); }
    if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
        e.preventDefault();
        state.selectedIds = [...state.notes.map(n => n.id), ...state.groups.map(g => g.id)];
        renderCanvas();
    }

    if (e.key === 'Escape') {
        if (document.querySelector('dialog[open]')) {
            document.querySelectorAll('dialog[open]').forEach(d => d.close());
        } else if (state.connectingSource) {
            state.connectingSource = null;
            renderCanvas();
        } else if (state.selectedIds.length > 0) {
            state.selectedIds = [];
            renderCanvas();
        }
    }

    if ((e.key === 'Delete' || e.key === 'Backspace') && state.selectedIds.length > 0) {
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
            e.preventDefault();
            deleteItem(state.selectedIds, 'multi');
        }
    }
}

function handleMouseMove(e) {
    currentMouseCanvasPos = getCanvasPos(e);

    if (state.isDragging) {
        if (state.dragType === 'canvas') {
            const dx = e.clientX - state.dragStart.x;
            const dy = e.clientY - state.dragStart.y;
            state.offset.x += dx;
            state.offset.y += dy;
            state.dragStart = { x: e.clientX, y: e.clientY };
            renderCanvas();
        } else if (state.dragType === 'note' && state.dragItem) {
            state.dragItem.x = currentMouseCanvasPos.x - state.dragOffset.x;
            state.dragItem.y = currentMouseCanvasPos.y - state.dragOffset.y;
            renderCanvas(); // Simple render
        } else if (state.dragType === 'group' && state.dragItem) {
            const dx = (currentMouseCanvasPos.x - state.dragOffset.x) - state.dragItem.x;
            const dy = (currentMouseCanvasPos.y - state.dragOffset.y) - state.dragItem.y;
            state.dragItem.x += dx;
            state.dragItem.y += dy;
            moveGroupAndChildren(state.dragItem.id, dx, dy);
            renderCanvas();
        }
    }

    if (state.connectingSource) {
        renderCanvas(); // Redraw connection line
    }
}

function handleMouseUp() {
    if (state.isDragging) {
        if (state.dragType === 'note' || state.dragType === 'group') {
            saveData();
        }
        state.isDragging = false;
        state.dragItem = null;
        DOM.canvasContainer.style.cursor = 'default';

        // Snap/Group logic could go here
    }
}

function handleWheel(e) {
    e.preventDefault();

    if (e.ctrlKey || e.metaKey) {
        const delta = -e.deltaY * 0.001;
        const rect = DOM.canvasContainer.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        applyZoom(delta, mouseX, mouseY);
    } else {
        state.offset.x -= e.deltaX;
        state.offset.y -= e.deltaY;
        renderCanvas();
    }
}

function applyZoom(delta, centerX, centerY) {
    const oldZoom = state.zoom;
    const newZoom = Math.min(Math.max(0.1, oldZoom + delta), 3);

    const worldX = (centerX - state.offset.x) / oldZoom;
    const worldY = (centerY - state.offset.y) / oldZoom;

    state.zoom = newZoom;

    state.offset.x = centerX - worldX * newZoom;
    state.offset.y = centerY - worldY * newZoom;

    renderCanvas();
}

function deleteItem(target, type) {
    console.log('deleteItem called:', { target, type, isDeleting: state.isDeleting });

    if (state.isDeleting) {
        return;
    }

    let ids = [];
    let msg = "";

    if (type === 'multi') {
        ids = Array.isArray(target) ? target : [target];
        msg = `選択した ${ids.length} 個の要素を削除しますか？`;
    } else {
        ids = [target];
        if (type === 'group') msg = "このグループと中身の関係を削除しますか？\n（ノートはグループから出されます）";
        else if (type === 'note') msg = "このノートを削除しますか？";
        else if (type === 'relation') msg = "この関係を削除しますか？";
    }

    state.isDeleting = true;

    showConfirmModal(msg, () => {
        pushHistory();
        executeDeletion(ids);
        renderCanvas();
        saveData();
        state.isDeleting = false;
        console.log('Deletion completed');
    });

    // Safety timeout
    setTimeout(() => { state.isDeleting = false; }, 2000);
}


function executeDeletion(ids) {
    const idsSet = new Set(ids);

    // 1. Delete Notes
    state.notes = state.notes.filter(n => !idsSet.has(n.id));

    // 2. Delete Groups
    const deletedGroupIds = state.groups.filter(g => idsSet.has(g.id)).map(g => g.id);

    deletedGroupIds.forEach(gid => {
        const group = state.groups.find(g => g.id === gid);
        const parentId = group ? group.groupId : null;

        state.notes.forEach(n => {
            if (n.groupId === gid) n.groupId = parentId;
        });

        state.groups.forEach(g => {
            if (g.groupId === gid) g.groupId = parentId;
        });
    });

    state.groups = state.groups.filter(g => !idsSet.has(g.id));

    // 3. Delete Relations
    const allRemainingIds = new Set([...state.notes.map(n => n.id), ...state.groups.map(g => g.id)]);

    state.relations = state.relations.filter(r => {
        if (idsSet.has(r.id)) return false;
        if (!allRemainingIds.has(r.source) || !allRemainingIds.has(r.target)) return false;
        return true;
    });

    state.selectedIds = [];
    cleanupEmptyGroups();
}

function duplicateItem(id, type) {
    pushHistory();
    const offset = 40;
    if (type === 'note') {
        const n = state.notes.find(x => x.id === id);
        if (n) state.notes.push({ ...n, id: Date.now(), x: n.x + offset, y: n.y + offset });
    } else {
        const g = state.groups.find(x => x.id === id);
        if (g) {
            const nextGid = 'g' + Date.now();
            state.groups.push({ ...g, id: nextGid, x: g.x + offset, y: g.y + offset });
            duplicateChildren(id, nextGid, offset, offset);
        }
    }
    renderCanvas(); saveData();
}

function duplicateChildren(oldId, newId, dx, dy) {
    state.notes.filter(n => n.groupId === oldId).forEach(n => {
        state.notes.push({ ...n, id: Date.now() + Math.random(), groupId: newId, x: n.x + dx, y: n.y + dy });
    });
    state.groups.filter(g => g.groupId === oldId).forEach(g => {
        const nextGid = 'g' + (Date.now() + Math.random());
        state.groups.push({ ...g, id: nextGid, groupId: newId, x: g.x + dx, y: g.y + dy });
        duplicateChildren(g.id, nextGid, dx, dy);
    });
}

function rotateColor(it) {
    const c = CONSTANTS.COLORS;
    it.color = c[(c.indexOf(it.color || 'slate') + 1) % c.length];
    saveData();
    renderCanvas();
}

function cycleColor(id, type) {
    const item = type === 'note' ? state.notes.find(n => n.id == id) : state.groups.find(g => g.id == id);
    if (item) rotateColor(item);
}


function cleanupEmptyGroups() {
    let changed = false;
    do {
        changed = false;
        const toDel = state.groups.filter(g => {
            const notes = state.notes.filter(n => n.groupId === g.id);
            const subs = state.groups.filter(gr => gr.groupId === g.id);
            return (notes.length + subs.length) <= 1;
        });

        if (toDel.length > 0) {
            toDel.forEach(g => {
                const parentId = g.groupId;
                state.notes.forEach(n => { if (n.groupId === g.id) n.groupId = parentId; });
                state.groups.forEach(gr => { if (gr.groupId === g.id) gr.groupId = parentId; });
                state.groups = state.groups.filter(gr => gr.id !== g.id);
                changed = true;
            });
        }
    } while (changed);

    if (state.groups.length >= 0) { renderCanvas(); }
}

function getResizeEdge(e, el) {
    const r = el.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    const padding = 16;

    const nearTop = y < padding;
    const nearBottom = y > r.height - padding;
    const nearLeft = x < padding;
    const nearRight = x > r.width - padding;

    if (nearBottom && nearRight) return 'se';
    if (nearBottom && nearLeft) return 'sw';
    if (nearTop && nearRight) return 'ne';
    if (nearTop && nearLeft) return 'nw';
    if (nearBottom) return 's';
    if (nearRight) return 'e';
    if (nearLeft) return 'w';
    if (nearTop) return 'n';
    return null;
}
