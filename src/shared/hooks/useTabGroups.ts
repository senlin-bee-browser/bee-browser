import { useState, useEffect, useCallback } from 'react'

interface TabGroupWithTabs extends chrome.tabGroups.TabGroup {
  tabs: chrome.tabs.Tab[]
}

export function useTabGroups() {
  const [tabGroups, setTabGroups] = useState<TabGroupWithTabs[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 获取标签组中的标签页
  const getTabsInGroup = useCallback(async (groupId: number): Promise<chrome.tabs.Tab[]> => {
    try {
      const tabs = await chrome.tabs.query({ groupId })
      return tabs
    } catch (error) {
      console.error('获取分组标签页失败:', error)
      return []
    }
  }, [])

  // 加载所有标签组及其标签页
  const loadTabGroups = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // 获取所有标签组
      const groups = await chrome.tabGroups.query({})
      
      // 为每个标签组获取其包含的标签页
      const groupsWithTabs = await Promise.all(
        groups.map(async (group) => {
          const tabs = await getTabsInGroup(group.id)
          return {
            ...group,
            tabs
          }
        })
      )

      setTabGroups(groupsWithTabs)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载标签组失败')
      console.error('加载标签组失败:', err)
    } finally {
      setLoading(false)
    }
  }, [getTabsInGroup])

  // 切换分组折叠状态
  const toggleGroupCollapse = useCallback(async (groupId: number) => {
    try {
      const group = await chrome.tabGroups.get(groupId)
      await chrome.tabGroups.update(groupId, { 
        collapsed: !group.collapsed 
      })
    } catch (error) {
      console.error('切换分组状态失败:', error)
    }
  }, [])

  // 更新分组标题
  const updateGroupTitle = useCallback(async (groupId: number, title: string) => {
    try {
      await chrome.tabGroups.update(groupId, { title })
    } catch (error) {
      console.error('更新分组标题失败:', error)
    }
  }, [])

  // 设置事件监听器
  useEffect(() => {
    // 标签组创建事件
    const handleGroupCreated = (group: chrome.tabGroups.TabGroup) => {
      console.log('标签组已创建:', group)
      loadTabGroups() // 重新加载所有数据
    }

    // 标签组更新事件
    const handleGroupUpdated = (group: chrome.tabGroups.TabGroup) => {
      console.log('标签组已更新:', group)
      loadTabGroups() // 重新加载所有数据
    }

    // 标签组删除事件
    const handleGroupRemoved = (group: chrome.tabGroups.TabGroup) => {
      console.log('标签组已删除:', group)
      setTabGroups(prev => prev.filter(g => g.id !== group.id))
    }

    // 标签组移动事件
    const handleGroupMoved = (group: chrome.tabGroups.TabGroup) => {
      console.log('标签组已移动:', group)
      loadTabGroups() // 重新加载所有数据
    }

    // 标签页更新事件（可能影响分组）
    const handleTabUpdated = (tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) => {
      // 如果标签页的分组发生变化，重新加载
      if (changeInfo.groupId !== undefined) {
        console.log('标签页分组已变化:', tab)
        loadTabGroups()
      }
    }

    // 添加事件监听器
    chrome.tabGroups.onCreated.addListener(handleGroupCreated)
    chrome.tabGroups.onUpdated.addListener(handleGroupUpdated)
    chrome.tabGroups.onRemoved.addListener(handleGroupRemoved)
    chrome.tabGroups.onMoved.addListener(handleGroupMoved)
    chrome.tabs.onUpdated.addListener(handleTabUpdated)

    // 清理函数
    return () => {
      chrome.tabGroups.onCreated.removeListener(handleGroupCreated)
      chrome.tabGroups.onUpdated.removeListener(handleGroupUpdated)
      chrome.tabGroups.onRemoved.removeListener(handleGroupRemoved)
      chrome.tabGroups.onMoved.removeListener(handleGroupMoved)
      chrome.tabs.onUpdated.removeListener(handleTabUpdated)
    }
  }, [loadTabGroups])

  // 初始加载
  useEffect(() => {
    loadTabGroups()
  }, [loadTabGroups])

  return {
    tabGroups,
    loading,
    error,
    refreshTabGroups: loadTabGroups,
    toggleGroupCollapse,
    updateGroupTitle
  }
} 