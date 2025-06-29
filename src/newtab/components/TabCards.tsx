import { useState, useMemo } from 'react'
import { X, Search, ExternalLink, Volume2, VolumeX, Pin, ChevronLeft, ChevronRight, MessageSquare } from 'lucide-react'
import AIChatBox from './AIChatBox'
import { default as  MindMap } from './Mindmap'
interface TabGroupWithTabs extends chrome.tabGroups.TabGroup {
  tabs: chrome.tabs.Tab[]
}
interface TabCardsProps {
  tabs: chrome.tabs.Tab[]
  searchQuery?: string
  onTabClick: (tab: chrome.tabs.Tab) => void
  onTabClose: (tabId: number) => void
  group: TabGroupWithTabs | null | undefined
}
import "./TabCards.css"

export default function TabCards({ tabs, searchQuery = '', onTabClick, onTabClose, group }: TabCardsProps) {
  const [filter, setFilter] = useState<'all' | 'active' | 'audible' | 'pinned'>('all')
  const [aiPanelCollapsed, setAiPanelCollapsed] = useState(false)

  const filteredTabs = useMemo(() => {
    let filtered = tabs

    // 应用搜索过滤
    if (searchQuery.trim()) {
      filtered = filtered.filter(tab => 
        tab.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tab.url?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // 应用状态过滤
    switch (filter) {
      case 'active':
        filtered = filtered.filter(tab => tab.active)
        break
      case 'audible':
        filtered = filtered.filter(tab => tab.audible)
        break
      case 'pinned':
        filtered = filtered.filter(tab => tab.pinned)
        break
    }

    return filtered
  }, [tabs, searchQuery, filter])

  const getDomainFromUrl = (url: string) => {
    try {
      return new URL(url).hostname
    } catch {
      return url
    }
  }

  const formatUrl = (url: string) => {
    try {
      const urlObj = new URL(url)
      const formatted = urlObj.hostname + urlObj.pathname
      return formatted.length > 30 ? formatted.substring(0, 30) + '...' : formatted
    } catch {
      const fallback = url
      return fallback.length > 30 ? fallback.substring(0, 30) + '...' : fallback
    }
  }

  const handleTabsAnalyzed = () => {
    // 当 AI 分析完成后，可以在这里处理刷新标签页列表等逻辑
    console.log('标签页分析完成，刷新列表')
  }

  const toggleAiPanel = () => {
    setAiPanelCollapsed(prev => !prev)
  }

  return (
    <div className="h-full flex">
      {/* 左侧标签页列表 */}
      <div className="flex-1 flex flex-col mr-4">
        <MindMap group={group} />
        
        {/* 标题和过滤器 */}
        <div className="flex items-center justify-between mb-4 mt-4">
          <h3 className="text-lg font-semibold text-black">
            标签页列表 ({filteredTabs.length})
          </h3>
          
          {/* <div className="flex items-center space-x-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                filter === 'all' 
                  ? 'bg-white text-gray-900' 
                  : 'text-black hover:bg-white hover:bg-opacity-20'
              }`}
            >
              全部
            </button>
            <button
              onClick={() => setFilter('active')}
              className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                filter === 'active' 
                  ? 'bg-white text-gray-900' 
                  : 'text-black hover:bg-white hover:bg-opacity-20'
              }`}
            >
              活跃
            </button>
            <button
              onClick={() => setFilter('audible')}
              className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                filter === 'audible' 
                  ? 'bg-white text-gray-900' 
                  : 'text-black hover:bg-white hover:bg-opacity-20'
              }`}
            >
              音频
            </button>
            <button
              onClick={() => setFilter('pinned')}
              className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                filter === 'pinned' 
                  ? 'bg-white text-gray-900' 
                  : 'text-black hover:bg-white hover:bg-opacity-20'
              }`}
            >
              已固定
            </button>
          </div> */}
        </div>

        {/* 标签页列表 */}
        <div className="flex-1 overflow-y-auto space-y-2">
          {filteredTabs.length === 0 ? (
            <div className="text-center py-8 text-black text-opacity-50">
              <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>没有找到匹配的标签页</p>
            </div>
          ) : (
            filteredTabs.map((tab) => (
              <div
                key={tab.id}
                className={`group relative p-3 rounded-lg bg-white bg-opacity-5 hover:bg-opacity-20 transition-all duration-200 border border-white border-opacity-10 hover:border-opacity-30 cursor-pointer ${
                  tab.active ? 'ring-2 ring-white ring-opacity-50' : ''
                }`}
                onClick={() => onTabClick(tab)}
              >
                <div className="flex items-start space-x-3">
                                   {/* 网站图标 */}
                   <div className="flex-shrink-0 w-8 h-8 rounded bg-white bg-opacity-20 flex items-center justify-center">
                     {tab.favIconUrl ? (
                       <img 
                         src={tab.favIconUrl} 
                         alt="" 
                         className="w-5 h-5 rounded"
                         onError={(e) => {
                           const target = e.target as HTMLImageElement;
                           target.style.display = 'none';
                         }}
                       />
                     ) : (
                       <ExternalLink className="w-4 h-4 text-black" />
                     )}
                   </div>

                  {/* 标签页信息 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <h4 className="font-medium text-black truncate group-hover:text-black">
                          {tab.title || '无标题'}
                        </h4>
                        
                        <p className="text-sm text-black text-opacity-60 truncate mt-1">
                          {formatUrl(tab.url || '')}
                        </p>
                        
                        <div className="flex items-center space-x-3 mt-2">
                          <span className="text-xs text-black text-opacity-50">
                            {getDomainFromUrl(tab.url || '')}
                          </span>
                          
                                                   {/* 状态指示器 */}
                           <div className="flex items-center space-x-1">
                             {tab.active && (
                               <span className="w-2 h-2 bg-green-400 rounded-full" title="活跃标签页"></span>
                             )}
                             {tab.pinned && (
                               <span title="已固定">
                                 <Pin className="w-3 h-3 text-yellow-400" />
                               </span>
                             )}
                             {tab.audible && (
                               <span title="正在播放音频">
                                 <Volume2 className="w-3 h-3 text-blue-400" />
                               </span>
                             )}
                             {tab.mutedInfo?.muted && (
                               <span title="已静音">
                                 <VolumeX className="w-3 h-3 text-red-400" />
                               </span>
                             )}
                           </div>
                        </div>
                      </div>

                      {/* 关闭按钮 */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          if (tab.id) {
                            onTabClose(tab.id)
                          }
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500 hover:bg-opacity-20 transition-all duration-200"
                        title="关闭标签页"
                      >
                        <X className="w-4 h-4 text-black hover:text-red-400" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 右侧 AI 对话面板 */}
      <div className={`ai-chat-panel transition-all duration-300 ${
        aiPanelCollapsed ? 'w-12 collapsed' : 'flex-1 w-180 min-w-0 uncollapsed'
      }`}>
        {aiPanelCollapsed ? (
          // 折叠状态：显示垂直窄条
          <div className="h-full bg-white bg-opacity-10 backdrop-blur-sm border border-white border-opacity-20 rounded-lg flex flex-col items-center justify-center space-y-4">
            <button
              onClick={toggleAiPanel}
              className="p-2 rounded-lg bg-white bg-opacity-20 hover:bg-opacity-30 transition-colors"
              title="展开 AI 助手"
            >
              <ChevronLeft className="w-5 h-5 text-black" />
            </button>
            
            <div className="flex flex-col items-center space-y-2">
              <MessageSquare className="w-5 h-5 text-black opacity-60" />
              <div className="text-xs text-black opacity-60 transform -rotate-90 whitespace-nowrap">
                AI 助手
              </div>
            </div>
          </div>
        ) : (
          // 展开状态：显示完整面板
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-2 px-2">
              <div className="flex items-center space-x-2">
                <MessageSquare className="w-4 h-4 text-black opacity-60" />
                <span className="text-sm font-medium text-black opacity-80">AI 助手</span>
              </div>
              <button
                onClick={toggleAiPanel}
                className="p-1 rounded hover:bg-white hover:bg-opacity-20 transition-colors"
                title="收起 AI 助手"
              >
                <ChevronRight className="w-4 h-4 text-black opacity-60" />
              </button>
            </div>
            <div className="flex-1">
              <AIChatBox
                currentTabs={tabs}
                onAnalyzeTabs={handleTabsAnalyzed}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 