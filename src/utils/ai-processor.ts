import type { TabGroup } from '@shared/contexts/AppContext'

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
  favIconUrl: string | undefined
  active: boolean | undefined
  pinned: boolean | undefined
  audible: boolean | undefined
  discarded: boolean | undefined
}

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
      favIconUrl: tab.favIconUrl,
      active: tab.active,
      pinned: tab.pinned,
      audible: tab.audible,
      discarded: tab.discarded,
    }))
  }

  /**
   * Send tabs to Coze API for AI analysis and categorization
   */
  static async analyzeTabsWithAI(tabsData: TabData[]): Promise<AnalysisResult[]> {
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
    const llmOutput = JSON.parse(responseData.data).output
    const results = JSON.parse(llmOutput)
    
    return results
  }

  /**
   * Create Chrome tab groups based on AI analysis results
   */
  static async createChromeTabGroups(
    results: AnalysisResult[], 
    originalTabs: chrome.tabs.Tab[]
  ): Promise<TabGroup[]> {
    // Group results by category manually
    const groupsMap = new Map<string, AnalysisResult[]>()
    results.forEach((result) => {
      const category = result.category
      if (!groupsMap.has(category)) {
        groupsMap.set(category, [])
      }
      groupsMap.get(category)!.push(result)
    })
    
    const createdGroups = await Promise.all(
      Array.from(groupsMap.entries()).map(async ([title, tabs]) => {
        const tabIds = tabs.map(t => +t.id).filter(Boolean)
        if (tabIds.length > 0) {
          const groupId = await chrome.tabs.group({ tabIds })
          await chrome.tabGroups.update(groupId, { title })
          
          // Create TabGroup object for app state
          const groupTabs = originalTabs.filter(tab => tabIds.includes(tab.id!))
          return {
            id: `native-${groupId}`,
            name: title,
            tabs: groupTabs,
            category: title,
            createdAt: new Date(),
            lastUpdated: new Date(),
            nativeGroupId: groupId
          }
        }
        return null
      })
    )

    return createdGroups.filter(Boolean) as TabGroup[]
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