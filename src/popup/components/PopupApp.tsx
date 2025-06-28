import { useState, useEffect, useMemo } from 'react'
import { Search, Settings, BarChart3, FolderOpen, RefreshCw, Download, RotateCcw, ExternalLink, X } from 'lucide-react'
import { Button, Loading } from '@shared/components'
import { useApp } from '@shared/contexts/AppContext'
import { useTabs } from '@shared/hooks/useTabs'

export default function PopupApp() {
  const { state, dispatch } = useApp()
  const { tabs, loading: tabsLoading, switchToTab, closeTab } = useTabs({ 
    enableEnhancement: false // 在 popup 中禁用增强功能以提高加载速度
  })
  const [searchQuery, setSearchQuery] = useState('')

  // 加载标签组数据
  const loadGroups = async () => {
    try {
      // 获取当前窗口并查询该窗口的所有标签组
      const currentWindow = await chrome.windows.getCurrent()
      const groups = await chrome.tabGroups.query({ windowId: currentWindow.id })
      
      // 为每个标签组获取其包含的标签页
      const groupsWithTabs = await Promise.all(
        groups.map(async (group) => {
          try {
            // 查询属于该组的标签页
            const tabs = await chrome.tabs.query({ groupId: group.id })
            
            return {
              id: `native-${group.id}`,
              name: group.title || `标签组 ${group.id}`,
              tabs: tabs,
              category: inferCategoryFromTabs(tabs) || 'General',
              createdAt: new Date(),
              lastUpdated: new Date(),
            }
          } catch (error) {
            console.warn(`获取标签组 ${group.id} 的标签页失败:`, error)
            return null
          }
        })
      )
      
      // 过滤掉失败的组并更新状态
      const validGroups = groupsWithTabs.filter(group => group !== null)
      dispatch({ type: 'SET_TAB_GROUPS', payload: validGroups })
      
    } catch (error) {
      console.error('Failed to load groups:', error)
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load tab groups' })
    }
  }

  // 根据标签页推断分类
  const inferCategoryFromTabs = (tabs: chrome.tabs.Tab[]): string => {
    if (!tabs || tabs.length === 0) return 'General'
    
    const domains = tabs.map(tab => {
      try {
        return new URL(tab.url || '').hostname
      } catch {
        return ''
      }
    }).filter(Boolean)
    
    if (domains.some(domain => domain.includes('github.com') || domain.includes('gitlab.com'))) {
      return 'Development'
    }
    if (domains.some(domain => domain.includes('youtube.com') || domain.includes('netflix.com'))) {
      return 'Entertainment'
    }
    if (domains.some(domain => domain.includes('google.com') || domain.includes('stackoverflow.com'))) {
      return 'Research'
    }
    if (domains.some(domain => domain.includes('amazon.com') || domain.includes('taobao.com'))) {
      return 'Shopping'
    }
    
    return 'General'
  }

  // 组件挂载时加载数据
  useEffect(() => {
    loadGroups()
  }, [])

  const handleOpenWorkspace = () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('src/workspace/workspace.html') })
    window.close()
  }

  const handleOpenSidepanel = async () => {
    try {
      const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (currentTab?.id) {
        await chrome.sidePanel.open({ tabId: currentTab.id })
      }
      window.close()
    } catch (error) {
      console.error('Failed to open sidepanel:', error)
    }
  }

  const handleAnalyzeCurrentTabs = async () => {
    dispatch({ type: 'SET_LOADING', payload: true })
    try {
      // Get all tabs in the current window and open workspace
      const allTabs = await chrome.tabs.query({ currentWindow: true })
      console.log('Analyzing tabs:', allTabs)
      // Open workspace for full analysis experience
      handleOpenWorkspace()
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to analyze current tabs' })
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }

  const handleGroupSimilarTabs = async () => {
    dispatch({ type: 'SET_LOADING', payload: true })
    try {
      // TODO: Implement tab grouping logic
      console.log('Grouping similar tabs')
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to group tabs' })
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }

  // 搜索过滤逻辑
  const filteredTabs = useMemo(() => {
    if (!searchQuery.trim()) {
      return []
    }
    
    const query = searchQuery.toLowerCase()
    return tabs.filter(tab => {
      const title = (tab.title || '').toLowerCase()
      const url = (tab.url || '').toLowerCase()
      const description = (tab.description || '').toLowerCase()
      
      // 从 URL 中提取域名进行搜索
      let domain = ''
      try {
        domain = tab.url ? new URL(tab.url).hostname.toLowerCase() : ''
      } catch {
        domain = ''
      }
      
      return (
        title.includes(query) ||
        url.includes(query) ||
        domain.includes(query) ||
        description.includes(query)
      )
    })
  }, [tabs, searchQuery])

  // 处理标签页点击跳转
  const handleTabClick = async (tab: chrome.tabs.Tab) => {
    try {
      if (tab.id) {
        await switchToTab(tab.id)
        window.close() // 关闭 popup
      }
    } catch (error) {
      console.error('Failed to switch to tab:', error)
      dispatch({ type: 'SET_ERROR', payload: 'Failed to switch to tab' })
    }
  }

  // 处理标签页关闭
  const handleTabClose = async (tabId: number, event: React.MouseEvent) => {
    event.stopPropagation() // 阻止冒泡，避免触发点击跳转
    try {
      await closeTab(tabId)
    } catch (error) {
      console.error('Failed to close tab:', error)
      dispatch({ type: 'SET_ERROR', payload: 'Failed to close tab' })
    }
  }

  // 获取标签页的图标
  const getTabIcon = (tab: chrome.tabs.Tab) => {
    if (tab.favIconUrl && !tab.favIconUrl.startsWith('chrome://')) {
      return tab.favIconUrl
    }
    return undefined
  }

  // 格式化URL显示
  const formatUrl = (url: string) => {
    try {
      const urlObj = new URL(url)
      return urlObj.hostname + urlObj.pathname
    } catch {
      return url
    }
  }

  // 计算活跃组数量（只计算有标签页的组）
  const activeGroupsCount = state.tabGroups.filter(group => group.tabs && group.tabs.length > 0).length

  const recentGroups = state.tabGroups.slice(0, 3)

  if (tabsLoading) {
    return (
      <div className="popup-container flex items-center justify-center">
        <Loading text="Loading..." />
      </div>
    )
  }

  return (
    <div className="popup-container space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-2xl">🐝</span>
          <h1 className="text-lg font-semibold">Bee Browser 0.0.1</h1>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => chrome.runtime.openOptionsPage()}
        >
          <Settings className="w-4 h-4" />
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="搜索你的标签页..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Search Results */}
      {searchQuery.trim() && (
        <div className="max-h-64 overflow-y-auto">
          <div className="text-sm text-gray-600 mb-2">
            找到 {filteredTabs.length} 个匹配的标签页
          </div>
          {filteredTabs.length > 0 ? (
            <div className="space-y-1">
              {filteredTabs.slice(0, 10).map((tab) => (
                <div
                  key={tab.id}
                  onClick={() => handleTabClick(tab)}
                  className="flex items-center space-x-3 p-2 bg-gray-50 hover:bg-gray-100 rounded-md cursor-pointer group transition-colors"
                >
                  <div className="flex-shrink-0">
                    {getTabIcon(tab) ? (
                      <img
                        src={getTabIcon(tab)}
                        alt=""
                        className="w-4 h-4"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    ) : (
                      <ExternalLink className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {tab.title || 'Untitled'}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {tab.url ? formatUrl(tab.url) : ''}
                    </div>
                    {tab.description && (
                      <div className="text-xs text-gray-400 truncate">
                        {tab.description}
                      </div>
                    )}
                  </div>
                  <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => tab.id && handleTabClose(tab.id, e)}
                      className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                      title="关闭标签页"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
              {filteredTabs.length > 10 && (
                <div className="text-xs text-gray-500 text-center py-2">
                  还有 {filteredTabs.length - 10} 个结果...
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-gray-500 text-center py-4">
              没有找到匹配的标签页
            </div>
          )}
        </div>
      )}

      {/* Stats - 只在没有搜索时显示 */}
      {!searchQuery.trim() && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-sm text-gray-600">Active Groups</div>
            <div className="text-xl font-semibold text-primary-600">{activeGroupsCount}</div>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-sm text-gray-600">Total Tabs</div>
            <div className="text-xl font-semibold text-primary-600">{tabs.length}</div>
          </div>
        </div>
      )}

      {/* Actions - 只在没有搜索时显示 */}
      {!searchQuery.trim() && (
        <div className="space-y-2">
          <Button
            onClick={handleAnalyzeCurrentTabs}
            loading={state.isLoading}
            className="w-full justify-start"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Analyze Current Tabs
          </Button>
          
          <Button
            variant="outline"
            onClick={handleGroupSimilarTabs}
            loading={state.isLoading}
            className="w-full justify-start"
          >
            <FolderOpen className="w-4 h-4 mr-2" />
            Group Similar Tabs
          </Button>
          
          <Button
            variant="outline"
            onClick={handleOpenSidepanel}
            className="w-full justify-start"
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Open Sidepanel
          </Button>
          
          <Button
            variant="outline"
            onClick={handleOpenWorkspace}
            className="w-full justify-start"
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Open Workspace
          </Button>
        </div>
      )}

      {/* Recent Groups - 只在没有搜索时显示 */}
      {!searchQuery.trim() && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">Recent Groups</h3>
          {recentGroups.length > 0 ? (
            <div className="space-y-2">
              {recentGroups.map((group) => (
                <div key={group.id} className="p-2 bg-gray-50 rounded-md">
                  <div className="text-sm font-medium">{group.name}</div>
                  <div className="text-xs text-gray-500">{group.tabs.length} tabs</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-500 text-center py-4">
              No groups yet. Start by analyzing your tabs!
            </div>
          )}
        </div>
      )}

      {/* Quick Actions - 只在没有搜索时显示 */}
      {!searchQuery.trim() && (
        <div className="flex space-x-2 pt-2 border-t">
          <Button variant="ghost" size="sm" className="flex-1">
            <Download className="w-4 h-4 mr-1" />
            Export
          </Button>
          <Button variant="ghost" size="sm" className="flex-1">
            <RotateCcw className="w-4 h-4 mr-1" />
            Sync
          </Button>
        </div>
      )}

      {/* Error Display */}
      {state.error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <div className="text-sm text-red-800">{state.error}</div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => dispatch({ type: 'SET_ERROR', payload: null })}
            className="mt-1 text-red-600"
          >
            Dismiss
          </Button>
        </div>
      )}
    </div>
  )
}