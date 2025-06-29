import { useState } from 'react'
import { ChevronRight, Eye, Brain, Sparkles, RefreshCw } from 'lucide-react'
import SearchBox from './SearchBox'
import { navigateToTab, showNavigationResult } from '@utils/tab-navigation'
import { AIProcessor } from '@utils/ai-processor'
import { useTabs } from '@shared/hooks'
import type { TabGroup } from '@shared/types'

interface HomepageProps {
  tabGroups: TabGroup[]
  onSearch: (query: string) => void
  onGroupClick: (groupId: number) => void
  getGroupIcon: (color: string) => string
  refreshTabGroups: () => void
}

export default function Homepage({ tabGroups, onSearch, onGroupClick, getGroupIcon, refreshTabGroups }: HomepageProps) {
  const { tabs } = useTabs({ enableEnhancement: false })
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  
  const analyzeTabs = AIProcessor.filterTabs(tabs)

  const executeTabAnalysis = async () => {
    try {
      setIsAnalyzing(true)
      
      const { createdGroups } = await AIProcessor.analyzeCurrentTabs()
      
      setTimeout(() => {
        refreshTabGroups()
      }, 1000)
      
    } catch (error) {
      console.error('❌ Tab analysis failed:', error)
    } finally {
      setIsAnalyzing(false)
    }
  }
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="min-h-full flex flex-col items-center p-12" style={{ minHeight: 'calc(100vh - 2rem)' }}>
        <div className="flex-1 flex flex-col items-center justify-center w-full max-w-6xl">
          {/* 品牌区域 */}
          <div className="text-center mb-4">
            <div className="w-20 h-20 bg-gradient-to-br from-orange-400 to-yellow-500 rounded-3xl flex items-center justify-center mb-6 mx-auto shadow-lg">
              <img src={chrome.runtime.getURL('icons/icon-128.png')} alt="logo" className="w-10 h-10" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-3" style={{ fontFamily: 'fantasy' }}>Bee Browser</h1>
          </div>

          {/* 搜索框 */}
          <div className="w-full max-w-2xl mb-8">
            <SearchBox 
              onSearch={onSearch}
              placeholder="搜索网页或输入网址，一键直达..."
            />
          </div>

          {/* AI 分析按钮 */}
          <div className="mb-8">
            <button
              onClick={executeTabAnalysis}
              disabled={isAnalyzing || analyzeTabs.length === 0}
              className="flex items-center space-x-3 px-6 py-3 bg-gradient-to-r from-orange-400 to-yellow-500 text-white rounded-xl hover:from-orange-500 hover:to-yellow-600 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span className="font-medium">AI 分析中...</span>
                </>
              ) : (
                <>
                  <Brain className="w-5 h-5" />
                  <span className="font-medium">AI 智能分析标签页</span>
                  <span className="bg-white/20 px-2 py-1 rounded-lg text-sm">
                    {analyzeTabs.length} 个
                  </span>
                </>
              )}
            </button>
          </div>

          {/* 分类概览 */}
          <div className="w-full">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tabGroups.slice(0, 6).map((group) => (
                <div
                  key={group.id}
                  className="bg-white/70 backdrop-blur-sm rounded-2xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-200 cursor-pointer"
                  onClick={() => onGroupClick(group.id)}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{ backgroundColor: "fb923c" }}>
                        {getGroupIcon(group.color)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {group.title || '未命名分组'}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {group.tabs?.length || 0} 个网页
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>

                  <div className="space-y-2">
                    {group.tabs?.slice(0, 3).map((tab, index) => (
                      <div 
                        key={index} 
                        className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={async (e) => {
                          e.stopPropagation()
                          console.log('🔄 首页标签页点击，跳转到:', tab.title)
                          const result = await navigateToTab(tab)
                          showNavigationResult(result, `已从首页跳转到「${tab.title}」`)
                        }}
                      >
                        <div className="w-4 h-4 rounded-sm bg-gray-200 flex items-center justify-center overflow-hidden">
                          {tab.favIconUrl ? (
                            <img src={tab.favIconUrl} alt="" className="w-full h-full" />
                          ) : (
                            <div className="w-2 h-2 bg-gray-400 rounded-sm"></div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {tab.title}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {tab.url ? new URL(tab.url).hostname : ''}
                          </p>
                        </div>
                        <div className="flex items-center space-x-1 text-gray-400">
                          <Eye className="w-3 h-3" />
                          <span className="text-xs">156</span>
                        </div>
                      </div>
                    ))}
                    {(group.tabs?.length || 0) > 3 && (
                      <div className="text-center py-2">
                        <span className="text-sm text-gray-500">
                          还有 {(group.tabs?.length || 0) - 3} 个网页...
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}