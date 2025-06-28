import { useState } from 'react'
import { Search, RefreshCw, Settings, ExternalLink, MoreVertical } from 'lucide-react'
import { Button, Loading } from '@shared/components'
import { useApp } from '@shared/contexts/AppContext'
import { useTabs } from '@shared/hooks/useTabs'

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
              src={tab.favIconUrl || '/icon-16.png'} 
              alt="" 
              className="w-4 h-4"
              onError={(e) => { e.currentTarget.src = '/icon-16.png' }}
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

export default function SidepanelApp() {
  const { state, dispatch } = useApp()
  const { tabs } = useTabs()
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'recent' | 'favorites'>('all')
  const [selectedGroup, setSelectedGroup] = useState<any>(null)

  const handleViewGroup = (group: any) => {
    setSelectedGroup(group)
  }

  const handleOpenAllTabs = async (group: any) => {
    try {
      for (const tab of group.tabs) {
        if (tab.url) {
          await chrome.tabs.create({ url: tab.url, active: false })
        }
      }
    } catch (error) {
      console.error('Failed to open tabs:', error)
    }
  }

  const handleAnalyzeCurrentTab = async () => {
    dispatch({ type: 'SET_LOADING', payload: true })
    try {
      const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true })
      // TODO: Implement analysis
      console.log('Analyzing tab:', currentTab)
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to analyze current tab' })
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
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

  if (state.isLoading) {
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
            <Button variant="ghost" size="sm" onClick={() => window.location.reload()}>
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => chrome.runtime.openOptionsPage()}>
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>

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

        {/* Filters */}
        <div className="flex space-x-2">
          {(['all', 'recent', 'favorites'] as const).map((filterType) => (
            <button
              key={filterType}
              onClick={() => setFilter(filterType)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                filter === filterType
                  ? 'bg-primary-100 text-primary-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
            </button>
          ))}
        </div>
      </header>

      {/* Stats */}
      <div className="bg-white border-b p-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-xl font-bold text-primary-600">{state.tabGroups.length}</div>
            <div className="text-xs text-gray-500">Groups</div>
          </div>
          <div>
            <div className="text-xl font-bold text-primary-600">{tabs.length}</div>
            <div className="text-xs text-gray-500">Tabs</div>
          </div>
          <div>
            <div className="text-xl font-bold text-primary-600">
              {new Set(state.tabGroups.map(g => g.category)).size}
            </div>
            <div className="text-xs text-gray-500">Categories</div>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-medium text-gray-900">Tab Groups</h2>
            <Button
              size="sm"
              onClick={handleAnalyzeCurrentTab}
              loading={state.isLoading}
            >
              Analyze Current
            </Button>
          </div>

          {filteredGroups.length > 0 ? (
            <div className="space-y-3">
              {filteredGroups.map((group) => (
                <GroupCard
                  key={group.id}
                  group={group}
                  onViewGroup={handleViewGroup}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-gray-400 mb-2">🔍</div>
              <div className="text-sm text-gray-500">
                {searchQuery ? 'No groups match your search' : 'No tab groups yet'}
              </div>
              {!searchQuery && (
                <div className="text-xs text-gray-400 mt-1">
                  Start by analyzing your current tab
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Group Detail Modal */}
      {selectedGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold">{selectedGroup.name}</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedGroup(null)}
              >
                ×
              </Button>
            </div>
            
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="bg-gray-100 px-2 py-1 rounded">{selectedGroup.category}</span>
                <span className="text-gray-500">
                  {new Date(selectedGroup.createdAt).toLocaleDateString()}
                </span>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Tabs ({selectedGroup.tabs.length})</h4>
                <div className="space-y-2">
                  {selectedGroup.tabs.map((tab: chrome.tabs.Tab, index: number) => (
                    <div key={index} className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                      <img 
                        src={tab.favIconUrl || '/icon-16.png'} 
                        alt="" 
                        className="w-4 h-4"
                        onError={(e) => { e.currentTarget.src = '/icon-16.png' }}
                      />
                      <span className="text-sm truncate flex-1">{tab.title}</span>
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
            
            <div className="p-4 border-t flex space-x-2">
              <Button
                onClick={() => handleOpenAllTabs(selectedGroup)}
                className="flex-1"
              >
                Open All Tabs
              </Button>
              <Button
                variant="outline"
                onClick={() => setSelectedGroup(null)}
                className="flex-1"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {state.error && (
        <div className="bg-red-50 border-t border-red-200 p-3">
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