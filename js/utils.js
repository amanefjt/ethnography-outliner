// ============================================================================
// UTILITIES
// ============================================================================

function getRandomColor() {
    return CONSTANTS.COLORS[Math.floor(Math.random() * CONSTANTS.COLORS.length)];
}

function escapeHtml(s) {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
}

function isParentCollapsed(id, v = new Set()) {
    if (!id || v.has(id)) return false;
    v.add(id);
    const g = state.groups.find(x => x.id === id);
    return g ? (g.collapsed || isParentCollapsed(g.groupId, v)) : false;
}

function findEmptyPosition(sx, sy, w, h) {
    let x = sx, y = sy, r = 0, a = 0;
    while (isOverlapping(x, y, w, h) && r < 2000) {
        r += 50;
        a += 0.5;
        x = sx + r * Math.cos(a);
        y = sy + r * Math.sin(a);
    }
    return { x, y };
}

function isOverlapping(x, y, w, h) {
    return state.notes.some(n => !(x + w < n.x || n.x + 300 < x || y + h < n.y || n.y + 150 < y)) ||
        state.groups.some(g => !(x + w < g.x || g.x + (g.width || 400) < x || y + h < g.y || g.y + (g.height || 300) < y));
}

function getResizeEdge(e, el) {
    const r = el.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    const nearBottom = y > r.height - 12;
    const nearRight = x > r.width - 12;
    if (nearBottom && nearRight) return 'se';
    if (nearBottom) return 's';
    if (nearRight) return 'e';
    return null;
}

function getResizeCursor(edge) {
    const cursors = { 's': 'ns-resize', 'e': 'ew-resize', 'se': 'nwse-resize' };
    return cursors[edge] || 'grab';
}

function getItemBounds(item) {
    const isGroup = typeof item.id === 'string' && item.id.startsWith('g');
    return {
        x: item.x,
        y: item.y,
        w: item.width || (isGroup ? CONSTANTS.DEFAULT_GROUP_WIDTH : CONSTANTS.NOTE_WIDTH),
        h: item.height || (isGroup ? CONSTANTS.DEFAULT_GROUP_HEIGHT : CONSTANTS.NOTE_HEIGHT)
    };
}

function getNearestBoundaryPoints(x1, y1, w1, h1, x2, y2, w2, h2) {
    const intersect = (ax, ay, aw, ah, tx, ty) => {
        const cx = ax + aw / 2;
        const cy = ay + ah / 2;
        const dx = tx - cx;
        const dy = ty - cy;
        if (dx === 0 && dy === 0) return { x: cx, y: cy };

        // 交点を計算。ターゲットの中心を結ぶ直線上
        const scaleX = (aw / 2) / Math.abs(dx);
        const scaleY = (ah / 2) / Math.abs(dy);
        const scale = Math.min(scaleX, scaleY);

        return { x: cx + dx * scale, y: cy + dy * scale };
    };

    // 中点同士を結ぶ線上の、それぞれの境界線上の点を求める
    const c1x = x1 + w1 / 2;
    const c1y = y1 + h1 / 2;
    const c2x = x2 + w2 / 2;
    const c2y = y2 + h2 / 2;

    const p1 = intersect(x1, y1, w1, h1, c2x, c2y);
    const p2 = intersect(x2, y2, w2, h2, c1x, c1y);
    return { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y };
}
