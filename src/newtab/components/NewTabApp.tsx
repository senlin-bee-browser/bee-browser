import { useState, useEffect, useMemo } from 'react'
import { Search, Home, Settings, Folder, RefreshCw, Zap, ChevronRight, Eye } from 'lucide-react'
import { useTabs, useTabGroups } from '@shared/hooks'
import TabCards from './TabCards'
import SearchBox from './SearchBox'
// import Analytics from './Analytics'
// import { default as  MindMap } from './Mindmap'
import { navigateToTab, closeTab, showNavigationResult } from '@utils/tab-navigation'

export default function NewTabApp() {
  const { tabs } = useTabs({ enableEnhancement: false })
  const { tabGroups, loading: groupsLoading, error: groupsError, refreshTabGroups } = useTabGroups()
  const [selectedGroupId, setSelectedGroupId] = useState<number | 'home'>('home')
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])
  
  const handleSearch = (query: string) => {
    if (query.trim()) {
      if (query.includes('.') && !query.includes(' ')) {
        const url = query.startsWith('http') ? query : `https://${query}`
        window.location.href = url
      } else {
        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`
        window.location.href = searchUrl
      }
    }
  }

  const handleGroupClick = (groupId: number) => {
    setSelectedGroupId(groupId)
  }

  const getGroupIcon = (color: string) => {
    const iconMap: Record<string, string> = {
      'blue': '💼',
      'green': '📚', 
      'orange': '🎨',
      'red': '📰',
      'purple': '🎮',
      'cyan': '🔧',
      'grey': '📁',
      'yellow': '⭐',
      'pink': '💖'
    }
    return iconMap[color] || '📁'
  }

  const selectedGroup = useMemo(() => {
    return selectedGroupId === 'home' ? null : tabGroups.find(group => group.id === selectedGroupId)
  }, [selectedGroupId, tabGroups])
  
  const displayTabs = selectedGroup ? selectedGroup.tabs : tabs.filter(tab => !tab.groupId || tab.groupId === -1)

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 flex">
      {/* 左侧导航栏 */}
      <div className="w-72 bg-white/80 backdrop-blur-sm border-r border-orange-200 flex flex-col">
        {/* 首页按钮 */}
        <div className="p-6">
          <button
            onClick={() => setSelectedGroupId('home')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl transition-all duration-200 border-2 ${
              selectedGroupId === 'home'
                ? 'bg-orange-400 border-orange-400 text-white shadow-lg'
                : 'border-orange-200 text-gray-700 hover:border-orange-300 hover:bg-orange-50'
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="font-medium">首页</span>
          </button>
        </div>

        {/* AI 智能分组标签 */}
        <div className="px-6 mb-4">
          <div className="text-sm font-medium text-gray-500 mb-3">AI 智能分组</div>
        </div>

        {/* 分组列表 */}
        <div className="flex-1 px-6 pb-4">
          <div className="space-y-1">
            {groupsLoading ? (
              <div className="text-center py-8 text-gray-500">
                <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin" />
                <p className="text-sm">加载中...</p>
              </div>
            ) : tabGroups.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Folder className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm text-gray-600">暂无标签组</p>
              </div>
            ) : (
              tabGroups.map((group) => (
                <button
                  key={group.id}
                  onClick={() => handleGroupClick(group.id)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 ${
                    selectedGroupId === group.id
                      ? 'bg-orange-100 border border-orange-200'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center text-white text-sm">
                      {getGroupIcon(group.color)}
                    </div>
                    <span className="font-medium text-gray-900 text-sm">
                      {group.title || '未命名分组'}
                    </span>
                  </div>
                  <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-lg">
                    {group.tabs?.length || 0}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* 创建新组员按钮 */}
        <div className="p-6 border-t border-gray-200">
          <button 
            onClick={refreshTabGroups}
            className="w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${groupsLoading ? 'animate-spin' : ''}`} />
            <span className="text-sm font-medium">刷新分组</span>
          </button>
        </div>
      </div>

      {/* 右侧主内容区域 */}
      <div className="main-content flex-1 flex flex-col" style={
        {
          overflow: 'scroll',
          height: '100vh'
        }
      }>
        {selectedGroupId === 'home' ? (
          /* 首页内容 */
          <div className="flex-1 overflow-y-auto">
            <div className="min-h-full flex flex-col items-center p-12" style={{ minHeight: 'calc(100vh - 2rem)' }}>
              <div className="flex-1 flex flex-col items-center justify-center w-full max-w-6xl">
              {/* 品牌区域 */}
              <div className="text-center mb-4">
                <div className="w-20 h-20 bg-gradient-to-br from-orange-400 to-yellow-500 rounded-3xl flex items-center justify-center mb-6 mx-auto shadow-lg">
                  {/* <Zap className="w-10 h-10 text-white" /> */}
                  <img src={chrome.runtime.getURL('icons/icon-128.png')} alt="logo" className="w-10 h-10" />
                </div>
                <h1 className="text-4xl font-bold text-gray-900 mb-3" style={{ fontFamily: 'fantasy' }}>Bee Browser</h1>
                {/* <p className="text-lg text-gray-600 mb-2">您的个人网页收藏中心</p> */}
                {/* <p className="text-gray-500">发现、收藏、管理您喜爱的网站</p> */}
              </div>

              {/* 搜索框 */}
              <div className="w-full max-w-2xl mb-8">
                <SearchBox 
                  onSearch={handleSearch}
                  placeholder="搜索网页或输入网址，一键直达..."
                />
              </div>

              {/* 搜索建议 */}
              {/* <div className="text-sm text-gray-500 mb-12">
                💡 试试搜索 "Github"、"设计" 或直接输入网址
              </div> */}

              {/* 分类概览 */}
              <div className="w-full">
                {/* <div className="flex items-center space-x-2 mb-6">
                  <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                    <span className="text-white text-sm">⭐</span>
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">分类概览</h2>
                  <span className="text-gray-500">{tabGroups.length} 个分类</span>
                </div> */}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {tabGroups.slice(0, 6).map((group) => (
                    <div
                      key={group.id}
                      className="bg-white/70 backdrop-blur-sm rounded-2xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-200 cursor-pointer"
                      onClick={() => handleGroupClick(group.id)}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{ backgroundColor: "fb923c" }}>
                            {getGroupIcon(group.color)}
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              {group.title || '未命名分组'}
                            </h3>
                            <p className="text-sm text-gray-500">
                              {group.tabs?.length || 0} 个网页
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      </div>

                      <div className="space-y-2">
                        {group.tabs?.slice(0, 3).map((tab, index) => (
                          <div 
                            key={index} 
                            className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                            onClick={async (e) => {
                              e.stopPropagation() // 防止触发父级的分组点击
                              console.log('🔄 首页标签页点击，跳转到:', tab.title)
                              const result = await navigateToTab(tab)
                              showNavigationResult(result, `已从首页跳转到「${tab.title}」`)
                            }}
                          >
                            <div className="w-4 h-4 rounded-sm bg-gray-200 flex items-center justify-center overflow-hidden">
                              {tab.favIconUrl ? (
                                <img src={tab.favIconUrl} alt="" className="w-full h-full" />
                              ) : (
                                <div className="w-2 h-2 bg-gray-400 rounded-sm"></div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {tab.title}
                              </p>
                              <p className="text-xs text-gray-500 truncate">
                                {tab.url ? new URL(tab.url).hostname : ''}
                              </p>
                            </div>
                            <div className="flex items-center space-x-1 text-gray-400">
                              <Eye className="w-3 h-3" />
                              <span className="text-xs">156</span>
                            </div>
                          </div>
                        ))}
                        {(group.tabs?.length || 0) > 3 && (
                          <div className="text-center py-2">
                            <span className="text-sm text-gray-500">
                              还有 {(group.tabs?.length || 0) - 3} 个网页...
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        ) : (
          /* 分组详情页 */
          <div className="flex-1 flex flex-col p-6">
            {/* 分组详情头部 */}
            {/* <div className="mb-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-yellow-500 rounded-xl flex items-center justify-center text-white text-lg">
                  {selectedGroup ? getGroupIcon(selectedGroup.color) : '📁'}
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {selectedGroup?.title || '分组详情'}
                  </h1>
                  <p className="text-gray-600">
                    {displayTabs.length} 个标签页
                  </p>
                </div>
              </div>
            </div> */}

            {/* 标签页列表 */}
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-gray-200 shadow-sm flex-1 overflow-hidden">
              {displayTabs.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-lg">该分组暂无标签页</p>
                    <p className="text-sm mt-1">该分组可能已被折叠或为空</p>
                  </div>
                </div>
              ) : (
                <div className="h-full overflow-y-auto p-6">
                  {/* <MindMap group={selectedGroup} /> */}
                  
                  <TabCards 
                    group={selectedGroup}
                    tabs={displayTabs}
                    // tabs={tabs}
                    searchQuery=""
                    onTabClick={async (tab: chrome.tabs.Tab) => {
                      console.log('🔄 尝试跳转到标签页:', tab.title)
                      const result = await navigateToTab(tab)
                      showNavigationResult(result, `已跳转到「${tab.title}」`)
                      
                      // 如果跳转成功，可以在这里添加额外的处理逻辑
                      if (result.success) {
                        // 可以记录访问历史、更新统计等
                      }
                    }}
                    onTabClose={async (tabId: number) => {
                      console.log('🔄 尝试关闭标签页 ID:', tabId)
                      const result = await closeTab(tabId)
                      showNavigationResult(result, '标签页已关闭')
                      
                      // 如果关闭成功，刷新标签组列表
                      if (result.success) {
                        refreshTabGroups()
                      }
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 