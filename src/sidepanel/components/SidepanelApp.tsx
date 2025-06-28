import { useState, useEffect } from 'react'
import { Search, RefreshCw, Settings, ExternalLink, MoreVertical, List, Layers, AlertCircle, CheckCircle, XCircle } from 'lucide-react'
import { Button, Loading } from '@shared/components'
import { useApp } from '@shared/contexts/AppContext'
import { useTabs } from '@shared/hooks/useTabs'
import TabsList from './TabsList'

interface GroupCardProps {
  group: {
    id: string
    name: string
    tabs: chrome.tabs.Tab[]
    category: string
    createdAt: Date
  }
  onViewGroup: (group: any) => void
}

interface DebugInfo {
  timestamp?: string
  request?: string
  response?: any
  responseType?: string
  groupsCount?: number
  error?: string
  stack?: string | undefined
}

function GroupCard({ group, onViewGroup }: GroupCardProps) {
  return (
    <div className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-medium text-gray-900 truncate">{group.name}</h3>
        <Button variant="ghost" size="sm" onClick={() => onViewGroup(group)}>
          <MoreVertical className="w-4 h-4" />
        </Button>
      </div>
      
      <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
        <span className="bg-gray-100 px-2 py-1 rounded text-xs">{group.category}</span>
        <span>{group.tabs.length} tabs</span>
      </div>
      
      <div className="space-y-1">
        {group.tabs.slice(0, 3).map((tab, index) => (
          <div key={index} className="flex items-center space-x-2 text-xs">
            <img 
              src={tab.favIconUrl || '/icons/icon-16.png'} 
              alt="" 
              className="w-4 h-4"
              onError={(e) => { e.currentTarget.src = '/icons/icon-16.png' }}
            />
            <span className="truncate">{tab.title}</span>
          </div>
        ))}
        {group.tabs.length > 3 && (
          <div className="text-xs text-gray-400">+{group.tabs.length - 3} more</div>
        )}
      </div>
    </div>
  )
}

// 调试信息组件
function DebugInfo({ debugInfo }: { debugInfo: DebugInfo }) {
  const [showDebug, setShowDebug] = useState(false)

  return (
    <div className="mt-4 p-3 bg-gray-100 rounded-lg text-xs">
      <button 
        onClick={() => setShowDebug(!showDebug)}
        className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
      >
        <AlertCircle className="w-4 h-4" />
        <span>调试信息 {showDebug ? '▼' : '▶'}</span>
      </button>
      
      {showDebug && (
        <pre className="mt-2 p-2 bg-white rounded text-xs overflow-auto max-h-40">
          {JSON.stringify(debugInfo, null, 2)}
        </pre>
      )}
    </div>
  )
}

export default function SidepanelApp() {
  const { state, dispatch } = useApp()
  const { tabs, switchToTab, closeTab, groupTabs } = useTabs()
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'recent' | 'favorites'>('all')
  const [selectedGroup, setSelectedGroup] = useState<any>(null)
  const [currentView, setCurrentView] = useState<'groups' | 'tabs'>('groups')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null)
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({})

  // 加载最新的 Groups 数据
  const loadGroups = async (showLoading = true) => {
    try {
      if (showLoading) {
        dispatch({ type: 'SET_LOADING', payload: true })
      }
      
      console.log('🔄 开始加载 Groups 数据...')
      
      // 使用 Chrome 原生 API 查询所有标签组
      const groups = await chrome.tabGroups.query({})
      console.log('📥 收到原生 tabGroups 数据:', groups)
      
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
              color: group.color,
              createdAt: new Date(), // Chrome API 没有提供创建时间，使用当前时间
              lastUpdated: new Date(),
              nativeGroupId: group.id,
              collapsed: group.collapsed,
              windowId: group.windowId
            }
          } catch (error) {
            console.warn(`获取标签组 ${group.id} 的标签页失败:`, error)
            return {
              id: `native-${group.id}`,
              name: group.title || `标签组 ${group.id}`,
              tabs: [],
              category: 'General',
              color: group.color,
              createdAt: new Date(),
              lastUpdated: new Date(),
              nativeGroupId: group.id,
              collapsed: group.collapsed,
              windowId: group.windowId
            }
          }
        })
      )
      
      console.log('✅ 格式化后的 Groups:', groupsWithTabs)
      
      setDebugInfo({
        timestamp: new Date().toISOString(),
        request: 'chrome.tabGroups.query({})',
        response: { groups, groupsWithTabs },
        responseType: 'chrome-native',
        groupsCount: groupsWithTabs.length
      })
      
      dispatch({ type: 'SET_TAB_GROUPS', payload: groupsWithTabs })
      dispatch({ type: 'SET_ERROR', payload: null })
      setLastRefreshTime(new Date())
      
    } catch (error) {
      console.error('❌ 加载 Groups 失败:', error)
      const errorMessage = error instanceof Error ? error.message : '加载 Groups 失败'
      dispatch({ type: 'SET_ERROR', payload: errorMessage })
      setDebugInfo((prev: DebugInfo) => ({
        ...prev,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      }))
    } finally {
      if (showLoading) {
        dispatch({ type: 'SET_LOADING', payload: false })
      }
    }
  }

  // 根据标签页推断分类
  const inferCategoryFromTabs = (tabs: chrome.tabs.Tab[]): string => {
    if (!tabs || tabs.length === 0) return 'General'
    
    // 简单的分类逻辑，基于 URL 域名
    const domains = tabs.map(tab => {
      try {
        return new URL(tab.url || '').hostname
      } catch {
        return ''
      }
    }).filter(Boolean)
    
    // 检查常见的网站类型
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

  // 刷新数据
  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await loadGroups(true)
      console.log('🔄 手动刷新完成')
    } finally {
      setIsRefreshing(false)
    }
  }

  // 强制重新同步数据
  const handleForceSync = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      console.log('🔄 开始强制同步数据...')
      
      // 直接重新查询原生标签组，不需要发送同步请求
      await loadGroups(false)
      
      console.log('✅ 强制同步完成')
    } catch (error) {
      console.error('❌ 强制同步失败:', error)
      dispatch({ type: 'SET_ERROR', payload: '强制同步失败: ' + (error instanceof Error ? error.message : '未知错误') })
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }

  // 组件挂载时加载数据
  useEffect(() => {
    console.log('🚀 SidepanelApp 组件挂载，开始加载数据')
    loadGroups()
  }, [])

  // 监听标签组变化，自动更新数据
  useEffect(() => {
    const handleTabGroupCreated = () => {
      console.log('📦 检测到标签组创建，重新加载数据')
      loadGroups(false)
    }

    const handleTabGroupUpdated = () => {
      console.log('📦 检测到标签组更新，重新加载数据')
      loadGroups(false)
    }

    const handleTabGroupRemoved = () => {
      console.log('📦 检测到标签组删除，重新加载数据')
      loadGroups(false)
    }

    // 监听标签组事件
    chrome.tabGroups.onCreated.addListener(handleTabGroupCreated)
    chrome.tabGroups.onUpdated.addListener(handleTabGroupUpdated)
    chrome.tabGroups.onRemoved.addListener(handleTabGroupRemoved)

    return () => {
      chrome.tabGroups.onCreated.removeListener(handleTabGroupCreated)
      chrome.tabGroups.onUpdated.removeListener(handleTabGroupUpdated)
      chrome.tabGroups.onRemoved.removeListener(handleTabGroupRemoved)
    }
  }, [])

  const handleViewGroup = (group: any) => {
    setSelectedGroup(group)
  }

  const handleOpenAllTabs = async (group: any) => {
    try {
      console.log('🔄 开始打开标签组中的所有标签页:', group.name)
      
      for (const tab of group.tabs) {
        if (tab.url && !tab.url.startsWith('chrome://')) {
          await chrome.tabs.create({ url: tab.url, active: false })
        }
      }
      
      console.log('✅ 已打开标签组中的所有标签页')
    } catch (error) {
      console.error('❌ 打开标签页失败:', error)
      dispatch({ type: 'SET_ERROR', payload: '打开标签页失败: ' + (error instanceof Error ? error.message : '未知错误') })
    }
  }

  const handleAnalyzeCurrentTab = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      
      const tabs = await chrome.tabs.query({ currentWindow: true })
      const tabsData = tabs.map(tab => ({
        id: tab.id,
        title: tab.title,
        url: tab.url,
        favIconUrl: tab.favIconUrl,
        active: tab.active,
        pinned: tab.pinned,
        audible: tab.audible,
        discarded: tab.discarded,
      }))

      const r = await fetch("https://api.coze.cn/v1/workflow/run", {
        method: "POST",
        headers: {
          "Authorization": "Bearer pat_gqb2WMNGMLRDwB85gyIhXxAxJDJZ7BM2bClu8H5imVrvvxV7oUMY8iLpdNUUMvSj",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          "workflow_id": "7520894694882525223",
          "parameters": {
            "input": tabsData //塞入标签页数组
          }
        })
      })
      const llmOutput = JSON.parse((await r.json()).data).output
      const results = JSON.parse(llmOutput)
      console.log(results)

      const groups = Object.groupBy(results, (g) => g.category)
      console.log(groups)
      Object.entries(groups).map(async ([title, tabs])=>{
        const groupId = await chrome.tabs.group({ 
          tabIds: tabs.map(t=>+t.id).filter(Boolean),
        })
        await chrome.tabGroups.update(groupId, {title})
      })
      
      // 重新加载 groups 以获取可能的新分组
      await loadGroups(false)
      
      console.log('✅ 当前标签页分析完成')
    } catch (error) {
      console.error('❌ 分析当前标签页失败:', error)
      dispatch({ type: 'SET_ERROR', payload: '分析当前标签页失败: ' + (error instanceof Error ? error.message : '未知错误') })
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }

  const handleSwitchToTab = async (tabId: number) => {
    try {
      await switchToTab(tabId)
    } catch (error) {
      console.error('Failed to switch to tab:', error)
    }
  }

  const handleCloseTab = async (tabId: number) => {
    try {
      await closeTab(tabId)
    } catch (error) {
      console.error('Failed to close tab:', error)
    }
  }

  const handleCreateGroupFromTabs = async (tabIds: number[]) => {
    try {
      console.log('🔄 开始创建标签组，标签页 IDs:', tabIds)
      
      if (tabIds.length === 0) {
        throw new Error('没有选择任何标签页')
      }

      // 使用 Chrome 原生 API 创建标签组
      const groupId = await chrome.tabs.group({ tabIds })
      console.log('✅ 创建了原生标签组，ID:', groupId)
      
      // 设置标签组的标题
      const groupName = `新分组 ${new Date().toLocaleTimeString()}`
      await chrome.tabGroups.update(groupId, {
        title: groupName,
        color: 'blue' // 可以根据需要设置颜色
      })
      
      console.log('✅ 已设置标签组标题:', groupName)
      
      // 重新加载 groups 以显示新创建的分组
      await loadGroups(false)
      
      console.log('✅ 标签组创建完成，tabIds:', tabIds)
    } catch (error) {
      console.error('❌ 创建标签组失败:', error)
      dispatch({ type: 'SET_ERROR', payload: '创建标签组失败: ' + (error instanceof Error ? error.message : '未知错误') })
    }
  }

  const filteredGroups = state.tabGroups.filter(group => {
    if (searchQuery && !group.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false
    }
    if (filter === 'recent') {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
      return new Date(group.createdAt) > threeDaysAgo
    }
    return true
  })

  if (state.isLoading && state.tabGroups.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-50">
        <Loading text="Loading knowledge panel..." />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-xl">🐝</span>
            <h1 className="font-semibold">Knowledge Panel</h1>
          </div>
          <div className="flex space-x-1">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleRefresh}
              loading={isRefreshing}
              disabled={state.isLoading}
              title="刷新数据"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleForceSync}
              disabled={state.isLoading || isRefreshing}
              title="强制同步"
            >
              <CheckCircle className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => chrome.runtime.openOptionsPage()}>
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* 状态指示器 */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            {state.error ? (
              <div className="flex items-center space-x-1 text-red-600">
                <XCircle className="w-3 h-3" />
                <span>出现错误</span>
              </div>
            ) : (
              <div className="flex items-center space-x-1 text-green-600">
                <CheckCircle className="w-3 h-3" />
                <span>数据正常</span>
              </div>
            )}
            <span className="text-gray-500">
              Groups: {state.tabGroups.length}
            </span>
          </div>
          {lastRefreshTime && (
            <span className="text-gray-400">
              上次刷新: {lastRefreshTime.toLocaleTimeString()}
            </span>
          )}
        </div>

        {/* 错误信息 */}
        {state.error && (
          <div className="bg-red-50 border border-red-200 rounded p-3">
            <div className="flex items-start space-x-2">
              <XCircle className="w-4 h-4 text-red-500 mt-0.5" />
              <div>
                <p className="text-sm text-red-800 font-medium">数据加载失败</p>
                <p className="text-xs text-red-600 mt-1">{state.error}</p>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={handleRefresh}
                  className="mt-2 text-red-600 hover:bg-red-100"
                >
                  重试
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search your knowledge base..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
          />
        </div>

        {/* View Toggle */}
        <div className="flex space-x-2">
          <button
            onClick={() => setCurrentView('groups')}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              currentView === 'groups'
                ? 'bg-blue-100 text-blue-700 border border-blue-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Groups ({state.tabGroups.length})</span>
          </button>
          <button
            onClick={() => setCurrentView('tabs')}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              currentView === 'tabs'
                ? 'bg-blue-100 text-blue-700 border border-blue-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <List className="w-4 h-4" />
            <span>Tabs ({tabs.length})</span>
          </button>
        </div>

        {/* Filter buttons */}
        <div className="flex space-x-2">
          {(['all', 'recent', 'favorites'] as const).map((filterOption) => (
            <button
              key={filterOption}
              onClick={() => setFilter(filterOption)}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                filter === filterOption
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {filterOption === 'all' ? '全部' : 
               filterOption === 'recent' ? '最近' : '收藏'}
            </button>
          ))}
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-hidden">
        {currentView === 'groups' ? (
          <div className="h-full overflow-y-auto p-4">
            {state.isLoading && state.tabGroups.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <Loading text="正在加载 Groups..." />
              </div>
            ) : filteredGroups.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="mb-6">
                  <Layers className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Groups Found</h3>
                  <p className="text-gray-500 max-w-sm">
                    {state.tabGroups.length === 0 
                      ? '还没有任何 Groups。开始浏览或创建一些标签页分组吧！'
                      : '没有找到匹配的 Groups。尝试调整筛选条件。'
                    }
                  </p>
                </div>
                
                <div className="space-y-3">
                  <Button onClick={handleAnalyzeCurrentTab} disabled={state.isLoading}>
                    分析当前标签页
                  </Button>
                  <Button variant="ghost" onClick={handleRefresh} disabled={isRefreshing}>
                    刷新数据
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredGroups.map((group) => (
                  <GroupCard
                    key={group.id}
                    group={group}
                    onViewGroup={handleViewGroup}
                  />
                ))}
              </div>
            )}
            
            {/* 调试信息 */}
            <DebugInfo debugInfo={debugInfo} />
          </div>
        ) : (
          <div className="h-full overflow-y-auto p-4">
            <TabsList
              tabs={tabs}
              onSwitchToTab={handleSwitchToTab}
              onCloseTab={handleCloseTab}
              onCreateGroup={handleCreateGroupFromTabs}
            />
          </div>
        )}
      </main>

      {/* Group Detail Modal */}
      {selectedGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold">{selectedGroup.name}</h2>
                  <p className="text-gray-500 text-sm">{selectedGroup.category} • {selectedGroup.tabs.length} tabs</p>
                </div>
                <div className="flex space-x-2">
                  <Button onClick={() => handleOpenAllTabs(selectedGroup)}>
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open All
                  </Button>
                  <Button variant="ghost" onClick={() => setSelectedGroup(null)}>
                    Close
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-96">
              <div className="space-y-3">
                {selectedGroup.tabs.map((tab: any, index: number) => (
                  <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <img 
                      src={tab.favIconUrl || '/icons/icon-16.png'} 
                      alt="" 
                      className="w-5 h-5"
                      onError={(e) => { e.currentTarget.src = '/icons/icon-16.png' }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{tab.title}</p>
                      <p className="text-xs text-gray-500 truncate">{tab.url}</p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => tab.url && chrome.tabs.create({ url: tab.url })}
                    >
                      <ExternalLink className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}