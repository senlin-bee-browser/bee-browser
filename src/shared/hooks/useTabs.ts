import { useState, useEffect, useCallback } from 'react'

export function useTabs() {
  const [tabs, setTabs] = useState<chrome.tabs.Tab[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadTabs = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const allTabs = await chrome.tabs.query({})
      setTabs(allTabs)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tabs')
    } finally {
      setLoading(false)
    }
  }, [])

  const createTab = useCallback(async (url: string) => {
    try {
      const tab = await chrome.tabs.create({ url })
      setTabs(prev => [...prev, tab])
      return tab
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to create tab')
    }
  }, [])

  const closeTab = useCallback(async (tabId: number) => {
    try {
      await chrome.tabs.remove(tabId)
      setTabs(prev => prev.filter(tab => tab.id !== tabId))
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to close tab')
    }
  }, [])

  const switchToTab = useCallback(async (tabId: number) => {
    try {
      await chrome.tabs.update(tabId, { active: true })
      const tab = await chrome.tabs.get(tabId)
      if (tab.windowId) {
        await chrome.windows.update(tab.windowId, { focused: true })
      }
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to switch to tab')
    }
  }, [])

  const groupTabs = useCallback(async (tabIds: number[], groupName?: string) => {
    try {
      const groupId = await chrome.tabs.group({ tabIds })
      if (groupName) {
        await chrome.tabGroups.update(groupId, { title: groupName })
      }
      return groupId
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to group tabs')
    }
  }, [])

  useEffect(() => {
    loadTabs()
  }, [loadTabs])

  useEffect(() => {
    const handleTabCreated = (tab: chrome.tabs.Tab) => {
      setTabs(prev => [...prev, tab])
    }

    const handleTabRemoved = (tabId: number) => {
      setTabs(prev => prev.filter(tab => tab.id !== tabId))
    }

    const handleTabUpdated = (tabId: number, _changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) => {
      setTabs(prev => prev.map(t => t.id === tabId ? tab : t))
    }

    chrome.tabs.onCreated.addListener(handleTabCreated)
    chrome.tabs.onRemoved.addListener(handleTabRemoved)
    chrome.tabs.onUpdated.addListener(handleTabUpdated)

    return () => {
      chrome.tabs.onCreated.removeListener(handleTabCreated)
      chrome.tabs.onRemoved.removeListener(handleTabRemoved)
      chrome.tabs.onUpdated.removeListener(handleTabUpdated)
    }
  }, [])

  return {
    tabs,
    loading,
    error,
    createTab,
    closeTab,
    switchToTab,
    groupTabs,
    reload: loadTabs
  }
}