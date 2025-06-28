import React from 'react'
import { BarChart3, Clock, Globe, TrendingUp, Calendar, Activity } from 'lucide-react'
import { useApp } from '@shared/contexts/AppContext'

interface MetricCardProps {
  title: string
  value: string | number
  icon: React.ComponentType<any>
  description?: string
}

function MetricCard({ title, value, icon: Icon, description }: MetricCardProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {description && (
            <p className="text-sm text-gray-500 mt-1">{description}</p>
          )}
        </div>
        <div className="bg-primary-100 rounded-full p-3">
          <Icon className="w-6 h-6 text-primary-600" />
        </div>
      </div>
    </div>
  )
}

interface CategoryAnalysisProps {
  categories: Array<{
    name: string
    count: number
    percentage: number
  }>
}

function CategoryAnalysis({ categories }: CategoryAnalysisProps) {
  const maxCount = Math.max(...categories.map(c => c.count))

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Categories Distribution</h3>
      
      <div className="space-y-4">
        {categories.map((category) => (
          <div key={category.name} className="flex items-center space-x-4">
            <div className="w-20 text-sm text-gray-600 capitalize">
              {category.name}
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(category.count / maxCount) * 100}%` }}
                  />
                </div>
                <div className="text-sm text-gray-600 w-12 text-right">
                  {category.count}
                </div>
              </div>
            </div>
            <div className="text-sm text-gray-500 w-12 text-right">
              {category.percentage}%
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

interface TimelineProps {
  timeline: Array<{
    date: string
    groups: number
    tabs: number
  }>
}

function Timeline({ timeline }: TimelineProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity Timeline</h3>
      
      <div className="space-y-3">
        {timeline.map((entry, index) => (
          <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
            <div className="flex items-center space-x-3">
              <div className="bg-primary-100 rounded-full p-2">
                <Calendar className="w-4 h-4 text-primary-600" />
              </div>
              <span className="text-sm font-medium text-gray-900">{entry.date}</span>
            </div>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <span>{entry.groups} groups</span>
              <span>{entry.tabs} tabs</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Analytics() {
  const { state } = useApp()

  // Calculate analytics data
  const totalTabs = state.tabGroups.reduce((sum, group) => sum + group.tabs.length, 0)
  const averageTabsPerGroup = state.tabGroups.length > 0 ? Math.round(totalTabs / state.tabGroups.length) : 0
  
  // Category analysis
  const categoryStats = state.tabGroups.reduce((acc, group) => {
    acc[group.category] = (acc[group.category] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const categories = Object.entries(categoryStats)
    .map(([name, count]) => ({
      name,
      count,
      percentage: Math.round((count / state.tabGroups.length) * 100) || 0
    }))
    .sort((a, b) => b.count - a.count)

  // Timeline data (last 7 days)
  const timeline = Array.from({ length: 7 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - i)
    const dateString = date.toLocaleDateString()
    
    const dayGroups = state.tabGroups.filter(group => 
      new Date(group.createdAt).toDateString() === date.toDateString()
    )
    
    return {
      date: dateString,
      groups: dayGroups.length,
      tabs: dayGroups.reduce((sum, group) => sum + group.tabs.length, 0)
    }
  }).reverse()

  // Most active category
  const mostActiveCategory = categories.length > 0 ? categories[0]!.name : 'None'
  
  // Recent activity (groups created in last 24 hours)
  const recentActivity = state.tabGroups.filter(group => {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    return new Date(group.createdAt) > oneDayAgo
  }).length

  return (
    <div className="p-6 space-y-6">
      {/* Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Groups"
          value={state.tabGroups.length}
          icon={BarChart3}
          description="All time"
        />
        <MetricCard
          title="Total Tabs"
          value={totalTabs}
          icon={Globe}
          description="Across all groups"
        />
        <MetricCard
          title="Avg. Tabs/Group"
          value={averageTabsPerGroup}
          icon={Activity}
          description="Group efficiency"
        />
        <MetricCard
          title="Recent Activity"
          value={recentActivity}
          icon={Clock}
          description="Last 24 hours"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Analysis */}
        {categories.length > 0 ? (
          <CategoryAnalysis categories={categories} />
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Categories Distribution</h3>
            <div className="text-center py-8">
              <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No categories to analyze yet</p>
            </div>
          </div>
        )}

        {/* Timeline */}
        <Timeline timeline={timeline} />
      </div>

      {/* Insights */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Insights</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-primary-50 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <TrendingUp className="w-5 h-5 text-primary-600" />
              <h4 className="font-medium text-primary-900">Most Active Category</h4>
            </div>
            <p className="text-primary-700 text-sm capitalize">{mostActiveCategory}</p>
          </div>
          
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Activity className="w-5 h-5 text-green-600" />
              <h4 className="font-medium text-green-900">Organization Score</h4>
            </div>
            <p className="text-green-700 text-sm">
              {state.tabGroups.length > 0 ? 'Good' : 'Start organizing!'}
            </p>
          </div>
          
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Clock className="w-5 h-5 text-blue-600" />
              <h4 className="font-medium text-blue-900">Productivity Trend</h4>
            </div>
            <p className="text-blue-700 text-sm">
              {recentActivity > 0 ? 'Active' : 'Stable'}
            </p>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      {state.tabGroups.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recommendations</h3>
          
          <div className="space-y-3">
            {averageTabsPerGroup > 10 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-yellow-800 text-sm">
                  <strong>Consider splitting large groups:</strong> Your average group size is {averageTabsPerGroup} tabs. 
                  Smaller groups are easier to manage.
                </p>
              </div>
            )}
            
            {categories.length === 1 && state.tabGroups.length > 3 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-blue-800 text-sm">
                  <strong>Diversify your categories:</strong> All your groups are in the same category. 
                  Consider analyzing different types of content.
                </p>
              </div>
            )}
            
            {recentActivity === 0 && state.tabGroups.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-green-800 text-sm">
                  <strong>Great organization:</strong> Your groups are well-maintained. 
                  Continue analyzing new tabs to keep your knowledge organized.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}