# Ethnography Outliner

An infinite canvas for organizing ethnographic field notes, supporting nested grouping, note linking, and Markdown import.

## 🔗 Public URL
**[https://amanefjt.github.io/ethnography-outliner/](https://amanefjt.github.io/ethnography-outliner/)**

---

## ✨ Features (v24.08)

### 1. Infinite Canvas & Cards
- **Create Notes**: Double-click or use the "Add Note" button. Supports Title (optional) and Body text.
- **Resize**: Drag the bottom-right corner of cards to resize.
- **Colors**: Change card colors using the palette button.
- **Drag & Drop**: Move cards freely.

### 2. Grouping System
- **Create Groups**: Select multiple items (hold Cmd/Ctrl + click) -> Click "Group" button.
- **Nested Groups**: Drag a group into another group.
- **Auto-Cleanup**: Groups with only 1 item (or empty) are automatically dissolved to keep the workspace clean.
- **Move Together**: Dragging a group moves all its children.
- **Drag Out**: You can drag items OUT of a group to ungroup them.
- **Color Coding**: Groups have random colors on creation, changeable via the palette button.

### 3. Relationships & Linking
- **Connect**: Select 2 items -> Click "Connect" (or use context menu).
- **Edit Lines**: Click a line to add a label.
- **Delete**: 
  - **Click 'x' button once**: Enters "Confirm" mode (Check icon).
  - **Click again**: Deletes the line.
  - **Double-click label**: Instantly deletes the line.

### 4. Text Import
- **Two Modes**:
  1. **Markdown/Workflowy**: Lines starting with `- ` are treated as hierarchies (Parent = Title, Child = Body).
  2. **Plain Text**: Split by empty lines (double newline).

### 5. View Modes
- **Canvas View**: Spatial organization.
- **Outliner View**: Linear, hierarchical list view of your data.

### 6. Data Persistence
- **Auto-Save**: All changes are saved to your browser's LocalStorage.

---

## 🛠 Project Structure

- `index.html`: Entry point and UI structure.
- `main.js`: Setup and initialization.
- `style.css`: Styling and layout.
- `js/`: Modularized logic.
  - `constants.js`: Config values.
  - `state.js`: Data management.
  - `render.js`: Drawing to the screen.
  - `interactions.js`: Event listeners and logic.
  - `utils.js`: Helper functions.
