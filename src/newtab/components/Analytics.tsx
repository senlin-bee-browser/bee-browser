import { MindMap } from '@ant-design/graphs'
import React from 'react'

export default function Analytics({group}: {group: any}) {
  // const activePage = {} as any;

  // const getCurrentGroup = () => {
  //   if (activePage.startsWith('group-')) {
  //     const groupId = activePage.replace('group-', '')
  //     return state.tabGroups.find(group => group.id === groupId)
  //   } 
  //   return null;
  // }

  // const group = getCurrentGroup()


  console.log("%c group", "color: red", group)

    // Transform group and tabs data into tree format for Ant Design MindMap
    const createMindMapData = () => {
      // 展示完整的三层结构：一级意图 -> 多个二级意图 -> 每个二级意图下的标签页
      if (group.intentAnalysis) {
        // 为每个二级意图创建子节点
        const level2Nodes = group.intentAnalysis.subcategories.map((subcategory, index) => {
          // 获取该二级意图下的标签页
          const subcategoryTabs = group.tabs.filter(tab => 
            subcategory.tab_ids.includes(tab.id || 0)
          )
          
          const tabChildren = subcategoryTabs.map((tab) => ({
            id: tab.title || 'Untitled', // 使用id字段显示标签页标题
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
            data: { tab, uniqueId: `tab-${tab.id}` } // 保存真实ID用于点击处理
          }))
  
          return {
            id: subcategory.intent_level2, // 使用id字段显示二级意图
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
            data: { level: 2, uniqueId: `level2-${index}` } // 保存层级信息
          }
        })
  
        return {
          id: group.intentAnalysis.intent_level1, // 使用id字段显示一级意图
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
          data: { level: 1, uniqueId: 'root' } // 保存层级信息
        }
      } else {
        // 兼容旧的单层结构
        const children = group.tabs.map((tab) => ({
          id: tab.title || 'Untitled', // 使用id字段显示标签页标题
          type: 'rect',
          size: [200, 35],
          style: {
            fill: '#ffffff',
            stroke: '#52c41a',
            lineWidth: 1,
            radius: 4,
            cursor: 'pointer',
          },
          labelCfg: {
            style: {
              fill: '#333',
              fontSize: 11,
              fontWeight: 'normal',
            },
          },
          data: { tab, uniqueId: `tab-${tab.id}` } // 保存真实ID用于点击处理
        }))
  
        return {
          id: group.name, // 使用id字段显示组名
          type: 'rect',
          size: [150, 50],
          style: {
            fill: '#1890ff',
            stroke: '#1890ff',
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
          children,
          data: { level: 1, uniqueId: 'root' } // 保存层级信息
        }
      }
    }
  const mindMapData = createMindMapData()

  const config = {
    data: mindMapData,
    layout: {
      type: 'mindmap',
      direction: 'H', // Horizontal layout
      getHGap: () => 100,
      getVGap: () => 50,
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
    onNodeClick: (evt: any) => {
      const { item } = evt
      const model = item.getModel()
      
      // Handle tab clicks
      if (model.data?.tab?.id) {
        // onTabClick(model.data.tab.id)
      }
    },
  }


  return (
    <div className="h-96 border border-gray-100 rounded-lg overflow-hidden">
    <MindMap {...config} />
  </div>
  )
}
