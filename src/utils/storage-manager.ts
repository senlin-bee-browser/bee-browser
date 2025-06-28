import type { TabGroup, Settings, StorageData } from '../types/app-types';

export class StorageManager {
  private static readonly STORAGE_KEYS = {
    TAB_GROUPS: 'tabGroups',
    SETTINGS: 'settings',
    LAST_SYNC: 'lastSync'
  } as const;

  private defaultSettings: Settings = {
    aiProvider: 'openai',
    enableAutoGrouping: true,
    maxHistoryDays: 30,
    groupingFrequency: 'realtime',
    privacyMode: false
  };

  async initialize(): Promise<void> {
    try {
      const existingSettings = await this.getSettings();
      if (!existingSettings.aiProvider) {
        await this.updateSettings(this.defaultSettings);
      }
    } catch (error) {
      console.error('Error initializing storage:', error);
      await this.updateSettings(this.defaultSettings);
    }
  }

  async getTabGroups(): Promise<TabGroup[]> {
    try {
      const result = await chrome.storage.local.get(StorageManager.STORAGE_KEYS.TAB_GROUPS);
      return result[StorageManager.STORAGE_KEYS.TAB_GROUPS] || [];
    } catch (error) {
      console.error('Error getting tab groups:', error);
      return [];
    }
  }

  async saveTabGroups(groups: TabGroup[]): Promise<void> {
    try {
      await chrome.storage.local.set({
        [StorageManager.STORAGE_KEYS.TAB_GROUPS]: groups
      });
      await this.updateLastSync();
    } catch (error) {
      console.error('Error saving tab groups:', error);
      throw error;
    }
  }

  async addTabGroup(group: TabGroup): Promise<void> {
    const groups = await this.getTabGroups();
    const existingIndex = groups.findIndex(g => g.id === group.id);
    
    if (existingIndex >= 0) {
      groups[existingIndex] = group;
    } else {
      groups.push(group);
    }
    
    await this.saveTabGroups(groups);
  }

  async removeTabGroup(groupId: string): Promise<void> {
    const groups = await this.getTabGroups();
    const filteredGroups = groups.filter(g => g.id !== groupId);
    await this.saveTabGroups(filteredGroups);
  }

  async getSettings(): Promise<Settings> {
    try {
      const result = await chrome.storage.local.get(StorageManager.STORAGE_KEYS.SETTINGS);
      const settings = result[StorageManager.STORAGE_KEYS.SETTINGS];
      
      return settings ? { ...this.defaultSettings, ...settings } : this.defaultSettings;
    } catch (error) {
      console.error('Error getting settings:', error);
      return this.defaultSettings;
    }
  }

  async updateSettings(settings: Partial<Settings>): Promise<void> {
    try {
      const currentSettings = await this.getSettings();
      const updatedSettings = { ...currentSettings, ...settings };
      
      await chrome.storage.local.set({
        [StorageManager.STORAGE_KEYS.SETTINGS]: updatedSettings
      });
    } catch (error) {
      console.error('Error updating settings:', error);
      throw error;
    }
  }

  async getLastSync(): Promise<number> {
    try {
      const result = await chrome.storage.local.get(StorageManager.STORAGE_KEYS.LAST_SYNC);
      return result[StorageManager.STORAGE_KEYS.LAST_SYNC] || 0;
    } catch (error) {
      console.error('Error getting last sync:', error);
      return 0;
    }
  }

  async updateLastSync(): Promise<void> {
    try {
      await chrome.storage.local.set({
        [StorageManager.STORAGE_KEYS.LAST_SYNC]: Date.now()
      });
    } catch (error) {
      console.error('Error updating last sync:', error);
    }
  }

  async exportData(): Promise<StorageData> {
    const [tabGroups, settings, lastSync] = await Promise.all([
      this.getTabGroups(),
      this.getSettings(),
      this.getLastSync()
    ]);

    return {
      tabGroups,
      settings,
      lastSync
    };
  }

  async importData(data: StorageData): Promise<void> {
    try {
      await chrome.storage.local.set({
        [StorageManager.STORAGE_KEYS.TAB_GROUPS]: data.tabGroups || [],
        [StorageManager.STORAGE_KEYS.SETTINGS]: { ...this.defaultSettings, ...data.settings },
        [StorageManager.STORAGE_KEYS.LAST_SYNC]: data.lastSync || Date.now()
      });
    } catch (error) {
      console.error('Error importing data:', error);
      throw error;
    }
  }

  async clearAllData(): Promise<void> {
    try {
      await chrome.storage.local.clear();
      await this.updateSettings(this.defaultSettings);
    } catch (error) {
      console.error('Error clearing data:', error);
      throw error;
    }
  }

  async getStorageUsage(): Promise<{ used: number; total: number }> {
    try {
      const usage = await chrome.storage.local.getBytesInUse();
      return {
        used: usage,
        total: chrome.storage.local.QUOTA_BYTES
      };
    } catch (error) {
      console.error('Error getting storage usage:', error);
      return { used: 0, total: chrome.storage.local.QUOTA_BYTES };
    }
  }

  onStorageChanged(callback: (changes: { [key: string]: chrome.storage.StorageChange }) => void): void {
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'local') {
        callback(changes);
      }
    });
  }
}