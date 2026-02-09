// ============================================================================
// RENDERING
// ============================================================================

function renderCanvas() {
    if (!DOM.canvas) return;
    // console.log('renderCanvas called. Notes:', state.notes.length, 'Groups:', state.groups.length);
    DOM.canvas.innerHTML = '';
    DOM.canvas.style.transform = `scale(${state.zoom}) translate(${state.offset.x}px, ${state.offset.y}px)`;

    // Layers Order (DOM order matters for same z-index, but we use explicit z-index)
    // 1. Groups (Background)
    renderGroups();

    // 2. Connector Layer (Lines)
    const svgLayer = createSVGLayer();

    // 3. Connector Labels Layer
    const labelsLayer = document.createElement('div');
    labelsLayer.style.position = 'absolute';
    labelsLayer.style.inset = '0';
    labelsLayer.style.pointerEvents = 'none';
    labelsLayer.style.zIndex = '60'; // Above lines, below notes
    DOM.canvas.appendChild(labelsLayer);

    renderRelations(svgLayer, labelsLayer);

    // 4. Notes (Foreground)
    renderNotes();



    renderOutline();

    updateUndoRedoButtons();
    lucide.createIcons();
}

function createSVGLayer() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'connector-layer');
    svg.style.pointerEvents = 'none';
    svg.style.zIndex = '50'; // Background lines
    DOM.canvas.appendChild(svg);
    return svg;
}

// --- Group Rendering ---
function renderGroups() {
    const sortedGroups = [...state.groups].sort((a, b) => {
        const depthA = getGroupDepth(a.id);
        const depthB = getGroupDepth(b.id);
        return depthA - depthB;
    });

    sortedGroups.forEach(g => {
        if (isParentCollapsed(g.groupId)) return;
        const el = document.createElement('div');
        el.className = `group-card color-${g.color || 'slate'} ${g.collapsed ? 'collapsed' : ''} ${state.selectedIds.includes(g.id) ? 'selected' : ''}`;

        // Data attributes for Event Delegation
        el.dataset.type = 'group';
        el.dataset.id = g.id;

        el.style.left = `${g.x}px`;
        el.style.top = `${g.y}px`;
        el.style.width = `${g.width || CONSTANTS.DEFAULT_GROUP_WIDTH}px`;
        el.style.height = `${g.height || CONSTANTS.DEFAULT_GROUP_HEIGHT}px`;

        const depth = getGroupDepth(g.id);
        el.style.zIndex = 100 + (depth * 10);

        const chevron = g.collapsed ? 'chevron-right' : 'chevron-down';

        el.innerHTML = `
        <div class="group-header">
            <button type="button" class="btn-collapse" data-action="toggle-collapse" data-id="${g.id}">
                <i data-lucide="${chevron}"></i>
            </button>
            ${g.collapsed
                ? `<div class="title-display">${escapeHtml(g.title || '無題のグループ')}</div>`
                : `<input type="text" class="group-title-input" value="${escapeHtml(g.title || '無題のグループ')}" 
                    data-action="rename-group" data-id="${g.id}" />`
            }
        </div>
        ${g.collapsed ? '<div class="collapsed-indicator">...</div>' : ''}
    `;
        // No attachGroupEventListeners needed!
        DOM.canvas.appendChild(el);
    });
}

function getGroupDepth(gid) {
    let depth = 0;
    let current = state.groups.find(g => g.id === gid);
    while (current && current.groupId && depth < 100) {
        depth++;
        current = state.groups.find(g => g.id === current.groupId);
    }
    return depth;
}

// --- Note Rendering ---
// --- Note Rendering ---
function renderNotes() {
    state.notes.forEach(note => {
        try {
            if (isParentCollapsed(note.groupId)) return;

            const el = createNoteElement(note);
            const depth = note.groupId ? getGroupDepth(note.groupId) + 1 : 0;
            // Base Z for notes: 500. Selected: +200.
            let z = 500 + (depth * 10);
            if (state.selectedIds.includes(note.id)) {
                z += 200;
            }
            el.style.zIndex = z;
            // Event listeners handled by global delegation in interactions.js
            // console.log('Rendering note:', note.id);
            DOM.canvas.appendChild(el);
        } catch (e) {
            console.error('Error rendering note:', note.id, e);
        }
    });
}

function createNoteElement(note) {
    const el = document.createElement('div');
    el.className = `note-card color-${note.color || 'slate'} ${state.selectedIds.includes(note.id) ? 'selected' : ''} ${note.isGhost ? 'ghost' : ''} ${note.collapsed ? 'collapsed' : ''}`;
    el.style.left = `${note.x}px`;
    el.style.top = `${note.y}px`;
    el.style.width = `${note.width || CONSTANTS.NOTE_WIDTH}px`;
    // Height is auto (min-height via CSS) - let content dictate size

    // Important: Data attributes for Global Event Delegation
    el.dataset.type = 'note';
    el.dataset.id = note.id;

    const chevron = note.collapsed ? 'chevron-right' : 'chevron-down';

    // Minimalist Structure: Collapse, Title, ID, Content
    // No more action buttons inside the card!
    el.innerHTML = `
        <div class="header-row">
            <button type="button" class="btn-collapse" data-action="toggle-collapse" data-id="${note.id}" title="${note.collapsed ? '展開' : '折りたたみ'}">
                <i data-lucide="${chevron}"></i>
            </button>
            ${note.collapsed
            ? `<div class="title-display">${escapeHtml(note.content || '無題のノート')}</div>`
            : (note.title
                ? `<div class="title-display" style="font-weight:700;">${escapeHtml(note.title)}</div>`
                : `<div class="meta"><span>ID: ${note.id}</span></div>`
            )
        }
        </div>
        ${!note.collapsed ? `<div class="content">${escapeHtml(note.content)}</div>` : ''}
    `;
    return el;
}

// --- Relations Rendering ---
function renderRelations(svg, labelsLayer) {
    state.relations.forEach(r => {
        // Source/Target can be Note (number) or Group (string)
        const s = typeof r.source === 'number' ? state.notes.find(n => n.id === r.source) : state.groups.find(g => g.id === r.source);
        const t = typeof r.target === 'number' ? state.notes.find(n => n.id === r.target) : state.groups.find(g => g.id === r.target);

        if (!s || !t) return;
        if (isParentCollapsed(s.groupId) || isParentCollapsed(t.groupId)) return;

        const b1 = getItemBounds(s);
        const b2 = getItemBounds(t);
        const p = getNearestBoundaryPoints(b1.x, b1.y, b1.w, b1.h, b2.x, b2.y, b2.w, b2.h);

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', p.x1); line.setAttribute('y1', p.y1);
        line.setAttribute('x2', p.x2); line.setAttribute('y2', p.y2);
        line.setAttribute('stroke', '#94a3b8'); line.setAttribute('stroke-width', '2');
        if (r.dash && r.dash !== 'none') line.setAttribute('stroke-dasharray', r.dash);
        svg.appendChild(line);

        if (labelsLayer) {
            const midX = (p.x1 + p.x2) / 2;
            const midY = (p.y1 + p.y2) / 2;
            const pill = document.createElement('div');
            pill.className = 'relation-label-container';
            pill.style.left = `${midX}px`;
            pill.style.top = `${midY}px`;
            pill.title = 'ダブルクリックで削除';

            const input = document.createElement('input');
            input.className = 'relation-label-input';
            input.value = r.label || '';
            input.placeholder = '名称なし';
            input.onchange = e => { pushHistory(); r.label = e.target.value; saveData(); };
            input.onmousedown = e => e.stopPropagation();

            const isPending = state.pendingDelete && state.pendingDelete.id === r.id;
            const delBtn = document.createElement('button');
            delBtn.className = `btn-rel-delete ${isPending ? 'pending' : ''}`;
            delBtn.type = 'button';
            delBtn.innerHTML = `<i data-lucide="${isPending ? 'check' : 'x'}"></i>`;
            delBtn.onclick = e => {
                e.stopPropagation();
                deleteItem(r.id, 'relation');
            };

            pill.ondblclick = e => {
                e.stopPropagation();
                deleteItem(r.id, 'relation');
            };

            pill.appendChild(input);
            pill.appendChild(delBtn);
            labelsLayer.appendChild(pill);
        }
    });

    // Connection Mode Feedback
    if (state.connectingSource) {
        DOM.canvasContainer.style.cursor = 'crosshair'; // Change cursor

        // Find source items
        const sources = Array.isArray(state.connectingSource) ? state.connectingSource : [state.connectingSource];

        sources.forEach(sId => {
            const s = typeof sId === 'number' ? state.notes.find(n => n.id === sId) : state.groups.find(g => g.id === sId);
            if (s) {
                const b = getItemBounds(s);
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                // Draw from center of source to mouse
                line.setAttribute('x1', b.x + b.w / 2);
                line.setAttribute('y1', b.y + b.h / 2);
                line.setAttribute('x2', currentMouseCanvasPos.x);
                line.setAttribute('y2', currentMouseCanvasPos.y);
                line.setAttribute('stroke', '#3b82f6');
                line.setAttribute('stroke-width', '2');
                line.setAttribute('stroke-dasharray', '5,5'); // Dashed for temporary line
                svg.appendChild(line);
            }
        });
    } else {
        DOM.canvasContainer.style.cursor = 'default';
    }
}

// function renderQuickActions() { ... Removed in favor of Context Bar ... }

// --- Outline Rendering ---
function renderOutline() {
    // Optimization: Don't render outline if not visible
    if (!DOM.outlinerView || !DOM.outlinerView.classList.contains('active')) return;

    if (!DOM.outlineList) return;
    DOM.outlineList.innerHTML = '';

    // Root items: items with null groupId
    const rootGroups = state.groups.filter(g => !g.groupId);
    const rootNotes = state.notes.filter(n => !n.groupId);
    const root = [...rootGroups, ...rootNotes].filter(it => !it.isGhost);

    root.sort((a, b) => a.y - b.y);

    root.forEach(it => DOM.outlineList.appendChild(createOutlineItem(it, 0)));
}

function createOutlineItem(it, depth = 0) {
    if (depth > 100) return document.createElement('div'); // Recursion limit

    const el = document.createElement('div');
    el.className = 'outline-item';
    el.draggable = true;
    el.dataset.id = it.id;

    const isG = typeof it.id === 'string';
    el.innerHTML = `<div class="outline-header ${isG ? 'is-group' : 'is-note'}"><span>${escapeHtml(it.title || (isG ? '無題のグループ' : '無題のノート'))}</span></div>`;

    if (isG) {
        // Children
        const childGroups = state.groups.filter(g => g.groupId === it.id);
        const childNotes = state.notes.filter(n => n.groupId === it.id);
        const children = [...childGroups, ...childNotes].filter(c => !c.isGhost);
        children.sort((a, b) => a.y - b.y);

        if (children.length > 0) {
            const container = document.createElement('div');
            container.className = 'outline-children';
            children.forEach(c => container.appendChild(createOutlineItem(c, depth + 1)));
            el.appendChild(container);
        }
    } else {
        const summary = document.createElement('div');
        summary.className = 'outline-content-summary';
        summary.textContent = it.content.length > 50 ? it.content.substring(0, 50) + '...' : it.content;
        el.appendChild(summary);
    }
    return el;
}

// ============================================================================
// UI FEEDBACK
// ============================================================================
window.UI = {
    progressOverlay: null,
    progressMessage: null,
    progressPercent: null,

    init() {
        this.progressOverlay = document.getElementById('ai-progress-overlay');
        this.progressMessage = document.getElementById('progress-message');
        this.progressPercent = document.getElementById('progress-percent');
    },

    showProgress(percent, message) {
        if (!this.progressOverlay) this.init();
        if (this.progressOverlay) {
            this.progressOverlay.style.display = 'flex';
            if (this.progressMessage) this.progressMessage.textContent = message || "AI分析中...";
            if (this.progressPercent) this.progressPercent.textContent = `${percent}%`;
        }
    },

    hideProgress() {
        if (!this.progressOverlay) this.init();
        if (this.progressOverlay) {
            this.progressOverlay.style.display = 'none';
        }
    }
};
