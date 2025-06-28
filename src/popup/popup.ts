import type { TabGroup, MessageType } from '../types/app-types';

class PopupController {
  private groupCount = 0;
  private tabCount = 0;

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    await this.setupEventListeners();
    await this.loadData();
    await this.updateStats();
  }

  private async setupEventListeners(): Promise<void> {
    const settingsBtn = document.getElementById('settingsBtn');
    const analyzeBtn = document.getElementById('analyzeBtn');
    const groupBtn = document.getElementById('groupBtn');
    const sidepanelBtn = document.getElementById('sidepanelBtn');
    const searchBtn = document.getElementById('searchBtn');
    const searchInput = document.getElementById('searchInput') as HTMLInputElement;
    const exportBtn = document.getElementById('exportBtn');
    const syncBtn = document.getElementById('syncBtn');

    settingsBtn?.addEventListener('click', this.openSettings.bind(this));
    analyzeBtn?.addEventListener('click', this.analyzeCurrentTab.bind(this));
    groupBtn?.addEventListener('click', this.groupSimilarTabs.bind(this));
    sidepanelBtn?.addEventListener('click', this.openSidePanel.bind(this));
    searchBtn?.addEventListener('click', this.performSearch.bind(this));
    exportBtn?.addEventListener('click', this.exportData.bind(this));
    syncBtn?.addEventListener('click', this.syncData.bind(this));

    searchInput?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.performSearch();
      }
    });
  }

  private async loadData(): Promise<void> {
    try {
      const response = await this.sendMessage({ type: 'GET_GROUPS' });
      if (response.groups) {
        this.displayGroups(response.groups);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      this.showError('Failed to load data');
    }
  }

  private async updateStats(): Promise<void> {
    try {
      const tabs = await chrome.tabs.query({});
      this.tabCount = tabs.filter(tab => !tab.url?.startsWith('chrome://')).length;
      
      const response = await this.sendMessage({ type: 'GET_GROUPS' });
      this.groupCount = response.groups?.length || 0;

      const groupCountEl = document.getElementById('groupCount');
      const tabCountEl = document.getElementById('tabCount');
      
      if (groupCountEl) groupCountEl.textContent = this.groupCount.toString();
      if (tabCountEl) tabCountEl.textContent = this.tabCount.toString();
    } catch (error) {
      console.error('Error updating stats:', error);
    }
  }

  private displayGroups(groups: TabGroup[]): void {
    const groupsList = document.getElementById('groupsList');
    if (!groupsList) return;

    if (groups.length === 0) {
      groupsList.innerHTML = `
        <div class="empty-state">
          <h4>No groups yet</h4>
          <p>Start browsing and we'll organize your tabs!</p>
        </div>
      `;
      return;
    }

    const sortedGroups = groups
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 5);

    groupsList.innerHTML = sortedGroups.map(group => `
      <div class="group-item" data-group-id="${group.id}">
        <div class="group-name">${this.escapeHtml(group.name)}</div>
        <div class="group-meta">
          <span>${group.tabs.length} tabs</span>
          <span>${this.formatDate(group.updatedAt)}</span>
        </div>
      </div>
    `).join('');

    groupsList.addEventListener('click', (e) => {
      const groupItem = (e.target as Element).closest('.group-item') as HTMLElement;
      if (groupItem) {
        const groupId = groupItem.dataset['groupId'];
        if (groupId) {
          this.openGroupInSidePanel(groupId);
        }
      }
    });
  }

  private async openSettings(): Promise<void> {
    await chrome.tabs.create({ url: 'options/options.html' });
    window.close();
  }

  private async analyzeCurrentTab(): Promise<void> {
    try {
      const analyzeBtn = document.getElementById('analyzeBtn');
      if (analyzeBtn) {
        analyzeBtn.textContent = '🔄 Analyzing...';
        (analyzeBtn as HTMLButtonElement).disabled = true;
      }

      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (activeTab?.id) {
        await this.sendMessage({ 
          type: 'ANALYZE_TAB', 
          payload: { tabId: activeTab.id } 
        });
        
        await this.loadData();
        await this.updateStats();
        this.showSuccess('Tab analyzed successfully!');
      }
    } catch (error) {
      console.error('Error analyzing tab:', error);
      this.showError('Failed to analyze tab');
    } finally {
      const analyzeBtn = document.getElementById('analyzeBtn');
      if (analyzeBtn) {
        analyzeBtn.textContent = '🔄 Analyze Current Tab';
        (analyzeBtn as HTMLButtonElement).disabled = false;
      }
    }
  }

  private async groupSimilarTabs(): Promise<void> {
    try {
      const groupBtn = document.getElementById('groupBtn');
      if (groupBtn) {
        groupBtn.textContent = '📁 Grouping...';
        (groupBtn as HTMLButtonElement).disabled = true;
      }

      await this.sendMessage({ type: 'SYNC_DATA' });
      await this.loadData();
      await this.updateStats();
      this.showSuccess('Tabs grouped successfully!');
    } catch (error) {
      console.error('Error grouping tabs:', error);
      this.showError('Failed to group tabs');
    } finally {
      const groupBtn = document.getElementById('groupBtn');
      if (groupBtn) {
        groupBtn.textContent = '📁 Group Similar Tabs';
        (groupBtn as HTMLButtonElement).disabled = false;
      }
    }
  }

  private async openSidePanel(): Promise<void> {
    try {
      await chrome.sidePanel.setOptions({ enabled: true });
      await chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT });
      window.close();
    } catch (error) {
      console.error('Error opening side panel:', error);
      this.showError('Failed to open side panel');
    }
  }

  private async openGroupInSidePanel(groupId: string): Promise<void> {
    try {
      await chrome.sidePanel.setOptions({ 
        enabled: true,
        path: `sidepanel/sidepanel.html?group=${groupId}`
      });
      await chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT });
      window.close();
    } catch (error) {
      console.error('Error opening group in side panel:', error);
      this.showError('Failed to open group');
    }
  }

  private async performSearch(): Promise<void> {
    const searchInput = document.getElementById('searchInput') as HTMLInputElement;
    const query = searchInput?.value.trim();
    
    if (!query) return;

    try {
      await chrome.sidePanel.setOptions({ 
        enabled: true,
        path: `sidepanel/sidepanel.html?search=${encodeURIComponent(query)}`
      });
      await chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT });
      window.close();
    } catch (error) {
      console.error('Error performing search:', error);
      this.showError('Failed to search');
    }
  }

  private async exportData(): Promise<void> {
    try {
      const response = await this.sendMessage({ type: 'GET_GROUPS' });
      const data = {
        groups: response.groups,
        exportedAt: new Date().toISOString(),
        version: '1.0.0'
      };
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      await chrome.downloads.download({
        url,
        filename: `bee-browser-export-${new Date().toISOString().split('T')[0]}.json`,
        saveAs: true
      });
      
      this.showSuccess('Data exported successfully!');
    } catch (error) {
      console.error('Error exporting data:', error);
      this.showError('Failed to export data');
    }
  }

  private async syncData(): Promise<void> {
    try {
      const syncBtn = document.getElementById('syncBtn');
      if (syncBtn) {
        syncBtn.textContent = 'Syncing...';
        (syncBtn as HTMLButtonElement).disabled = true;
      }

      await this.sendMessage({ type: 'SYNC_DATA' });
      await this.loadData();
      await this.updateStats();
      this.showSuccess('Data synced successfully!');
    } catch (error) {
      console.error('Error syncing data:', error);
      this.showError('Failed to sync data');
    } finally {
      const syncBtn = document.getElementById('syncBtn');
      if (syncBtn) {
        syncBtn.textContent = 'Sync Now';
        (syncBtn as HTMLButtonElement).disabled = false;
      }
    }
  }

  private async sendMessage(message: MessageType): Promise<any> {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(response);
        }
      });
    });
  }

  private showSuccess(message: string): void {
    this.showNotification(message, 'success');
  }

  private showError(message: string): void {
    this.showNotification(message, 'error');
  }

  private showNotification(message: string, type: 'success' | 'error'): void {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 12px;
      z-index: 1000;
      ${type === 'success' ? 'background: #d4edda; color: #155724; border: 1px solid #c3e6cb;' : 'background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb;'}
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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
  new PopupController();
});