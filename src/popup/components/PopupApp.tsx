import { useState } from 'react'
import { Search, Settings, BarChart3, FolderOpen, RefreshCw, Download, RotateCcw } from 'lucide-react'
import { Button, Loading } from '@shared/components'
import { useApp } from '@shared/contexts/AppContext'
import { useTabs } from '@shared/hooks/useTabs'

export default function PopupApp() {
  const { state, dispatch } = useApp()
  const { tabs, loading: tabsLoading } = useTabs()
  const [searchQuery, setSearchQuery] = useState('')

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

  const handleAnalyzeCurrentTab = async () => {
    dispatch({ type: 'SET_LOADING', payload: true })
    try {
      const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true })
      // TODO: Implement AI analysis
      console.log('Analyzing tab:', currentTab)
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to analyze current tab' })
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
          <div className="text-xl font-semibold text-primary-600">{state.tabGroups.length}</div>
        </div>
        <div className="bg-gray-50 p-3 rounded-lg">
          <div className="text-sm text-gray-600">Total Tabs</div>
          <div className="text-xl font-semibold text-primary-600">{tabs.length}</div>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-2">
        <Button
          onClick={handleAnalyzeCurrentTab}
          loading={state.isLoading}
          className="w-full justify-start"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Analyze Current Tab
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