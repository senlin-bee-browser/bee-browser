import { useState } from 'react'
import { Folder, ExternalLink, MoreVertical, Trash2, Edit, Calendar, Globe } from 'lucide-react'
import { Button } from '@shared/components'
import { useApp } from '@shared/contexts/AppContext'

interface GroupsProps {
  searchQuery: string
}

interface GroupCardProps {
  group: {
    id: string
    name: string
    tabs: chrome.tabs.Tab[]
    category: string
    createdAt: Date
    lastUpdated: Date
  }
  onEdit: (group: any) => void
  onDelete: (groupId: string) => void
  onOpenTabs: (tabs: chrome.tabs.Tab[]) => void
}

function GroupCard({ group, onEdit, onDelete, onOpenTabs }: GroupCardProps) {
  const [showMenu, setShowMenu] = useState(false)

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start space-x-3 flex-1">
          <div className="bg-primary-100 rounded-lg p-2">
            <Folder className="w-5 h-5 text-primary-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 mb-1">{group.name}</h3>
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <span className="bg-gray-100 px-2 py-1 rounded text-xs capitalize">
                {group.category}
              </span>
              <span className="flex items-center">
                <Globe className="w-3 h-3 mr-1" />
                {group.tabs.length} tabs
              </span>
              <span className="flex items-center">
                <Calendar className="w-3 h-3 mr-1" />
                {new Date(group.lastUpdated).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
        
        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowMenu(!showMenu)}
          >
            <MoreVertical className="w-4 h-4" />
          </Button>
          
          {showMenu && (
            <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 w-48">
              <button
                onClick={() => {
                  onEdit(group)
                  setShowMenu(false)
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Group
              </button>
              <button
                onClick={() => {
                  onOpenTabs(group.tabs)
                  setShowMenu(false)
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open All Tabs
              </button>
              <hr className="my-1" />
              <button
                onClick={() => {
                  onDelete(group.id)
                  setShowMenu(false)
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 text-red-600 flex items-center"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Group
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tab Preview */}
      <div className="space-y-2">
        {group.tabs.slice(0, 4).map((tab, index) => (
          <div key={index} className="flex items-center space-x-2 text-sm">
            <img 
              src={tab.favIconUrl } 
              alt="" 
              className="w-4 h-4 flex-shrink-0"
              onError={(e) => { e.currentTarget.src = '/icon-16.png' }}
            />
            <span className="truncate text-gray-700">{tab.title}</span>
          </div>
        ))}
        {group.tabs.length > 4 && (
          <div className="text-xs text-gray-500 pl-6">
            +{group.tabs.length - 4} more tabs
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex space-x-2 mt-4 pt-4 border-t border-gray-100">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onOpenTabs(group.tabs)}
          className="flex-1"
        >
          <ExternalLink className="w-3 h-3 mr-1" />
          Open All
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEdit(group)}
        >
          <Edit className="w-3 h-3" />
        </Button>
      </div>
    </div>
  )
}

export default function Groups({ searchQuery }: GroupsProps) {
  const { state, dispatch } = useApp()
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'size'>('recent')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [editingGroup, setEditingGroup] = useState<any>(null)

  const categories = ['all', ...Array.from(new Set(state.tabGroups.map(g => g.category)))]

  const filteredGroups = state.tabGroups
    .filter(group => {
      if (searchQuery && !group.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false
      }
      if (selectedCategory !== 'all' && group.category !== selectedCategory) {
        return false
      }
      return true
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'size':
          return b.tabs.length - a.tabs.length
        case 'recent':
        default:
          return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
      }
    })

  const handleEditGroup = (group: any) => {
    setEditingGroup(group)
  }

  const handleDeleteGroup = (groupId: string) => {
    if (confirm('Are you sure you want to delete this group?')) {
      dispatch({ type: 'DELETE_TAB_GROUP', payload: groupId })
    }
  }

  const handleOpenTabs = async (tabs: chrome.tabs.Tab[]) => {
    try {
      for (const tab of tabs) {
        if (tab.url) {
          await chrome.tabs.create({ url: tab.url, active: false })
        }
      }
    } catch (error) {
      console.error('Failed to open tabs:', error)
    }
  }

  const handleSaveEdit = (updatedGroup: any) => {
    dispatch({
      type: 'UPDATE_TAB_GROUP',
      payload: {
        id: updatedGroup.id,
        updates: {
          name: updatedGroup.name,
          category: updatedGroup.category
        }
      }
    })
    setEditingGroup(null)
  }

  return (
    <div className="p-6">
      {/* Filters */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              {categories.map(category => (
                <option key={category} value={category}>
                  {category === 'all' ? 'All Categories' : category.charAt(0).toUpperCase() + category.slice(1)}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sort by</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="recent">Most Recent</option>
              <option value="name">Name A-Z</option>
              <option value="size">Group Size</option>
            </select>
          </div>
        </div>
        
        <div className="text-sm text-gray-600">
          {filteredGroups.length} of {state.tabGroups.length} groups
        </div>
      </div>

      {/* Groups Grid */}
      {filteredGroups.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGroups.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              onEdit={handleEditGroup}
              onDelete={handleDeleteGroup}
              onOpenTabs={handleOpenTabs}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Folder className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchQuery ? 'No groups match your search' : 'No groups found'}
          </h3>
          <p className="text-gray-600 mb-6">
            {searchQuery 
              ? 'Try adjusting your search or filters' 
              : 'Start by analyzing your tabs to create knowledge groups'}
          </p>
          <Button onClick={() => console.log('Analyze tabs')}>
            Analyze Current Tabs
          </Button>
        </div>
      )}

      {/* Edit Group Modal */}
      {editingGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Edit Group</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Group Name
                </label>
                <input
                  type="text"
                  value={editingGroup.name}
                  onChange={(e) => setEditingGroup({ ...editingGroup, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <input
                  type="text"
                  value={editingGroup.category}
                  onChange={(e) => setEditingGroup({ ...editingGroup, category: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <Button
                onClick={() => handleSaveEdit(editingGroup)}
                className="flex-1"
              >
                Save Changes
              </Button>
              <Button
                variant="outline"
                onClick={() => setEditingGroup(null)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}