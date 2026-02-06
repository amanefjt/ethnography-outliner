# 実装計画: Ethnography Outliner

博士号を持つ文化人類学者が、フィールドノート（カード）を空間的に配置し、そこから創発的にアウトライン（構造化された議論）を立ち上げるためのWebアプリケーションを開発します。

## ユーザーレビューが必要な項目

> [!IMPORTANT]
> データの保存方法について：今回はプロトタイプとして、ブラウザの `LocalStorage` を使用します。永続的なバックエンド（データベース）や Dynalist/Workflowy との直接連携は将来的な拡張事項とします。

## 提案される変更

### [NEW] Frontend Application

React と Vite をベースに、洗練されたデザイン（Glassmorphism）と直感的なインタラクションを重視したシングルページアプリケーションを構築します。

#### [NEW] [App.jsx](file:///Users/shufujita/.gemini/antigravity/scratch/ethnography-outliner/src/App.jsx)
アプリケーションのメインロジック。キャンバス状態とアウトライン状態を同期させます。

#### [NEW] [CardCanvas.jsx](file:///Users/shufujita/.gemini/antigravity/scratch/ethnography-outliner/src/components/CardCanvas.jsx)
KJ法的な空間配置を可能にするキャンバスコンポーネント。ドラッグ＆ドロップでカードを自由に動か、近接するもの同士を緩やかにグループ化します。

#### [NEW] [Outliner.jsx](file:///Users/shufujita/.gemini/antigravity/scratch/ethnography-outliner/src/components/Outliner.jsx)
キャンバス上の物理的な配置（X/Y座標およびグループ）を、箇条書きの階層構造として表示・編集するビュー。

#### [NEW] [index.css](file:///Users/shufujita/.gemini/antigravity/scratch/ethnography-outliner/src/index.css)
プレミアムなデザインシステムの実装。深いブルーやグレーを基調とした、集中力を高めるダークモード/ライトモード対応のUI。

## 検証プラン

### 手動検証
1.  **カード入力**: 複数のフィールドノート（短いテキスト）を入力し、キャンバスに生成されることを確認。
2.  **空間配置**: キャンバス上でカードを移動させ、近くに置いたものが「アウトライン」側で同じセクションに分類されることを確認。
3.  **構造化**: アウトラインビューで順序を入れ替えた際、議論の流れとして成立しているかを確認。
4.  **記法対応**: `//`（分割）や `--`（結合）が直感的に機能するかをシミュレーション。
