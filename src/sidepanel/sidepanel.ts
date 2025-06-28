import type { TabGroup, MessageType } from '@types/app-types';

class SidePanelController {
  private groups: TabGroup[] = [];
  private filteredGroups: TabGroup[] = [];
  private currentFilter = 'all';
  private currentSort = 'recent';
  private selectedGroup: TabGroup | null = null;

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    await this.loadData();
    this.setupEventListeners();
    this.handleURLParams();
    await this.updateStats();
  }

  private async loadData(): Promise<void> {
    try {
      const response = await this.sendMessage({ type: 'GET_GROUPS' });
      this.groups = response.groups || [];
      this.applyFiltersAndSort();
      this.renderGroups();
    } catch (error) {
      console.error('Error loading data:', error);
      this.showError('Failed to load data');
    }
  }

  private setupEventListeners(): void {
    const refreshBtn = document.getElementById('refreshBtn');
    const settingsBtn = document.getElementById('settingsBtn');
    const searchInput = document.getElementById('searchInput') as HTMLInputElement;
    const searchBtn = document.getElementById('searchBtn');
    const sortSelect = document.getElementById('sortSelect') as HTMLSelectElement;
    const viewToggle = document.getElementById('viewToggle');
    const generateInsights = document.getElementById('generateInsights');
    const exportBtn = document.getElementById('exportBtn');
    const analyzeCurrentBtn = document.getElementById('analyzeCurrentBtn');

    refreshBtn?.addEventListener('click', this.refreshData.bind(this));
    settingsBtn?.addEventListener('click', this.openSettings.bind(this));
    searchInput?.addEventListener('input', this.handleSearch.bind(this));
    searchBtn?.addEventListener('click', this.performSearch.bind(this));
    sortSelect?.addEventListener('change', this.handleSortChange.bind(this));
    viewToggle?.addEventListener('click', this.toggleView.bind(this));
    generateInsights?.addEventListener('click', this.generateInsights.bind(this));
    exportBtn?.addEventListener('click', this.exportData.bind(this));
    analyzeCurrentBtn?.addEventListener('click', this.analyzeCurrentTab.bind(this));

    // Filter buttons
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const filter = target.dataset.filter || 'all';
        this.handleFilterChange(filter);
      });
    });

    // Modal event listeners
    const closeModal = document.getElementById('closeModal');
    const openAllTabs = document.getElementById('openAllTabs');
    const deleteGroup = document.getElementById('deleteGroup');
    const groupModal = document.getElementById('groupModal');

    closeModal?.addEventListener('click', this.closeModal.bind(this));
    openAllTabs?.addEventListener('click', this.openAllTabsInGroup.bind(this));
    deleteGroup?.addEventListener('click', this.deleteSelectedGroup.bind(this));
    groupModal?.addEventListener('click', (e) => {
      if (e.target === groupModal) {
        this.closeModal();
      }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', this.handleKeydown.bind(this));
  }

  private handleURLParams(): void {
    const urlParams = new URLSearchParams(window.location.search);
    const groupId = urlParams.get('group');
    const searchQuery = urlParams.get('search');

    if (groupId) {
      const group = this.groups.find(g => g.id === groupId);
      if (group) {
        this.openGroupModal(group);
      }
    }

    if (searchQuery) {
      const searchInput = document.getElementById('searchInput') as HTMLInputElement;
      if (searchInput) {
        searchInput.value = searchQuery;
        this.handleSearch();
      }
    }
  }

  private async updateStats(): Promise<void> {
    try {
      const response = await this.sendMessage({ type: 'GET_ANALYTICS' });
      const analytics = response.analytics;

      const totalGroupsEl = document.getElementById('totalGroups');
      const totalTabsEl = document.getElementById('totalTabs');
      const categoriesEl = document.getElementById('categories');

      if (totalGroupsEl) totalGroupsEl.textContent = analytics.totalGroups.toString();
      if (totalTabsEl) totalTabsEl.textContent = analytics.totalTabs.toString();
      if (categoriesEl) {
        const categoriesCount = Object.keys(analytics.categoriesCounts || {}).length;
        categoriesEl.textContent = categoriesCount.toString();
      }

      await this.updateInsights(analytics);
    } catch (error) {
      console.error('Error updating stats:', error);
    }
  }

  private async updateInsights(analytics: any): Promise<void> {
    const topCategoryEl = document.getElementById('topCategory');
    const peakTimeEl = document.getElementById('peakTime');
    const productivityScoreEl = document.getElementById('productivityScore');

    if (topCategoryEl && analytics.categoriesCounts) {
      const topCategory = Object.entries(analytics.categoriesCounts)
        .sort(([, a], [, b]) => (b as number) - (a as number))[0];
      topCategoryEl.textContent = topCategory ? topCategory[0] : 'None';
    }

    if (peakTimeEl) {
      peakTimeEl.textContent = this.calculatePeakTime();
    }

    if (productivityScoreEl) {
      const score = this.calculateProductivityScore(analytics);
      productivityScoreEl.textContent = score.toString();
    }
  }

  private handleFilterChange(filter: string): void {
    this.currentFilter = filter;
    
    // Update UI
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-filter') === filter);
    });

    this.applyFiltersAndSort();
    this.renderGroups();
  }

  private handleSortChange(): void {
    const sortSelect = document.getElementById('sortSelect') as HTMLSelectElement;
    this.currentSort = sortSelect.value;
    this.applyFiltersAndSort();
    this.renderGroups();
  }

  private handleSearch(): void {
    const searchInput = document.getElementById('searchInput') as HTMLInputElement;
    const query = searchInput.value.toLowerCase().trim();

    if (query === '') {
      this.filteredGroups = [...this.groups];
    } else {
      this.filteredGroups = this.groups.filter(group => {
        return group.name.toLowerCase().includes(query) ||
               group.description.toLowerCase().includes(query) ||
               group.keywords.some(keyword => keyword.toLowerCase().includes(query)) ||
               group.tabs.some(tab => 
                 tab.title.toLowerCase().includes(query) || 
                 tab.url.toLowerCase().includes(query)
               );
      });
    }

    this.applySort();
    this.renderGroups();
  }

  private performSearch(): void {
    this.handleSearch();
  }

  private applyFiltersAndSort(): void {
    // Apply filters
    switch (this.currentFilter) {
      case 'recent':
        const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
        this.filteredGroups = this.groups.filter(group => group.updatedAt > oneDayAgo);
        break;
      case 'favorites':
        // For now, treat high confidence groups as favorites
        this.filteredGroups = this.groups.filter(group => group.confidence > 0.8);
        break;
      default:
        this.filteredGroups = [...this.groups];
    }

    this.applySort();
  }

  private applySort(): void {
    switch (this.currentSort) {
      case 'name':
        this.filteredGroups.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'size':
        this.filteredGroups.sort((a, b) => b.tabs.length - a.tabs.length);
        break;
      case 'category':
        this.filteredGroups.sort((a, b) => a.category.localeCompare(b.category));
        break;
      default: // recent
        this.filteredGroups.sort((a, b) => b.updatedAt - a.updatedAt);
    }
  }

  private renderGroups(): void {
    const container = document.getElementById('groupsContainer');
    if (!container) return;

    if (this.filteredGroups.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <h3>No groups found</h3>
          <p>Try adjusting your filters or start browsing to create groups.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = this.filteredGroups.map(group => `
      <div class="group-card" data-group-id="${group.id}">
        <div class="group-card-header">
          <span class="group-name">${this.escapeHtml(group.name)}</span>
          <span class="group-badge">${group.tabs.length}</span>
        </div>
        <div class="group-meta">
          <span>${group.category}</span>
          <span>${this.formatDate(group.updatedAt)}</span>
          <span>${Math.round(group.confidence * 100)}% confidence</span>
        </div>
        <div class="group-description">${this.escapeHtml(group.description)}</div>
        <div class="group-keywords">
          ${group.keywords.slice(0, 5).map(keyword => `
            <span class="keyword-tag">${this.escapeHtml(keyword)}</span>
          `).join('')}
        </div>
      </div>
    `).join('');

    // Add click listeners
    container.addEventListener('click', (e) => {
      const groupCard = (e.target as Element).closest('.group-card') as HTMLElement;
      if (groupCard) {
        const groupId = groupCard.dataset.groupId;
        const group = this.groups.find(g => g.id === groupId);
        if (group) {
          this.openGroupModal(group);
        }
      }
    });
  }

  private openGroupModal(group: TabGroup): void {
    this.selectedGroup = group;
    const modal = document.getElementById('groupModal');
    
    // Populate modal content
    const modalGroupName = document.getElementById('modalGroupName');
    const modalGroupCategory = document.getElementById('modalGroupCategory');
    const modalGroupCreated = document.getElementById('modalGroupCreated');
    const modalGroupConfidence = document.getElementById('modalGroupConfidence');
    const modalGroupDescription = document.getElementById('modalGroupDescription');
    const modalGroupKeywords = document.getElementById('modalGroupKeywords');
    const modalGroupTabs = document.getElementById('modalGroupTabs');

    if (modalGroupName) modalGroupName.textContent = group.name;
    if (modalGroupCategory) modalGroupCategory.textContent = group.category;
    if (modalGroupCreated) modalGroupCreated.textContent = this.formatDate(group.createdAt);
    if (modalGroupConfidence) modalGroupConfidence.textContent = `${Math.round(group.confidence * 100)}%`;
    if (modalGroupDescription) modalGroupDescription.textContent = group.description;
    
    if (modalGroupKeywords) {
      modalGroupKeywords.innerHTML = group.keywords.map(keyword => `
        <span class="keyword-tag">${this.escapeHtml(keyword)}</span>
      `).join('');
    }

    if (modalGroupTabs) {
      modalGroupTabs.innerHTML = group.tabs.map(tab => `
        <div class="tab-item" data-url="${tab.url}">
          <img class="tab-favicon" src="${tab.favicon || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path fill="%23999" d="M8 0a8 8 0 100 16A8 8 0 008 0z"/></svg>'}" alt="">
          <div class="tab-info">
            <div class="tab-title">${this.escapeHtml(tab.title)}</div>
            <div class="tab-url">${this.escapeHtml(tab.url)}</div>
          </div>
        </div>
      `).join('');

      // Add click listeners for tabs
      modalGroupTabs.addEventListener('click', (e) => {
        const tabItem = (e.target as Element).closest('.tab-item') as HTMLElement;
        if (tabItem) {
          const url = tabItem.dataset.url;
          if (url) {
            chrome.tabs.create({ url });
          }
        }
      });
    }

    if (modal) {
      modal.style.display = 'flex';
    }
  }

  private closeModal(): void {
    const modal = document.getElementById('groupModal');
    if (modal) {
      modal.style.display = 'none';
    }
    this.selectedGroup = null;
  }

  private async openAllTabsInGroup(): Promise<void> {
    if (!this.selectedGroup) return;

    try {
      for (const tab of this.selectedGroup.tabs) {
        await chrome.tabs.create({ url: tab.url, active: false });
      }
      this.closeModal();
    } catch (error) {
      console.error('Error opening tabs:', error);
      this.showError('Failed to open tabs');
    }
  }

  private async deleteSelectedGroup(): Promise<void> {
    if (!this.selectedGroup) return;

    if (confirm(`Are you sure you want to delete the group "${this.selectedGroup.name}"?`)) {
      try {
        await this.sendMessage({
          type: 'DELETE_GROUP',
          payload: { groupId: this.selectedGroup.id }
        });
        
        this.groups = this.groups.filter(g => g.id !== this.selectedGroup!.id);
        this.applyFiltersAndSort();
        this.renderGroups();
        await this.updateStats();
        this.closeModal();
      } catch (error) {
        console.error('Error deleting group:', error);
        this.showError('Failed to delete group');
      }
    }
  }

  private async refreshData(): Promise<void> {
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
      refreshBtn.textContent = '🔄';
      refreshBtn.style.animation = 'spin 1s linear infinite';
    }

    try {
      await this.sendMessage({ type: 'SYNC_DATA' });
      await this.loadData();
      await this.updateStats();
    } catch (error) {
      console.error('Error refreshing data:', error);
      this.showError('Failed to refresh data');
    } finally {
      if (refreshBtn) {
        refreshBtn.textContent = '🔄';
        refreshBtn.style.animation = '';
      }
    }
  }

  private async openSettings(): Promise<void> {
    await chrome.tabs.create({ url: 'options/options.html' });
  }

  private toggleView(): void {
    const viewToggle = document.getElementById('viewToggle');
    // This could toggle between different view modes (grid/list, etc.)
    console.log('Toggle view mode');
  }

  private async generateInsights(): Promise<void> {
    const generateBtn = document.getElementById('generateInsights') as HTMLButtonElement;
    
    if (generateBtn) {
      generateBtn.disabled = true;
      generateBtn.textContent = 'Generating...';
    }

    try {
      const response = await this.sendMessage({ type: 'GET_ANALYTICS' });
      await this.updateInsights(response.analytics);
    } catch (error) {
      console.error('Error generating insights:', error);
      this.showError('Failed to generate insights');
    } finally {
      if (generateBtn) {
        generateBtn.disabled = false;
        generateBtn.textContent = 'Generate';
      }
    }
  }

  private async exportData(): Promise<void> {
    try {
      const response = await this.sendMessage({ type: 'EXPORT_DATA' });
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
    } catch (error) {
      console.error('Error exporting data:', error);
      this.showError('Failed to export data');
    }
  }

  private async analyzeCurrentTab(): Promise<void> {
    try {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (activeTab.id) {
        await this.sendMessage({
          type: 'ANALYZE_TAB',
          payload: { tabId: activeTab.id }
        });
        
        await this.refreshData();
      }
    } catch (error) {
      console.error('Error analyzing current tab:', error);
      this.showError('Failed to analyze current tab');
    }
  }

  private handleKeydown(e: KeyboardEvent): void {
    // Escape key closes modal
    if (e.key === 'Escape') {
      this.closeModal();
    }
    
    // Ctrl/Cmd + F focuses search
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      e.preventDefault();
      const searchInput = document.getElementById('searchInput') as HTMLInputElement;
      if (searchInput) {
        searchInput.focus();
      }
    }
  }

  private calculatePeakTime(): string {
    // This would analyze the groups' creation times to find peak browsing hours
    const currentHour = new Date().getHours();
    if (currentHour >= 9 && currentHour <= 17) {
      return '9:00 AM - 5:00 PM';
    } else if (currentHour >= 18 && currentHour <= 22) {
      return '6:00 PM - 10:00 PM';
    } else {
      return 'Evening';
    }
  }

  private calculateProductivityScore(analytics: any): number {
    // Simple productivity score based on categories and grouping efficiency
    const productiveCategories = ['Development', 'Research', 'Education', 'Productivity'];
    const totalGroups = analytics.totalGroups || 0;
    const totalTabs = analytics.totalTabs || 0;
    
    if (totalGroups === 0) return 0;
    
    const productiveGroups = Object.entries(analytics.categoriesCounts || {})
      .filter(([category]) => productiveCategories.includes(category))
      .reduce((sum, [, count]) => sum + (count as number), 0);
    
    const groupingEfficiency = totalGroups > 0 ? Math.min(totalTabs / totalGroups, 10) / 10 : 0;
    const productivityRatio = totalGroups > 0 ? productiveGroups / totalGroups : 0;
    
    return Math.round((groupingEfficiency * 0.4 + productivityRatio * 0.6) * 100);
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

  private showError(message: string): void {
    // Simple error notification - could be enhanced with a proper notification system
    console.error(message);
    
    // Create a temporary error notification
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #dc3545;
      color: white;
      padding: 12px 16px;
      border-radius: 4px;
      font-size: 14px;
      z-index: 1001;
      max-width: 300px;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 5000);
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
  new SidePanelController();
});