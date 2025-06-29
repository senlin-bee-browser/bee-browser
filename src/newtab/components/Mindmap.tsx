import { MindMap } from '@ant-design/graphs'
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { AIProcessor } from '@utils/ai-processor'
import { IntentAnalysisResult, IntentSubcategory } from '@shared/contexts/AppContext'
import { Spin, Alert } from 'antd'
import { navigateToTab, showNavigationResult } from '@utils/tab-navigation'

interface TabGroupWithTabs extends chrome.tabGroups.TabGroup {
  tabs: chrome.tabs.Tab[]
}

interface MindmapProps {
  group: TabGroupWithTabs | null | undefined
}

// 数据对比工具函数
const compareTabsData = (tabs1: chrome.tabs.Tab[], tabs2: chrome.tabs.Tab[]): boolean => {
  if (tabs1.length !== tabs2.length) return false
  
  for (let i = 0; i < tabs1.length; i++) {
    const tab1 = tabs1[i]
    const tab2 = tabs2[i]
    
    // 安全检查
    if (!tab1 || !tab2) return false
    
    // 比较关键属性
    if (tab1.id !== tab2.id || 
        tab1.title !== tab2.title || 
        tab1.url !== tab2.url || 
        tab1.favIconUrl !== tab2.favIconUrl) {
      return false
    }
  }
  
  return true
}

// 生成数据哈希值，用于快速比较
const generateTabsHash = (tabs: chrome.tabs.Tab[]): string => {
  if (!tabs || tabs.length === 0) return 'empty'
  
  return tabs
    .map(tab => `${tab.id}-${tab.title}-${tab.url}`)
    .sort() // 排序确保顺序一致性
    .join('|')
}

// 深度比较两个 group 对象是否相等
const areGroupsEqual = (
  prevGroup: TabGroupWithTabs | null | undefined,
  nextGroup: TabGroupWithTabs | null | undefined
): boolean => {
  // 处理 null/undefined 情况
  if (prevGroup === nextGroup) return true
  if (!prevGroup || !nextGroup) return false
  
  // 比较基本属性
  if (prevGroup.id !== nextGroup.id ||
      prevGroup.title !== nextGroup.title ||
      prevGroup.color !== nextGroup.color ||
      prevGroup.collapsed !== nextGroup.collapsed) {
    return false
  }
  
  // 比较标签页数据
  const prevTabs = prevGroup.tabs || []
  const nextTabs = nextGroup.tabs || []
  
  return compareTabsData(prevTabs, nextTabs)
}

// 组件内部实现
function MindmapInternal({ group }: MindmapProps) {
  // 使用数据哈希值作为稳定标识符
  const dataHash = useMemo(() => {
    const groupHash = group ? `${group.id}-${group.title}-${group.color}` : 'no-group'
    const tabsHash = generateTabsHash(group?.tabs || [])
    return `${groupHash}:${tabsHash}`
  }, [group])

  // 缓存标签页数据，只有哈希值改变时才重新计算
  const tabs = useMemo(() => {
    console.log('📋 标签页数据重新计算，dataHash:', dataHash)
    return group?.tabs || []
  }, [dataHash])

  const [analysisResults, setAnalysisResults] = useState<IntentAnalysisResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout>()
  const lastAnalyzedHashRef = useRef<string>('')

  const getInvisibleCharacter = () => {
    return String.fromCodePoint(0xE0100 + +(Math.random() * 256).toFixed(0)) 
  }

  // 优化的AI分析效果，带缓存检查
  useEffect(() => {
    // 检查是否需要重新分析
    if (lastAnalyzedHashRef.current === dataHash) {
      console.log('🚫 数据未变化，跳过AI分析')
      return
    }

    console.log('🔄 数据已变化，准备AI分析', {
      oldHash: lastAnalyzedHashRef.current,
      newHash: dataHash,
      tabsCount: tabs.length
    })

    // 清除之前的定时器
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    
    // 设置新的防抖定时器
    debounceTimerRef.current = setTimeout(async () => {
      if (!tabs || tabs.length === 0) {
        console.log('❌ 没有标签页，跳过分析')
        setAnalysisResults([])
        lastAnalyzedHashRef.current = dataHash
        return
      }

      setLoading(true)
      setError(null)

      try {
        // 过滤和准备标签页数据
        const filteredTabs = AIProcessor.filterTabs(tabs)
        const tabsData = AIProcessor.prepareTabData(filteredTabs)
        
        console.log('📤 开始AI分析，标签页数量:', tabsData.length)
        
        // 调用AI分析
        const results = await AIProcessor.analyzeTabsWithAI(tabsData)
        console.log('✅ AI分析完成:', results)
        
        setAnalysisResults(results)
        lastAnalyzedHashRef.current = dataHash // 更新已分析的哈希值
      } catch (err) {
        console.error('❌ AI分析失败:', err)
        setError(err instanceof Error ? err.message : '分析失败')
      } finally {
        setLoading(false)
      }
    }, 500) // 500ms 防抖延迟
    
    // 清理函数
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [dataHash, tabs])

  // Transform AI analysis results into tree format for Ant Design MindMap
  const createMindMapData = useCallback(() => {
    if (analysisResults.length === 0) {
      return {
        id: '等待分析...',
        type: 'rect',
        size: [200, 50],
        style: {
          fill: '#f0f0f0',
          stroke: '#d0d0d0',
          lineWidth: 1,
          radius: 4,
        },
        labelCfg: {
          style: {
            fill: '#666',
            fontSize: 12,
            fontWeight: 'normal',
          },
        },
        data: { uniqueId: 'empty' }
      }
    }

    // 如果有多个一级意图，创建根节点
    if (analysisResults.length > 1) {
      const intentNodes = analysisResults.map((intentResult: IntentAnalysisResult, resultIndex: number) => {
        // 为每个二级意图创建子节点
        const level2Nodes = intentResult.subcategories.map((subcategory: IntentSubcategory, index: number) => {
          // 获取该二级意图下的标签页
          const subcategoryTabs = tabs.filter((tab: chrome.tabs.Tab) => 
            subcategory.tab_ids.includes(tab.id || 0)
          )
          
          const tabChildren = subcategoryTabs.map((tab: chrome.tabs.Tab) => ({
            id: (tab.title || 'Untitled') + ' ' + getInvisibleCharacter(),
            type: 'rect',
            size: [160, 28],
            style: {
              fill: '#f0f9ff',
              stroke: '#0ea5e9',
              lineWidth: 1,
              radius: 3,
              cursor: 'pointer',
            },
            labelCfg: {
              style: {
                fill: '#0369a1',
                fontSize: 9,
                fontWeight: 'normal',
              },
            },
            data: { tab, uniqueId: `tab-${tab.id}` }
          }))

          return {
            id: subcategory.intent_level2,
            type: 'rect',
            size: [200, 35],
            style: {
              fill: '#dbeafe',
              stroke: '#3b82f6',
              lineWidth: 1,
              radius: 4,
            },
            labelCfg: {
              style: {
                fill: '#1e40af',
                fontSize: 10,
                fontWeight: 'medium',
              },
            },
            children: tabChildren,
            data: { level: 2, uniqueId: `level2-${resultIndex}-${index}` }
          }
        })

        return {
          id: intentResult.intent_level1,
          type: 'rect',
          size: [280, 50],
          style: {
            fill: '#1e40af',
            stroke: '#1e40af',
            lineWidth: 2,
            radius: 6,
          },
          labelCfg: {
            style: {
              fill: '#ffffff',
              fontSize: 14,
              fontWeight: 'bold',
            },
          },
          children: level2Nodes,
          data: { level: 1, uniqueId: `intent-${resultIndex}` }
        }
      })

      return {
        id: '标签页意图分析',
        type: 'rect',
        size: [300, 60],
        style: {
          fill: '#722ed1',
          stroke: '#722ed1',
          lineWidth: 2,
          radius: 8,
        },
        labelCfg: {
          style: {
            fill: '#ffffff',
            fontSize: 16,
            fontWeight: 'bold',
          },
        },
        children: intentNodes,
        data: { level: 0, uniqueId: 'root' }
      }
    } else {
      // 只有一个一级意图时，直接显示该意图的结构
      const intentResult = analysisResults[0]
      if (!intentResult) {
        return {
          id: '分析数据错误',
          type: 'rect',
          size: [200, 50],
          style: {
            fill: '#ff4d4f',
            stroke: '#ff4d4f',
            lineWidth: 1,
            radius: 4,
          },
          labelCfg: {
            style: {
              fill: '#ffffff',
              fontSize: 12,
              fontWeight: 'normal',
            },
          },
          data: { uniqueId: 'error' }
        }
      }
      
      const level2Nodes = intentResult.subcategories.map((subcategory: IntentSubcategory, index: number) => {
        const subcategoryTabs = tabs.filter((tab: chrome.tabs.Tab) => 
          subcategory.tab_ids.includes(tab.id || 0)
        )
        
        const tabChildren = subcategoryTabs.map((tab: chrome.tabs.Tab) => ({
          id: (tab.title || 'Untitled') + ' ' + getInvisibleCharacter(),
          type: 'rect',
          size: [160, 28],
          style: {
            fill: '#f0f9ff',
            stroke: '#0ea5e9',
            lineWidth: 1,
            radius: 3,
            cursor: 'pointer',
          },
          labelCfg: {
            style: {
              fill: '#0369a1',
              fontSize: 9,
              fontWeight: 'normal',
            },
          },
          data: { tab, uniqueId: `tab-${tab.id}` }
        }))

        return {
          id: subcategory.intent_level2,
          type: 'rect',
          size: [200, 35],
          style: {
            fill: '#dbeafe',
            stroke: '#3b82f6',
            lineWidth: 1,
            radius: 4,
          },
          labelCfg: {
            style: {
              fill: '#1e40af',
              fontSize: 10,
              fontWeight: 'medium',
            },
          },
          children: tabChildren,
          data: { level: 2, uniqueId: `level2-${index}` }
        }
      })

      return {
        id: intentResult.intent_level1,
        type: 'rect',
        size: [280, 50],
        style: {
          fill: '#1e40af',
          stroke: '#1e40af',
          lineWidth: 2,
          radius: 6,
        },
        labelCfg: {
          style: {
            fill: '#ffffff',
            fontSize: 14,
            fontWeight: 'bold',
          },
        },
        children: level2Nodes,
        data: { level: 1, uniqueId: 'root' }
      }
    }
  }, [analysisResults, tabs])

  const mindMapData = useMemo(() => createMindMapData(), [createMindMapData])

  const config = {
    autoFit: 'center' as const,
    type: "boxed" as const,
    data: mindMapData,
    layout: {
      type: 'mindmap',
      direction: 'H', // Horizontal layout
      getHGap: () => 40,
      getVGap: () => 10,
      getSide: () => 'right', // All children nodes on the right side
    },
  
    defaultNode: {
      type: 'rect',
      size: [120, 40],
      style: {
        fill: '#ffffff',
        stroke: '#1890ff',
        lineWidth: 1,
        radius: 4,
      },
      labelCfg: {
        style: {
          fill: '#333',
          fontSize: 12,
          fontWeight: 'normal',
        },
      },
    },
    onNodeClick: async (evt: any) => {
      const { item } = evt
      const model = item.getModel()
      
      // Handle tab clicks
      if (model.data?.tab?.id) {
        console.log('🔄 MindMap节点点击，跳转到标签页:', model.data.tab.title)
        const result = await navigateToTab(model.data.tab)
        showNavigationResult(result, `已从思维导图跳转到「${model.data.tab.title}」`)
      }
    },
  }

  // 加载状态
  if (loading) {
    return (
      <div className="h-96 border border-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
        <Spin size="large" tip="正在分析标签页..." />
      </div>
    )
  }

  // 错误状态
  if (error) {
    return (
      <div className="h-96 border border-gray-100 rounded-lg overflow-hidden p-4">
        <Alert
          message="分析失败"
          description={error}
          type="error"
          showIcon
          action={
            <button 
              onClick={() => window.location.reload()}
              className="text-blue-600 hover:text-blue-800"
            >
              重试
            </button>
          }
        />
      </div>
    )
  }

  // 没有标签页
  if (!tabs || tabs.length === 0) {
    return (
      <div className="h-96 border border-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
        <div className="text-center text-gray-500">
          <p>没有标签页可以分析</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-96 border border-gray-100 rounded-lg overflow-hidden">
      <MindMap {...config} />
    </div>
  )
}

// 使用 React.memo 和自定义比较函数来优化渲染
const Mindmap = React.memo(MindmapInternal, (prevProps, nextProps) => {
  // 使用我们的深度比较函数
  const isEqual = areGroupsEqual(prevProps.group, nextProps.group)
  
  if (!isEqual) {
    console.log('🔄 Props已变化，组件需要重新渲染', {
      prevGroupId: prevProps.group?.id,
      nextGroupId: nextProps.group?.id,
      prevTabsCount: prevProps.group?.tabs?.length || 0,
      nextTabsCount: nextProps.group?.tabs?.length || 0
    })
  } else {
    console.log('✅ Props未变化，跳过组件渲染')
  }
  
  return isEqual
})

Mindmap.displayName = 'Mindmap'

export default Mindmap
