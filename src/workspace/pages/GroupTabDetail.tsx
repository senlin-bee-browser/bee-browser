import { useState } from 'react'
import { ExternalLink, X, Star, StarOff, Globe, Clock, MoreVertical, Search } from 'lucide-react'
import { Button } from '@shared/components'
import type { TabGroup } from '@shared/contexts/AppContext'

interface GroupTabDetailProps {
  group: TabGroup
}

interface TabItemProps {
  tab: chrome.tabs.Tab
  onOpenTab: (url: string) => void
  onCloseTab: (tabId: number) => void
  onSwitchToTab: (tabId: number) => void
}

function TabItem({ tab, onOpenTab, onCloseTab, onSwitchToTab }: TabItemProps) {
  const [showActions, setShowActions] = useState(false)
  const [isFavorite, setIsFavorite] = useState(false)

  const handleOpenTab = () => {
    if (tab.url) {
      onOpenTab(tab.url)
    }
  }

  const handleSwitchToTab = () => {
    if (tab.id) {
      onSwitchToTab(tab.id)
    }
  }

  const handleCloseTab = () => {
    if (tab.id) {
      onCloseTab(tab.id)
    }
  }

  const getDomain = (url: string) => {
    try {
      return new URL(url).hostname
    } catch {
      return 'Unknown'
    }
  }

  const getTimeAgo = () => {
    // Since Chrome doesn't provide last accessed time, we'll show "Recently"
    return 'Recently'
  }

  return (
    <div 
      className="group bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all duration-200"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="flex items-start space-x-3">
        {/* Favicon */}
        <div className="flex-shrink-0 mt-1">
          <img 
            src={tab.favIconUrl || '/assets/icons/icon-16.png'} 
            alt="" 
            className="w-5 h-5"
            onError={(e) => { e.currentTarget.src = '/assets/icons/icon-16.png' }}
          />
        </div>

        {/* Tab Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mb-1">
                {tab.title}
              </h3>
              <div className="flex items-center space-x-4 text-xs text-gray-500 mb-2">
                <div className="flex items-center space-x-1">
                  <Globe className="w-3 h-3" />
                  <span>{getDomain(tab.url || '')}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Clock className="w-3 h-3" />
                  <span>{getTimeAgo()}</span>
                </div>
              </div>
              <div className="text-xs text-gray-400 line-clamp-1">
                {tab.url}
              </div>
            </div>

            {/* Actions */}
            <div className={`flex items-center space-x-1 transition-opacity duration-200 ${
              showActions ? 'opacity-100' : 'opacity-0'
            }`}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsFavorite(!isFavorite)}
                className="h-6 w-6 p-0"
                title={isFavorite ? "Remove from favorites" : "Add to favorites"}
              >
                {isFavorite ? (
                  <Star className="w-3 h-3 text-yellow-500 fill-current" />
                ) : (
                  <StarOff className="w-3 h-3" />
                )}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleCloseTab}
                className="h-6 w-6 p-0"
                title="Close tab"
              >
                <X className="w-3 h-3" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                title="More actions"
              >
                <MoreVertical className="w-3 h-3" />
              </Button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-2 mt-3">
            <Button
              size="sm"
              variant="outline"
              onClick={handleSwitchToTab}
              className="text-xs"
            >
              Switch to Tab
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleOpenTab}
              className="text-xs"
            >
              <ExternalLink className="w-3 h-3 mr-1" />
              Open New
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function GroupTabDetail({ group }: GroupTabDetailProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'title' | 'domain' | 'recent'>('title')

  const handleOpenTab = async (url: string) => {
    try {
      await chrome.tabs.create({ url, active: false })
    } catch (error) {
      console.error('Failed to open tab:', error)
    }
  }

  const handleCloseTab = async (tabId: number) => {
    try {
      await chrome.tabs.remove(tabId)
      // Note: The tab will be automatically removed from the group by Chrome
    } catch (error) {
      console.error('Failed to close tab:', error)
    }
  }

  const handleSwitchToTab = async (tabId: number) => {
    try {
      await chrome.tabs.update(tabId, { active: true })
      const tab = await chrome.tabs.get(tabId)
      if (tab.windowId) {
        await chrome.windows.update(tab.windowId, { focused: true })
      }
    } catch (error) {
      console.error('Failed to switch to tab:', error)
    }
  }

  const filteredTabs = group.tabs
    .filter(tab => {
      if (!searchQuery) return true
      const query = searchQuery.toLowerCase()
      return (
        tab.title?.toLowerCase().includes(query) ||
        tab.url?.toLowerCase().includes(query)
      )
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return (a.title || '').localeCompare(b.title || '')
        case 'domain':
          const domainA = a.url ? new URL(a.url).hostname : ''
          const domainB = b.url ? new URL(b.url).hostname : ''
          return domainA.localeCompare(domainB)
        case 'recent':
          // Since we don't have real lastAccessed data, just maintain current order
          return 0
        default:
          return 0
      }
    })

  return (
    <div className="p-6 space-y-6">
      {/* Group Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-2xl font-bold text-primary-600">{group.tabs.length}</div>
          <div className="text-sm text-gray-600">Total Tabs</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-2xl font-bold text-green-600">
            {new Set(group.tabs.map(tab => {
              try {
                return new URL(tab.url || '').hostname
              } catch {
                return 'unknown'
              }
            })).size}
          </div>
          <div className="text-sm text-gray-600">Unique Domains</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-2xl font-bold text-blue-600">{group.category}</div>
          <div className="text-sm text-gray-600">Category</div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search tabs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
              />
            </div>
          </div>
          
          <div className="flex space-x-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
            >
              <option value="title">Sort by Title</option>
              <option value="domain">Sort by Domain</option>
              <option value="recent">Sort by Recent</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabs List */}
      <div className="space-y-4">
        {filteredTabs.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Globe className="w-16 h-16 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchQuery ? 'No tabs match your search' : 'No tabs in this group'}
            </h3>
            <p className="text-gray-600">
              {searchQuery 
                ? 'Try adjusting your search query' 
                : 'This group appears to be empty'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTabs.map((tab, index) => (
              <TabItem
                key={tab.id || index}
                tab={tab}
                onOpenTab={handleOpenTab}
                onCloseTab={handleCloseTab}
                onSwitchToTab={handleSwitchToTab}
              />
            ))}
          </div>
        )}
      </div>

      {/* Group Actions */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Group Actions</h3>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={() => {
              group.tabs.forEach(tab => {
                if (tab.url) {
                  chrome.tabs.create({ url: tab.url, active: false })
                }
              })
            }}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Open All Tabs
          </Button>
          <Button variant="outline">
            Export Group
          </Button>
          <Button variant="outline">
            Duplicate Group
          </Button>
          <Button variant="destructive">
            Delete Group
          </Button>
        </div>
      </div>
    </div>
  )
}