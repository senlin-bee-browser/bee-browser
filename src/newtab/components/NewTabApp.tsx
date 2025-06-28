import { useState, useEffect } from 'react'
import { Search, Clock, TrendingUp, Bookmark, Settings, Plus } from 'lucide-react'
import { useApp } from '@shared/contexts/AppContext'
import { useTabs } from '@shared/hooks/useTabs'
import { TabGroup } from '@/types/app-types'
import GroupsList from './GroupsList'
import BrowsingTopology from './BrowsingTopology'
import TabCards from './TabCards'
import SearchBox from './SearchBox'

export default function NewTabApp() {
  const { state } = useApp()
  const { tabs } = useTabs()
  const [searchQuery, setSearchQuery] = useState('')
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    })
  }

  const getGreeting = () => {
    const hour = currentTime.getHours()
    if (hour < 6) return '深夜好'
    if (hour < 12) return '早上好'
    if (hour < 18) return '下午好'
    return '晚上好'
  }

  const handleSearch = (query: string) => {
    if (query.trim()) {
      // 检查是否是URL
      if (query.includes('.') && !query.includes(' ')) {
        const url = query.startsWith('http') ? query : `https://${query}`
        window.location.href = url
      } else {
        // 使用默认搜索引擎
        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`
        window.location.href = searchUrl
      }
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500">
      {/* 背景装饰 */}
      <div className="absolute inset-0 bg-black bg-opacity-20"></div>
      
      {/* 主要内容 */}
      <div className="relative z-10 flex flex-col h-screen">
        {/* 顶部栏 */}
        <header className="flex items-center justify-between p-6 text-white">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">🐝</span>
              <h1 className="text-xl font-bold">蜜蜂书签</h1>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <button className="p-2 rounded-lg hover:bg-white hover:bg-opacity-20 transition-colors">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* 时间和问候语 */}
        <div className="text-center text-white mb-8">
          <div className="text-6xl font-light mb-2">{formatTime(currentTime)}</div>
          <div className="text-xl opacity-90 mb-1">{formatDate(currentTime)}</div>
          <div className="text-lg opacity-75">{getGreeting()}，今天要浏览什么呢？</div>
        </div>

        {/* 搜索框 */}
        <div className="flex justify-center mb-8">
          <SearchBox 
            onSearch={handleSearch}
            placeholder="搜索网页或输入网址..."
          />
        </div>

        {/* 主要内容区域 - 两栏布局 */}
        <div className="flex-1 flex space-x-6 px-6 pb-6 min-h-0">
          {/* 左侧：分组列表 */}
          <div className="w-80 flex-shrink-0">
            <GroupsList 
              groups={state.tabGroups}
                             onGroupClick={(group: TabGroup) => {
                 // TODO: 处理分组点击
                 console.log('点击分组:', group)
               }}
            />
          </div>

          {/* 右侧：拓扑图和标签页卡片 */}
          <div className="flex-1 flex flex-col space-y-6 min-w-0">
            {/* 浏览路径拓扑图 */}
            <div className="h-80 bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-6">
                           <BrowsingTopology 
               tabs={tabs}
               onNodeClick={(tab: chrome.tabs.Tab) => {
                 if (tab.id) {
                   chrome.tabs.update(tab.id, { active: true })
                 }
               }}
             />
            </div>

            {/* 标签页卡片列表 */}
            <div className="flex-1 bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-6 min-h-0">
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
          </div>
        </div>

        {/* 底部快捷操作 */}
        <footer className="p-6 text-center text-white text-opacity-75">
          <div className="flex justify-center space-x-6">
            <button className="flex items-center space-x-2 px-4 py-2 rounded-lg hover:bg-white hover:bg-opacity-20 transition-colors">
              <Plus className="w-4 h-4" />
              <span>添加书签</span>
            </button>
            <button className="flex items-center space-x-2 px-4 py-2 rounded-lg hover:bg-white hover:bg-opacity-20 transition-colors">
              <Clock className="w-4 h-4" />
              <span>历史记录</span>
            </button>
            <button className="flex items-center space-x-2 px-4 py-2 rounded-lg hover:bg-white hover:bg-opacity-20 transition-colors">
              <TrendingUp className="w-4 h-4" />
              <span>统计信息</span>
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
} 