import React, { useState } from 'react'
import { Search, Settings, Home, BarChart3, Folder, Plus, Filter } from 'lucide-react'
import { Button } from '@shared/components'
import { useApp } from '@shared/contexts/AppContext'
import Dashboard from '../pages/Dashboard'
import Groups from '../pages/Groups'
import Analytics from '../pages/Analytics'

type ActivePage = 'dashboard' | 'groups' | 'analytics'

interface NavigationProps {
  activePage: ActivePage
  onPageChange: (page: ActivePage) => void
}

function Navigation({ activePage, onPageChange }: NavigationProps) {
  const navigationItems = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: Home },
    { id: 'groups' as const, label: 'Groups', icon: Folder },
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

      <div className="flex-1 p-4">
        <ul className="space-y-2">
          {navigationItems.map((item) => {
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

export default function WorkspaceApp() {
  const { state } = useApp()
  const [activePage, setActivePage] = useState<ActivePage>('dashboard')
  const [searchQuery, setSearchQuery] = useState('')

  const getPageTitle = () => {
    switch (activePage) {
      case 'dashboard':
        return 'Dashboard'
      case 'groups':
        return 'Tab Groups'
      case 'analytics':
        return 'Analytics'
      default:
        return 'Workspace'
    }
  }

  const getPageSubtitle = () => {
    switch (activePage) {
      case 'dashboard':
        return 'Overview of your browsing knowledge'
      case 'groups':
        return `${state.tabGroups.length} groups organized by AI`
      case 'analytics':
        return 'Insights into your browsing patterns'
      default:
        return ''
    }
  }

  const renderPageActions = () => {
    switch (activePage) {
      case 'groups':
        return (
          <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search groups..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <Button variant="outline">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Group
            </Button>
          </>
        )
      default:
        return null
    }
  }

  const renderPageContent = () => {
    switch (activePage) {
      case 'dashboard':
        return <Dashboard />
      case 'groups':
        return <Groups searchQuery={searchQuery} />
      case 'analytics':
        return <Analytics />
      default:
        return <Dashboard />
    }
  }

  return (
    <div className="h-screen flex bg-gray-50">
      <Navigation activePage={activePage} onPageChange={setActivePage} />
      
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
    </div>
  )
}