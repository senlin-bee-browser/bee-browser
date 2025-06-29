import { Search } from 'lucide-react'
import TabCards from './TabCards'
import { navigateToTab, closeTab, showNavigationResult } from '@utils/tab-navigation'
import type { TabGroup } from '@shared/types'

interface GroupDetailProps {
  selectedGroup: TabGroup | null
  displayTabs: chrome.tabs.Tab[]
  refreshTabGroups: () => void
}

export default function GroupDetail({ selectedGroup, displayTabs, refreshTabGroups }: GroupDetailProps) {
  return (
    <div className="flex-1 flex flex-col p-6">
      {/* 标签页列表 */}
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-gray-200 shadow-sm flex-1 overflow-hidden">
        {displayTabs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-lg">该分组暂无标签页</p>
              <p className="text-sm mt-1">该分组可能已被折叠或为空</p>
            </div>
          </div>
        ) : (
          <div className="h-full overflow-y-auto p-6">
            <TabCards 
              group={selectedGroup}
              tabs={displayTabs}
              searchQuery=""
              onTabClick={async (tab: chrome.tabs.Tab) => {
                console.log('🔄 尝试跳转到标签页:', tab.title)
                const result = await navigateToTab(tab)
                showNavigationResult(result, `已跳转到「${tab.title}」`)
                
                if (result.success) {
                  // 可以记录访问历史、更新统计等
                }
              }}
              onTabClose={async (tabId: number) => {
                console.log('🔄 尝试关闭标签页 ID:', tabId)
                const result = await closeTab(tabId)
                showNavigationResult(result, '标签页已关闭')
                
                if (result.success) {
                  refreshTabGroups()
                }
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}