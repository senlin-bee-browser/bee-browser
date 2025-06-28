import { NativeTabGroups } from './native-tab-groups';
import { TabGroupIntegration } from './tab-group-integration';

/**
 * Chrome 原生标签分组功能演示
 */
export class NativeTabGroupsDemo {
  private nativeTabGroups: NativeTabGroups;
  private _integration: TabGroupIntegration;

  constructor() {
    this.nativeTabGroups = new NativeTabGroups();
    this._integration = new TabGroupIntegration();
  }

  /**
   * 演示: 创建原生标签分组
   */
  async demoCreateNativeGroup(): Promise<void> {
    console.log('=== 演示: 创建原生标签分组 ===');
    
    try {
      const tabs = await chrome.tabs.query({ currentWindow: true });
      
      if (tabs.length < 2) {
        console.log('需要至少2个标签页来创建分组');
        return;
      }

      const tabIds = tabs.slice(0, 3).map(tab => tab.id!);
      
      const group = await this.nativeTabGroups.createNativeGroup(tabIds, {
        title: '演示分组',
        color: 'blue',
        collapsed: false
      });

      console.log('原生标签分组已创建:', group);
      
    } catch (error) {
      console.error('创建原生分组演示失败:', error);
    }
  }

  /**
   * 演示: 查询现有分组
   */
  async demoQueryGroups(): Promise<void> {
    console.log('=== 演示: 查询现有分组 ===');
    
    try {
      const allGroups = await this.nativeTabGroups.queryGroups();
      console.log(`找到 ${allGroups.length} 个标签分组`);
      
      for (const group of allGroups) {
        console.log(`- ${group.title || '未命名'} (颜色: ${group.color})`);
        const tabs = await this.nativeTabGroups.getTabsInGroup(group.id);
        console.log(`  包含 ${tabs.length} 个标签页`);
      }
      
    } catch (error) {
      console.error('查询分组演示失败:', error);
    }
  }

  /**
   * 运行所有演示
   */
  async runAllDemos(): Promise<void> {
    console.log('开始运行 Chrome 原生标签分组演示...');
    
    try {
      await this.demoCreateNativeGroup();
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      await this.demoQueryGroups();
      
      console.log('所有演示已完成!');
      
    } catch (error) {
      console.error('演示过程中发生错误:', error);
    }
  }
}

// 导出到window对象用于控制台调试
if (typeof window !== 'undefined') {
  (window as any).NativeTabGroupsDemo = NativeTabGroupsDemo;
} 