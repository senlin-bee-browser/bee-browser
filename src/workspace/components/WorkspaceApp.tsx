import React, { useState } from 'react'
import { Settings, Home, BarChart3, Folder, Plus, Filter, X, ChevronDown, ChevronRight } from 'lucide-react'
import { Button } from '@shared/components'
import { useApp } from '@shared/contexts/AppContext'
import { useTabs } from '@shared/hooks/useTabs'
import Dashboard from '../pages/Dashboard'
import Analytics from '../pages/Analytics'
import GroupTabDetail from '../pages/GroupTabDetail'

type ActivePage = 'dashboard' | 'analytics' | `group-${string}`

interface NavigationProps {
  activePage: ActivePage
  onPageChange: (page: ActivePage) => void
  onShowNewGroupModal: () => void
}

function Navigation({ activePage, onPageChange, onShowNewGroupModal }: NavigationProps) {
  const { state } = useApp()
  const [groupsExpanded, setGroupsExpanded] = useState(true)

  const basicNavigationItems = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: Home },
    { id: 'analytics' as const, label: 'Analytics', icon: BarChart3 },
  ]

  return (
    <nav className="bg-white border-r border-gray-200 w-64 h-full flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">🐝</span>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Bee Browser</h1>
            <p className="text-sm text-gray-600">Knowledge Workspace</p>
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-2">
          {/* Basic Navigation Items */}
          {basicNavigationItems.map((item) => {
            const Icon = item.icon
            return (
              <li key={item.id}>
                <button
                  onClick={() => onPageChange(item.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    activePage === item.id
                      ? 'bg-primary-100 text-primary-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </button>
              </li>
            )
          })}

          {/* Groups Section */}
          <li>
            <div className="space-y-1">
              {/* Groups Header with Toggle and Add Button */}
              <div className="flex items-center justify-between px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg">
                <button
                  onClick={() => setGroupsExpanded(!groupsExpanded)}
                  className="flex items-center space-x-3 flex-1"
                >
                  {groupsExpanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                  <Folder className="w-5 h-5" />
                  <span className="font-medium">Groups</span>
                  <span className="text-xs text-gray-500">({state.tabGroups.length})</span>
                </button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onShowNewGroupModal}
                  className="p-1.5 h-15 w-15"
                  title="Add New Group"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {/* Group Items */}
              {groupsExpanded && (
                <ul className="ml-6 space-y-1">
                  {state.tabGroups.length === 0 ? (
                    <li className="px-4 py-2 text-sm text-gray-500 italic">
                      No groups yet
                    </li>
                  ) : (
                    state.tabGroups.map((group) => (
                      <li key={group.id}>
                        <button
                          onClick={() => onPageChange(`group-${group.id}` as ActivePage)}
                          className={`w-full flex items-center space-x-3 px-4 py-2 rounded-lg text-left transition-colors text-sm ${
                            activePage === `group-${group.id}`
                              ? 'bg-primary-50 text-primary-700 font-medium border-l-2 border-primary-500'
                              : 'text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          <div className="w-2 h-2 rounded-full bg-current opacity-60" />
                          <span className="truncate flex-1">{group.name}</span>
                          <span className="text-xs text-gray-400">
                            {group.tabs.length}
                          </span>
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              )}
            </div>
          </li>
        </ul>
      </div>

      <div className="p-4 border-t border-gray-200">
        <Button
          variant="outline"
          onClick={() => chrome.runtime.openOptionsPage()}
          className="w-full justify-start"
        >
          <Settings className="w-4 h-4 mr-2" />
          Settings
        </Button>
      </div>
    </nav>
  )
}

interface HeaderProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}

function Header({ title, subtitle, actions }: HeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          {subtitle && <p className="text-gray-600 mt-1">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center space-x-3">{actions}</div>}
      </div>
    </header>
  )
}

interface NewGroupFormData {
  name: string
  category: string
  selectedTabIds: number[]
}

interface NewGroupModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (formData: NewGroupFormData) => void
  availableTabs: chrome.tabs.Tab[]
}

function NewGroupModal({ isOpen, onClose, onSubmit, availableTabs }: NewGroupModalProps) {
  const [formData, setFormData] = useState<NewGroupFormData>({
    name: '',
    category: '',
    selectedTabIds: []
  })

  const categories = [
    'General',
    'Development', 
    'Research',
    'Entertainment',
    'Shopping',
    'Work',
    'Education',
    'Social',
    'News',
    'Other'
  ]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.name.trim() && formData.category && formData.selectedTabIds.length > 0) {
      onSubmit(formData)
      // Reset form
      setFormData({
        name: '',
        category: '',
        selectedTabIds: []
      })
    }
  }

  const toggleTabSelection = (tabId: number) => {
    setFormData(prev => ({
      ...prev,
      selectedTabIds: prev.selectedTabIds.includes(tabId)
        ? prev.selectedTabIds.filter(id => id !== tabId)
        : [...prev.selectedTabIds, tabId]
    }))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Create New Group</h2>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <div className="p-6 space-y-6 overflow-y-auto">
            {/* Group Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Group Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter group name..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category *
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              >
                <option value="">Select a category...</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            {/* Tab Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Tabs * ({formData.selectedTabIds.length} selected)
              </label>
              <div className="border border-gray-300 rounded-md max-h-64 overflow-y-auto">
                {availableTabs.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    No tabs available
                  </div>
                ) : (
                  <div className="p-2 space-y-2">
                    {availableTabs.map(tab => (
                      <div
                        key={tab.id}
                        className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer hover:bg-gray-50 ${
                          formData.selectedTabIds.includes(tab.id!) ? 'bg-primary-50 border border-primary-200' : 'border border-transparent'
                        }`}
                        onClick={() => tab.id && toggleTabSelection(tab.id)}
                      >
                        <input
                          type="checkbox"
                          checked={formData.selectedTabIds.includes(tab.id!)}
                          onChange={() => tab.id && toggleTabSelection(tab.id)}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                        <img 
                          src={tab.favIconUrl || '/icons/icon-16.png'} 
                          alt="" 
                          className="w-4 h-4"
                          onError={(e) => { e.currentTarget.src = '/icons/icon-16.png' }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {tab.title}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {tab.url}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-200 flex space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!formData.name.trim() || !formData.category || formData.selectedTabIds.length === 0}
              className="flex-1"
            >
              Create Group
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function WorkspaceApp() {
  const { state, dispatch } = useApp()
  const { tabs } = useTabs()
  const [activePage, setActivePage] = useState<ActivePage>('dashboard')
  // Remove unused search state for now
  const [showNewGroupModal, setShowNewGroupModal] = useState(false)

  const handleCreateNewGroup = async (formData: NewGroupFormData) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      
      // Get selected tabs
      const selectedTabs = tabs.filter(tab => 
        formData.selectedTabIds.includes(tab.id!)
      )

      // Create new tab group using Chrome API
      const groupId = await chrome.tabs.group({ 
        tabIds: formData.selectedTabIds 
      })

      // Update the group with name and color
      await chrome.tabGroups.update(groupId, {
        title: formData.name,
        color: 'blue' // You can map categories to colors
      })

      // Create the TabGroup object for our state
      const newGroup = {
        id: `native-${groupId}`,
        name: formData.name,
        tabs: selectedTabs,
        category: formData.category,
        createdAt: new Date(),
        lastUpdated: new Date(),
        nativeGroupId: groupId
      }

      // Add to app state
      dispatch({ type: 'ADD_TAB_GROUP', payload: newGroup })
      
      // Close modal
      setShowNewGroupModal(false)
      
      console.log('✅ Created new group:', newGroup)
    } catch (error) {
      console.error('❌ Failed to create group:', error)
      dispatch({ 
        type: 'SET_ERROR', 
        payload: `Failed to create group: ${error instanceof Error ? error.message : 'Unknown error'}` 
      })
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }

  const getCurrentGroup = () => {
    if (activePage.startsWith('group-')) {
      const groupId = activePage.replace('group-', '')
      return state.tabGroups.find(group => group.id === groupId)
    }
    return null
  }

  const getPageTitle = () => {
    if (activePage.startsWith('group-')) {
      const group = getCurrentGroup()
      return group ? group.name : 'Group Not Found'
    }
    
    switch (activePage) {
      case 'dashboard':
        return 'Dashboard'
      case 'analytics':
        return 'Analytics'
      default:
        return 'Workspace'
    }
  }

  const getPageSubtitle = () => {
    if (activePage.startsWith('group-')) {
      const group = getCurrentGroup()
      return group ? `${group.tabs.length} tabs • ${group.category}` : ''
    }

    switch (activePage) {
      case 'dashboard':
        return 'Overview of your browsing knowledge'
      case 'analytics':
        return 'Insights into your browsing patterns'
      default:
        return ''
    }
  }

  const renderPageActions = () => {
    if (activePage.startsWith('group-')) {
      const group = getCurrentGroup()
      if (!group) return null
      
      return (
        <>
          <Button variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            Filter Tabs
          </Button>
          <Button variant="outline">
            Edit Group
          </Button>
        </>
      )
    }

    // No actions for other pages now
    return null
  }

  const renderPageContent = () => {
    if (activePage.startsWith('group-')) {
      const group = getCurrentGroup()
      if (!group) {
        return (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Group Not Found</h3>
              <p className="text-gray-600">The requested group could not be found.</p>
              <Button 
                onClick={() => setActivePage('dashboard')}
                className="mt-4"
              >
                Go to Dashboard
              </Button>
            </div>
          </div>
        )
      }
      
      return <GroupTabDetail 
        group={group} 
        onGroupDeleted={() => setActivePage('dashboard')}
      />
    }

    switch (activePage) {
      case 'dashboard':
        return <Dashboard />
      case 'analytics':
        return <Analytics />
      default:
        return <Dashboard />
    }
  }

  return (
    <div className="h-screen flex bg-gray-50">
      <Navigation 
        activePage={activePage} 
        onPageChange={setActivePage}
        onShowNewGroupModal={() => setShowNewGroupModal(true)}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          title={getPageTitle()}
          subtitle={getPageSubtitle()}
          actions={renderPageActions()}
        />
        
        <main className="flex-1 overflow-y-auto">
          {renderPageContent()}
        </main>
      </div>

      {/* New Group Modal */}
      <NewGroupModal
        isOpen={showNewGroupModal}
        onClose={() => setShowNewGroupModal(false)}
        onSubmit={handleCreateNewGroup}
        availableTabs={tabs.filter(tab => !tab.groupId || tab.groupId === -1)} // Only show ungrouped tabs
      />
    </div>
  )
}