import { useEffect, useRef, useMemo } from 'react'
import { Globe, ExternalLink } from 'lucide-react'

interface BrowsingTopologyProps {
  tabs: chrome.tabs.Tab[]
  onNodeClick: (tab: chrome.tabs.Tab) => void
}

interface Node {
  id: string
  tab: chrome.tabs.Tab
  x: number
  y: number
  domain: string
  connections: string[]
}

export default function BrowsingTopology({ tabs, onNodeClick }: BrowsingTopologyProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // 处理标签页数据，创建节点和连接
  const { nodes, maxConnections } = useMemo(() => {
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

    const nodes: Node[] = []
    const connections = new Map<string, number>()
    
    // 为每个域名创建节点
    domainGroups.forEach((domainTabs, domain) => {
      if (domainTabs.length === 0) return
      const representative = domainTabs[0]! // 使用第一个标签页作为代表
      const nodeId = domain
      
      // 计算节点位置（简单的圆形布局）
      const angle = (nodes.length / domainGroups.size) * 2 * Math.PI
      const radius = Math.min(200, 50 + domainGroups.size * 10)
      const centerX = 250
      const centerY = 150
      
      const x = centerX + Math.cos(angle) * radius
      const y = centerY + Math.sin(angle) * radius
      
      nodes.push({
        id: nodeId,
        tab: representative,
        x,
        y,
        domain,
        connections: []
      })
      
      connections.set(domain, domainTabs.length)
    })

    // 计算连接（基于相似度或访问时间）
    nodes.forEach(node => {
      nodes.forEach(otherNode => {
        if (node.id !== otherNode.id) {
          // 简单的连接逻辑：如果域名相似或是子域名
          if (node.domain.includes(otherNode.domain) || 
              otherNode.domain.includes(node.domain) ||
              node.domain.split('.').slice(-2).join('.') === otherNode.domain.split('.').slice(-2).join('.')) {
            node.connections.push(otherNode.id)
          }
        }
      })
    })

    const maxConnections = Math.max(...Array.from(connections.values()))
    
    return { nodes, maxConnections }
  }, [tabs])

  // 绘制拓扑图
  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 设置画布大小
    const rect = container.getBoundingClientRect()
    canvas.width = rect.width
    canvas.height = rect.height

    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // 绘制连接线
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'
    ctx.lineWidth = 1
    
    nodes.forEach(node => {
      node.connections.forEach(connectionId => {
        const connectedNode = nodes.find(n => n.id === connectionId)
        if (connectedNode) {
          ctx.beginPath()
          ctx.moveTo(node.x, node.y)
          ctx.lineTo(connectedNode.x, connectedNode.y)
          ctx.stroke()
        }
      })
    })

    // 绘制节点
    nodes.forEach(node => {
      const tabCount = tabs.filter(tab => {
        try {
          return tab.url && new URL(tab.url).hostname === node.domain
        } catch {
          return false
        }
      }).length

      // 节点大小基于标签页数量
      const radius = Math.max(8, Math.min(20, 5 + tabCount * 2))
      
      // 节点颜色基于活跃状态
      const isActive = tabs.some(tab => tab.active && tab.url && 
        new URL(tab.url).hostname === node.domain)
      
      ctx.fillStyle = isActive ? 'rgba(34, 197, 94, 0.8)' : 'rgba(255, 255, 255, 0.8)'
      ctx.beginPath()
      ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI)
      ctx.fill()

      // 节点边框
      ctx.strokeStyle = 'rgba(255, 255, 255, 1)'
      ctx.lineWidth = 2
      ctx.stroke()

      // 标签数量文本
      if (tabCount > 1) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'
        ctx.font = '10px Arial'
        ctx.textAlign = 'center'
        ctx.fillText(tabCount.toString(), node.x, node.y + 3)
      }
    })

  }, [nodes, tabs])

  // 处理点击事件
  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    // 查找被点击的节点
    const clickedNode = nodes.find(node => {
      const distance = Math.sqrt((x - node.x) ** 2 + (y - node.y) ** 2)
      return distance <= 20 // 点击范围
    })

    if (clickedNode) {
      onNodeClick(clickedNode.tab)
    }
  }

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
          <Globe className="w-5 h-5" />
          <span>浏览路径拓扑图</span>
        </h3>
        <div className="text-sm text-white text-opacity-75">
          {nodes.length} 个域名，{tabs.length} 个标签页
        </div>
      </div>

      <div className="relative bg-black bg-opacity-20 rounded-lg overflow-hidden">
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          className="cursor-pointer"
          style={{ width: '100%', height: '250px' }}
        />
        
        {nodes.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-white text-opacity-50">
            <div className="text-center">
              <Globe className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>没有标签页数据</p>
              <p className="text-sm mt-1">打开一些网页来查看拓扑图</p>
            </div>
          </div>
        ) : (
          <div className="absolute top-2 left-2 text-xs text-white text-opacity-60">
            <p>• 节点大小表示标签页数量</p>
            <p>• 绿色节点表示当前活跃</p>
            <p>• 连线表示域名关联</p>
            <p>• 点击节点切换到该标签页</p>
          </div>
        )}
      </div>
    </div>
  )
} 