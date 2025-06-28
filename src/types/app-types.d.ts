export interface TabInfo {
  id: number;
  url: string;
  title: string;
  favicon?: string;
  lastAccessed: number;
  domain: string;
  content?: string;
}

export interface HistoryItem {
  id: string;
  url: string;
  title: string;
  lastVisitTime: number;
  visitCount: number;
  domain: string;
}

export interface TabGroup {
  id: string;
  name: string;
  description: string;
  tabs: TabInfo[];
  keywords: string[];
  category: string;
  createdAt: number;
  updatedAt: number;
  confidence: number;
}

export interface AIAnalysis {
  summary: string;
  keywords: string[];
  category: string;
  relatedUrls: string[];
  confidence: number;
}

export interface Settings {
  aiProvider: 'openai' | 'anthropic' | 'local';
  apiKey?: string;
  enableAutoGrouping: boolean;
  maxHistoryDays: number;
  groupingFrequency: 'realtime' | 'hourly' | 'daily';
  privacyMode: boolean;
}

export interface StorageData {
  tabGroups: TabGroup[];
  settings: Settings;
  lastSync: number;
}

export interface MessageType {
  type: 'TAB_UPDATED' | 'ANALYZE_TAB' | 'GET_GROUPS' | 'UPDATE_SETTINGS' | 'SYNC_DATA' | 'GET_SETTINGS' | 'CLEAR_DATA' | 'EXPORT_DATA' | 'IMPORT_DATA' | 'GET_ANALYTICS' | 'GET_STORAGE_USAGE' | 'DELETE_GROUP';
  payload?: any;
}

export interface AIProvider {
  analyze(content: string, url: string): Promise<AIAnalysis>;
  groupTabs(tabs: TabInfo[]): Promise<TabGroup[]>;
}