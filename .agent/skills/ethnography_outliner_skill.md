---
name: Ethnography Outliner Skill
description: Instructions and specifications for the Ethnography Outliner application features and interactions.
---

# Ethnography Outliner Skill

## 1. Interaction Specifications

### Relations (Connect)
- **Goal**: Create a visual link between two items (Notes or Groups).
- **Action**:
    1.  Click the "Link" icon (🔗) on the source item.
    2.  The cursor changes to `crosshair`, and a dashed line follows the mouse from the source center.
    3.  Click the target item to complete the connection.
- **Constraints**:
    -   Cannot connect to self.
    -   Line is drawn between nearest boundary points.
    -   Double-click the relation label to delete it.

### Zoom Control
- **Logic**: "Zoom to Cursor" principal.
- **Action**:
    -   Mouse Wheel (with Ctrl/Meta) or Touchpad Pinch: Zooms in/out centered on the mouse pointer location.
    -   Buttons (+/-): Zoom in/out centered on the current view center.
- **Implementation Note**: `state.offset` updates must compensate for the zoom scale change relative to the pivot point.

### Robust Deletion
- **Trigger**:
    -   Keyboard: `Delete` or `Backspace`.
    -   UI: Trash icon on item.
- **Behavior**:
    -   ALWAYS triggers the Custom Confirmation Modal (`#confirm-modal`).
    -   **Multi-Select**: Deletes all selected notes and groups.
    -   **Group Deletion**: Deletes the group container and releases children (unless children are also selected).
    -   **Relation Deletion**: Explicitly deleted relationships are removed. Relationships attached to deleted items are automatically removed.

## 2. AI Features (Gemini Integration)

### Group-to-Group Structure
- **Scope**: Can analyze selection containing both Notes and Groups.
- **Logic**: Recursively extracts text content from groups to form a comprehensive prompt.
- **UI**:
    -   Uses "AI Result Modal" (`#ai-result-modal`) to display results/errors.
    -   Never uses native `alert()`.
- **Function**: `AIFeatures.generateSummaryProposal(items)`

### Paradigm Fault Lines
- **Trigger**: "Lightning" icon (⚡️) on Group header.
- **Logic**: Analyzes internal contradictions within a group and proposes split.
- **UI**: Shows progress overlay, then AI Result Modal.

### Thick Description
- **Trigger**: "Sparkles" icon (✨) on Group header.
- **Logic**: Rewrites group title into a propositional statement.

## 3. Data Integrity Rules
- **Saving**: All actions (Move, Resize, Edit, Delete, Connect) trigger `saveData()` and `pushHistory()`.
- **Initialization**: Browser reload ensures fresh state but loads from `localStorage`.
