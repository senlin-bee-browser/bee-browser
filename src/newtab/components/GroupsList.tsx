import { Folder, Users, Globe, Hash, Clock } from 'lucide-react'
import { TabGroup } from '@/types/app-types'

interface GroupsListProps {
  groups: TabGroup[]
  onGroupClick: (group: TabGroup) => void
}

export default function GroupsList({ groups, onGroupClick }: GroupsListProps) {
  const getGroupIcon = (group: TabGroup) => {
    switch (group.category) {
      case 'work':
        return <Folder className="w-5 h-5" />
      case 'social':
        return <Users className="w-5 h-5" />
      case 'entertainment':
        return <Globe className="w-5 h-5" />
      default:
        return <Hash className="w-5 h-5" />
    }
  }

  const getGroupColor = (group: TabGroup) => {
    const colors = {
      work: 'bg-blue-500',
      social: 'bg-green-500',
      entertainment: 'bg-purple-500',
      shopping: 'bg-yellow-500',
      news: 'bg-red-500',
      research: 'bg-indigo-500',
      development: 'bg-gray-500',
      other: 'bg-pink-500'
    }
    return colors[group.category as keyof typeof colors] || colors.other
  }

  return (
    <div className="h-full">
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {groups.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Folder className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-gray-600">暂无分组</p>
            <p className="text-sm mt-1 text-gray-500">开始浏览网页会自动创建分组</p>
          </div>
        ) : (
          groups.map((group) => (
            <div
              key={group.id}
              onClick={() => onGroupClick(group)}
              className="group cursor-pointer p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-all duration-200 border border-gray-200 hover:border-gray-300 hover:shadow-sm"
            >
              <div className="flex items-start space-x-3">
                <div className={`p-2 rounded-lg ${getGroupColor(group)} text-white`}>
                  {getGroupIcon(group)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 truncate group-hover:text-gray-900">
                    {group.name}
                  </h3>
                  
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                    {group.description || '无描述'}
                  </p>
                  
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span className="flex items-center space-x-1">
                        <Hash className="w-3 h-3" />
                        <span>{group.tabs?.length || 0} 个标签</span>
                      </span>
                      
                      <span className="flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>
                          {new Date(group.createdAt).toLocaleDateString('zh-CN')}
                        </span>
                      </span>
                    </div>
                    
                    <div className="flex space-x-1">
                      {group.tabs?.slice(0, 3).map((tab, index) => (
                        <div
                          key={index}
                          className="w-4 h-4 rounded-sm bg-gray-200 border border-gray-300"
                          title={tab.title}
                        >
                          {tab.favicon && (
                            <img
                              src={tab.favicon}
                              alt=""
                              className="w-full h-full rounded-sm"
                            />
                          )}
                        </div>
                      ))}
                      {(group.tabs?.length || 0) > 3 && (
                        <div className="w-4 h-4 rounded-sm bg-gray-200 border border-gray-300 flex items-center justify-center text-xs text-gray-600">
                          +
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
} 