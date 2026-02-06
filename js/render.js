// ============================================================================
// RENDERING
// ============================================================================

function renderCanvas() {
    if (!DOM.canvas) return;
    DOM.canvas.innerHTML = '';
    DOM.canvas.style.transform = `scale(${state.zoom}) translate(${state.offset.x}px, ${state.offset.y}px)`;
    renderGroups();
    renderNotes();
    const svgLayer = createSVGLayer();
    const labelsLayer = document.createElement('div');
    labelsLayer.id = 'labels-layer';
    labelsLayer.style.position = 'absolute';
    labelsLayer.style.inset = '0';
    labelsLayer.style.pointerEvents = 'none';
    labelsLayer.style.zIndex = '950';
    DOM.canvas.appendChild(labelsLayer);

    renderRelations(svgLayer, labelsLayer);
    renderQuickActions();
    renderOutline();
    updateUndoRedoButtons();
    lucide.createIcons();
}

function createSVGLayer() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.id = 'connector-layer';
    svg.setAttribute('class', 'connector-layer');
    DOM.canvas.appendChild(svg);
    return svg;
}

// --- Group Rendering ---
function renderGroups() {
    // 括りが消える問題を修正: 親（一番外側）を先に、入れ子になっているものを後に描画
    const sortedGroups = [...state.groups].sort((a, b) => {
        const depthA = getGroupDepth(a.id);
        const depthB = getGroupDepth(b.id);
        return depthA - depthB;
    });

    sortedGroups.forEach(g => {
        if (isParentCollapsed(g.groupId)) return;
        const el = document.createElement('div');
        el.className = `group-card ${g.collapsed ? 'collapsed' : ''} ${state.selectedIds.includes(g.id) ? 'selected' : ''}`;
        el.dataset.id = g.id;
        el.style.left = `${g.x}px`;
        el.style.top = `${g.y}px`;
        el.style.width = `${g.width || CONSTANTS.DEFAULT_GROUP_WIDTH}px`;
        el.style.height = `${g.height || CONSTANTS.DEFAULT_GROUP_HEIGHT}px`;
        // グループのz-indexは階層の深さに応じて設定
        const depth = getGroupDepth(g.id);
        el.style.zIndex = depth * 10;

        el.innerHTML = `
        <div class="group-header">
            <button class="btn-collapse"><i data-lucide="${g.collapsed ? 'chevron-right' : 'chevron-down'}"></i></button>
            <input type="text" class="group-title-input" value="${escapeHtml(g.title || '無題のグループ')}" />
            <div class="item-actions">
                <button class="action-btn btn-duplicate" title="複製"><i data-lucide="copy"></i></button>
                <button class="action-btn btn-connect" title="関係付け"><i data-lucide="link"></i></button>
                <button class="action-btn btn-delete" title="削除"><i data-lucide="trash-2"></i></button>
            </div>
        </div>
        ${g.collapsed ? '<div class="collapsed-indicator">...</div>' : ''}
    `;
        attachGroupEventListeners(el, g);
        DOM.canvas.appendChild(el);
    });
}

function getGroupDepth(gid) {
    let depth = 0;
    let current = state.groups.find(g => g.id === gid);
    while (current && current.groupId) {
        depth++;
        current = state.groups.find(g => g.id === current.groupId);
    }
    return depth;
}

// --- Note Rendering ---
function renderNotes() {
    state.notes.forEach(note => {
        if (isParentCollapsed(note.groupId)) return;
        const el = createNoteElement(note);
        // ノートは同じ階層のグループより常に手前に表示
        const depth = note.groupId ? getGroupDepth(note.groupId) + 1 : 0;
        el.style.zIndex = depth * 10 + 100; // ベースとしてグループより高い値を設定
        if (state.selectedIds.includes(note.id)) {
            el.style.zIndex = depth * 10 + 500;
        }
        attachNoteEventListeners(el, note);
        DOM.canvas.appendChild(el);
    });
}

function createNoteElement(note) {
    const el = document.createElement('div');
    const isPending = state.pendingDelete && state.pendingDelete.id === note.id;
    el.className = `note-card color-${note.color || 'slate'} ${state.selectedIds.includes(note.id) ? 'selected' : ''} ${note.isGhost ? 'ghost' : ''} ${note.collapsed ? 'collapsed' : ''}`;
    el.style.left = `${note.x}px`;
    el.style.top = `${note.y}px`;
    el.style.width = `${note.width || CONSTANTS.NOTE_WIDTH}px`;
    el.style.height = `${note.height || CONSTANTS.NOTE_HEIGHT}px`;
    el.dataset.id = note.id;

    const chevron = note.collapsed ? 'chevron-right' : 'chevron-down';
    el.innerHTML = `
        <div class="header-row">
            <button class="btn-collapse"><i data-lucide="${chevron}"></i></button>
            <input type="text" class="title-input" value="${escapeHtml(note.title || '')}" placeholder="タイトルなし" />
        </div>
        <div class="content">${escapeHtml(note.content)}</div>
        <div class="meta"><span>ID: ${note.id}</span></div>
        <div class="item-actions">
            <button class="action-btn btn-maximize" title="全文表示"><i data-lucide="maximize-2"></i></button>
            <button class="action-btn btn-duplicate" title="複製"><i data-lucide="copy"></i></button>
            <button class="action-btn btn-connect" title="関係付け"><i data-lucide="link"></i></button>
            <button class="action-btn btn-ghost" title="半透明"><i data-lucide="eye"></i></button>
            <button class="action-btn btn-color" title="色変更"><i data-lucide="palette"></i></button>
            <button class="action-btn btn-delete ${isPending ? 'pending' : ''}" title="削除"><i data-lucide="${isPending ? 'check' : 'trash-2'}"></i></button>
        </div>
    `;
    return el;
}

// --- Relations Rendering ---
function renderRelations(svg, labelsLayer) {
    state.relations.forEach(r => {
        const s = state.notes.find(n => n.id === r.source) || state.groups.find(g => g.id === r.source);
        const t = state.notes.find(n => n.id === r.target) || state.groups.find(g => g.id === r.target);
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

            const delBtn = document.createElement('button');
            delBtn.className = 'btn-rel-delete';
            delBtn.innerHTML = '<i data-lucide="x"></i>';
            delBtn.onclick = e => {
                e.stopPropagation();
                if (confirm('この関係性を削除しますか？')) {
                    pushHistory();
                    state.relations = state.relations.filter(rel => rel.id !== r.id);
                    saveData();
                    renderCanvas();
                }
            };

            // ダブルクリックでも削除可能
            pill.ondblclick = e => {
                e.stopPropagation();
                state.relations = state.relations.filter(rel => rel.id !== r.id);
                saveData();
                renderCanvas();
            };

            pill.appendChild(input);
            pill.appendChild(delBtn);
            labelsLayer.appendChild(pill);
        }
    });

    if (state.connectingSource) {
        const s = state.notes.find(n => n.id === state.connectingSource) || state.groups.find(g => g.id === state.connectingSource);
        if (s) {
            const b = getItemBounds(s);
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', b.x + b.w / 2); line.setAttribute('y1', b.y + b.h / 2);
            line.setAttribute('x2', currentMouseCanvasPos.x); line.setAttribute('y2', currentMouseCanvasPos.y);
            line.setAttribute('stroke', '#3b82f6'); line.setAttribute('stroke-width', '2');
            svg.appendChild(line);
        }
    }
}

function renderQuickActions() {
    if (state.selectedIds.length < 2) return;
    const items = state.selectedIds.map(id => state.notes.find(n => n.id === id) || state.groups.find(g => g.id === id)).filter(Boolean);
    if (items.length < 2) return;

    // 選択された全アイテムの中心点を求める
    const minX = Math.min(...items.map(i => i.x));
    const maxX = Math.max(...items.map(i => i.x + (i.width || (typeof i.id === 'string' ? CONSTANTS.DEFAULT_GROUP_WIDTH : CONSTANTS.NOTE_WIDTH))));
    const minY = Math.min(...items.map(i => i.y));
    const maxY = Math.max(...items.map(i => i.y + (i.height || (typeof i.id === 'string' ? CONSTANTS.DEFAULT_GROUP_HEIGHT : CONSTANTS.NOTE_HEIGHT)))); // Typo fix: NOTE_HEIGHT

    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;

    const container = document.createElement('div');
    container.className = 'quick-actions';
    container.style.left = `${cx}px`;
    container.style.top = `${minY - 50}px`; // アイテム群の上に表示

    const btn = document.createElement('button');
    btn.className = 'quick-btn';
    btn.innerHTML = `まとめてグループ化`;
    btn.onclick = () => {
        pushHistory();
        const id = 'g' + Date.now();
        // コンテンツのマージンを考慮してグループサイズを決定
        const padding = 60;
        const g = {
            id,
            title: "",
            x: minX - padding,
            y: minY - padding * 1.5, // ヘッダー分
            width: maxX - minX + padding * 2,
            height: maxY - minY + padding * 2.5,
            collapsed: false,
            groupId: null
        };
        state.groups.push(g);

        // 選択されたアイテムをグループに所属させる（もし既にグループに入っていたら、その親からは抜けるが、座標は維持）
        // ただし、グループ化の際は、入れ子をサポートするため、単にgroupIdを上書きする
        // 今回の要件：選択アイテムを囲む新しいグループを作る。既存の親関係はどうするか？
        // シンプルに：選択されたアイテムの親を新しいグループにする。新しいグループの親はnull（ルート）または共通の親？
        // 簡易実装：ルートに作成。

        items.forEach(it => {
            // 相対座標調整は不要（グループは絶対座標管理かつ、子も絶対座標管理で、移動時に同期するため）
            it.groupId = id;
        });

        state.selectedIds = []; updateGroupBounds(id); saveData(); renderCanvas();
    };
    container.appendChild(btn);

    if (state.selectedIds.length === 2) {
        const relBtn = document.createElement('button');
        relBtn.className = 'quick-btn'; relBtn.style.background = '#64748b'; relBtn.innerHTML = `関係付ける`;
        relBtn.onclick = () => {
            pushHistory();
            state.relations.push({
                source: state.selectedIds[0],
                target: state.selectedIds[1],
                id: Date.now(),
                dash: CONSTANTS.DASH_PATTERNS[Math.floor(Math.random() * CONSTANTS.DASH_PATTERNS.length)]
            });
            state.selectedIds = []; saveData(); renderCanvas();
        };
        container.appendChild(relBtn);
    }

    DOM.canvas.appendChild(container);
}

function renderOutline() {
    if (!DOM.outlineList) return;
    DOM.outlineList.innerHTML = '';
    const root = [...state.groups.filter(g => !g.groupId), ...state.notes.filter(n => !n.groupId)].filter(it => !it.isGhost);
    root.forEach(it => DOM.outlineList.appendChild(createOutlineItem(it)));
}

function createOutlineItem(it) {
    const el = document.createElement('div');
    el.className = 'outline-item';
    const isG = typeof it.id === 'string';
    el.innerHTML = `<div class="outline-header ${isG ? 'is-group' : 'is-note'}"><span>${escapeHtml(it.title || (isG ? '無題のグループ' : '無題のノート'))}</span></div>`;

    if (isG) {
        const children = [...state.groups.filter(g => g.groupId === it.id), ...state.notes.filter(n => n.groupId === it.id)].filter(c => !c.isGhost);
        if (children.length > 0) {
            const container = document.createElement('div');
            container.className = 'outline-children';
            children.forEach(c => container.appendChild(createOutlineItem(c)));
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
