// ============================================================================
// SETTINGS MANAGEMENT
// ============================================================================

const Settings = {
    apiKey: localStorage.getItem('gemini_api_key') || '',

    init() {
        // Settings Button Listener
        const btn = document.getElementById('btn-settings');
        if (btn) {
            btn.onclick = () => this.openModal();
        }

        // Modal Listeners
        const saveBtn = document.getElementById('btn-save-settings');
        if (saveBtn) saveBtn.onclick = () => this.save();

        const closeBtn = document.getElementById('btn-close-settings');
        if (closeBtn) closeBtn.onclick = () => this.closeModal();
    },

    openModal() {
        const modal = document.getElementById('settings-modal');
        const input = document.getElementById('input-api-key');
        if (input) input.value = this.apiKey;
        if (modal) modal.classList.add('active');
    },

    closeModal() {
        const modal = document.getElementById('settings-modal');
        if (modal) modal.classList.remove('active');
    },

    save() {
        const input = document.getElementById('input-api-key');
        const newKey = input ? input.value.trim() : '';
        this.apiKey = newKey;
        localStorage.setItem('gemini_api_key', newKey);
        this.closeModal();
        alert('✨ 設定を保存しました');
    },

    getApiKey() {
        this.apiKey = localStorage.getItem('gemini_api_key') || '';
        return this.apiKey;
    }
};

// Initialize on load
window.addEventListener('DOMContentLoaded', () => {
    Settings.init();
});
