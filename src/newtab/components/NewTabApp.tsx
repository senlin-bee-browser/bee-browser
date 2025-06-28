import { useState, useEffect } from 'react'
import { Search, Clock, Settings, Plus, Grid3X3, BarChart3 } from 'lucide-react'
import { useApp, TabGroup } from '@shared/contexts/AppContext'
import { useTabs } from '@shared/hooks/useTabs'
import GroupsList from './GroupsList'
import BrowsingTopology from './BrowsingTopology'
import TabCards from './TabCards'
import SearchBox from './SearchBox'

export default function NewTabApp() {
  const { state } = useApp()
  const { tabs } = useTabs({ enableEnhancement: false })
  const [searchQuery, setSearchQuery] = useState('')
  const [currentTime, setCurrentTime] = useState(new Date())
  const [activeView, setActiveView] = useState<'topology' | 'cards'>('topology')

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('zh-CN', {
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    })
  }

  const getGreeting = () => {
    const hour = currentTime.getHours()
    if (hour < 6) return '夜深了'
    if (hour < 12) return '早上好'
    if (hour < 18) return '下午好'
    return '晚上好'
  }

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 顶部栏 */}
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-yellow-500 rounded-full flex items-center justify-center">
              <span className="text-white font-semibold text-sm">🐝</span>
            </div>
            <h1 className="text-xl font-semibold text-gray-900">蜜蜂书签</h1>
          </div>
          
          <div className="flex items-center space-x-3">
            <button className="w-8 h-8 rounded-full bg-white/70 backdrop-blur-sm border border-gray-200 flex items-center justify-center hover:bg-white/90 transition-all duration-200">
              <Settings className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </header>

        {/* 欢迎区域 */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center space-x-6 mb-6">
            <div className="text-right">
              <div className="text-4xl font-light text-gray-900 mb-1">{formatTime(currentTime)}</div>
              <div className="text-lg text-gray-600">{formatDate(currentTime)}</div>
            </div>
            <div className="w-px h-16 bg-gray-300"></div>
            <div className="text-left">
              <div className="text-2xl font-medium text-gray-900">{getGreeting()}</div>
              <div className="text-lg text-gray-600">开始新的浏览之旅</div>
            </div>
          </div>

          {/* 搜索框 */}
          <div className="max-w-2xl mx-auto">
            <SearchBox 
              onSearch={handleSearch}
              placeholder="搜索网页或输入网址..."
            />
          </div>
        </div>

        {/* 主要内容区域 */}
        <div className="grid grid-cols-12 gap-6">
          {/* 左侧：分组列表 */}
          <div className="col-span-3">
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">标签组</h2>
                <button className="w-6 h-6 rounded-md bg-blue-500 text-white flex items-center justify-center hover:bg-blue-600 transition-colors">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
                             <GroupsList 
                 groups={[]}
                 onGroupClick={(group: any) => {
                   console.log('点击分组:', group)
                 }}
               />
            </div>
          </div>

          {/* 右侧：主视图 */}
          <div className="col-span-9">
            {/* 视图切换 */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-1 bg-white/70 backdrop-blur-sm rounded-lg p-1 border border-gray-200">
                <button
                  onClick={() => setActiveView('topology')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    activeView === 'topology' 
                      ? 'bg-blue-500 text-white shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                  <span>拓扑视图</span>
                </button>
                <button
                  onClick={() => setActiveView('cards')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    activeView === 'cards' 
                      ? 'bg-blue-500 text-white shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Grid3X3 className="w-4 h-4" />
                  <span>卡片视图</span>
                </button>
              </div>

              <div className="text-sm text-gray-700">
                {tabs.length} 个活跃标签页
              </div>
            </div>

            {/* 内容视图 */}
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-gray-200 shadow-sm overflow-hidden" style={{ height: '500px' }}>
              {activeView === 'topology' ? (
                <BrowsingTopology 
                  tabs={tabs}
                  onNodeClick={(tab: chrome.tabs.Tab) => {
                    if (tab.id) {
                      chrome.tabs.update(tab.id, { active: true })
                    }
                  }}
                />
              ) : (
                <div className="h-full overflow-y-auto p-6">
                  <TabCards 
                    tabs={tabs}
                    searchQuery={searchQuery}
                    onTabClick={(tab: chrome.tabs.Tab) => {
                      if (tab.id) {
                        chrome.tabs.update(tab.id, { active: true })
                      }
                    }}
                    onTabClose={(tabId: number) => {
                      chrome.tabs.remove(tabId)
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 底部快捷操作 */}
        <footer className="mt-8 text-center">
          <div className="inline-flex items-center space-x-2 bg-white/70 backdrop-blur-sm rounded-xl border border-gray-200 p-2">
            <button className="flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              <Plus className="w-4 h-4" />
              <span>新建书签</span>
            </button>
            <div className="w-px h-4 bg-gray-300"></div>
            <button className="flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              <Clock className="w-4 h-4" />
              <span>历史记录</span>
            </button>
            <div className="w-px h-4 bg-gray-300"></div>
            <button className="flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              <BarChart3 className="w-4 h-4" />
              <span>浏览统计</span>
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
} 