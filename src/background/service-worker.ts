import { TabMonitor } from './tab-monitor';
import { StorageManager } from '@utils/storage-manager';
import { TabGrouper } from '@utils/tab-grouper';
import type { MessageType, Settings } from '@types/app-types';

class ServiceWorker {
  private tabMonitor: TabMonitor;
  private storageManager: StorageManager;
  private tabGrouper: TabGrouper;
  private isInitialized = false;

  constructor() {
    this.tabMonitor = new TabMonitor();
    this.storageManager = new StorageManager();
    this.tabGrouper = new TabGrouper();
    this.initialize();
  }

  private async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await this.storageManager.initialize();
      await this.setupEventListeners();
      await this.tabMonitor.start();
      
      this.isInitialized = true;
      console.log('Bee Browser: Service worker initialized');
    } catch (error) {
      console.error('Bee Browser: Failed to initialize service worker:', error);
    }
  }

  private async setupEventListeners(): Promise<void> {
    chrome.tabs.onActivated.addListener(this.handleTabActivated.bind(this));
    chrome.tabs.onUpdated.addListener(this.handleTabUpdated.bind(this));
    chrome.tabs.onRemoved.addListener(this.handleTabRemoved.bind(this));
    chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));
    chrome.runtime.onInstalled.addListener(this.handleInstalled.bind(this));
  }

  private async handleTabActivated(activeInfo: chrome.tabs.TabActiveInfo): Promise<void> {
    try {
      const tab = await chrome.tabs.get(activeInfo.tabId);
      if (tab.url && !tab.url.startsWith('chrome://')) {
        await this.tabMonitor.trackTab(tab);
      }
    } catch (error) {
      console.error('Error handling tab activation:', error);
    }
  }

  private async handleTabUpdated(
    tabId: number,
    changeInfo: chrome.tabs.TabChangeInfo,
    tab: chrome.tabs.Tab
  ): Promise<void> {
    if (changeInfo.status === 'complete' && tab.url && !tab.url.startsWith('chrome://')) {
      try {
        await this.tabMonitor.trackTab(tab);
        await this.processTabForGrouping(tab);
      } catch (error) {
        console.error('Error handling tab update:', error);
      }
    }
  }

  private async handleTabRemoved(tabId: number): Promise<void> {
    try {
      await this.tabMonitor.removeTab(tabId);
    } catch (error) {
      console.error('Error handling tab removal:', error);
    }
  }

  private async handleMessage(
    message: MessageType,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void
  ): Promise<void> {
    try {
      switch (message.type) {
        case 'GET_GROUPS':
          const groups = await this.storageManager.getTabGroups();
          sendResponse({ groups });
          break;
          
        case 'UPDATE_SETTINGS':
          await this.storageManager.updateSettings(message.payload as Settings);
          sendResponse({ success: true });
          break;
          
        case 'ANALYZE_TAB':
          if (message.payload?.tabId) {
            const tab = await chrome.tabs.get(message.payload.tabId);
            await this.processTabForGrouping(tab);
          }
          sendResponse({ success: true });
          break;
          
        case 'SYNC_DATA':
          await this.syncAllData();
          sendResponse({ success: true });
          break;
          
        default:
          sendResponse({ error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ error: error.message });
    }
  }

  private async handleInstalled(details: chrome.runtime.InstalledDetails): Promise<void> {
    if (details.reason === 'install') {
      await this.setupDefaultSettings();
      chrome.tabs.create({ url: 'options/options.html' });
    }
  }

  private async processTabForGrouping(tab: chrome.tabs.Tab): Promise<void> {
    const settings = await this.storageManager.getSettings();
    if (!settings.enableAutoGrouping) return;

    try {
      const tabInfo = await this.tabMonitor.getTabInfo(tab.id!);
      if (tabInfo) {
        await this.tabGrouper.processTab(tabInfo);
      }
    } catch (error) {
      console.error('Error processing tab for grouping:', error);
    }
  }

  private async setupDefaultSettings(): Promise<void> {
    const defaultSettings: Settings = {
      aiProvider: 'openai',
      enableAutoGrouping: true,
      maxHistoryDays: 30,
      groupingFrequency: 'realtime',
      privacyMode: false
    };
    
    await this.storageManager.updateSettings(defaultSettings);
  }

  private async syncAllData(): Promise<void> {
    try {
      const tabs = await chrome.tabs.query({});
      const validTabs = tabs.filter(tab => tab.url && !tab.url.startsWith('chrome://'));
      
      for (const tab of validTabs) {
        await this.tabMonitor.trackTab(tab);
      }
      
      await this.storageManager.updateLastSync();
      console.log('Bee Browser: Data sync completed');
    } catch (error) {
      console.error('Error syncing data:', error);
    }
  }
}

new ServiceWorker();