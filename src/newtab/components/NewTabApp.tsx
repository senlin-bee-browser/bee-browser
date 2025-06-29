import { useState, useEffect, useMemo } from 'react'
import { Home, Folder, RefreshCw } from 'lucide-react'
import { useTabs, useTabGroups } from '@shared/hooks'
import Homepage from './Homepage'
import GroupDetail from './GroupDetail'

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
          <Homepage 
            tabGroups={tabGroups}
            onSearch={handleSearch}
            onGroupClick={handleGroupClick}
            getGroupIcon={getGroupIcon}
            refreshTabGroups={refreshTabGroups}
          />
        ) : (
          <GroupDetail 
            selectedGroup={selectedGroup}
            displayTabs={displayTabs}
            refreshTabGroups={refreshTabGroups}
          />
        )}
      </div>
    </div>
  )
} 