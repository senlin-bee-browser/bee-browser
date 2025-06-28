import { useState, useEffect, useCallback } from 'react'

// 扩展标签页类型，包含简介信息
interface EnhancedTab extends chrome.tabs.Tab {
  description?: string
  lastAccessed?: number
  domain?: string
  pageAnalysis?: {
    metaDescription?: string
    headings?: string[]
    summary?: string
  }
}

export function useTabs() {
  const [tabs, setTabs] = useState<EnhancedTab[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 从页面内容提取简介信息
  const extractPageDescription = useCallback(async (tab: chrome.tabs.Tab): Promise<string> => {
    if (!tab.id || !tab.url || tab.url.startsWith('chrome://')) {
      return ''
    }

    try {
      // 尝试通过 content script 获取页面信息
      const response = await chrome.tabs.sendMessage(tab.id, { type: 'ANALYZE_TAB' })
      
      if (response?.data?.metadata) {
        const metadata = response.data.metadata
        
        // 优先使用 meta description
        if (metadata.description) {
          return metadata.description
        }
        
        // 解析页面内容获取简介
        if (response.data.content) {
          try {
            const contentData = JSON.parse(response.data.content)
            
            // 返回 meta description
            if (contentData.metaDescription) {
              return contentData.metaDescription
            }
            
            // 如果没有 meta description，从第一段或标题生成简介
            if (contentData.paragraphs?.length > 0) {
              return contentData.paragraphs[0].substring(0, 150) + '...'
            }
            
            if (contentData.headings?.length > 1) {
              // 使用第一个非主标题的标题作为简介
              const subtitle = contentData.headings.find((h: any) => h.level > 1)
              if (subtitle?.text) {
                return subtitle.text
              }
            }
          } catch (parseError) {
            console.warn('Failed to parse content data:', parseError)
          }
        }
      }
    } catch (error) {
      // 如果获取失败，尝试通过 executeScript 获取基本信息
      try {
        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            const description = document.querySelector('meta[name="description"]')?.getAttribute('content')
            if (description) return description
            
            const firstP = document.querySelector('p')?.textContent?.trim()
            if (firstP && firstP.length > 30) {
              return firstP.substring(0, 150) + '...'
            }
            
            return ''
          }
        })
        
        return results?.[0]?.result || ''
      } catch (scriptError) {
        console.warn('Failed to extract description for tab:', tab.id, scriptError)
        return ''
      }
    }
    
    return ''
  }, [])

  // 获取域名
  const extractDomain = useCallback((url: string): string => {
    try {
      return new URL(url).hostname
    } catch {
      return 'Unknown'
    }
  }, [])

  // 增强标签页数据
  const enhanceTabData = useCallback(async (tab: chrome.tabs.Tab): Promise<EnhancedTab> => {
    const description = await extractPageDescription(tab)
    
    return {
      ...tab,
      description,
      domain: extractDomain(tab.url || ''),
      lastAccessed: Date.now() // Chrome API 没有提供真实的 lastAccessed，这里用当前时间
    }
  }, [extractPageDescription, extractDomain])

  const loadTabs = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const allTabs = await chrome.tabs.query({})
      
      // 并行增强所有标签页数据
      const enhancedTabs = await Promise.all(
        allTabs.map(tab => enhanceTabData(tab))
      )
      
      setTabs(enhancedTabs)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tabs')
    } finally {
      setLoading(false)
    }
  }, [enhanceTabData])

  const createTab = useCallback(async (url: string) => {
    try {
      const tab = await chrome.tabs.create({ url })
      const enhancedTab = await enhanceTabData(tab)
      setTabs(prev => [...prev, enhancedTab])
      return tab
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to create tab')
    }
  }, [enhanceTabData])

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
    const handleTabCreated = async (tab: chrome.tabs.Tab) => {
      const enhancedTab = await enhanceTabData(tab)
      setTabs(prev => [...prev, enhancedTab])
    }

    const handleTabRemoved = (tabId: number) => {
      setTabs(prev => prev.filter(tab => tab.id !== tabId))
    }

    const handleTabUpdated = async (tabId: number, _changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) => {
      const enhancedTab = await enhanceTabData(tab)
      setTabs(prev => prev.map(t => t.id === tabId ? enhancedTab : t))
    }

    chrome.tabs.onCreated.addListener(handleTabCreated)
    chrome.tabs.onRemoved.addListener(handleTabRemoved)
    chrome.tabs.onUpdated.addListener(handleTabUpdated)

    return () => {
      chrome.tabs.onCreated.removeListener(handleTabCreated)
      chrome.tabs.onRemoved.removeListener(handleTabRemoved)
      chrome.tabs.onUpdated.removeListener(handleTabUpdated)
    }
  }, [enhanceTabData])

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