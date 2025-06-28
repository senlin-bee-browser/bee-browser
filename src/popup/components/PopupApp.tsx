import { useState, useEffect } from 'react'
import { Search, Settings, BarChart3, FolderOpen, RefreshCw, Download, RotateCcw } from 'lucide-react'
import { Button, Loading } from '@shared/components'
import { useApp } from '@shared/contexts/AppContext'
import { useTabs } from '@shared/hooks/useTabs'

export default function PopupApp() {
  const { state, dispatch } = useApp()
  const { tabs, loading: tabsLoading } = useTabs()
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
          placeholder="Search your knowledge..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
      </div>

      {/* Stats */}
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

      {/* Actions */}
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

      {/* Recent Groups */}
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

      {/* Quick Actions */}
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