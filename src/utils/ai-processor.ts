import type { TabGroup, IntentAnalysisResult } from '@shared/contexts/AppContext'

/**
 * AIProcessor - Centralized AI analysis utility for tab categorization and grouping
 * 
 * This module encapsulates the Coze API logic for analyzing browser tabs
 * and automatically creating Chrome tab groups based on AI categorization.
 */

interface TabData {
  id: number | undefined
  title: string | undefined
  url: string | undefined
}

// 旧的单层分析结果（保持兼容）
interface AnalysisResult {
  id: string
  category: string
  [key: string]: any
}

export class AIProcessor {
  private static readonly COZE_API_URL = "https://api.coze.cn/v1/workflow/run"
  private static readonly WORKFLOW_ID = "7520894694882525223"
  private static readonly API_KEY = "pat_gqb2WMNGMLRDwB85gyIhXxAxJDJZ7BM2bClu8H5imVrvvxV7oUMY8iLpdNUUMvSj"

  /**
   * Filter tabs to exclude extension pages
   */
  static filterTabs(tabs: chrome.tabs.Tab[]): chrome.tabs.Tab[] {
    return tabs.filter(tab => {
      if (!tab.url) return true
      const isExtensionPage = tab.url.startsWith(`chrome-extension://${chrome.runtime.id}/`)
      return !isExtensionPage
    })
  }

  /**
   * Prepare tab data for AI analysis
   */
  static prepareTabData(tabs: chrome.tabs.Tab[]): TabData[] {
    return tabs.map(tab => ({
      id: tab.id,
      title: tab.title,
      url: tab.url,
    }))
  }

  /**
   * Send tabs to Coze API for AI analysis and categorization (两层意图分析)
   */
  static async analyzeTabsWithAI(tabsData: TabData[]): Promise<IntentAnalysisResult[]> {
    console.log('🚀 Sending tabs to AI for analysis:', tabsData.length, 'tabs')
    console.log('📤 Tab data sample:', tabsData.slice(0, 2))

    const response = await fetch(this.COZE_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        "workflow_id": this.WORKFLOW_ID,
        "parameters": {
          "input": tabsData
        }
      })
    })

    if (!response.ok) {
      throw new Error(`Coze API error: ${response.status} ${response.statusText}`)
    }

    const responseData = await response.json()
    console.log('📥 Raw API response:', responseData)
    
    const llmOutput = JSON.parse(responseData.data).output
    console.log('🧠 LLM output:', llmOutput)
    
    const results: IntentAnalysisResult[] = JSON.parse(llmOutput)
    console.log('✅ Parsed two-level intent results:', results)
    
    // 验证并修复数据结构
    const validResults = results.filter(result => 
      result.intent_level1 && 
      result.subcategories && 
      Array.isArray(result.subcategories) &&
      result.subcategories.length > 0
    )
    
    console.log('🔧 Validated two-level intent results:', validResults)
    return validResults
  }

  /**
   * Create Chrome tab groups based on two-level intent analysis results
   * 每个一级意图创建一个TabGroup，包含该意图下的所有标签页
   */
  static async createChromeTabGroups(
    results: IntentAnalysisResult[], 
    originalTabs: chrome.tabs.Tab[]
  ): Promise<TabGroup[]> {
    console.log('🔨 Creating Chrome tab groups by level1 intent from results:', results)
    console.log('📋 Original tabs count:', originalTabs.length)

    const createdGroups: TabGroup[] = []
    
    for (const intentResult of results) {
      // 收集该一级意图下所有标签页的ID
      const allTabIds: number[] = []
      intentResult.subcategories.forEach(subcategory => {
        allTabIds.push(...subcategory.tab_ids.filter(id => id && id > 0))
      })
      
      console.log(`🏷️  Creating level1 group "${intentResult.intent_level1}" with ${allTabIds.length} total tabs`)
      
      if (allTabIds.length > 0) {
        try {
          // 为该一级意图创建一个Chrome标签页组
          const groupId = await chrome.tabs.group({ tabIds: allTabIds })
          await chrome.tabGroups.update(groupId, { title: intentResult.intent_level1 })
          
          // 获取该一级意图下的所有标签页
          const groupTabs = originalTabs.filter(tab => tab.id && allTabIds.includes(tab.id))
          
          console.log(`✅ Created level1 group "${intentResult.intent_level1}" with ${groupTabs.length} tabs`)
          console.log(`📂 Subcategories: ${intentResult.subcategories.map(s => s.intent_level2).join(', ')}`)
          
          createdGroups.push({
            id: `level1-${groupId}`,
            name: intentResult.intent_level1,
            tabs: groupTabs,
            category: intentResult.intent_level1,
            createdAt: new Date(),
            lastUpdated: new Date(),
            nativeGroupId: groupId,
            intentAnalysis: {
              intent_level1: intentResult.intent_level1,
              intent_level1_description: intentResult.intent_level1_description,
              subcategories: intentResult.subcategories
            }
          })
        } catch (error) {
          console.error(`❌ Failed to create level1 group "${intentResult.intent_level1}":`, error)
        }
      } else {
        console.log(`⚠️  Skipping level1 group "${intentResult.intent_level1}" - no valid tab IDs`)
      }
    }

    console.log('🎉 Successfully created level1 groups:', createdGroups.map(g => ({ 
      name: g.name, 
      tabCount: g.tabs.length,
      subcategoriesCount: g.intentAnalysis.subcategories.length
    })))
    
    return createdGroups
  }

  /**
   * Complete workflow: Analyze current window tabs and create groups
   * 
   * This is the main method that components should use for tab analysis
   */
  static async analyzeCurrentTabs(): Promise<{
    createdGroups: TabGroup[]
    totalTabsAnalyzed: number
  }> {
    try {
      // 1. Get tabs from current window
      const allTabs = await chrome.tabs.query({ currentWindow: true })
      
      // 2. Filter out extension pages
      const filteredTabs = this.filterTabs(allTabs)
      
      if (filteredTabs.length === 0) {
        throw new Error('No valid tabs found for analysis')
      }
      
      // 3. Prepare data for AI
      const tabsData = this.prepareTabData(filteredTabs)
      
      // 4. Send to AI for analysis
      const analysisResults = await this.analyzeTabsWithAI(tabsData)
      
      // 5. Create Chrome tab groups
      const createdGroups = await this.createChromeTabGroups(analysisResults, filteredTabs)
      
      console.log('✅ Tab analysis completed successfully:', {
        totalTabs: filteredTabs.length,
        groupsCreated: createdGroups.length,
        groups: createdGroups.map(g => ({ name: g.name, tabCount: g.tabs.length }))
      })
      
      return {
        createdGroups,
        totalTabsAnalyzed: filteredTabs.length
      }
      
    } catch (error) {
      console.error('❌ Tab analysis failed:', error)
      throw new Error(`Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get current window tabs with extension filtering (for preview)
   */
  static async getCurrentTabs(): Promise<chrome.tabs.Tab[]> {
    const allTabs = await chrome.tabs.query({ currentWindow: true })
    return this.filterTabs(allTabs)
  }
}