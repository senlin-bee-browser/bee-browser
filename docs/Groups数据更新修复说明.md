# Groups 数据更新修复说明

## 🐛 问题描述

在侧边栏面板中，Groups 的数量显示不正确，始终为 0，这是因为 `SidepanelApp` 组件没有在挂载时加载最新的 Groups 数据。

## 🔍 问题根源

1. **初始状态为空**: `AppContext` 中 `tabGroups` 的初始值是空数组 `[]`
2. **缺少数据加载**: `SidepanelApp` 组件没有在挂载时从存储或背景脚本加载数据
3. **无刷新机制**: 没有监听数据变化或提供手动刷新功能

## ✅ 解决方案

### 1. 添加数据加载逻辑

在 `SidepanelApp` 组件中添加了 `loadGroups` 函数：

```typescript
const loadGroups = async () => {
  try {
    dispatch({ type: "SET_LOADING", payload: true });

    // 通过 background script 获取集成的 groups（包括原生和自定义groups）
    const response = await chrome.runtime.sendMessage({ type: "GET_GROUPS" });

    if (response?.groups) {
      // 转换集成的 groups 为 AppContext 期望的格式
      const formattedGroups = response.groups.map((group: any) => ({
        id: group.id,
        name: group.name,
        tabs: group.tabs,
        category: group.category,
        createdAt: new Date(group.createdAt || Date.now()),
        lastUpdated: new Date(group.updatedAt || Date.now()),
      }));

      dispatch({ type: "SET_TAB_GROUPS", payload: formattedGroups });
    }
  } catch (error) {
    console.error("Failed to load groups:", error);
    dispatch({ type: "SET_ERROR", payload: "Failed to load tab groups" });
  } finally {
    dispatch({ type: "SET_LOADING", payload: false });
  }
};
```

### 2. 组件挂载时自动加载

```typescript
// 组件挂载时加载数据
useEffect(() => {
  loadGroups();
}, []);
```

### 3. 监听存储变化

```typescript
// 监听存储变化，自动更新数据
useEffect(() => {
  const handleStorageChange = (changes: {
    [key: string]: chrome.storage.StorageChange;
  }) => {
    if (changes["tabGroups"]) {
      loadGroups();
    }
  };

  chrome.storage.onChanged.addListener(handleStorageChange);
  return () => chrome.storage.onChanged.removeListener(handleStorageChange);
}, []);
```

### 4. 添加手动刷新功能

```typescript
// 刷新数据
const handleRefresh = async () => {
  setIsRefreshing(true);
  try {
    await loadGroups();
  } finally {
    setIsRefreshing(false);
  }
};
```

刷新按钮更新：

```tsx
<Button
  variant="ghost"
  size="sm"
  onClick={handleRefresh}
  loading={isRefreshing}
  disabled={state.isLoading}
>
  <RefreshCw className="w-4 h-4" />
</Button>
```

### 5. 优化相关操作

- **分析当前标签页**: 分析完成后自动刷新 Groups 数据
- **创建新分组**: 创建完成后自动刷新 Groups 数据
- **改进加载状态**: 只在初次加载且没有数据时显示加载动画

## 🔗 数据流

1. **组件挂载** → 调用 `loadGroups()`
2. **loadGroups()** → 发送 `GET_GROUPS` 消息到 background script
3. **TabGroupIntegration.getAllIntegratedGroups()** → 获取原生+自定义 Groups
4. **格式化数据** → 转换为 AppContext 期望的格式
5. **更新状态** → `dispatch({ type: 'SET_TAB_GROUPS', payload: groups })`
6. **UI 更新** → 显示正确的 Groups 数量和列表

## 🎯 核心改进

### 自动化数据同步

- 组件挂载时自动加载
- 存储变化时自动更新
- 相关操作后自动刷新

### 用户体验优化

- 提供手动刷新按钮
- 加载状态指示
- 错误处理和提示

### 数据完整性

- 获取集成的 Groups（原生 + 自定义）
- 正确的数据格式转换
- 类型安全的实现

## 🚀 测试步骤

1. **重新加载扩展**以应用更改
2. **打开侧边栏面板**
3. **验证 Groups 数量**是否正确显示
4. **创建新分组**，检查数量是否自动更新
5. **点击刷新按钮**，确认手动刷新功能
6. **分析当前标签页**，验证是否更新分组

## 📊 预期结果

- ✅ Groups 数量正确显示
- ✅ 数据实时同步更新
- ✅ 手动刷新功能正常
- ✅ 错误处理完善
- ✅ 加载状态清晰

---

_现在 Groups 数据会准确显示最新的数量和内容！_ 🎉
