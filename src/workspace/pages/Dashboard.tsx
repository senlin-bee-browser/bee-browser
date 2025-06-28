import React from 'react'
import { BarChart3, Folder, Globe, Clock, TrendingUp, Activity } from 'lucide-react'
import { Button } from '@shared/components'
import { useApp } from '@shared/contexts/AppContext'
import { useTabs } from '@shared/hooks/useTabs'

interface StatCardProps {
  title: string
  value: string | number
  icon: React.ComponentType<any>
  trend?: {
    value: number
    isPositive: boolean
  }
  onClick?: () => void
}

function StatCard({ title, value, icon: Icon, trend, onClick }: StatCardProps) {
  return (
    <div 
      className={`bg-white rounded-lg border border-gray-200 p-6 ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
          {trend && (
            <div className="flex items-center mt-2">
              <TrendingUp className={`w-4 h-4 mr-1 ${trend.isPositive ? 'text-green-500' : 'text-red-500'}`} />
              <span className={`text-sm font-medium ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {trend.isPositive ? '+' : ''}{trend.value}%
              </span>
            </div>
          )}
        </div>
        <div className="bg-primary-100 rounded-full p-3">
          <Icon className="w-6 h-6 text-primary-600" />
        </div>
      </div>
    </div>
  )
}

interface QuickActionProps {
  title: string
  description: string
  icon: React.ComponentType<any>
  onClick: () => void
}

function QuickAction({ title, description, icon: Icon, onClick }: QuickActionProps) {
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-lg border border-gray-200 p-4 text-left hover:shadow-md transition-shadow w-full"
    >
      <div className="flex items-start space-x-3">
        <div className="bg-primary-100 rounded-lg p-2">
          <Icon className="w-5 h-5 text-primary-600" />
        </div>
        <div>
          <h3 className="font-medium text-gray-900">{title}</h3>
          <p className="text-sm text-gray-600 mt-1">{description}</p>
        </div>
      </div>
    </button>
  )
}

export default function Dashboard() {
  const { state, dispatch } = useApp()
  const { tabs } = useTabs()

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

  const recentGroups = state.tabGroups
    .sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime())
    .slice(0, 5)

  const categories = Array.from(new Set(state.tabGroups.map(g => g.category)))

  return (
    <div className="p-6 space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Groups"
          value={state.tabGroups.length}
          icon={Folder}
          trend={{ value: 12, isPositive: true }}
        />
        <StatCard
          title="Active Tabs"
          value={tabs.length}
          icon={Globe}
          trend={{ value: 8, isPositive: true }}
        />
        <StatCard
          title="Categories"
          value={categories.length}
          icon={BarChart3}
        />
        <StatCard
          title="Today's Groups"
          value={state.tabGroups.filter(g => 
            new Date(g.createdAt).toDateString() === new Date().toDateString()
          ).length}
          icon={Clock}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-1">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <QuickAction
              title="Analyze Current Tab"
              description="Use AI to analyze and categorize the current tab"
              icon={Activity}
              onClick={handleAnalyzeCurrentTab}
            />
            <QuickAction
              title="Group Similar Tabs"
              description="Automatically group tabs with similar content"
              icon={Folder}
              onClick={handleGroupSimilarTabs}
            />
            <QuickAction
              title="View Analytics"
              description="See insights about your browsing patterns"
              icon={BarChart3}
              onClick={() => {}}
            />
          </div>
        </div>

        {/* Recent Groups */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Recent Groups</h2>
            <Button variant="outline" size="sm">
              View All
            </Button>
          </div>

          {recentGroups.length > 0 ? (
            <div className="bg-white rounded-lg border border-gray-200">
              {recentGroups.map((group, index) => (
                <div
                  key={group.id}
                  className={`p-4 flex items-center justify-between ${
                    index !== recentGroups.length - 1 ? 'border-b border-gray-100' : ''
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="bg-primary-100 rounded-lg p-2">
                      <Folder className="w-4 h-4 text-primary-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{group.name}</h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>{group.tabs.length} tabs</span>
                        <span className="bg-gray-100 px-2 py-1 rounded text-xs">
                          {group.category}
                        </span>
                        <span>{new Date(group.lastUpdated).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    View
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
              <Folder className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No groups yet</h3>
              <p className="text-gray-600 mb-4">
                Start by analyzing your current tab or grouping similar tabs
              </p>
              <Button onClick={handleAnalyzeCurrentTab}>
                Analyze Current Tab
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Categories Overview */}
      {categories.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Categories</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {categories.map((category) => {
              const groupsInCategory = state.tabGroups.filter(g => g.category === category)
              return (
                <div key={category} className="bg-white rounded-lg border border-gray-200 p-4 text-center">
                  <div className="text-2xl font-bold text-primary-600 mb-1">
                    {groupsInCategory.length}
                  </div>
                  <div className="text-sm text-gray-600 capitalize">{category}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Error Display */}
      {state.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-red-800">{state.error}</div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => dispatch({ type: 'SET_ERROR', payload: null })}
            className="mt-2 text-red-600"
          >
            Dismiss
          </Button>
        </div>
      )}
    </div>
  )
}