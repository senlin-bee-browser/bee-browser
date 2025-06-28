import { AIProcessor } from './ai-processor';
import { StorageManager } from './storage-manager';
import type { TabInfo, TabGroup, Settings } from '../types/app-types';

export class TabGrouper {
  private storageManager: StorageManager;
  private aiProcessor: AIProcessor | null = null;
  private processingQueue: Set<number> = new Set();

  constructor() {
    this.storageManager = new StorageManager();
    this.initializeAIProcessor();
  }

  private async initializeAIProcessor(): Promise<void> {
    try {
      const settings = await this.storageManager.getSettings();
      this.aiProcessor = new AIProcessor(settings);
    } catch (error) {
      console.error('Error initializing AI processor:', error);
    }
  }

  async processTab(tabInfo: TabInfo): Promise<void> {
    if (this.processingQueue.has(tabInfo.id)) {
      return;
    }

    this.processingQueue.add(tabInfo.id);

    try {
      const settings = await this.storageManager.getSettings();
      
      if (!settings.enableAutoGrouping) {
        return;
      }

      await this.addTabToAppropriateGroup(tabInfo);
    } catch (error) {
      console.error('Error processing tab:', error);
    } finally {
      this.processingQueue.delete(tabInfo.id);
    }
  }

  async groupAllTabs(tabs: TabInfo[]): Promise<TabGroup[]> {
    if (!this.aiProcessor) {
      await this.initializeAIProcessor();
    }

    if (!this.aiProcessor) {
      throw new Error('AI processor not available');
    }

    try {
      const filteredTabs = this.filterValidTabs(tabs);
      const newGroups = await this.aiProcessor.groupTabs(filteredTabs);
      
      await this.mergeWithExistingGroups(newGroups);
      return await this.storageManager.getTabGroups();
    } catch (error) {
      console.error('Error grouping all tabs:', error);
      throw error;
    }
  }

  async regroupExistingGroups(): Promise<void> {
    try {
      const existingGroups = await this.storageManager.getTabGroups();
      const allTabs = existingGroups.flatMap(group => group.tabs);
      
      if (allTabs.length === 0) {
        return;
      }

      await this.storageManager.saveTabGroups([]);
      await this.groupAllTabs(allTabs);
    } catch (error) {
      console.error('Error regrouping existing groups:', error);
      throw error;
    }
  }

  async findSimilarGroups(tabInfo: TabInfo): Promise<TabGroup[]> {
    const existingGroups = await this.storageManager.getTabGroups();
    const similarGroups: Array<{ group: TabGroup; score: number }> = [];

    for (const group of existingGroups) {
      const score = await this.calculateSimilarityScore(tabInfo, group);
      if (score > 0.3) {
        similarGroups.push({ group, score });
      }
    }

    return similarGroups
      .sort((a, b) => b.score - a.score)
      .map(item => item.group);
  }

  async createNewGroup(tabs: TabInfo[], name?: string): Promise<TabGroup> {
    if (!this.aiProcessor) {
      await this.initializeAIProcessor();
    }

    const groups = await this.aiProcessor!.groupTabs(tabs);
    const group = groups[0];
    
    if (!group) {
      throw new Error('Failed to create group');
    }
    
    if (name) {
      group.name = name;
    }

    await this.storageManager.addTabGroup(group);
    return group;
  }

  async addTabToGroup(tabInfo: TabInfo, groupId: string): Promise<void> {
    const groups = await this.storageManager.getTabGroups();
    const group = groups.find(g => g.id === groupId);
    
    if (!group) {
      throw new Error('Group not found');
    }

    const existingTabIndex = group.tabs.findIndex(t => t.id === tabInfo.id);
    if (existingTabIndex >= 0) {
      group.tabs[existingTabIndex] = tabInfo;
    } else {
      group.tabs.push(tabInfo);
    }

    group.updatedAt = Date.now();
    await this.updateGroupMetadata(group);
    await this.storageManager.addTabGroup(group);
  }

  async removeTabFromGroup(tabId: number, groupId: string): Promise<void> {
    const groups = await this.storageManager.getTabGroups();
    const group = groups.find(g => g.id === groupId);
    
    if (!group) {
      return;
    }

    group.tabs = group.tabs.filter(t => t.id !== tabId);
    group.updatedAt = Date.now();

    if (group.tabs.length === 0) {
      await this.storageManager.removeTabGroup(groupId);
    } else {
      await this.updateGroupMetadata(group);
      await this.storageManager.addTabGroup(group);
    }
  }

  async updateGroupSettings(settings: Settings): Promise<void> {
    if (this.aiProcessor) {
      this.aiProcessor = new AIProcessor(settings);
    }
  }

  async getGroupAnalytics(): Promise<{
    totalGroups: number;
    totalTabs: number;
    averageTabsPerGroup: number;
    categoriesCounts: { [category: string]: number };
    recentActivity: { date: string; groupsCreated: number }[];
  }> {
    const groups = await this.storageManager.getTabGroups();
    const totalGroups = groups.length;
    const totalTabs = groups.reduce((sum, group) => sum + group.tabs.length, 0);
    const averageTabsPerGroup = totalGroups > 0 ? totalTabs / totalGroups : 0;

    const categoriesCounts: { [category: string]: number } = {};
    groups.forEach(group => {
      categoriesCounts[group.category] = (categoriesCounts[group.category] || 0) + 1;
    });

    const recentActivity = this.calculateRecentActivity(groups);

    return {
      totalGroups,
      totalTabs,
      averageTabsPerGroup: Math.round(averageTabsPerGroup * 10) / 10,
      categoriesCounts,
      recentActivity
    };
  }

  private async addTabToAppropriateGroup(tabInfo: TabInfo): Promise<void> {
    const similarGroups = await this.findSimilarGroups(tabInfo);
    
    if (similarGroups.length > 0 && similarGroups[0]) {
      await this.addTabToGroup(tabInfo, similarGroups[0].id);
    } else {
      const newGroup = await this.createNewGroup([tabInfo]);
      console.log(`Created new group: ${newGroup.name}`);
    }
  }

  private async calculateSimilarityScore(tabInfo: TabInfo, group: TabGroup): Promise<number> {
    let score = 0;

    const tabDomain = new URL(tabInfo.url).hostname;
    const groupDomains = group.tabs.map(tab => new URL(tab.url).hostname);
    
    if (groupDomains.includes(tabDomain)) {
      score += 0.4;
    }

    if (tabInfo.title && group.keywords.some(keyword => 
      tabInfo.title.toLowerCase().includes(keyword.toLowerCase())
    )) {
      score += 0.3;
    }

    if (tabInfo.content && group.keywords.some(keyword => 
      tabInfo.content!.toLowerCase().includes(keyword.toLowerCase())
    )) {
      score += 0.2;
    }

    const timeDiff = Math.abs(Date.now() - group.updatedAt);
    const hoursAgo = timeDiff / (1000 * 60 * 60);
    if (hoursAgo < 24) {
      score += 0.1 * (1 - hoursAgo / 24);
    }

    return Math.min(score, 1.0);
  }

  private filterValidTabs(tabs: TabInfo[]): TabInfo[] {
    return tabs.filter(tab => {
      try {
        new URL(tab.url);
        return !tab.url.startsWith('chrome://') && 
               !tab.url.startsWith('edge://') && 
               !tab.url.startsWith('about:') &&
               tab.title && 
               tab.title.trim().length > 0;
      } catch {
        return false;
      }
    });
  }

  private async mergeWithExistingGroups(newGroups: TabGroup[]): Promise<void> {
    const existingGroups = await this.storageManager.getTabGroups();
    const mergedGroups: TabGroup[] = [];

    for (const newGroup of newGroups) {
      const similarExisting = existingGroups.find(existing => 
        existing.category === newGroup.category &&
        this.calculateGroupSimilarity(existing, newGroup) > 0.7
      );

      if (similarExisting) {
        const mergedTabs = this.mergeTabs(similarExisting.tabs, newGroup.tabs);
        similarExisting.tabs = mergedTabs;
        similarExisting.updatedAt = Date.now();
        await this.updateGroupMetadata(similarExisting);
        mergedGroups.push(similarExisting);
      } else {
        mergedGroups.push(newGroup);
      }
    }

    const finalGroups = [
      ...existingGroups.filter(existing => 
        !mergedGroups.some(merged => merged.id === existing.id)
      ),
      ...newGroups
    ];

    await this.storageManager.saveTabGroups(finalGroups);
  }

  private calculateGroupSimilarity(group1: TabGroup, group2: TabGroup): number {
    const keywords1 = new Set(group1.keywords.map(k => k.toLowerCase()));
    const keywords2 = new Set(group2.keywords.map(k => k.toLowerCase()));
    
    const intersection = new Set([...keywords1].filter(x => keywords2.has(x)));
    const union = new Set([...keywords1, ...keywords2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  private mergeTabs(existingTabs: TabInfo[], newTabs: TabInfo[]): TabInfo[] {
    const tabMap = new Map<string, TabInfo>();
    
    existingTabs.forEach(tab => {
      tabMap.set(tab.url, tab);
    });
    
    newTabs.forEach(tab => {
      const existing = tabMap.get(tab.url);
      if (existing) {
        if (tab.lastAccessed > existing.lastAccessed) {
          tabMap.set(tab.url, tab);
        }
      } else {
        tabMap.set(tab.url, tab);
      }
    });
    
    return Array.from(tabMap.values());
  }

  private async updateGroupMetadata(group: TabGroup): Promise<void> {
    if (!this.aiProcessor) return;

    try {
      const analyses = await Promise.all(
        group.tabs.map(tab => this.aiProcessor!.analyze(tab.content || '', tab.url))
      );

      const allKeywords = analyses.flatMap(a => a.keywords);
      const keywordFreq: { [key: string]: number } = {};
      
      allKeywords.forEach(keyword => {
        keywordFreq[keyword] = (keywordFreq[keyword] || 0) + 1;
      });

      group.keywords = Object.entries(keywordFreq)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([keyword]) => keyword);

      group.confidence = analyses.reduce((sum, a) => sum + a.confidence, 0) / analyses.length;
    } catch (error) {
      console.warn('Failed to update group metadata:', error);
    }
  }

  private calculateRecentActivity(groups: TabGroup[]): { date: string; groupsCreated: number }[] {
    const activity: { [date: string]: number } = {};
    const now = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0]!;
      activity[dateStr] = 0;
    }

    groups.forEach(group => {
      const date = new Date(group.createdAt).toISOString().split('T')[0]!;
      if (date in activity) {
        activity[date] = (activity[date] || 0) + 1;
      }
    });

    return Object.entries(activity).map(([date, groupsCreated]) => ({
      date,
      groupsCreated
    }));
  }
}