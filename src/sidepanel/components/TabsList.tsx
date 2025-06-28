import { useState } from 'react'
import { ExternalLink, X, Star, Clock, Globe, ChevronRight, FileText, Copy } from 'lucide-react'
import { Button } from '@shared/components'

// 扩展的标签页类型
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

interface TabsListProps {
  tabs: EnhancedTab[]
  onSwitchToTab: (tabId: number) => void
  onCloseTab: (tabId: number) => void
  onCreateGroup?: (tabIds: number[]) => void
}

interface TabItemProps {
  tab: EnhancedTab
  isSelected: boolean
  onSelect: (tabId: number, isSelected: boolean) => void
  onSwitchTo: (tabId: number) => void
  onClose: (tabId: number) => void
}

function TabItem({ tab, isSelected, onSelect, onSwitchTo, onClose }: TabItemProps) {
  const handleClick = () => {
    onSwitchTo(tab.id!)
  }

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation()
    onClose(tab.id!)
  }

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation()
    onSelect(tab.id!, e.target.checked)
  }

  const getDomain = (url?: string) => {
    if (!url) return 'Unknown'
    try {
      return new URL(url).hostname
    } catch {
      return 'Unknown'
    }
  }

  const formatLastAccessed = (tab: EnhancedTab) => {
    // Chrome tabs API 中没有直接的 lastAccessed，这里显示当前状态
    if (tab.active) return 'Active now'
    if (tab.audible) return 'Playing audio'
    if (tab.discarded) return 'Suspended'
    return 'Background'
  }

  // 获取页面描述
  const getPageDescription = (tab: EnhancedTab): string => {
    if (tab.description) {
      return tab.description
    }
    if (tab.pageAnalysis?.metaDescription) {
      return tab.pageAnalysis.metaDescription
    }
    if (tab.pageAnalysis?.summary) {
      return tab.pageAnalysis.summary
    }
    return ''
  }

  const description = getPageDescription(tab)

  return (
    <div 
      className={`group bg-white border rounded-lg p-3 hover:shadow-md transition-all cursor-pointer ${
        isSelected ? 'border-blue-500 bg-blue-50' : 'hover:border-gray-300'
      } ${tab.active ? 'ring-2 ring-blue-200' : ''}`}
      onClick={handleClick}
    >
      <div className="flex items-start space-x-3">
        {/* 选择框 */}
        <input
          type="checkbox"
          checked={isSelected}
          onChange={handleSelect}
          className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          onClick={(e) => e.stopPropagation()}
        />

        {/* 网站图标 */}
        <div className="flex-shrink-0">
          <img 
            src={tab.favIconUrl } 
            alt="" 
            className="w-5 h-5 rounded"
            onError={(e) => { e.currentTarget.src = '/icon-16.png' }}
          />
        </div>

        {/* 标签页信息 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-gray-900 truncate" title={tab.title}>
                {tab.title || 'Untitled'}
              </h3>
              <div className="flex items-center space-x-2 mt-1">
                <Globe className="w-3 h-3 text-gray-400" />
                <span className="text-xs text-gray-500 truncate">
                  {tab.domain || getDomain(tab.url)}
                </span>
              </div>
              
              {/* 页面描述 */}
              {description && (
                <div className="flex items-start space-x-1 mt-2">
                  <FileText className="w-3 h-3 text-gray-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                    {description}
                  </p>
                </div>
              )}
            </div>

            {/* 操作按钮 */}
            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="h-6 w-6 p-0 hover:bg-red-100 hover:text-red-600"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>

          {/* 状态信息 */}
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center space-x-2">
              {tab.active && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-800">
                  <div className="w-1.5 h-1.5 bg-green-400 rounded-full mr-1"></div>
                  Active
                </span>
              )}
              {tab.audible && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800">
                  🔊 Audio
                </span>
              )}
              {tab.discarded && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">
                  💤 Suspended
                </span>
              )}
              {tab.pinned && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-yellow-100 text-yellow-800">
                  📌 Pinned
                </span>
              )}
            </div>
            
            <div className="flex items-center space-x-1 text-xs text-gray-400">
              <Clock className="w-3 h-3" />
              <span>{formatLastAccessed(tab)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function TabsList({ tabs, onSwitchToTab, onCloseTab, onCreateGroup }: TabsListProps) {
  const [selectedTabs, setSelectedTabs] = useState<Set<number>>(new Set())
  const [sortBy, setSortBy] = useState<'title' | 'domain' | 'recent'>('recent')
  const [filterBy, setFilterBy] = useState<'all' | 'active' | 'audible' | 'pinned' | 'with-description'>('all')

  const handleSelectTab = (tabId: number, isSelected: boolean) => {
    const newSelected = new Set(selectedTabs)
    if (isSelected) {
      newSelected.add(tabId)
    } else {
      newSelected.delete(tabId)
    }
    setSelectedTabs(newSelected)
  }

  const handleSelectAll = () => {
    if (selectedTabs.size === filteredTabs.length) {
      setSelectedTabs(new Set())
    } else {
      setSelectedTabs(new Set(filteredTabs.map(tab => tab.id!)))
    }
  }

  const handleCreateGroupFromSelected = () => {
    if (selectedTabs.size > 0 && onCreateGroup) {
      onCreateGroup(Array.from(selectedTabs))
      setSelectedTabs(new Set())
    }
  }

  const handleCloseSelected = async () => {
    for (const tabId of selectedTabs) {
      await onCloseTab(tabId)
    }
    setSelectedTabs(new Set())
  }

  const handleCopyJSON = async () => {
    try {
      const tabsData = filteredTabs.map(tab => ({
        id: tab.id,
        title: tab.title,
        url: tab.url,
        favIconUrl: tab.favIconUrl,
        active: tab.active,
        pinned: tab.pinned,
        audible: tab.audible,
        discarded: tab.discarded,
        domain: tab.domain || (tab.url ? new URL(tab.url).hostname : ''),
        description: tab.description,
        pageAnalysis: tab.pageAnalysis
      }))
      
      const jsonString = JSON.stringify(tabsData, null, 2)
      await navigator.clipboard.writeText(jsonString)
      
      // 可以添加一个简单的提示（可选）
      console.log('标签页数据已复制到剪贴板')
    } catch (error) {
      console.error('复制失败:', error)
    }
  }

  // 过滤标签页
  const filteredTabs = tabs.filter(tab => {
    switch (filterBy) {
      case 'active':
        return tab.active
      case 'audible':
        return tab.audible
      case 'pinned':
        return tab.pinned
      case 'with-description':
        return !!(tab.description || tab.pageAnalysis?.metaDescription)
      default:
        return true
    }
  })

  // 排序标签页
  const sortedTabs = [...filteredTabs].sort((a, b) => {
    switch (sortBy) {
      case 'title':
        return (a.title || '').localeCompare(b.title || '')
      case 'domain':
        const getDomain = (url?: string) => {
          try {
            return url ? new URL(url).hostname : ''
          } catch {
            return ''
          }
        }
        return getDomain(a.url).localeCompare(getDomain(b.url))
      case 'recent':
      default:
        // 活跃标签优先，然后按ID排序（近似时间顺序）
        if (a.active && !b.active) return -1
        if (!a.active && b.active) return 1
        return (b.id || 0) - (a.id || 0)
    }
  })

  const groupedTabs = sortedTabs.reduce((groups, tab) => {
    const domain = tab.domain || (tab.url ? new URL(tab.url).hostname : 'Other')
    if (!groups[domain]) {
      groups[domain] = []
    }
    groups[domain].push(tab)
    return groups
  }, {} as Record<string, EnhancedTab[]>)

  return (
    <div className="space-y-4">
      {/* 工具栏 */}
      <div className="bg-white rounded-lg border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h2 className="text-lg font-semibold text-gray-900">
              所有标签页 ({tabs.length})
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyJSON}
              className="text-gray-500 hover:text-gray-700"
              title="复制标签页JSON数据"
            >
              <Copy className="w-4 h-4" />
            </Button>
          </div>
          {selectedTabs.size > 0 && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">
                已选择 {selectedTabs.size} 个
              </span>
              {onCreateGroup && (
                <Button
                  size="sm"
                  onClick={handleCreateGroupFromSelected}
                  disabled={selectedTabs.size < 2}
                >
                  创建分组
                </Button>
              )}
              <Button
                size="sm"
                variant="destructive"
                onClick={handleCloseSelected}
              >
                关闭选中
              </Button>
            </div>
          )}
        </div>

        {/* 筛选和排序 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={handleSelectAll}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {selectedTabs.size === filteredTabs.length ? '取消全选' : '全选'}
            </button>
          </div>

          <div className="flex items-center space-x-4">
            {/* 筛选 */}
            <select 
              value={filterBy} 
              onChange={(e) => setFilterBy(e.target.value as any)}
              className="text-sm border border-gray-300 rounded px-2 py-1"
            >
              <option value="all">所有标签页</option>
              <option value="active">活跃标签页</option>
              <option value="audible">播放音频</option>
              <option value="pinned">已固定</option>
              <option value="with-description">有简介信息</option>
            </select>

            {/* 排序 */}
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-sm border border-gray-300 rounded px-2 py-1"
            >
              <option value="recent">最近使用</option>
              <option value="title">按标题</option>
              <option value="domain">按网站</option>
            </select>
          </div>
        </div>
      </div>

      {/* 标签页列表 */}
      {sortBy === 'domain' ? (
        // 按域名分组显示
        <div className="space-y-4">
          {Object.entries(groupedTabs).map(([domain, domainTabs]) => (
            <div key={domain} className="space-y-2">
              <div className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                <Globe className="w-4 h-4" />
                <span>{domain}</span>
                <span className="text-gray-500">({domainTabs.length})</span>
              </div>
              <div className="space-y-2 ml-6">
                {domainTabs.map((tab) => (
                  <TabItem
                    key={tab.id}
                    tab={tab}
                    isSelected={selectedTabs.has(tab.id!)}
                    onSelect={handleSelectTab}
                    onSwitchTo={onSwitchToTab}
                    onClose={onCloseTab}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        // 普通列表显示
        <div className="space-y-2">
          {sortedTabs.map((tab) => (
            <TabItem
              key={tab.id}
              tab={tab}
              isSelected={selectedTabs.has(tab.id!)}
              onSelect={handleSelectTab}
              onSwitchTo={onSwitchToTab}
              onClose={onCloseTab}
            />
          ))}
        </div>
      )}

      {filteredTabs.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Globe className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>没有找到标签页</p>
        </div>
      )}
    </div>
  )
} 