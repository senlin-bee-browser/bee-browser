/**
 * 标签页导航工具模块
 * 提供完善的标签页跳转、关闭等功能
 */

export interface TabNavigationResult {
  success: boolean
  error?: string
  action: 'activate' | 'close' | 'focus_window'
}

/**
 * 跳转到指定标签页
 * @param tab 目标标签页对象
 * @returns Promise<TabNavigationResult>
 */
export async function navigateToTab(tab: chrome.tabs.Tab): Promise<TabNavigationResult> {
  try {
    if (!tab.id) {
      return {
        success: false,
        error: '标签页ID无效',
        action: 'activate'
      }
    }

    // 1. 首先激活标签页
    await chrome.tabs.update(tab.id, { active: true })
    
    // 2. 如果标签页在不同窗口，需要聚焦到该窗口
    if (tab.windowId) {
      try {
        // 获取当前活跃窗口
        const currentWindow = await chrome.windows.getCurrent()
        
        // 如果标签页不在当前窗口，切换到目标窗口
        if (currentWindow.id !== tab.windowId) {
          await chrome.windows.update(tab.windowId, { focused: true })
          
          return {
            success: true,
            action: 'focus_window'
          }
        }
      } catch (windowError) {
        console.warn('切换窗口失败，但标签页已激活:', windowError)
        // 即使窗口切换失败，标签页仍然被激活了
      }
    }

    return {
      success: true,
      action: 'activate'
    }

  } catch (error) {
    console.error('跳转到标签页失败:', error)
    
    // 处理常见错误情况
    if (error instanceof Error) {
      if (error.message.includes('No tab with id')) {
        return {
          success: false,
          error: '标签页已不存在',
          action: 'activate'
        }
      }
      if (error.message.includes('Cannot access')) {
        return {
          success: false,
          error: '没有权限访问该标签页',
          action: 'activate'
        }
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
      action: 'activate'
    }
  }
}

/**
 * 关闭指定标签页
 * @param tabId 标签页ID
 * @returns Promise<TabNavigationResult>
 */
export async function closeTab(tabId: number): Promise<TabNavigationResult> {
  try {
    await chrome.tabs.remove(tabId)
    
    return {
      success: true,
      action: 'close'
    }

  } catch (error) {
    console.error('关闭标签页失败:', error)
    
    if (error instanceof Error) {
      if (error.message.includes('No tab with id')) {
        return {
          success: false,
          error: '标签页已不存在',
          action: 'close'
        }
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : '关闭失败',
      action: 'close'
    }
  }
}

/**
 * 批量关闭标签页
 * @param tabIds 标签页ID数组
 * @returns Promise<TabNavigationResult[]>
 */
export async function closeTabs(tabIds: number[]): Promise<TabNavigationResult[]> {
  const results: TabNavigationResult[] = []
  
  try {
    // 使用批量API提高性能
    await chrome.tabs.remove(tabIds)
    
    // 为每个ID创建成功结果
    tabIds.forEach(() => {
      results.push({
        success: true,
        action: 'close'
      })
    })
    
  } catch (error) {
    console.error('批量关闭标签页失败:', error)
    
    // 如果批量操作失败，尝试逐个关闭
    for (const tabId of tabIds) {
      const result = await closeTab(tabId)
      results.push(result)
    }
  }
  
  return results
}

/**
 * 创建新标签页并跳转
 * @param url 目标URL
 * @param options 创建选项
 * @returns Promise<TabNavigationResult>
 */
export async function createAndNavigateToTab(
  url: string, 
  options: {
    active?: boolean
    windowId?: number
    index?: number
  } = {}
): Promise<TabNavigationResult> {
  try {
    const tab = await chrome.tabs.create({
      url,
      active: options.active ?? true,
      windowId: options.windowId,
      index: options.index
    })
    
    if (tab.id && options.active !== false) {
      // 如果创建了活跃标签页，确保窗口也被聚焦
      if (tab.windowId) {
        await chrome.windows.update(tab.windowId, { focused: true })
      }
    }

    return {
      success: true,
      action: 'activate'
    }

  } catch (error) {
    console.error('创建标签页失败:', error)
    
    return {
      success: false,
      error: error instanceof Error ? error.message : '创建失败',
      action: 'activate'
    }
  }
}

/**
 * 检查标签页是否存在
 * @param tabId 标签页ID
 * @returns Promise<boolean>
 */
export async function tabExists(tabId: number): Promise<boolean> {
  try {
    await chrome.tabs.get(tabId)
    return true
  } catch {
    return false
  }
}

/**
 * 显示操作结果通知
 * @param result 操作结果
 * @param customMessage 自定义消息
 */
export function showNavigationResult(result: TabNavigationResult, customMessage?: string) {
  if (result.success) {
    const messages = {
      activate: customMessage || '已跳转到标签页',
      close: customMessage || '标签页已关闭',
      focus_window: customMessage || '已切换到目标窗口'
    }
    console.log('✅', messages[result.action])
  } else {
    console.error('❌ 操作失败:', result.error)
    // 这里可以集成通知系统，比如显示toast消息
  }
} 