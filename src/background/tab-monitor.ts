import type { TabInfo, ExtendedTab } from '@types/app-types';
import type { ExtendedTab as ChromeExtendedTab } from '@types/chrome-api';

export class TabMonitor {
  private activeTabs = new Map<number, TabInfo>();
  private tabActivityTimer = new Map<number, NodeJS.Timeout>();

  async start(): Promise<void> {
    console.log('Bee Browser: Tab monitor started');
    await this.loadExistingTabs();
  }

  async trackTab(tab: chrome.tabs.Tab): Promise<void> {
    if (!tab.id || !tab.url || tab.url.startsWith('chrome://')) {
      return;
    }

    const tabInfo: TabInfo = {
      id: tab.id,
      url: tab.url,
      title: tab.title || 'Untitled',
      favicon: tab.favIconUrl,
      lastAccessed: Date.now(),
      domain: this.extractDomain(tab.url)
    };

    this.activeTabs.set(tab.id, tabInfo);
    this.resetActivityTimer(tab.id);
    
    await this.extractTabContent(tab.id);
  }

  async removeTab(tabId: number): Promise<void> {
    this.activeTabs.delete(tabId);
    
    const timer = this.tabActivityTimer.get(tabId);
    if (timer) {
      clearTimeout(timer);
      this.tabActivityTimer.delete(tabId);
    }
  }

  async getTabInfo(tabId: number): Promise<TabInfo | undefined> {
    return this.activeTabs.get(tabId);
  }

  getAllTabs(): TabInfo[] {
    return Array.from(this.activeTabs.values());
  }

  private async loadExistingTabs(): Promise<void> {
    try {
      const tabs = await chrome.tabs.query({});
      for (const tab of tabs) {
        if (tab.url && !tab.url.startsWith('chrome://')) {
          await this.trackTab(tab);
        }
      }
    } catch (error) {
      console.error('Error loading existing tabs:', error);
    }
  }

  private extractDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return 'unknown';
    }
  }

  private resetActivityTimer(tabId: number): void {
    const existingTimer = this.tabActivityTimer.get(tabId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(() => {
      const tabInfo = this.activeTabs.get(tabId);
      if (tabInfo) {
        tabInfo.lastAccessed = Date.now();
      }
    }, 1000);

    this.tabActivityTimer.set(tabId, timer);
  }

  private async extractTabContent(tabId: number): Promise<void> {
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId },
        function: this.getPageContent
      });

      if (results && results[0]?.result) {
        const tabInfo = this.activeTabs.get(tabId);
        if (tabInfo) {
          tabInfo.content = results[0].result;
        }
      }
    } catch (error) {
      console.warn(`Could not extract content from tab ${tabId}:`, error);
    }
  }

  private getPageContent(): string {
    const title = document.title || '';
    const metaDescription = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
    const headings = Array.from(document.querySelectorAll('h1, h2, h3'))
      .map(h => h.textContent?.trim())
      .filter(text => text && text.length > 0)
      .slice(0, 10);
    
    const paragraphs = Array.from(document.querySelectorAll('p'))
      .map(p => p.textContent?.trim())
      .filter(text => text && text.length > 50)
      .slice(0, 5);

    return [
      title,
      metaDescription,
      ...headings,
      ...paragraphs
    ].join(' ').substring(0, 2000);
  }
}