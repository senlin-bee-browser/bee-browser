import type { Settings, MessageType } from '@types/app-types';

class OptionsController {
  private settings: Settings | null = null;

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    await this.loadSettings();
    this.setupEventListeners();
    await this.updateAnalytics();
    await this.updateStorageInfo();
  }

  private async loadSettings(): Promise<void> {
    try {
      const response = await this.sendMessage({ type: 'GET_SETTINGS' } as MessageType);
      this.settings = response.settings;
      this.populateForm();
    } catch (error) {
      console.error('Error loading settings:', error);
      this.showError('Failed to load settings');
    }
  }

  private populateForm(): void {
    if (!this.settings) return;

    const aiProviderSelect = document.getElementById('aiProvider') as HTMLSelectElement;
    const apiKeyInput = document.getElementById('apiKey') as HTMLInputElement;
    const enableAutoGroupingCheckbox = document.getElementById('enableAutoGrouping') as HTMLInputElement;
    const groupingFrequencySelect = document.getElementById('groupingFrequency') as HTMLSelectElement;
    const maxHistoryDaysInput = document.getElementById('maxHistoryDays') as HTMLInputElement;
    const privacyModeCheckbox = document.getElementById('privacyMode') as HTMLInputElement;

    aiProviderSelect.value = this.settings.aiProvider;
    apiKeyInput.value = this.settings.apiKey || '';
    enableAutoGroupingCheckbox.checked = this.settings.enableAutoGrouping;
    groupingFrequencySelect.value = this.settings.groupingFrequency;
    maxHistoryDaysInput.value = this.settings.maxHistoryDays.toString();
    privacyModeCheckbox.checked = this.settings.privacyMode;

    this.toggleApiKeyField();
  }

  private setupEventListeners(): void {
    const aiProviderSelect = document.getElementById('aiProvider');
    const toggleApiKeyBtn = document.getElementById('toggleApiKey');
    const saveBtn = document.getElementById('saveBtn');
    const resetBtn = document.getElementById('resetBtn');
    const clearDataBtn = document.getElementById('clearDataBtn');
    const exportBtn = document.getElementById('exportBtn');
    const importBtn = document.getElementById('importBtn');
    const importFile = document.getElementById('importFile') as HTMLInputElement;

    aiProviderSelect?.addEventListener('change', this.toggleApiKeyField.bind(this));
    toggleApiKeyBtn?.addEventListener('click', this.toggleApiKeyVisibility.bind(this));
    saveBtn?.addEventListener('click', this.saveSettings.bind(this));
    resetBtn?.addEventListener('click', this.resetToDefaults.bind(this));
    clearDataBtn?.addEventListener('click', this.confirmClearData.bind(this));
    exportBtn?.addEventListener('click', this.exportData.bind(this));
    importBtn?.addEventListener('click', () => importFile?.click());
    importFile?.addEventListener('change', this.importData.bind(this));

    // Auto-save on form changes
    const formElements = document.querySelectorAll('input, select');
    formElements.forEach(element => {
      element.addEventListener('change', this.onFormChange.bind(this));
    });

    // Modal event listeners
    const modalCancel = document.getElementById('modalCancel');
    const modalConfirm = document.getElementById('modalConfirm');
    modalCancel?.addEventListener('click', this.hideModal.bind(this));
    modalConfirm?.addEventListener('click', this.handleModalConfirm.bind(this));
  }

  private toggleApiKeyField(): void {
    const aiProvider = (document.getElementById('aiProvider') as HTMLSelectElement).value;
    const apiKeyGroup = document.getElementById('apiKeyGroup');
    
    if (apiKeyGroup) {
      apiKeyGroup.style.display = aiProvider === 'local' ? 'none' : 'block';
    }
  }

  private toggleApiKeyVisibility(): void {
    const apiKeyInput = document.getElementById('apiKey') as HTMLInputElement;
    const toggleBtn = document.getElementById('toggleApiKey');
    
    if (apiKeyInput.type === 'password') {
      apiKeyInput.type = 'text';
      if (toggleBtn) toggleBtn.textContent = '🙈';
    } else {
      apiKeyInput.type = 'password';
      if (toggleBtn) toggleBtn.textContent = '👁️';
    }
  }

  private onFormChange(): void {
    const saveBtn = document.getElementById('saveBtn') as HTMLButtonElement;
    const saveStatus = document.getElementById('saveStatus');
    
    if (saveBtn) {
      saveBtn.textContent = 'Save Changes';
      saveBtn.disabled = false;
    }
    
    if (saveStatus) {
      saveStatus.className = 'save-status';
      saveStatus.textContent = '';
    }
  }

  private async saveSettings(): Promise<void> {
    try {
      const saveBtn = document.getElementById('saveBtn') as HTMLButtonElement;
      const saveStatus = document.getElementById('saveStatus');
      
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving...';
      
      const formData = this.getFormData();
      
      await this.sendMessage({
        type: 'UPDATE_SETTINGS',
        payload: formData
      } as MessageType);
      
      this.settings = { ...this.settings, ...formData };
      
      if (saveStatus) {
        saveStatus.className = 'save-status success';
        saveStatus.textContent = 'Settings saved successfully!';
      }
      
      saveBtn.textContent = 'Saved';
      
      setTimeout(() => {
        if (saveStatus) {
          saveStatus.className = 'save-status';
          saveStatus.textContent = '';
        }
        saveBtn.textContent = 'Save Settings';
        saveBtn.disabled = false;
      }, 2000);
      
    } catch (error) {
      console.error('Error saving settings:', error);
      this.showSaveError('Failed to save settings');
    }
  }

  private getFormData(): Partial<Settings> {
    const aiProvider = (document.getElementById('aiProvider') as HTMLSelectElement).value as Settings['aiProvider'];
    const apiKey = (document.getElementById('apiKey') as HTMLInputElement).value;
    const enableAutoGrouping = (document.getElementById('enableAutoGrouping') as HTMLInputElement).checked;
    const groupingFrequency = (document.getElementById('groupingFrequency') as HTMLSelectElement).value as Settings['groupingFrequency'];
    const maxHistoryDays = parseInt((document.getElementById('maxHistoryDays') as HTMLInputElement).value);
    const privacyMode = (document.getElementById('privacyMode') as HTMLInputElement).checked;

    return {
      aiProvider,
      apiKey: aiProvider !== 'local' ? apiKey : undefined,
      enableAutoGrouping,
      groupingFrequency,
      maxHistoryDays,
      privacyMode
    };
  }

  private async resetToDefaults(): Promise<void> {
    const defaultSettings: Settings = {
      aiProvider: 'openai',
      enableAutoGrouping: true,
      maxHistoryDays: 30,
      groupingFrequency: 'realtime',
      privacyMode: false
    };

    try {
      await this.sendMessage({
        type: 'UPDATE_SETTINGS',
        payload: defaultSettings
      } as MessageType);
      
      this.settings = defaultSettings;
      this.populateForm();
      this.showSuccess('Settings reset to defaults');
    } catch (error) {
      console.error('Error resetting settings:', error);
      this.showError('Failed to reset settings');
    }
  }

  private confirmClearData(): void {
    this.showModal(
      'Clear All Data',
      'This will permanently delete all tab groups and analysis data. This action cannot be undone.',
      'clearData'
    );
  }

  private async clearData(): Promise<void> {
    try {
      await this.sendMessage({ type: 'CLEAR_DATA' } as MessageType);
      await this.updateAnalytics();
      await this.updateStorageInfo();
      this.showSuccess('All data cleared successfully');
    } catch (error) {
      console.error('Error clearing data:', error);
      this.showError('Failed to clear data');
    }
  }

  private async exportData(): Promise<void> {
    try {
      const response = await this.sendMessage({ type: 'EXPORT_DATA' } as MessageType);
      const data = response.data;
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `bee-browser-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      this.showSuccess('Data exported successfully');
    } catch (error) {
      console.error('Error exporting data:', error);
      this.showError('Failed to export data');
    }
  }

  private async importData(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      await this.sendMessage({
        type: 'IMPORT_DATA',
        payload: data
      } as MessageType);
      
      await this.updateAnalytics();
      await this.updateStorageInfo();
      this.showSuccess('Data imported successfully');
    } catch (error) {
      console.error('Error importing data:', error);
      this.showError('Failed to import data. Please check the file format.');
    }
  }

  private async updateAnalytics(): Promise<void> {
    try {
      const response = await this.sendMessage({ type: 'GET_ANALYTICS' } as MessageType);
      const analytics = response.analytics;
      
      const totalGroupsEl = document.getElementById('totalGroups');
      const totalTabsEl = document.getElementById('totalTabs');
      const avgTabsPerGroupEl = document.getElementById('avgTabsPerGroup');
      const lastSyncEl = document.getElementById('lastSync');
      
      if (totalGroupsEl) totalGroupsEl.textContent = analytics.totalGroups.toString();
      if (totalTabsEl) totalTabsEl.textContent = analytics.totalTabs.toString();
      if (avgTabsPerGroupEl) avgTabsPerGroupEl.textContent = analytics.averageTabsPerGroup.toString();
      if (lastSyncEl) {
        const lastSync = response.lastSync;
        lastSyncEl.textContent = lastSync ? this.formatDate(lastSync) : 'Never';
      }
    } catch (error) {
      console.error('Error updating analytics:', error);
    }
  }

  private async updateStorageInfo(): Promise<void> {
    try {
      const response = await this.sendMessage({ type: 'GET_STORAGE_USAGE' } as MessageType);
      const { used, total } = response.storage;
      
      const usedMB = used / (1024 * 1024);
      const totalMB = total / (1024 * 1024);
      const percentage = (used / total) * 100;
      
      const storageUsedEl = document.getElementById('storageUsed');
      const storageTextEl = document.getElementById('storageText');
      
      if (storageUsedEl) {
        storageUsedEl.style.width = `${percentage}%`;
      }
      
      if (storageTextEl) {
        storageTextEl.textContent = `${usedMB.toFixed(2)} MB used of ${totalMB.toFixed(0)} MB`;
      }
    } catch (error) {
      console.error('Error updating storage info:', error);
    }
  }

  private showModal(title: string, message: string, action: string): void {
    const modal = document.getElementById('confirmModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalMessage = document.getElementById('modalMessage');
    const modalConfirm = document.getElementById('modalConfirm');
    
    if (modal && modalTitle && modalMessage && modalConfirm) {
      modalTitle.textContent = title;
      modalMessage.textContent = message;
      modalConfirm.setAttribute('data-action', action);
      modal.style.display = 'flex';
    }
  }

  private hideModal(): void {
    const modal = document.getElementById('confirmModal');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  private async handleModalConfirm(): Promise<void> {
    const modalConfirm = document.getElementById('modalConfirm');
    const action = modalConfirm?.getAttribute('data-action');
    
    this.hideModal();
    
    switch (action) {
      case 'clearData':
        await this.clearData();
        break;
    }
  }

  private async sendMessage(message: MessageType): Promise<any> {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else if (response?.error) {
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      });
    });
  }

  private showSuccess(message: string): void {
    const saveStatus = document.getElementById('saveStatus');
    if (saveStatus) {
      saveStatus.className = 'save-status success';
      saveStatus.textContent = message;
      
      setTimeout(() => {
        saveStatus.className = 'save-status';
        saveStatus.textContent = '';
      }, 3000);
    }
  }

  private showError(message: string): void {
    const saveStatus = document.getElementById('saveStatus');
    if (saveStatus) {
      saveStatus.className = 'save-status error';
      saveStatus.textContent = message;
      
      setTimeout(() => {
        saveStatus.className = 'save-status';
        saveStatus.textContent = '';
      }, 5000);
    }
  }

  private showSaveError(message: string): void {
    const saveBtn = document.getElementById('saveBtn') as HTMLButtonElement;
    const saveStatus = document.getElementById('saveStatus');
    
    if (saveStatus) {
      saveStatus.className = 'save-status error';
      saveStatus.textContent = message;
    }
    
    if (saveBtn) {
      saveBtn.textContent = 'Save Settings';
      saveBtn.disabled = false;
    }
    
    setTimeout(() => {
      if (saveStatus) {
        saveStatus.className = 'save-status';
        saveStatus.textContent = '';
      }
    }, 5000);
  }

  private formatDate(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new OptionsController();
});