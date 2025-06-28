import type { AIAnalysis, AIProvider, Settings, TabInfo } from '../types/app-types';

export class AIProcessor implements AIProvider {
  private settings: Settings;

  constructor(settings: Settings) {
    this.settings = settings;
  }

  async analyze(content: string, url: string): Promise<AIAnalysis> {
    try {
      switch (this.settings.aiProvider) {
        case 'openai':
          return await this.analyzeWithOpenAI(content, url);
        case 'anthropic':
          return await this.analyzeWithAnthropic(content, url);
        case 'local':
          return await this.analyzeLocally(content, url);
        default:
          throw new Error(`Unsupported AI provider: ${this.settings.aiProvider}`);
      }
    } catch (error) {
      console.error('Error in AI analysis:', error);
      return this.getFallbackAnalysis(content, url);
    }
  }

  async groupTabs(tabs: TabInfo[]): Promise<import('../types/app-types').TabGroup[]> {
    if (tabs.length === 0) return [];

    try {
      const analyses = await Promise.all(
        tabs.map(tab => this.analyze(tab.content || '', tab.url))
      );

      const groups = this.clusterByCategory(tabs, analyses);
      return groups.map(group => ({
        id: this.generateGroupId(),
        name: this.generateGroupName(group.tabs, group.analyses),
        description: this.generateGroupDescription(group.tabs, group.analyses),
        tabs: group.tabs,
        keywords: this.extractGroupKeywords(group.analyses),
        category: this.determineGroupCategory(group.analyses),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        confidence: this.calculateGroupConfidence(group.analyses)
      }));
    } catch (error) {
      console.error('Error grouping tabs:', error);
      return this.getFallbackGrouping(tabs);
    }
  }

  private async analyzeWithOpenAI(content: string, url: string): Promise<AIAnalysis> {
    if (!this.settings.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const prompt = this.createAnalysisPrompt(content, url);
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.settings.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
        temperature: 0.3
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const result = data.choices[0]?.message?.content;
    
    return this.parseAIResponse(result);
  }

  private async analyzeWithAnthropic(content: string, url: string): Promise<AIAnalysis> {
    if (!this.settings.apiKey) {
      throw new Error('Anthropic API key not configured');
    }

    const prompt = this.createAnalysisPrompt(content, url);
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.settings.apiKey}`,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.statusText}`);
    }

    const data = await response.json();
    const result = data.content[0]?.text;
    
    return this.parseAIResponse(result);
  }

  private async analyzeLocally(content: string, url: string): Promise<AIAnalysis> {
    const urlObj = new URL(url);
    const domain = urlObj.hostname;
    
    const keywords = this.extractKeywords(content);
    const category = this.categorizeByDomain(domain) || this.categorizeByKeywords(keywords);
    
    return {
      summary: this.generateLocalSummary(content),
      keywords,
      category,
      relatedUrls: [],
      confidence: 0.7
    };
  }

  private createAnalysisPrompt(content: string, url: string): string {
    return `Analyze this web page content and provide a JSON response with the following structure:
{
  "summary": "Brief summary of the content (max 100 chars)",
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "category": "category name",
  "relatedUrls": [],
  "confidence": 0.8
}

URL: ${url}
Content: ${content.substring(0, 1500)}

Respond only with valid JSON.`;
  }

  private parseAIResponse(response: string): AIAnalysis {
    try {
      const cleaned = response.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      
      return {
        summary: parsed.summary || 'No summary available',
        keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
        category: parsed.category || 'General',
        relatedUrls: Array.isArray(parsed.relatedUrls) ? parsed.relatedUrls : [],
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5
      };
    } catch (error) {
      console.warn('Failed to parse AI response:', error);
      return {
        summary: 'Analysis failed',
        keywords: [],
        category: 'Unknown',
        relatedUrls: [],
        confidence: 0.1
      };
    }
  }

  private getFallbackAnalysis(content: string, url: string): AIAnalysis {
    const urlObj = new URL(url);
    const keywords = this.extractKeywords(content);
    
    return {
      summary: `Content from ${urlObj.hostname}`,
      keywords,
      category: this.categorizeByDomain(urlObj.hostname) || 'General',
      relatedUrls: [],
      confidence: 0.3
    };
  }

  private extractKeywords(content: string): string[] {
    const words = content
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3);
    
    const frequency: { [key: string]: number } = {};
    words.forEach(word => {
      frequency[word] = (frequency[word] || 0) + 1;
    });
    
    return Object.entries(frequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([word]) => word);
  }

  private categorizeByDomain(domain: string): string | null {
    const categories: { [key: string]: string } = {
      'github.com': 'Development',
      'stackoverflow.com': 'Development',
      'youtube.com': 'Entertainment',
      'netflix.com': 'Entertainment',
      'amazon.com': 'Shopping',
      'ebay.com': 'Shopping',
      'news.ycombinator.com': 'News',
      'reddit.com': 'Social',
      'twitter.com': 'Social',
      'linkedin.com': 'Professional',
      'docs.google.com': 'Productivity',
      'notion.so': 'Productivity'
    };
    
    return categories[domain] || null;
  }

  private categorizeByKeywords(keywords: string[]): string {
    const categoryKeywords: { [key: string]: string[] } = {
      'Development': ['code', 'programming', 'javascript', 'python', 'api', 'github'],
      'News': ['news', 'breaking', 'politics', 'world', 'update'],
      'Shopping': ['buy', 'price', 'product', 'cart', 'order'],
      'Entertainment': ['video', 'music', 'movie', 'game', 'watch'],
      'Education': ['learn', 'course', 'tutorial', 'study', 'education'],
      'Research': ['research', 'analysis', 'data', 'study', 'academic']
    };
    
    for (const [category, catKeywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(keyword => catKeywords.includes(keyword))) {
        return category;
      }
    }
    
    return 'General';
  }

  private clusterByCategory(tabs: TabInfo[], analyses: AIAnalysis[]): Array<{ tabs: TabInfo[], analyses: AIAnalysis[] }> {
    const groups: { [category: string]: { tabs: TabInfo[], analyses: AIAnalysis[] } } = {};
    
    for (let i = 0; i < tabs.length; i++) {
      const tab = tabs[i];
      const analysis = analyses[i];
      if (!tab || !analysis) continue;
      const category = analysis.category;
      
      if (!groups[category]) {
        groups[category] = { tabs: [], analyses: [] };
      }
      
      groups[category].tabs.push(tab);
      groups[category].analyses.push(analysis);
    }
    
    return Object.values(groups);
  }

  private generateGroupName(tabs: TabInfo[], analyses: AIAnalysis[]): string {
    const category = analyses[0]?.category || 'General';
    const domains = [...new Set(tabs.map(tab => new URL(tab.url).hostname))];
    
    if (domains.length === 1) {
      return `${category} - ${domains[0]}`;
    }
    
    return `${category} (${tabs.length} tabs)`;
  }

  private generateGroupDescription(tabs: TabInfo[], analyses: AIAnalysis[]): string {
    const category = analyses[0]?.category || 'General';
    const domains = [...new Set(tabs.map(tab => new URL(tab.url).hostname))];
    
    return `${category} related content from ${domains.length} ${domains.length === 1 ? 'domain' : 'domains'}`;
  }

  private extractGroupKeywords(analyses: AIAnalysis[]): string[] {
    const allKeywords = analyses.flatMap(a => a.keywords);
    const frequency: { [key: string]: number } = {};
    
    allKeywords.forEach(keyword => {
      frequency[keyword] = (frequency[keyword] || 0) + 1;
    });
    
    return Object.entries(frequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([keyword]) => keyword);
  }

  private determineGroupCategory(analyses: AIAnalysis[]): string {
    const categories = analyses.map(a => a.category);
    const frequency: { [key: string]: number } = {};
    
    categories.forEach(category => {
      frequency[category] = (frequency[category] || 0) + 1;
    });
    
    return Object.entries(frequency)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 'General';
  }

  private calculateGroupConfidence(analyses: AIAnalysis[]): number {
    if (analyses.length === 0) return 0;
    
    const avgConfidence = analyses.reduce((sum, a) => sum + a.confidence, 0) / analyses.length;
    return Math.round(avgConfidence * 100) / 100;
  }

  private generateLocalSummary(content: string): string {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
    return sentences[0]?.trim().substring(0, 100) || 'No summary available';
  }

  private getFallbackGrouping(tabs: TabInfo[]): import('../types/app-types').TabGroup[] {
    const domainGroups: { [domain: string]: TabInfo[] } = {};
    
    tabs.forEach(tab => {
      const domain = new URL(tab.url).hostname;
      if (!domainGroups[domain]) {
        domainGroups[domain] = [];
      }
      domainGroups[domain].push(tab);
    });
    
    return Object.entries(domainGroups).map(([domain, domainTabs]) => ({
      id: this.generateGroupId(),
      name: `${domain} (${domainTabs.length} tabs)`,
      description: `Tabs from ${domain}`,
      tabs: domainTabs,
      keywords: [domain],
      category: this.categorizeByDomain(domain) || 'General',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      confidence: 0.5
    }));
  }

  private generateGroupId(): string {
    return `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}