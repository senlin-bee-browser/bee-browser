import { NativeTabGroups } from './native-tab-groups';
import { TabGrouper } from './tab-grouper';
import { StorageManager } from './storage-manager';
import type { TabInfo, TabGroup as CustomTabGroup, Settings } from '../types/app-types';

export interface IntegratedTabGroup {
  id: string;
  name: string;
  category: string;
  color: string;
  tabs: TabInfo[];
  nativeGroupId?: number;
  isNativeGroup: boolean;
  collapsed?: boolean;
  windowId?: number;
  createdAt: number;
  updatedAt: number;
}

export class TabGroupIntegration {
  private nativeTabGroups: NativeTabGroups;
  private customTabGrouper: TabGrouper;
  private storageManager: StorageManager;
  private settings: Settings | null = null;

  constructor() {
    this.nativeTabGroups = new NativeTabGroups();
    this.customTabGrouper = new TabGrouper();
    this.storageManager = new StorageManager();
    this.initializeSettings();
    this.setupIntegrationListeners();
  }

  private async initializeSettings(): Promise<void> {
    try {
      this.settings = await this.storageManager.getSettings();
    } catch (error) {
      console.error('初始化设置失败:', error);
    }
  }

  private setupIntegrationListeners(): void {
    // 监听原生分组事件并同步到自定义系统
    this.nativeTabGroups.addEventListener('groupCreated', (nativeGroup: any) => {
      this.syncNativeGroupToCustom(nativeGroup);
    });

    this.nativeTabGroups.addEventListener('groupUpdated', (nativeGroup: any) => {
      this.syncNativeGroupToCustom(nativeGroup);
    });

    this.nativeTabGroups.addEventListener('groupRemoved', (nativeGroup: any) => {
      this.handleNativeGroupRemoved(nativeGroup);
    });
  }

  /**
   * 获取所有集成的标签分组（原生+自定义）
   */
  async getAllIntegratedGroups(): Promise<IntegratedTabGroup[]> {
    try {
      const [nativeGroups, customGroups] = await Promise.all([
        this.nativeTabGroups.queryGroups(),
        this.storageManager.getTabGroups()
      ]);

      const integratedGroups: IntegratedTabGroup[] = [];

      // 处理原生分组
      for (const nativeGroup of nativeGroups) {
        const tabs = await this.nativeTabGroups.getTabsInGroup(nativeGroup.id);
        const tabInfos = await this.convertTabsToTabInfos(tabs);
        
        integratedGroups.push({
          id: `native-${nativeGroup.id}`,
          name: nativeGroup.title || '未命名分组',
          category: this.inferCategoryFromTabs(tabInfos),
          color: nativeGroup.color,
          tabs: tabInfos,
          nativeGroupId: nativeGroup.id,
          isNativeGroup: true,
          collapsed: nativeGroup.collapsed,
          windowId: nativeGroup.windowId,
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
      }

      // 处理自定义分组（不与原生分组冲突的）
      for (const customGroup of customGroups) {
        // 检查是否有对应的原生分组
        const hasNativeCounterpart = integratedGroups.some(
          group => group.nativeGroupId && this.groupsAreEquivalent(group, customGroup)
        );

        if (!hasNativeCounterpart) {
          integratedGroups.push({
            id: customGroup.id,
            name: customGroup.name,
            category: customGroup.category,
            color: this.mapCategoryToColor(customGroup.category),
            tabs: customGroup.tabs,
            isNativeGroup: false,
            createdAt: customGroup.createdAt,
            updatedAt: customGroup.updatedAt
          });
        }
      }

      return integratedGroups;
    } catch (error) {
      console.error('获取集成分组失败:', error);
      return [];
    }
  }

  /**
   * 创建智能分组（使用AI + 原生分组）
   */
  async createIntelligentGroup(
    tabs: TabInfo[], 
    options?: {
      useNativeGroup?: boolean;
      groupName?: string;
      color?: string;
    }
  ): Promise<IntegratedTabGroup | null> {
    try {
      // 首先使用AI分析这些标签
      const customGroup = await this.customTabGrouper.createNewGroup(tabs, options?.groupName);
      
      if (!customGroup) {
        throw new Error('创建自定义分组失败');
      }

      // 如果启用了原生分组功能，也创建原生分组
      if (options?.useNativeGroup !== false && this.shouldUseNativeGroups()) {
        const tabIds = tabs.map(tab => tab.id);
        const nativeGroup = await this.nativeTabGroups.createNativeGroup(tabIds, {
          title: customGroup.name,
          color: options?.color || this.mapCategoryToColor(customGroup.category),
          collapsed: false
        });

        // 返回集成分组
        return {
          id: customGroup.id,
          name: customGroup.name,
          category: customGroup.category,
          color: nativeGroup.color,
          tabs: customGroup.tabs,
          nativeGroupId: nativeGroup.id,
          isNativeGroup: true,
          collapsed: nativeGroup.collapsed,
          windowId: nativeGroup.windowId,
          createdAt: customGroup.createdAt,
          updatedAt: customGroup.updatedAt
        };
      } else {
        // 仅返回自定义分组
        return {
          id: customGroup.id,
          name: customGroup.name,
          category: customGroup.category,
          color: this.mapCategoryToColor(customGroup.category),
          tabs: customGroup.tabs,
          isNativeGroup: false,
          createdAt: customGroup.createdAt,
          updatedAt: customGroup.updatedAt
        };
      }
    } catch (error) {
      console.error('创建智能分组失败:', error);
      return null;
    }
  }

  /**
   * 将现有自定义分组转换为原生分组
   */
  async convertCustomGroupToNative(customGroupId: string): Promise<IntegratedTabGroup | null> {
    try {
      const customGroups = await this.storageManager.getTabGroups();
      const customGroup = customGroups.find(group => group.id === customGroupId);
      
      if (!customGroup) {
        throw new Error('找不到指定的自定义分组');
      }

      const nativeGroup = await this.nativeTabGroups.createNativeGroupFromCustomGroup(customGroup);
      
      if (!nativeGroup) {
        throw new Error('创建原生分组失败');
      }

      // 返回集成分组
      return {
        id: customGroup.id,
        name: customGroup.name,
        category: customGroup.category,
        color: nativeGroup.color,
        tabs: customGroup.tabs,
        nativeGroupId: nativeGroup.id,
        isNativeGroup: true,
        collapsed: nativeGroup.collapsed,
        windowId: nativeGroup.windowId,
        createdAt: customGroup.createdAt,
        updatedAt: Date.now()
      };
    } catch (error) {
      console.error('转换自定义分组到原生分组失败:', error);
      return null;
    }
  }

  /**
   * 将原生分组转换为自定义分组
   */
  async convertNativeGroupToCustom(nativeGroupId: number): Promise<IntegratedTabGroup | null> {
    try {
      const nativeGroup = await this.nativeTabGroups.getGroup(nativeGroupId);
      const tabs = await this.nativeTabGroups.getTabsInGroup(nativeGroupId);
      const tabInfos = await this.convertTabsToTabInfos(tabs);

      // 创建自定义分组
      const customGroup = await this.customTabGrouper.createNewGroup(
        tabInfos, 
        nativeGroup.title || '转换的分组'
      );

             // 移除原生分组
       const tabIds = tabs.map(tab => tab.id).filter((id): id is number => id !== undefined);
       await this.nativeTabGroups.ungroupTabs(tabIds);

      return {
        id: customGroup.id,
        name: customGroup.name,
        category: customGroup.category,
        color: this.mapCategoryToColor(customGroup.category),
        tabs: customGroup.tabs,
        isNativeGroup: false,
        createdAt: customGroup.createdAt,
        updatedAt: customGroup.updatedAt
      };
    } catch (error) {
      console.error('转换原生分组到自定义分组失败:', error);
      return null;
    }
  }

  /**
   * 同步所有自定义分组到原生分组
   */
  async syncAllCustomGroupsToNative(): Promise<void> {
    if (!this.shouldUseNativeGroups()) {
      console.log('原生分组功能未启用，跳过同步');
      return;
    }

    try {
      await this.nativeTabGroups.syncCustomGroupsToNative();
      console.log('同步所有自定义分组到原生分组完成');
    } catch (error) {
      console.error('同步所有自定义分组到原生分组失败:', error);
    }
  }

  /**
   * 获取分组统计信息
   */
  async getIntegratedAnalytics(): Promise<{
    totalGroups: number;
    nativeGroups: number;
    customGroups: number;
    totalTabs: number;
    analytics: any;
  }> {
    try {
      const [nativeAnalytics, customAnalytics, integratedGroups] = await Promise.all([
        this.nativeTabGroups.getGroupsAnalytics(),
        this.customTabGrouper.getGroupAnalytics(),
        this.getAllIntegratedGroups()
      ]);

      const nativeGroupsCount = integratedGroups.filter(group => group.isNativeGroup).length;
      const customGroupsCount = integratedGroups.filter(group => !group.isNativeGroup).length;
      const totalTabs = integratedGroups.reduce((sum, group) => sum + group.tabs.length, 0);

      return {
        totalGroups: integratedGroups.length,
        nativeGroups: nativeGroupsCount,
        customGroups: customGroupsCount,
        totalTabs,
        analytics: {
          native: nativeAnalytics,
          custom: customAnalytics
        }
      };
    } catch (error) {
      console.error('获取集成统计信息失败:', error);
      throw error;
    }
  }

  /**
   * 同步原生分组到自定义系统
   */
  private async syncNativeGroupToCustom(nativeGroup: any): Promise<void> {
    try {
      const tabs = await this.nativeTabGroups.getTabsInGroup(nativeGroup.id);
      const tabInfos = await this.convertTabsToTabInfos(tabs);
      
      if (tabInfos.length > 0) {
        await this.customTabGrouper.createNewGroup(
          tabInfos, 
          nativeGroup.title || '原生分组'
        );
      }
    } catch (error) {
      console.error('同步原生分组到自定义系统失败:', error);
    }
  }

  /**
   * 处理原生分组删除事件
   */
  private async handleNativeGroupRemoved(nativeGroup: any): Promise<void> {
    // 这里可以实现清理逻辑，比如删除对应的自定义分组记录
    console.log('原生分组已删除:', nativeGroup);
  }

     /**
    * 工具方法：检查是否应该使用原生分组
    */
   private shouldUseNativeGroups(): boolean {
     // 默认启用原生分组功能
     return true;
   }

  /**
   * 工具方法：将Chrome tabs转换为TabInfo
   */
  private async convertTabsToTabInfos(tabs: chrome.tabs.Tab[]): Promise<TabInfo[]> {
    return tabs.map(tab => ({
      id: tab.id!,
      url: tab.url!,
      title: tab.title || '',
      favIconUrl: tab.favIconUrl,
      domain: new URL(tab.url!).hostname,
      lastAccessed: Date.now()
    }));
  }

  /**
   * 工具方法：从标签推断分类
   */
  private inferCategoryFromTabs(tabs: TabInfo[]): string {
    // 简单的分类推断逻辑
    const domains = tabs.map(tab => tab.domain).filter(Boolean);
    
    if (domains.some(domain => domain.includes('github') || domain.includes('stackoverflow'))) {
      return 'development';
    }
    if (domains.some(domain => domain.includes('youtube') || domain.includes('netflix'))) {
      return 'entertainment';
    }
    if (domains.some(domain => domain.includes('amazon') || domain.includes('shopping'))) {
      return 'shopping';
    }
    if (domains.some(domain => domain.includes('news') || domain.includes('cnn'))) {
      return 'news';
    }
    
    return 'general';
  }

  /**
   * 工具方法：检查分组是否等效
   */
  private groupsAreEquivalent(integratedGroup: IntegratedTabGroup, customGroup: CustomTabGroup): boolean {
    // 简单的等效性检查
    const integratedTabIds = integratedGroup.tabs.map(tab => tab.id).sort();
    const customTabIds = customGroup.tabs.map(tab => tab.id).sort();
    
    return JSON.stringify(integratedTabIds) === JSON.stringify(customTabIds);
  }

  /**
   * 工具方法：将分类映射到颜色
   */
  private mapCategoryToColor(category: string): string {
    const colorMap: { [key: string]: string } = {
      'work': 'blue',
      'social': 'green',
      'shopping': 'orange',
      'entertainment': 'purple',
      'research': 'cyan',
      'news': 'red',
      'development': 'grey',
      'education': 'yellow',
      'general': 'grey'
    };

    return colorMap[category.toLowerCase()] || 'grey';
  }
} 