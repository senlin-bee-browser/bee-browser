/**
 * Coze API 调用工具类
 * 基于 Coze 工作流聊天 API 文档实现
 * https://www.coze.cn/open/docs/developer_guides/workflow_chat
 */

interface CozeMessage {
  role: 'user' | 'assistant'
  content: string
}

interface CozeRequest {
  workflow_id: string
  additional_messages: CozeMessage[]
  parameters?: {
    ext?: any
  }
}

interface CozeResponse {
  code: number
  msg: string
  data: {
    id: string
    conversation_id: string
    status: string
    output: string
    error?: string
  }
}

interface StreamCallbacks {
  onProgress?: (content: string) => void
  onError?: (error: Error) => void
  onComplete?: (finalContent: string) => void
}

export class CozeAPI {
  private static readonly API_URL = "https://api.coze.cn/v1/workflows/chat"
  private static readonly WORKFLOW_ID = "7521002279249248306"
  private static readonly API_KEY = "pat_gqb2WMNGMLRDwB85gyIhXxAxJDJZ7BM2bClu8H5imVrvvxV7oUMY8iLpdNUUMvSj"

  /**
   * 发送消息到 Coze 工作流（流式输出版本）
   */
  static async sendMessageStream(
    userMessage: string,
    callbacks: StreamCallbacks,
    context?: {
      tabs?: chrome.tabs.Tab[]
      conversationHistory?: CozeMessage[]
    }
  ): Promise<string> {
    try {
      // 构建请求消息
      const messages: CozeMessage[] = []
      
      // 添加历史对话（如果有）
      if (context?.conversationHistory) {
        messages.push(...context.conversationHistory.slice(-5)) // 保留最近5条消息作为上下文
      }
      
      // 添加当前用户消息
      messages.push({
        role: 'user',
        content: userMessage
      })

      // 如果有标签页信息，添加到消息上下文中
      let enrichedMessage = userMessage
      if (context?.tabs && context.tabs.length > 0) {
        const tabsInfo = context.tabs.map(tab => ({
          title: tab.title || '无标题',
          url: tab.url || '',
          domain: tab.url ? this.extractDomain(tab.url) : ''
        }))
        
        enrichedMessage = `${userMessage}\n\n当前标签页信息：\n${JSON.stringify(tabsInfo, null, 2)}`
        
        // 更新最后一条消息
        if (messages.length > 0) {
          const lastMessage = messages[messages.length - 1]
          if (lastMessage) {
            lastMessage.content = enrichedMessage
          }
        }
      }

      const requestBody: CozeRequest = {
        workflow_id: this.WORKFLOW_ID,
        additional_messages: messages,
        parameters: {
          ext: null
        }
      }

      console.log('🚀 发送流式请求到 Coze API:', requestBody)

      const response = await fetch(this.API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.API_KEY}`,
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream'
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const error = new Error(`Coze API 请求失败: ${response.status} ${response.statusText}`)
        callbacks.onError?.(error)
        throw error
      }

      // 处理事件流响应（流式版本）
      const eventStream = await this.parseEventStreamWithCallbacks(response, callbacks)
      return eventStream

    } catch (error) {
      console.error('❌ Coze API 流式调用失败:', error)
      callbacks.onError?.(error as Error)
      throw error
    }
  }

  /**
   * 发送消息到 Coze 工作流
   */
  static async sendMessage(
    userMessage: string,
    context?: {
      tabs?: chrome.tabs.Tab[]
      conversationHistory?: CozeMessage[]
    }
  ): Promise<string> {
    try {
      // 构建请求消息
      const messages: CozeMessage[] = []
      
      // 添加历史对话（如果有）
      if (context?.conversationHistory) {
        messages.push(...context.conversationHistory.slice(-5)) // 保留最近5条消息作为上下文
      }
      
      // 添加当前用户消息
      messages.push({
        role: 'user',
        content: userMessage
      })

      // 如果有标签页信息，添加到消息上下文中
      let enrichedMessage = userMessage
      if (context?.tabs && context.tabs.length > 0) {
        const tabsInfo = context.tabs.map(tab => ({
          title: tab.title || '无标题',
          url: tab.url || '',
          domain: tab.url ? this.extractDomain(tab.url) : ''
        }))
        
        enrichedMessage = `${userMessage}\n\n当前标签页信息：\n${JSON.stringify(tabsInfo, null, 2)}`
        
        // 更新最后一条消息
        if (messages.length > 0) {
          const lastMessage = messages[messages.length - 1]
          if (lastMessage) {
            lastMessage.content = enrichedMessage
          }
        }
      }

      const requestBody: CozeRequest = {
        workflow_id: this.WORKFLOW_ID,
        additional_messages: messages,
        parameters: {
          ext: null
        }
      }

      console.log('🚀 发送请求到 Coze API:', requestBody)

      const response = await fetch(this.API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.API_KEY}`,
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream'
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        throw new Error(`Coze API 请求失败: ${response.status} ${response.statusText}`)
      }

      // 处理事件流响应
      const eventStream = await this.parseEventStream(response)
      return eventStream

    } catch (error) {
      console.error('❌ Coze API 调用失败:', error)
      throw error
    }
  }

  /**
   * 解析事件流响应（支持流式回调）
   */
  private static async parseEventStreamWithCallbacks(response: Response, callbacks: StreamCallbacks): Promise<string> {
    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('无法读取响应流')
    }

    const decoder = new TextDecoder()
    let buffer = ''
    let finalContent = ''
    let chatStatus = 'created'
    let lastError = null

    try {
      while (true) {
        const { done, value } = await reader.read()
        
        if (done) {
          break
        }

        // 将字节流转换为文本
        buffer += decoder.decode(value, { stream: true })
        
        // 按行分割处理事件
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // 保留最后不完整的行
        
        for (const line of lines) {
          if (line.trim() === '') continue
          
          // 解析事件行
          if (line.startsWith('event: ')) {
            const eventType = line.substring(7).trim();
            console.log('📥 事件类型:', eventType, "Data Stream:", line);
            continue
          }
          
          if (line.startsWith('data: ')) {
            const eventData = line.substring(6).trim()
            
            if (eventData === '') continue
            
            try {
              const data = JSON.parse(eventData)
              
              // 处理不同类型的事件
              if (data.status) {
                chatStatus = data.status
                if (data.last_error && data.last_error.code !== 0) {
                  lastError = data.last_error
                }
              }
              
              // 收集消息内容片段并实时回调
              if (data.role === 'assistant' && data.type === 'answer' && data.content) {
                // 对于 delta 事件，累积内容
                if (data.content_type === 'text') {
                  // 根据事件流的特点，每个delta可能包含累积的完整内容
                  // 我们保存最新的完整内容
                  finalContent = data.content
                  
                  // 实时回调更新内容
                  callbacks.onProgress?.(finalContent)
                }
              }
              
              console.log('📥 事件数据:', data)
              
            } catch (parseError) {
              console.warn('解析事件数据失败:', parseError, eventData)
            }
          }
        }
      }
    } finally {
      reader.releaseLock()
    }

    // 检查执行状态
    if (chatStatus === 'error' || lastError) {
      const error = new Error(`工作流执行错误: ${lastError?.msg || '未知错误'}`)
      callbacks.onError?.(error)
      throw error
    }

    if (!finalContent) {
      const error = new Error('没有收到有效的回复内容')
      callbacks.onError?.(error)
      throw error
    }

    console.log('✅ 最终响应内容:', finalContent)
    callbacks.onComplete?.(finalContent)
    return finalContent
  }

  /**
   * 解析事件流响应
   */
  private static async parseEventStream(response: Response): Promise<string> {
    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('无法读取响应流')
    }

    const decoder = new TextDecoder()
    let buffer = ''
    let finalContent = ''
    let chatStatus = 'created'
    let lastError = null

    try {
      while (true) {
        const { done, value } = await reader.read()
        
        if (done) {
          break
        }

        // 将字节流转换为文本
        buffer += decoder.decode(value, { stream: true })
        
        // 按行分割处理事件
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // 保留最后不完整的行
        
        for (const line of lines) {
          if (line.trim() === '') continue
          
          // 解析事件行
          if (line.startsWith('event: ')) {
            const eventType = line.substring(7).trim();
            console.log('📥 事件类型:', eventType, "Data Stream:", line);
            continue
          }
          
          if (line.startsWith('data: ')) {
            const eventData = line.substring(6).trim()
            
            if (eventData === '') continue
            
            try {
              const data = JSON.parse(eventData)
              
              // 处理不同类型的事件
              if (data.status) {
                chatStatus = data.status
                if (data.last_error && data.last_error.code !== 0) {
                  lastError = data.last_error
                }
              }
              
              // 收集消息内容片段
              if (data.role === 'assistant' && data.type === 'answer' && data.content) {
                // 对于 delta 事件，累积内容
                if (data.content_type === 'text') {
                  // 根据事件流的特点，每个delta可能包含累积的完整内容
                  // 我们保存最新的完整内容
                  finalContent = data.content
                }
              }
              
              console.log('📥 事件数据:', data)
              
            } catch (parseError) {
              console.warn('解析事件数据失败:', parseError, eventData)
            }
          }
        }
      }
    } finally {
      reader.releaseLock()
    }

    // 检查执行状态
    if (chatStatus === 'error' || lastError) {
      throw new Error(`工作流执行错误: ${lastError?.msg || '未知错误'}`)
    }

    if (!finalContent) {
      throw new Error('没有收到有效的回复内容')
    }

    console.log('✅ 最终响应内容:', finalContent)
    return finalContent
  }

  /**
   * 分析标签页的专用方法
   */
  static async analyzeTabsWithCoze(tabs: chrome.tabs.Tab[]): Promise<string> {
    if (tabs.length === 0) {
      return '没有找到需要分析的标签页。'
    }

    const tabsData = tabs.map(tab => ({
      title: tab.title || '无标题',
      url: tab.url || '',
      domain: tab.url ? this.extractDomain(tab.url) : '',
      active: tab.active || false,
      pinned: tab.pinned || false
    }))

    const analysisPrompt = `请分析以下 ${tabs.length} 个网页，总结这些网页的内容：${JSON.stringify(tabsData, null, 2)}`

    try {
      const result = await this.sendMessage(analysisPrompt)
      return result
    } catch (error) {
      console.error('标签页分析失败:', error)
      return '抱歉，标签页分析服务暂时不可用，请稍后再试。'
    }
  }

  /**
   * 提取域名
   */
  private static extractDomain(url: string): string {
    try {
      return new URL(url).hostname
    } catch {
      return url
    }
  }

  /**
   * 检查 API 连接状态
   */
  static async checkConnection(): Promise<boolean> {
    try {
      const testMessage = "你好，请回复确认连接正常。"
      await this.sendMessage(testMessage)
      return true
    } catch {
      return false
    }
  }
} 