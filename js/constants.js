const CONSTANTS = {
    NOTE_WIDTH: 300,
    NOTE_HEIGHT: 150,
    DEFAULT_GROUP_WIDTH: 400,
    DEFAULT_GROUP_HEIGHT: 300,
    COLORS: ['rose', 'orange', 'yellow', 'green', 'cyan', 'blue', 'purple'],
    DASH_PATTERNS: ['none', '5,5', '10,10', '20,10,5,10', '15,10,5,10,15'],
    GRID_SIZE: 1 // No grid snap effectively
};

// Global DOM references
const DOM = {
    canvasContainer: null,
    canvas: null,
    canvasView: null,
    outlinerView: null,
    outlineList: null,
    viewToggle: null,
    addNoteBtn: null,
    addGroupBtn: null,
    noteModal: null,
    noteInput: null,
    noteTitleInput: null,
    saveNoteBtn: null,
    cancelNoteBtn: null,
    rearrangeBtn: null,
    zoomInBtn: null,
    zoomOutBtn: null,
    importBtn: null,
    importModal: null,
    importInput: null,
    saveImportBtn: null,
    cancelImportBtn: null,
    viewModal: null,
    viewTitle: null,
    viewBody: null,
    closeViewBtn: null,
    undoBtn: null,
    redoBtn: null
};

// Global State
const state = {
    notes: [],
    groups: [],
    relations: [],
    zoom: 1,
    offset: { x: 0, y: 0 },
    isDragging: false,
    dragType: null, // 'canvas', 'note', 'group'
    dragItem: null,
    dragStart: { x: 0, y: 0 },
    dragOffset: { x: 0, y: 0 },
    selectedIds: [],
    connectingSource: null,
    history: { past: [], future: [] },
    pendingDelete: null,
    outlineOrder: {} // parentId -> [childIds] for custom ordering (not fully implemented yet)
};

// Mouse Position Tracking
let currentMouseCanvasPos = { x: 0, y: 0 };
