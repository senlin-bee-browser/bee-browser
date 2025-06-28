import { useMemo } from 'react'
import { Globe, Activity, Zap } from 'lucide-react'

interface BrowsingTopologyProps {
  tabs: chrome.tabs.Tab[]
  onNodeClick: (tab: chrome.tabs.Tab) => void
}

interface DomainNode {
  domain: string
  tabs: chrome.tabs.Tab[]
  isActive: boolean
  favicon?: string
  position: { x: number; y: number }
}

export default function BrowsingTopology({ tabs, onNodeClick }: BrowsingTopologyProps) {
  // 处理标签页数据，按域名分组
  const domainNodes = useMemo(() => {
    const domainGroups = new Map<string, chrome.tabs.Tab[]>()
    
    // 按域名分组
    tabs.forEach(tab => {
      if (!tab.url) return
      
      try {
        const domain = new URL(tab.url).hostname
        if (!domainGroups.has(domain)) {
          domainGroups.set(domain, [])
        }
        domainGroups.get(domain)!.push(tab)
      } catch {
        // 忽略无效URL
      }
    })

    const nodes: DomainNode[] = []
    
    // 为每个域名创建节点
    Array.from(domainGroups.entries()).forEach(([domain, domainTabs], index) => {
      if (domainTabs.length === 0) return
      
      const representative = domainTabs[0]!
      const isActive = domainTabs.some(tab => tab.active)
      
      // 计算节点位置 - 网格布局
      const columns = Math.ceil(Math.sqrt(domainGroups.size))
      const row = Math.floor(index / columns)
      const col = index % columns
      
              nodes.push({
          domain,
          tabs: domainTabs,
          isActive,
          favicon: representative.favIconUrl || undefined,
        position: {
          x: col * 120 + 60,
          y: row * 120 + 60
        }
      })
    })

    return nodes
  }, [tabs])

  const handleNodeClick = (node: DomainNode) => {
    // 点击活跃标签页，如果没有则点击第一个
    const activeTab = node.tabs.find(tab => tab.active) || node.tabs[0]
    if (activeTab) {
      onNodeClick(activeTab)
    }
  }

  return (
    <div className="w-full h-full relative overflow-hidden">
      {/* 标题栏 */}
      <div className="absolute top-6 left-6 z-10 bg-white/90 backdrop-blur-sm rounded-2xl px-6 py-4 border border-gray-200 shadow-lg">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
            <Activity className="w-5 h-5 text-black" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">浏览拓扑</h3>
                           <p className="text-sm text-gray-700">{domainNodes.length} 个网站，{tabs.length} 个标签页</p>
          </div>
        </div>
      </div>

      {/* 统计信息 */}
      <div className="absolute top-6 right-6 z-10 bg-white/90 backdrop-blur-sm rounded-2xl px-6 py-4 border border-gray-200 shadow-lg">
        <div className="flex items-center space-x-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{tabs.filter(tab => tab.active).length}</div>
                         <div className="text-xs text-gray-700">活跃</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{tabs.filter(tab => tab.audible).length}</div>
                         <div className="text-xs text-gray-700">音频</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{tabs.filter(tab => tab.pinned).length}</div>
                         <div className="text-xs text-gray-700">固定</div>
          </div>
        </div>
      </div>

      {/* 节点容器 */}
      <div className="absolute inset-0 pt-32 pb-8 px-8 overflow-auto">
        <div className="relative min-h-full" style={{ width: 'max-content' }}>
          {/* 背景网格 */}
          <div className="absolute inset-0 opacity-30" style={{
            backgroundImage: 'radial-gradient(circle, #e5e7eb 1px, transparent 1px)',
            backgroundSize: '30px 30px'
          }}></div>

          {/* 域名节点 */}
          {domainNodes.map((node, index) => (
            <div
              key={node.domain}
              className="absolute cursor-pointer group"
              style={{
                left: node.position.x,
                top: node.position.y,
                transform: 'translate(-50%, -50%)'
              }}
              onClick={() => handleNodeClick(node)}
            >
              {/* 节点主体 */}
              <div className={`relative transition-all duration-300 transform group-hover:scale-110 ${
                node.isActive ? 'scale-110' : ''
              }`}>
                <div className={`w-20 h-20 rounded-2xl border-3 flex items-center justify-center shadow-lg transition-all duration-300 ${
                  node.isActive 
                    ? 'bg-gradient-to-br from-blue-500 to-blue-600 border-blue-400 ring-4 ring-blue-500/30' 
                    : 'bg-white border-gray-300 group-hover:border-blue-400 group-hover:shadow-xl'
                }`}>
                  {node.favicon ? (
                    <img 
                      src={node.favicon} 
                      alt={node.domain}
                      className="w-10 h-10 rounded-xl"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                        const next = e.currentTarget.nextElementSibling as HTMLElement
                        if (next) next.style.display = 'flex'
                      }}
                    />
                  ) : null}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${node.favicon ? 'hidden' : 'flex'}`}>
                    <Globe className={`w-6 h-6 ${node.isActive ? 'text-black' : 'text-gray-500'}`} />
                  </div>
                </div>
                
                {/* 标签数量指示器 */}
                {node.tabs.length > 1 && (
                  <div className="absolute -top-2 -right-2 w-7 h-7 bg-gradient-to-br from-red-500 to-red-600 text-black rounded-full flex items-center justify-center text-xs font-bold shadow-lg">
                    {node.tabs.length > 9 ? '9+' : node.tabs.length}
                  </div>
                )}

                {/* 活跃指示器 */}
                {node.isActive && (
                  <div className="absolute -top-1 -left-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                    <Zap className="w-2 h-2 text-black" />
                  </div>
                )}
              </div>

              {/* 域名标签 */}
              <div className="mt-3 text-center">
                <div className="bg-white/90 backdrop-blur-sm px-3 py-1 rounded-lg border border-gray-200 shadow-sm">
                  <div className="text-sm font-medium text-gray-900 truncate max-w-24" title={node.domain}>
                    {node.domain.length > 12 ? `${node.domain.substring(0, 12)}...` : node.domain}
                  </div>
                </div>
              </div>

              {/* 悬停详情 */}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-4 px-4 py-3 bg-gray-900 text-black text-sm rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-xl">
                <div className="font-semibold">{node.domain}</div>
                <div className="text-gray-300 text-xs mt-1">{node.tabs.length} 个标签页</div>
                {node.tabs.some(tab => tab.audible) && (
                  <div className="text-blue-300 text-xs">🔊 播放音频</div>
                )}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-b-gray-900"></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 空状态 */}
      {domainNodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center bg-white/90 backdrop-blur-sm rounded-3xl p-12 border border-gray-200 shadow-xl max-w-md">
            <div className="w-20 h-20 bg-gradient-to-br from-gray-400 to-gray-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Globe className="w-10 h-10 text-black" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">暂无浏览数据</h3>
            <p className="text-gray-600">打开一些网页来查看拓扑关系图</p>
          </div>
        </div>
      )}
    </div>
  )
} 