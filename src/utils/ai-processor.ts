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
    }))
  }

  /**
   * Send tabs to Coze API for AI analysis and categorization
   */
  static async analyzeTabsWithAI(tabsData: TabData[]): Promise<AnalysisResult[]> {
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
    
    const results = JSON.parse(llmOutput)
    console.log('✅ Parsed results:', results)
    
    // Fix empty IDs by mapping results back to original tabs
    const validResults = results.map((result: any, index: number) => ({
      id: tabsData[index]?.id?.toString() || index.toString(),
      category: result.category
    })).filter((result: any) => result.id && result.category)
    
    console.log('🔧 Fixed results with proper IDs:', validResults)
    return validResults
  }

  /**
   * Create Chrome tab groups based on AI analysis results
   */
  static async createChromeTabGroups(
    results: AnalysisResult[], 
    originalTabs: chrome.tabs.Tab[]
  ): Promise<TabGroup[]> {
    console.log('🔨 Creating Chrome tab groups from results:', results)
    console.log('📋 Original tabs count:', originalTabs.length)

    // Group results by category manually
    const groupsMap = new Map<string, AnalysisResult[]>()
    results.forEach((result) => {
      const category = result.category
      if (!groupsMap.has(category)) {
        groupsMap.set(category, [])
      }
      groupsMap.get(category)!.push(result)
    })
    
    console.log('📊 Groups map:', Array.from(groupsMap.entries()))
    
    const createdGroups = await Promise.all(
      Array.from(groupsMap.entries()).map(async ([title, tabResults]) => {
        const tabIds = tabResults
          .map(t => parseInt(t.id))
          .filter(id => !isNaN(id) && id > 0)
        
        console.log(`🏷️  Creating group "${title}" with tab IDs:`, tabIds)
        
        if (tabIds.length > 0) {
          try {
            const groupId = await chrome.tabs.group({ tabIds })
            await chrome.tabGroups.update(groupId, { title })
            
            // Create TabGroup object for app state
            const groupTabs = originalTabs.filter(tab => tab.id && tabIds.includes(tab.id))
            
            console.log(`✅ Created group "${title}" with ${groupTabs.length} tabs`)
            
            return {
              id: `native-${groupId}`,
              name: title,
              tabs: groupTabs,
              category: title,
              createdAt: new Date(),
              lastUpdated: new Date(),
              nativeGroupId: groupId
            }
          } catch (error) {
            console.error(`❌ Failed to create group "${title}":`, error)
            return null
          }
        }
        console.log(`⚠️  Skipping group "${title}" - no valid tab IDs`)
        return null
      })
    )

    const validGroups = createdGroups.filter(Boolean) as TabGroup[]
    console.log('🎉 Successfully created groups:', validGroups.map(g => ({ name: g.name, tabCount: g.tabs.length })))
    
    return validGroups
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