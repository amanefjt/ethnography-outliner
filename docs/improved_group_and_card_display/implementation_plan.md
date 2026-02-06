# Implementation Plan - グループ・カード表示および操作性の改善

## User Review Required
> [!NOTE]
> - **グループの折りたたみ**: 折りたたみ時はグループ内の要素（ノート・子グループ）を非表示にし、グループ自体のサイズをヘッダーのみに縮小します。展開時に元のサイズと位置関係を復元します。
> - **配置ロジック**: 画面中央から渦巻き状に空きスペースを探索し、重ならない位置を決定します。完全に空きがない場合は少しずらして配置します。

## Proposed Changes

### Logic Layer (`main.js`)

#### [MODIFY] data model & initialization
- `initializeDefaultData` や `addGroup`, `saveNote` でオブジェクト作成時に `collapsed: false` プロパティを追加。

#### [MODIFY] `renderGroups` / `createGroupElement`
- グループ要素生成時に、折りたたみボタン（chevron icon等）を追加。
- `collapsed` 状態に応じてクラス `collapsed` を付与。
- 折りたたみトグル時のイベントハンドラを追加。

#### [MODIFY] `renderNotes` / `createNoteElement`
- タイトルがある場合のみ折りたたみボタンを表示。
- `collapsed` 状態のスタイル適用。
- リンクアイコン（`.btn-connect`）の削除。

#### [MODIFY] `drag` / `startDrag` (Group Drag Logic)
- グループドラッグ時、そのグループを親 (`groupId`) に持つ全てのノートとグループを再帰的に取得。
- 親グループの移動量 (`dx`, `dy`) を、取得したすべての子要素の座標 (`x`, `y`) にも加算する。

#### [MODIFY] Placement Logic (`findEmptyPosition` - New Function)
- `saveNote` および `addGroup` で使用。
- 現在のビューの中心座標 (`state.offset` と `CANVAS_SIZE` から計算) を起点に、既存のアイテムと重ならない矩形領域を探す。

### UI Layer (`style.css`)

#### [MODIFY] Card Styles
- `.note-card .meta span` (ID表示): フォントサイズを小さくし、色を薄くする (`font-size: 0.7rem; color: #cbd5e1;` 等)。
- `.note-card.collapsed`: 高さ制限、`.content` 非表示、`.meta` 非表示等のスタイル。
- `.group-card.collapsed`: 高さ制限（ヘッダーのみ）、内部要素非表示のスタイル。
- リンクアイコン非表示 (`.btn-connect { display: none; }`)。

## Verification Plan

### Manual Verification
1. **上位グループ連動**:
   - グループの中にノートを置く。
   - そのグループをさらに別のグループ（上位）で囲む。
   - 上位グループをドラッグし、中のグループとノートが一緒についてくるか確認。
2. **新規配置**:
   - 画面中央にカードがある状態で「新しいノート」を作成。
   - 重ならずに近くに配置されるか確認。
3. **表示改善**:
   - ノートのリンクアイコンが消えているか。
   - IDが小さく薄くなっているか。
4. **折りたたみ**:
   - ノートを作成しタイトルを入力。折りたたみボタンで本文が隠れるか確認。
   - 「新規」以外の名前をつけたグループで、折りたたみボタンで中身が隠れ、小さくなるか確認。
   - ドラッグしても折りたたみ状態が維持されるか確認。
