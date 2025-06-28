import type { TabInfo, TabGroup as CustomTabGroup, Settings } from '../types/app-types';
import { StorageManager } from './storage-manager';

export class NativeTabGroups {
  private storageManager: StorageManager;
  private groupEventListeners: Map<string, Function> = new Map();

  constructor() {
    this.storageManager = new StorageManager();
    this.setupEventListeners();
  }

  /**
   * 设置标签分组事件监听器
   */
  private setupEventListeners(): void {
         // 监听标签分组创建事件
     (chrome.tabGroups as any).onCreated.addListener((group: any) => {
       this.handleGroupCreated(group);
     });

     // 监听标签分组更新事件
     (chrome.tabGroups as any).onUpdated.addListener((group: any) => {
       this.handleGroupUpdated(group);
     });

     // 监听标签分组删除事件
     (chrome.tabGroups as any).onRemoved.addListener((group: any) => {
       this.handleGroupRemoved(group);
     });

     // 监听标签分组移动事件
     (chrome.tabGroups as any).onMoved.addListener((group: any) => {
       this.handleGroupMoved(group);
     });
  }

  /**
   * 创建新的原生标签分组
   */
     async createNativeGroup(
     tabIds: number[], 
     options?: {
       title?: string;
       color?: string;
       collapsed?: boolean;
     }
   ): Promise<any> {
         try {
       // 创建标签分组
       const group = await (chrome.tabGroups as any).create({ tabIds });

       // 设置分组属性
       if (options) {
         const updateProperties: any = {};
         
         if (options.title) updateProperties.title = options.title;
         if (options.color) updateProperties.color = options.color;
         if (options.collapsed !== undefined) updateProperties.collapsed = options.collapsed;

         if (Object.keys(updateProperties).length > 0) {
           const updatedGroup = await (chrome.tabGroups as any).update(group.id, updateProperties);
           return updatedGroup;
         }
       }

       console.log(`原生标签分组已创建: ${group.title || '未命名'} (ID: ${group.id})`);
       return group;
    } catch (error) {
      console.error('创建原生标签分组失败:', error);
      throw error;
    }
  }

  /**
   * 获取指定的标签分组
   */
     async getGroup(groupId: number): Promise<any> {
         try {
       return await (chrome.tabGroups as any).get(groupId);
    } catch (error) {
      console.error('获取标签分组失败:', error);
      throw error;
    }
  }

  /**
   * 查询标签分组
   */
     async queryGroups(
     queryInfo?: any
   ): Promise<any[]> {
         try {
       return await (chrome.tabGroups as any).query(queryInfo || {});
    } catch (error) {
      console.error('查询标签分组失败:', error);
      throw error;
    }
  }

  /**
   * 更新标签分组
   */
     async updateGroup(
     groupId: number, 
     updateProperties: any
   ): Promise<any> {
         try {
       const updatedGroup = await (chrome.tabGroups as any).update(groupId, updateProperties);
      console.log(`标签分组已更新: ${updatedGroup.title || '未命名'} (ID: ${groupId})`);
      return updatedGroup;
    } catch (error) {
      console.error('更新标签分组失败:', error);
      throw error;
    }
  }

  /**
   * 移动标签分组
   */
     async moveGroup(
     groupId: number, 
     moveProperties: { index: number; windowId?: number }
   ): Promise<any> {
         try {
       const movedGroup = await (chrome.tabGroups as any).move(groupId, moveProperties);
      console.log(`标签分组已移动: ${movedGroup.title || '未命名'} (ID: ${groupId})`);
      return movedGroup;
    } catch (error) {
      console.error('移动标签分组失败:', error);
      throw error;
    }
  }

  /**
   * 取消标签分组（解散分组）
   */
  async ungroupTabs(tabIds: number[]): Promise<void> {
         try {
       await (chrome.tabGroups as any).ungroup(tabIds);
      console.log(`标签已从分组中移除: ${tabIds.length} 个标签`);
    } catch (error) {
      console.error('取消标签分组失败:', error);
      throw error;
    }
  }

  /**
   * 根据自定义分组创建原生标签分组
   */
     async createNativeGroupFromCustomGroup(
     customGroup: CustomTabGroup
   ): Promise<any | null> {
    const tabIds = customGroup.tabs.map(tab => tab.id);
    
    // 过滤掉无效的标签ID
    const validTabIds = await this.filterValidTabIds(tabIds);
    
    if (validTabIds.length === 0) {
      console.warn('没有有效的标签ID可以创建分组');
      return null;
    }

    try {
      const color = this.mapCategoryToColor(customGroup.category);
      const group = await this.createNativeGroup(validTabIds, {
        title: customGroup.name,
        color: color,
        collapsed: false
      });

      return group;
    } catch (error) {
      console.error('从自定义分组创建原生分组失败:', error);
      return null;
    }
  }

  /**
   * 同步所有自定义分组到原生分组
   */
  async syncCustomGroupsToNative(): Promise<void> {
    try {
      const customGroups = await this.storageManager.getTabGroups();
      const results = await Promise.allSettled(
        customGroups.map(group => this.createNativeGroupFromCustomGroup(group))
      );

      let successCount = 0;
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          successCount++;
        } else {
          const groupName = customGroups[index]?.name || '未知分组';
          console.warn(`同步分组失败: ${groupName}`);
        }
      });

      console.log(`同步完成: ${successCount}/${customGroups.length} 个分组已创建`);
    } catch (error) {
      console.error('同步自定义分组到原生分组失败:', error);
    }
  }

  /**
   * 获取指定分组中的所有标签
   */
  async getTabsInGroup(groupId: number): Promise<chrome.tabs.Tab[]> {
    try {
      const tabs = await chrome.tabs.query({ groupId });
      return tabs;
    } catch (error) {
      console.error('获取分组中的标签失败:', error);
      return [];
    }
  }

  /**
   * 将标签添加到现有分组
   */
  async addTabsToGroup(tabIds: number[], groupId: number): Promise<void> {
         try {
       await (chrome.tabs as any).group({ groupId, tabIds });
      console.log(`标签已添加到分组 ${groupId}: ${tabIds.length} 个标签`);
    } catch (error) {
      console.error('添加标签到分组失败:', error);
      throw error;
    }
  }

  /**
   * 折叠或展开标签分组
   */
     async toggleGroupCollapse(groupId: number): Promise<any> {
    try {
      const group = await this.getGroup(groupId);
      return await this.updateGroup(groupId, { collapsed: !group.collapsed });
    } catch (error) {
      console.error('切换分组折叠状态失败:', error);
      throw error;
    }
  }

  /**
   * 获取所有窗口的标签分组统计信息
   */
  async getGroupsAnalytics(): Promise<{
    totalGroups: number;
    totalTabsInGroups: number;
    groupsByColor: { [color: string]: number };
    groupsByWindow: { [windowId: number]: number };
    collapsedGroups: number;
  }> {
    try {
      const allGroups = await this.queryGroups();
      const analytics = {
        totalGroups: allGroups.length,
        totalTabsInGroups: 0,
        groupsByColor: {} as { [color: string]: number },
        groupsByWindow: {} as { [windowId: number]: number },
        collapsedGroups: 0
      };

            for (const group of allGroups) {
        if (!group) continue;
        
        // 统计分组中的标签数量
        const tabsInGroup = await this.getTabsInGroup(group.id);
        analytics.totalTabsInGroups += tabsInGroup.length;

        // 按颜色统计
        if (group.color) {
          analytics.groupsByColor[group.color] = (analytics.groupsByColor[group.color] || 0) + 1;
        }

        // 按窗口统计
        if (group.windowId) {
          analytics.groupsByWindow[group.windowId] = (analytics.groupsByWindow[group.windowId] || 0) + 1;
        }

        // 统计折叠的分组
        if (group.collapsed) {
          analytics.collapsedGroups++;
        }
      }

      return analytics;
    } catch (error) {
      console.error('获取分组统计信息失败:', error);
      throw error;
    }
  }

  /**
   * 事件处理函数
   */
     private async handleGroupCreated(group: any): Promise<void> {
    console.log('原生标签分组已创建:', group);
    this.notifyListeners('groupCreated', group);
  }

     private async handleGroupUpdated(group: any): Promise<void> {
    console.log('原生标签分组已更新:', group);
    this.notifyListeners('groupUpdated', group);
  }

     private async handleGroupRemoved(group: any): Promise<void> {
    console.log('原生标签分组已删除:', group);
    this.notifyListeners('groupRemoved', group);
  }

     private async handleGroupMoved(group: any): Promise<void> {
    console.log('原生标签分组已移动:', group);
    this.notifyListeners('groupMoved', group);
  }

  /**
   * 注册事件监听器
   */
  addEventListener(event: string, callback: Function): void {
    this.groupEventListeners.set(event, callback);
  }

  /**
   * 移除事件监听器
   */
  removeEventListener(event: string): void {
    this.groupEventListeners.delete(event);
  }

  /**
   * 通知事件监听器
   */
  private notifyListeners(event: string, data: any): void {
    const callback = this.groupEventListeners.get(event);
    if (callback) {
      callback(data);
    }
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
      'education': 'yellow'
    };

    return colorMap[category.toLowerCase()] || 'grey';
  }

  /**
   * 工具方法：过滤有效的标签ID
   */
  private async filterValidTabIds(tabIds: number[]): Promise<number[]> {
    const validTabIds: number[] = [];
    
    for (const tabId of tabIds) {
      try {
        await chrome.tabs.get(tabId);
        validTabIds.push(tabId);
      } catch (error) {
        console.warn(`标签 ${tabId} 不存在或已关闭`);
      }
    }

    return validTabIds;
  }
} 