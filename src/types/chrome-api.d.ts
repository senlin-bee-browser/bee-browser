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

  namespace tabGroups {
    type Color = 'grey' | 'blue' | 'red' | 'yellow' | 'green' | 'pink' | 'purple' | 'cyan' | 'orange';
    
    interface TabGroup {
      id: number;
      collapsed: boolean;
      color: Color;
      title?: string;
      windowId: number;
    }

    interface CreateProperties {
      tabIds: number[];
    }

    interface UpdateProperties {
      collapsed?: boolean;
      color?: Color;
      title?: string;
    }

    interface QueryInfo {
      collapsed?: boolean;
      color?: Color;
      title?: string;
      windowId?: number;
    }

    function create(createProperties: CreateProperties): Promise<TabGroup>;
    function get(groupId: number): Promise<TabGroup>;
    function query(queryInfo?: QueryInfo): Promise<TabGroup[]>;
    function update(groupId: number, updateProperties: UpdateProperties): Promise<TabGroup>;
    function move(groupId: number, moveProperties: { index: number; windowId?: number }): Promise<TabGroup>;
    function ungroup(tabIds: number[]): Promise<void>;

    namespace onCreated {
      function addListener(callback: (group: TabGroup) => void): void;
      function removeListener(callback: (group: TabGroup) => void): void;
    }

    namespace onRemoved {
      function addListener(callback: (group: TabGroup) => void): void;
      function removeListener(callback: (group: TabGroup) => void): void;
    }

    namespace onUpdated {
      function addListener(callback: (group: TabGroup) => void): void;
      function removeListener(callback: (group: TabGroup) => void): void;
    }

    namespace onMoved {
      function addListener(callback: (group: TabGroup) => void): void;
      function removeListener(callback: (group: TabGroup) => void): void;
    }
  }

  namespace tabs {
    interface GroupOptions {
      groupId?: number;
      tabIds: number[];
    }
    
    function group(options: GroupOptions): Promise<number>;
  }
}

export interface ExtendedTab extends chrome.tabs.Tab {
  lastAccessed?: number;
  domain?: string;
}