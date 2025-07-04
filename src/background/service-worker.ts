import { TabMonitor } from './tab-monitor';
import { StorageManager } from '@utils/storage-manager';
import { TabGrouper } from '@utils/tab-grouper';
import { TabGroupIntegration } from '@utils/tab-group-integration';
import type { MessageType, Settings } from '../types/app-types';

class ServiceWorker {
  private tabMonitor: TabMonitor;
  private storageManager: StorageManager;
  private tabGrouper: TabGrouper;
  private tabGroupIntegration: TabGroupIntegration;
  private isInitialized = false;

  constructor() {
    this.tabMonitor = new TabMonitor();
    this.storageManager = new StorageManager();
    this.tabGrouper = new TabGrouper();
    this.tabGroupIntegration = new TabGroupIntegration();
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
    _tabId: number,
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

  private async handleTabRemoved(tabId: number, _removeInfo: chrome.tabs.TabRemoveInfo): Promise<void> {
    try {
      await this.tabMonitor.removeTab(tabId);
    } catch (error) {
      console.error('Error handling tab removal:', error);
    }
  }

  private async handleMessage(
    message: MessageType,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void
  ): Promise<void> {
    try {
      switch (message.type) {
        case 'GET_GROUPS':
          const groups = await this.tabGroupIntegration.getAllIntegratedGroups();
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
          
        case 'CREATE_NATIVE_GROUP':
          if (message.payload?.tabs) {
            const result = await this.tabGroupIntegration.createIntelligentGroup(
              message.payload.tabs,
              message.payload.options
            );
            sendResponse({ result });
          }
          break;
          
        case 'SYNC_TO_NATIVE':
          await this.tabGroupIntegration.syncAllCustomGroupsToNative();
          sendResponse({ success: true });
          break;
          
        case 'GET_ANALYTICS':
          const analytics = await this.tabGroupIntegration.getIntegratedAnalytics();
          sendResponse({ analytics });
          break;
          
        default:
          sendResponse({ error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ error: error instanceof Error ? error.message : 'Unknown error' });
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