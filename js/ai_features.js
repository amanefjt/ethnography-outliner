// ============================================================================
// AI ETHNOGRAPHER FEATURES (Gemini API Integration)
// ============================================================================

const AIFeatures = {

    /**
     * Call Gemini API
     */
    async callGemini(prompt, systemInstruction = "") {
        const apiKey = Settings.getApiKey();
        if (!apiKey) {
            // Using custom modal instead of alert for consistency
            this.showAIResult("APIキー未設定", "右上の設定ボタンからGemini APIキーを設定してください。");
            return null;
        }

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

        const payload = {
            contents: [{
                parts: [{ text: prompt }]
            }],
            system_instruction: {
                parts: [{ text: systemInstruction }]
            },
            generationConfig: {
                response_mime_type: "application/json"
            }
        };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error?.message || response.statusText);
            }

            const data = await response.json();
            const text = data.candidates[0].content.parts[0].text;
            return JSON.parse(text);

        } catch (error) {
            console.error("Gemini API Error:", error);
            this.showAIResult("APIエラー", `エラーが発生しました:\n${error.message}`);
            return null;
        }
    },

    /**
     * Helper: Show AI Result Modal
     */
    /**
     * Helper: Show AI Result Modal
     */
    showAIResult(title, content) {
        const dialog = document.getElementById('ai-result-dialog');
        const titleEl = document.getElementById('ai-result-title');
        const bodyEl = document.getElementById('ai-result-body');

        if (dialog && titleEl && bodyEl) {
            titleEl.textContent = title;
            bodyEl.textContent = content;
            dialog.showModal();
            lucide.createIcons();
        } else {
            // Fallback
            alert(`${title}\n\n${content}`);
        }
    },

    /**
     * Feature: "Survival Logic" Grouping / Summary Proposal
     */
    async generateSummaryProposal(items) {
        if (!items || items.length === 0) return;

        // Recursive content extraction
        const extractContent = (it) => {
            if (typeof it.id === 'number') {
                return `- NOTE(ID:${it.id}): "${it.content}"`;
            } else {
                // Group: extract children recursively
                const children = state.notes.filter(n => n.groupId === it.id)
                    .concat(state.groups.filter(g => g.groupId === it.id));
                const childContent = children.map(c => extractContent(c)).join('\n');
                return `- GROUP(ID:${it.id}) "${it.title}":\n${childContent}`;
            }
        };

        const contentStr = items.map(it => extractContent(it)).join('\n');

        UI.showProgress(10, "分析を開始します...");

        const systemPrompt = `
あなたは「生存の論理」を探求する文化人類学者です。
提示されたフィールドノートやグループを分析し、**「直感的なグループ分け」**または**「メタレベルの統合」**を行います。
`;

        const userPrompt = `
以下の要素（ノートやグループ）を分析し、これらを束ねる新しい「意味のまとまり（グループ）」を1つ提案してください。

【出力形式（JSON）】
{
  "groupTitle": "具体的で喚起的なグループ名",
  "reason": "このグループを作成した人類学的理由（短く）",
  "targetIds": [ 対象となるIDのリスト（ノートIDは数値、グループIDは文字列） ]
}

【対象データ】
${contentStr}
`;

        // UI.showProgress(30, "Geminiが思考中...");
        const loading = document.getElementById('ai-loading');
        if (loading) loading.classList.add('active');

        try {
            const result = await this.callGemini(userPrompt, systemPrompt);

            // UI.showProgress(80, "結果を適用中...");
            if (result && result.targetIds && result.targetIds.length > 0) {
                this.applyGrouping(result, items); // Pass original items to help filtering
            }
        } finally {
            // UI.hideProgress();
            if (loading) loading.classList.remove('active');
        }
    },

    applyGrouping(result, candidateItems) {
        // Filter items that are actually present and selected
        // Ensure type consistency for filter
        const targetItems = candidateItems.filter(it => result.targetIds.includes(it.id));

        if (targetItems.length === 0) {
            this.showAIResult("分析結果", "該当する要素が見つかりませんでした。");
            return;
        }

        pushHistory();

        // Calculate bounds
        const minX = Math.min(...targetItems.map(n => n.x));
        const minY = Math.min(...targetItems.map(n => n.y));
        const maxX = Math.max(...targetItems.map(n => n.x + (n.width || (typeof n.id === 'string' ? CONSTANTS.DEFAULT_GROUP_WIDTH : CONSTANTS.NOTE_WIDTH))));
        const maxY = Math.max(...targetItems.map(n => n.y + (n.height || (typeof n.id === 'string' ? CONSTANTS.DEFAULT_GROUP_HEIGHT : CONSTANTS.NOTE_HEIGHT))));

        const padding = 60;
        const newGroupId = 'g' + Date.now();

        const newGroup = {
            id: newGroupId,
            title: result.groupTitle,
            x: minX - padding,
            y: minY - padding * 1.5,
            width: maxX - minX + padding * 2,
            height: maxY - minY + padding * 2.5,
            color: CONSTANTS.COLORS[Math.floor(Math.random() * CONSTANTS.COLORS.length)],
            collapsed: false,
            groupId: null
        };

        state.groups.push(newGroup);
        targetItems.forEach(n => n.groupId = newGroupId);

        // Deselect and Refresh
        state.selectedIds = [];
        // updateGroupBounds(newGroupId); 
        saveData();
        renderCanvas();

        this.showAIResult("✨ グループを作成しました", `「${result.groupTitle}」\n\n理由: ${result.reason}`);
    },

    /**
     * Feature: "Paradigm Fault Lines" Analysis
     */
    async generateGroupSplitProposal(group, children) {
        if (!group || !children || children.length === 0) return;

        // We use the custom modal for confirmation? No, `confirm` is sync.
        // Let's use the new showConfirmModal helper if we can refactor this to async/callback.
        // For now, let's skip confirmation or use the robust one if possible. 
        // Since we are inside an async function triggered by click, we can't easily wait for the custom modal callback inline without refactoring.
        // **Decision**: Skip confirmation for AI actions or trust the Undo button. Let's skip confirmation to make it snappy, or use `alert` if we must. 
        // Actually, let's just proceed. It's properly undoable.

        const notesContent = children.map(n => `- ID:${n.id} "${n.content}"`).join('\n');

        const systemPrompt = `
あなたは「パラダイムの断層」を見抜く文化人類学者です。
グループ内に潜む「価値観のねじれ」や「矛盾」を暴き出し、分割案を提示します。
`;

        const userPrompt = `
以下のグループ（タイトル：「${group.title}」）を分析し、内部に断層（対立）があれば分割してください。
断層が明確でない場合は、無理に分割せず空のリストを返してください。

【出力形式（JSON）】
{
  "faultFound": true,
  "analysis": "断層の分析内容",
  "newGroups": [
    {
      "title": "新しいグループ名A",
      "noteIds": [ ... ]
    },
    {
      "title": "新しいグループ名B",
      "noteIds": [ ... ]
    }
  ]
}

【対象データ】
${notesContent}
`;

        // UI.showProgress(30, "グループの断層を探しています...");
        const loading = document.getElementById('ai-loading');
        if (loading) loading.classList.add('active');

        try {
            const result = await this.callGemini(userPrompt, systemPrompt);

            if (!result || !result.faultFound) { // splitFound -> faultFound (based on JSON prompt)
                if (loading) loading.classList.remove('active');
                this.showAIResult("分析結果", "✅ 明確な断層は見つかりませんでした。\nこのグループは強固な結束を持っています。");
                return;
            }

            // UI.showProgress(80, "グループを分割中...");
            if (result.newGroups && result.newGroups.length > 0) {
                this.applyFaultLines(group, result); // applyGroupSplit -> applyFaultLines
            }
        } catch (error) {
            console.error("AI Split Error:", error);
            this.showAIResult("エラー", "断層分析中にエラーが発生しました。");
        } finally {
            if (loading) loading.classList.remove('active');
        }
    },

    applyFaultLines(originalGroup, result) {
        pushHistory();

        let startX = originalGroup.x + 20;
        let startY = originalGroup.y + 60;

        result.newGroups.forEach((ng, index) => {
            const newGroupId = 'g' + Date.now() + index;
            const targetNotes = state.notes.filter(n => ng.noteIds.includes(n.id));

            if (targetNotes.length === 0) return;

            // Move notes to new group
            targetNotes.forEach(n => n.groupId = newGroupId);

            // Create Group Object
            const nMinX = Math.min(...targetNotes.map(n => n.x));
            const nMinY = Math.min(...targetNotes.map(n => n.y));
            const nMaxX = Math.max(...targetNotes.map(n => n.x + (n.width || 300)));
            const nMaxY = Math.max(...targetNotes.map(n => n.y + (n.height || 150)));

            state.groups.push({
                id: newGroupId,
                title: ng.title,
                x: nMinX - 20,
                y: nMinY - 40,
                width: nMaxX - nMinX + 40,
                height: nMaxY - nMinY + 60,
                color: CONSTANTS.COLORS[Math.floor(Math.random() * CONSTANTS.COLORS.length)],
                collapsed: false,
                groupId: originalGroup.groupId
            });
        });

        // 2. What to do with the original group?
        const remainingChildren = state.notes.filter(n => n.groupId === originalGroup.id);
        if (remainingChildren.length === 0) {
            state.groups = state.groups.filter(g => g.id !== originalGroup.id);
        }

        saveData();
        renderCanvas();
        this.showAIResult("⚡️ 断層を発見しました", `${result.newGroups.length}つのグループに分割しました。\n\n分析: ${result.analysis}`);
    },


};
