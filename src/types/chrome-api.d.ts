declare namespace chrome {
  namespace sidePanel {
    interface SidePanelOptions {
      path?: string;
      enabled?: boolean;
      tabId?: number;
    }
    
    function setOptions(options: SidePanelOptions): Promise<void>;
    function getOptions(options: { tabId?: number }): Promise<SidePanelOptions>;
  }
  
  namespace action {
    function setBadgeText(details: { text: string; tabId?: number }): Promise<void>;
    function setBadgeBackgroundColor(details: { color: string; tabId?: number }): Promise<void>;
  }
}

export interface ExtendedTab extends chrome.tabs.Tab {
  lastAccessed?: number;
  domain?: string;
}