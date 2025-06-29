import React, { createContext, useContext, useReducer, ReactNode } from 'react'

// AI分析返回的二层意图结构
interface IntentSubcategory {
  intent_level2: string
  tab_ids: number[]
}

interface IntentAnalysisResult {
  intent_level1: string
  intent_level1_description: string
  subcategories: IntentSubcategory[]
}

// Chrome标签页分组结构（每个TabGroup代表一个一级意图）
interface TabGroup {
  id: string
  name: string // 一级意图名称
  tabs: chrome.tabs.Tab[] // 该一级意图下的所有标签页
  category: string // 等同于name，保持兼容
  createdAt: Date
  lastUpdated: Date
  nativeGroupId?: number
  // 两层意图分析结果：一个一级意图包含多个二级意图
  intentAnalysis?: {
    intent_level1: string // 一级意图
    intent_level1_description: string // 一级意图描述
    subcategories: IntentSubcategory[] // 该一级意图下的所有二级意图
  }
}

interface AppState {
  tabGroups: TabGroup[]
  activeTabId: number | null
  isLoading: boolean
  error: string | null
  settings: {
    aiProvider: 'openai' | 'claude' | 'local'
    autoGrouping: boolean
    maxHistoryDays: number
  }
}

type AppAction = 
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_TAB_GROUPS'; payload: TabGroup[] }
  | { type: 'ADD_TAB_GROUP'; payload: TabGroup }
  | { type: 'UPDATE_TAB_GROUP'; payload: { id: string; updates: Partial<TabGroup> } }
  | { type: 'DELETE_TAB_GROUP'; payload: string }
  | { type: 'SET_ACTIVE_TAB'; payload: number | null }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<AppState['settings']> }

const initialState: AppState = {
  tabGroups: [],
  activeTabId: null,
  isLoading: false,
  error: null,
  settings: {
    aiProvider: 'openai',
    autoGrouping: true,
    maxHistoryDays: 30,
  }
}

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload }
    
    case 'SET_ERROR':
      return { ...state, error: action.payload }
    
    case 'SET_TAB_GROUPS':
      return { ...state, tabGroups: action.payload }
    
    case 'ADD_TAB_GROUP':
      return { ...state, tabGroups: [...state.tabGroups, action.payload] }
    
    case 'UPDATE_TAB_GROUP':
      return {
        ...state,
        tabGroups: state.tabGroups.map(group =>
          group.id === action.payload.id
            ? { ...group, ...action.payload.updates, lastUpdated: new Date() }
            : group
        )
      }
    
    case 'DELETE_TAB_GROUP':
      return {
        ...state,
        tabGroups: state.tabGroups.filter(group => group.id !== action.payload)
      }
    
    case 'SET_ACTIVE_TAB':
      return { ...state, activeTabId: action.payload }
    
    case 'UPDATE_SETTINGS':
      return {
        ...state,
        settings: { ...state.settings, ...action.payload }
      }
    
    default:
      return state
  }
}

interface AppContextType {
  state: AppState
  dispatch: React.Dispatch<AppAction>
}

const AppContext = createContext<AppContextType | undefined>(undefined)

interface AppProviderProps {
  children: ReactNode
}

export function AppProvider({ children }: AppProviderProps) {
  const [state, dispatch] = useReducer(appReducer, initialState)

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const context = useContext(AppContext)
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return context
}

export type { TabGroup, AppState, AppAction, IntentAnalysisResult, IntentSubcategory }