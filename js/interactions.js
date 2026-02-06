// ============================================================================
// INTERACTIONS & EVENTS
// ============================================================================

function setupEventListeners() {
    window.addEventListener('resize', () => { renderCanvas(); });
    window.addEventListener('keydown', handleKeydown);
    window.addEventListener('keyup', handleKeyup);

    // Canvas Events
    DOM.canvasContainer.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    DOM.canvasContainer.addEventListener('wheel', handleWheel, { passive: false });

    // UI Buttons
    DOM.viewToggle.onclick = toggleView;
    DOM.addNoteBtn.onclick = openNoteModal;
    DOM.addGroupBtn.onclick = addGroup;
    DOM.saveNoteBtn.onclick = saveNote;
    DOM.cancelNoteBtn.onclick = closeNoteModal;
    DOM.rearrangeBtn.onclick = autoRearrange;
    DOM.zoomInBtn.onclick = () => { state.zoom = Math.min(state.zoom + 0.1, 3); renderCanvas(); };
    DOM.zoomOutBtn.onclick = () => { state.zoom = Math.max(state.zoom - 0.1, 0.1); renderCanvas(); };
    DOM.undoBtn.onclick = undo;
    DOM.redoBtn.onclick = redo;
    DOM.importBtn.onclick = openImportModal;
    DOM.saveImportBtn.onclick = handleImport;
    DOM.cancelImportBtn.onclick = closeImportModal;
    DOM.closeViewBtn.onclick = closeViewModal;
}

function handleKeydown(e) {
    if (e.key === ' ' && !state.isDragging) { DOM.canvasContainer.style.cursor = 'grab'; }
    if ((e.metaKey || e.ctrlKey) && e.key === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
    if ((e.metaKey || e.ctrlKey) && e.key === 'y') { e.preventDefault(); redo(); }
}

function handleKeyup(e) {
    if (e.key === ' ') { DOM.canvasContainer.style.cursor = 'default'; }
}

function handleMouseDown(e) {
    if (e.target.closest('.action-btn') || e.target.closest('.quick-btn') || e.target.tagName === 'INPUT') return;
    const isSpace = e.code === 'Space' || e.button === 1;

    currentMouseCanvasPos = getCanvasPos(e); // Start pos

    if (isSpace || (e.button === 0 && e.target === DOM.canvasContainer)) {
        state.isDragging = true;
        state.dragType = 'canvas';
        state.dragStart = { x: e.clientX, y: e.clientY };
        DOM.canvasContainer.style.cursor = 'grabbing';
    } else if (state.connectingSource && e.button === 0) {
        // 完成させる
        // クリックした場所にあるアイテムを探す
        // Note: Canvas上の要素をクリックした場合、e.targetはnote-card等になる
        const targetEl = e.target.closest('.note-card') || e.target.closest('.group-card');
        if (targetEl) {
            const tid = targetEl.dataset.id;
            const pid = targetEl.classList.contains('group-card') ? tid : parseInt(tid); // group id is string, note id is int
            if (pid !== state.connectingSource) {
                pushHistory();
                state.relations.push({
                    source: state.connectingSource,
                    target: pid,
                    id: Date.now(),
                    dash: CONSTANTS.DASH_PATTERNS[Math.floor(Math.random() * CONSTANTS.DASH_PATTERNS.length)]
                });
                saveData();
            }
        }
        state.connectingSource = null;
        renderCanvas();
    } else if (e.target === DOM.canvasContainer || e.target.id === 'canvas' || e.target.id === 'connector-layer') {
        // 背景クリックで選択解除
        state.selectedIds = [];
        state.connectingSource = null;
        renderCanvas();
    }
}

function handleMouseMove(e) {
    currentMouseCanvasPos = getCanvasPos(e);
    if (state.connectingSource) {
        // 線を引くために再描画
        renderCanvas();
    }

    if (!state.isDragging) return;

    if (state.dragType === 'canvas') {
        const dx = e.clientX - state.dragStart.x;
        const dy = e.clientY - state.dragStart.y;
        state.offset.x += dx;
        state.offset.y += dy;
        state.dragStart = { x: e.clientX, y: e.clientY };
        renderCanvas();
    } else if (state.dragType === 'note' || state.dragType === 'group') {
        const item = state.dragItem;
        if (!item) return;
        const dx = (currentMouseCanvasPos.x - state.dragOffset.x) - item.x;
        const dy = (currentMouseCanvasPos.y - state.dragOffset.y) - item.y;

        if (dx !== 0 || dy !== 0) {
            item.x += dx;
            item.y += dy;

            // グループなら子要素も一緒に移動
            if (state.dragType === 'group') {
                moveGroupAndChildren(item.id, dx, dy);
            }
            // 選択中の他のアイテムも移動（ただし、グループ移動に巻き込まれているものは二重移動しないように注意が必要だが、今回は簡易実装）
            // Simpler: Just move dragged item. Multi-select drag not fully implemented in main logic yet.
        }
        renderCanvas();
    } else if (state.dragType === 'resize') {
        const item = state.dragItem;
        const w = (currentMouseCanvasPos.x - item.x);
        const h = (currentMouseCanvasPos.y - item.y);
        if (w > 100) item.width = w;
        if (h > 50) item.height = h;
        renderCanvas();
    }
}

function handleMouseUp() {
    state.isDragging = false;
    DOM.canvasContainer.style.cursor = 'default';
    if (state.dragType === 'note' || state.dragType === 'group' || state.dragType === 'resize') {
        cleanupEmptyGroups(); // グループから出た、あるいは殻になったグループの掃除
        saveData();
    }
    state.dragType = null;
    state.dragItem = null;
}

function handleWheel(e) {
    if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = -e.deltaY * 0.001;
        state.zoom = Math.min(Math.max(0.1, state.zoom + delta), 3);
        renderCanvas();
    } else {
        state.offset.x -= e.deltaX;
        state.offset.y -= e.deltaY;
        renderCanvas();
    }
}

// Item Drag Starters
function startDrag(e, type) {
    if (e.target.tagName === 'INPUT' || e.target.closest('.action-btn') || e.target.closest('.btn-collapse')) return;
    const el = e.currentTarget;
    const id = el.dataset.id;
    const pid = type === 'note' ? parseInt(id) : id;

    if (e.metaKey || e.ctrlKey) {
        if (state.selectedIds.includes(pid)) state.selectedIds = state.selectedIds.filter(s => s !== pid);
        else state.selectedIds.push(pid);
        renderCanvas();
        return;
    }

    state.isDragging = true;
    state.dragType = type;
    state.dragItem = type === 'note' ? state.notes.find(n => n.id === pid) : state.groups.find(g => g.id === pid);

    // オフセット計算: マウス位置 - アイテム位置
    const pos = getCanvasPos(e);
    state.dragOffset.x = pos.x - state.dragItem.x;
    state.dragOffset.y = pos.y - state.dragItem.y;

    // 前面に持ってくる（配列の最後に移動）
    if (type === 'note') {
        state.notes = state.notes.filter(n => n.id !== pid);
        state.notes.push(state.dragItem);
    } else {
        // グループの場合は階層構造があるので単純に配列順序を変えると描画順がおかしくなる可能性があるが
        // 描画関数でソートしているのでOK
    }
}

function startResize(e, item, edge) {
    e.stopPropagation();
    state.isDragging = true;
    state.dragType = 'resize';
    state.dragItem = item;
}

function getCanvasPos(e) {
    const rect = DOM.canvasContainer.getBoundingClientRect();
    const x = (e.clientX - rect.left - state.offset.x) / state.zoom;
    const y = (e.clientY - rect.top - state.offset.y) / state.zoom;
    return { x, y };
}

function moveGroupAndChildren(groupId, dx, dy) {
    state.notes.filter(n => n.groupId === groupId).forEach(n => { n.x += dx; n.y += dy; });
    state.groups.filter(g => g.groupId === groupId).forEach(g => { g.x += dx; g.y += dy; moveGroupAndChildren(g.id, dx, dy); });
}

function updateGroupBounds(gid) {
    // グループのサイズを中身に合わせて調整するロジック（簡易版）
    // 現状は手動リサイズと自動判定が混在しないよう、明示的なリサイズがない場合のみ自動調整するなどの制御が必要
    // 今回はスキップ
}

function attachNoteEventListeners(el, n) {
    el.onmousedown = e => {
        if (!n.collapsed) {
            const edge = getResizeEdge(e, el);
            if (edge) { startResize(e, n, edge); return; }
        }
        startDrag(e, 'note');
    };
    el.onmousemove = e => {
        if (!n.collapsed && !state.dragType) {
            const edge = getResizeEdge(e, el);
            el.style.cursor = edge ? getResizeCursor(edge) : 'auto';
        }
    };
    el.querySelector('.title-input').onclick = e => e.stopPropagation();
    el.querySelector('.title-input').onchange = e => { pushHistory(); n.title = e.target.value; saveData(); };
    el.querySelector('.btn-collapse').onclick = e => { e.stopPropagation(); n.collapsed = !n.collapsed; renderCanvas(); saveData(); };
    el.querySelector('.btn-maximize').onclick = e => { e.stopPropagation(); openViewModal(n); };
    el.querySelector('.btn-duplicate').onclick = e => { e.stopPropagation(); duplicateItem(n.id, 'note'); };
    el.querySelector('.btn-connect').onclick = e => { e.stopPropagation(); state.connectingSource = n.id; renderCanvas(); };
    el.querySelector('.btn-ghost').onclick = e => { e.stopPropagation(); n.isGhost = !n.isGhost; renderCanvas(); };
    el.querySelector('.btn-delete').onclick = e => { e.stopPropagation(); deleteItem(n.id, 'note'); };
    el.querySelector('.btn-color').onclick = e => { e.stopPropagation(); rotateColor(n); };
}

function attachGroupEventListeners(el, g) {
    el.onmousedown = e => {
        const edge = !g.collapsed && getResizeEdge(e, el);
        if (edge) startResize(e, g, edge); else startDrag(e, 'group');
    };
    el.onmousemove = e => {
        if (!g.collapsed && !state.dragType) {
            const edge = getResizeEdge(e, el);
            el.style.cursor = edge ? getResizeCursor(edge) : 'auto';
        }
    };
    el.querySelector('.group-title-input').onclick = e => e.stopPropagation();
    el.querySelector('.group-title-input').onchange = e => { pushHistory(); g.title = e.target.value; saveData(); };
    el.querySelector('.btn-collapse').onclick = e => { e.stopPropagation(); g.collapsed = !g.collapsed; renderCanvas(); saveData(); };
    el.querySelector('.btn-duplicate').onclick = e => { e.stopPropagation(); duplicateItem(g.id, 'group'); };
    el.querySelector('.btn-connect').onclick = e => { e.stopPropagation(); state.connectingSource = g.id; renderCanvas(); };
    el.querySelector('.btn-color').onclick = e => { e.stopPropagation(); rotateColor(g); };
    el.querySelector('.btn-delete').onclick = e => { e.stopPropagation(); deleteItem(g.id, 'group'); };
}

// Logic Actions
function addGroup() {
    pushHistory();
    const p = findEmptyPosition(currentMouseCanvasPos.x, currentMouseCanvasPos.y, 400, 300);
    const g = { id: 'g' + Date.now(), title: "", x: p.x, y: p.y, width: 400, height: 300, collapsed: false, groupId: null };
    state.groups.push(g);
    // Check if added over items -> auto group? No, keep simple.
    renderCanvas(); saveData();
}

function saveNote() {
    const t = DOM.noteTitleInput.value.trim();
    const c = DOM.noteInput.value.trim();
    if (!c && !t) return;
    pushHistory();
    const p = findEmptyPosition(currentMouseCanvasPos.x, currentMouseCanvasPos.y, 300, 150);
    const n = { id: Date.now(), title: t, content: c, x: p.x, y: p.y, width: CONSTANTS.NOTE_WIDTH, height: CONSTANTS.NOTE_HEIGHT, color: getRandomColor(), collapsed: false };
    state.notes.push(n);
    renderCanvas(); saveData(); closeNoteModal();
}

function deleteItem(id, type) {
    if (state.pendingDelete && state.pendingDelete.id === id) {
        pushHistory();
        if (type === 'note') state.notes = state.notes.filter(n => n.id !== id);
        else if (type === 'group') {
            state.groups = state.groups.filter(g => g.id !== id);
            state.notes.forEach(n => { if (n.groupId === id) n.groupId = null; });
            state.groups.forEach(g => { if (g.groupId === id) g.groupId = null; });
        } else if (type === 'relation') {
            state.relations = state.relations.filter(r => r.id !== id);
        }
        state.pendingDelete = null;
        cleanupEmptyGroups(); // 削除によって1つだけになったグループがあれば掃除
        renderCanvas(); saveData();
    } else {
        state.pendingDelete = { id, timer: setTimeout(() => { state.pendingDelete = null; renderCanvas(); }, 3000) };
        renderCanvas();
    }
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

function autoRearrange() {
    // Simple grid arrange
    pushHistory();
    let col = 0, row = 0;
    const items = [...state.groups.filter(g => !g.groupId), ...state.notes.filter(n => !n.groupId)];
    items.forEach((it, i) => {
        it.x = col * 420;
        it.y = row * 450;
        col++;
        if (col > 3) { col = 0; row++; }
        // Children move relatively? No, this is destructive rearrange.
        // Actually we need to move children too if we move parent.
        // But for root items, we assume they carry their children.
        if (typeof it.id === 'string') moveGroupAndChildren(it.id, 0, 0); // Logic flaw: absolute pos set above.
        // Fixing arrange logic is out of scope for "Refactor", keeping existing behavior.
    });
    renderCanvas(); saveData();
}

function cleanupEmptyGroups() {
    let changed = false;
    do {
        changed = false;
        // 0個または1個の要素しか持たないグループを抽出
        const toDel = state.groups.filter(g => {
            const notes = state.notes.filter(n => n.groupId === g.id);
            const subs = state.groups.filter(gr => gr.groupId === g.id);
            return (notes.length + subs.length) <= 1;
        });

        if (toDel.length > 0) {
            toDel.forEach(g => {
                const parentId = g.groupId;
                // 中身（もしあれば）の親を、削除されるグループの親に書き換える
                state.notes.forEach(n => { if (n.groupId === g.id) n.groupId = parentId; });
                state.groups.forEach(gr => { if (gr.groupId === g.id) gr.groupId = parentId; });
                // グループ自体を削除
                state.groups = state.groups.filter(gr => gr.id !== g.id);
                changed = true;
            });
        }
    } while (changed);

    if (state.groups.length >= 0) { renderCanvas(); }
}

// Modals
function openNoteModal() { DOM.noteModal.classList.add('active'); DOM.noteTitleInput.value = ''; DOM.noteInput.value = ''; DOM.noteTitleInput.focus(); }
function closeNoteModal() { DOM.noteModal.classList.remove('active'); DOM.noteTitleInput.value = ''; DOM.noteInput.value = ''; }
function openImportModal() { DOM.importModal.classList.add('active'); DOM.importInput.focus(); }
function closeImportModal() { DOM.importModal.classList.remove('active'); DOM.importInput.value = ''; }
function openViewModal(n) { DOM.viewTitle.textContent = n.title || 'ノート閲覧'; DOM.viewBody.textContent = n.content; DOM.viewModal.classList.add('active'); }
function closeViewModal() { DOM.viewModal.classList.remove('active'); }
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

// Import Logic
function handleImport() {
    const text = DOM.importInput.value.trim();
    if (!text) return;

    let items = [];
    const lines = text.split('\n');
    const isMd = lines.some(l => l.trim().startsWith('- '));

    if (isMd) {
        let current = null;
        lines.forEach(line => {
            const top = line.match(/^-\s+(.*)/);
            const sub = line.match(/^\s+-\s+(.*)/);
            if (top) {
                if (current) items.push(current);
                current = { first: top[1].trim(), second: [] };
            }
            else if (sub) {
                if (current) current.second.push(sub[1].trim());
                else items.push({ title: "", content: sub[1].trim() });
            }
            else if (current) {
                if (current.second.length) current.second[current.second.length - 1] += ' ' + line.trim();
                else current.first += ' ' + line.trim();
            }
        });
        if (current) items.push(current);
        items = items.map(it => ({
            title: it.second.length ? it.first : "",
            content: it.second.length ? it.second.join('\n\n') : it.first
        }));
    } else {
        items = text.split(/\n\s*\n/).map(p => ({ title: "", content: p.trim() })).filter(p => p.content);
    }

    items.forEach((it, i) => {
        const p = findEmptyPosition(currentMouseCanvasPos.x + i * 20, currentMouseCanvasPos.y + i * 20, 300, 150);
        state.notes.push({ id: Date.now() + i, title: it.title, content: it.content, x: p.x, y: p.y, width: CONSTANTS.NOTE_WIDTH, height: CONSTANTS.NOTE_HEIGHT, color: 'slate', collapsed: false });
    });
    renderCanvas(); saveData(); closeImportModal();
}
