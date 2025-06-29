import React, { useState, useCallback } from "react";
import { Bubble, Sender } from "@ant-design/x";
import { Button, Card, message } from "antd";
import { UserOutlined, RobotOutlined, WifiOutlined } from "@ant-design/icons";
import { AIProcessor } from "@utils/ai-processor";
import { CozeAPI } from "@utils/coze-api";
import "./AIChatBox.css";

interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
  status?: "loading" | "complete" | "error";
  typing?: boolean;
}

interface AIChatBoxProps {
  currentTabs?: chrome.tabs.Tab[];
  onAnalyzeTabs?: () => void;
}

export default function AIChatBox({
  currentTabs = [],
  onAnalyzeTabs,
}: AIChatBoxProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content: "您好！我是 Bee Bee，有什么想问的吗？",
      role: "assistant",
      timestamp: new Date(),
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [apiConnected, setApiConnected] = useState<boolean | null>(null);

  // 检查 API 连接状态
  const checkAPIConnection = useCallback(async () => {
    try {
      const connected = await CozeAPI.checkConnection();
      setApiConnected(connected);
      return connected;
    } catch {
      setApiConnected(false);
      return false;
    }
  }, []);

  // 初始化时检查连接
  React.useEffect(() => {
    checkAPIConnection();
  }, [checkAPIConnection]);

  // 添加消息
  const addMessage = useCallback(
    (
      content: string,
      role: "user" | "assistant",
      status?: "loading" | "complete" | "error"
    ) => {
      const newMessage: Message = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        content,
        role,
        timestamp: new Date(),
        status: status || "complete",
        typing: status === "loading",
      };
      setMessages((prev) => [...prev, newMessage]);
      return newMessage;
    },
    []
  );

  // 更新消息内容（用于流式更新）
  const updateMessage = useCallback(
    (
      messageId: string,
      content: string,
      status?: "loading" | "complete" | "error"
    ) => {
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id === messageId) {
            const originalContent = msg.content;
            const newContent = originalContent + content;

            return {
              ...msg,
              content: newContent,
              status: status || msg.status || "complete",
              typing: status === "loading",
            };
          }
          return msg;
        })
      );
    },
    []
  );

  // 处理用户输入
  const handleUserInput = useCallback(
    async (userInput: string) => {
      if (!userInput.trim()) return;

      // 添加用户消息
      addMessage(userInput.trim(), "user");
      setLoading(true);

      // 为助手创建一个占位消息，用于流式更新
      const assistantMessage = addMessage(
        "正在思考中...",
        "assistant",
        "loading"
      );

      try {
        // 检查是否是标签页分析相关的请求
        const isTabAnalysisRequest =
          userInput.toLowerCase().includes("分析") ||
          userInput.toLowerCase().includes("标签") ||
          userInput.toLowerCase().includes("分组") ||
          userInput.toLowerCase().includes("整理");

        if (isTabAnalysisRequest && currentTabs.length > 0) {
          // 使用 Coze API 进行标签页分析（流式）
          await CozeAPI.sendMessageStream(
            `请分析以下 ${
              currentTabs.length
            } 个网页，总结这些网页的内容：${JSON.stringify(
              currentTabs.map((tab) => ({
                title: tab.title || "无标题",
                url: tab.url || "",
                domain: tab.url ? new URL(tab.url).hostname : "",
              })),
              null,
              2
            )}`,
            {
              onProgress: (content) => {
                // 实时更新助手消息内容
                updateMessage(assistantMessage.id, content, "loading");
              },
              onComplete: (finalContent) => {
                console.log("✅ 流式输出完成:", finalContent);
                updateMessage(assistantMessage.id, finalContent, "complete");
                setLoading(false);
              },
              onError: (error) => {
                console.error("流式输出错误:", error);
                updateMessage(
                  assistantMessage.id,
                  "抱歉，分析失败了。",
                  "error"
                );
                throw error;
              },
            },
            {
              tabs: currentTabs,
              conversationHistory: messages.slice(-5).map((msg) => ({
                role: msg.role,
                content: msg.content,
              })),
            }
          );
        } else {
          // 构建对话历史作为上下文
          const conversationHistory = messages.slice(-5).map((msg) => ({
            role: msg.role,
            content: msg.content,
          }));

          // 使用 Coze API 进行对话（流式）
          await CozeAPI.sendMessageStream(
            userInput,
            {
              onProgress: (content) => {
                // 实时更新助手消息内容
                updateMessage(assistantMessage.id, content, "loading");
              },
              onComplete: (finalContent) => {
                console.log("✅ 流式输出完成:", finalContent);
                updateMessage(assistantMessage.id, finalContent, "complete");
                setLoading(false);
              },
              onError: (error) => {
                console.error("流式输出错误:", error);
                updateMessage(
                  assistantMessage.id,
                  "抱歉，回复失败了。",
                  "error"
                );
                throw error;
              },
            },
            {
              tabs: currentTabs,
              conversationHistory,
            }
          );
        }
      } catch (error) {
        console.error("AI 回复失败:", error);

        // 降级到本地预设回复
        const fallbackResponse = await generateFallbackResponse(
          userInput,
          currentTabs
        );

        // 更新助手消息为降级回复
        updateMessage(assistantMessage.id, fallbackResponse, "complete");

        setLoading(false);
        message.error("AI 服务暂时不可用，已切换到本地模式");
        setApiConnected(false);
      }
    },
    [currentTabs, addMessage, updateMessage, messages]
  );

  // 执行标签页分析
  const handleAnalyzeTabs = useCallback(async () => {
    if (currentTabs.length === 0) {
      message.warning("没有找到需要分析的标签页");
      return;
    }

    setLoading(true);

    try {
      // 添加分析开始消息
      addMessage("开始分析我的标签页", "user");

      // 为助手创建一个占位消息，用于流式更新
      const assistantMessage = addMessage(
        "正在分析标签页...",
        "assistant",
        "loading"
      );

      // 优先使用 Coze API 进行分析（流式）
      if (apiConnected !== false) {
        try {
          const tabsData = currentTabs.map((tab) => ({
            title: tab.title || "无标题",
            url: tab.url || "",
            domain: tab.url ? new URL(tab.url).hostname : "",
            active: tab.active || false,
            pinned: tab.pinned || false,
          }));

          await CozeAPI.sendMessageStream(
            `请分析以下 ${
              currentTabs.length
            } 个网页，总结这些网页的内容：${JSON.stringify(tabsData, null, 2)}`,
            {
              onProgress: (content) => {
                // 实时更新助手消息内容
                updateMessage(assistantMessage.id, content, "loading");
              },
              onComplete: async (finalContent) => {
                console.log("✅ 分析流式输出完成:", finalContent);
                updateMessage(assistantMessage.id, finalContent, "complete");
                setLoading(false);
              },
              onError: (error) => {
                console.error("流式输出错误:", error);
                updateMessage(
                  assistantMessage.id,
                  "抱歉，分析失败了。",
                  "error"
                );
                throw error;
              },
            }
          );

          return;
        } catch (error) {
          console.error("Coze 分析失败，降级到本地分析:", error);
        }
      }

      // 降级到本地分析
      const result = await AIProcessor.analyzeCurrentTabs();
      const resultMessage = `分析完成！我已经为您的 ${
        result.totalTabsAnalyzed
      } 个标签页创建了 ${
        result.createdGroups.length
      } 个分组：\n\n${result.createdGroups
        .map((group) => `• ${group.name} (${group.tabs.length} 个标签页)`)
        .join("\n")}`;

      // 更新助手消息为本地分析结果
      updateMessage(assistantMessage.id, resultMessage, "complete");

      setLoading(false);
      message.success("标签页分析完成！");
      onAnalyzeTabs?.();
    } catch (error) {
      console.error("标签页分析失败:", error);

      // 查找并更新最后一个空内容的助手消息
      let messageUpdated = false;
      setMessages((prev) => {
        const lastEmptyAssistantIndex = prev
          .map((msg, index) =>
            msg.role === "assistant" && msg.content === "" ? index : -1
          )
          .filter((index) => index !== -1)
          .pop();

        if (lastEmptyAssistantIndex !== undefined) {
          const newMessages = [...prev];
          const originalMessage = newMessages[lastEmptyAssistantIndex];
          if (originalMessage) {
            newMessages[lastEmptyAssistantIndex] = {
              id: originalMessage.id,
              role: originalMessage.role,
              timestamp: originalMessage.timestamp,
              content: "抱歉，标签页分析失败了。请检查网络连接后重试。",
            };
            messageUpdated = true;
          }
          return newMessages;
        }

        return prev;
      });

      // 如果没有找到空的助手消息，使用 addMessage 添加错误消息
      if (!messageUpdated) {
        addMessage(
          "抱歉，标签页分析失败了。请检查网络连接后重试。",
          "assistant"
        );
      }

      setLoading(false);
      message.error("标签页分析失败");
    }
  }, [currentTabs, onAnalyzeTabs, addMessage, updateMessage, apiConnected]);

  // 转换消息格式
  const bubbleItems = messages.map((msg) => ({
    key: msg.id,
    content: msg.content,
    variant: (msg.role === "user" ? "filled" : "outlined") as
      | "filled"
      | "outlined",
    avatar: msg.role === "user" ? <UserOutlined /> : <RobotOutlined />,
    placement: (msg.role === "user" ? "end" : "start") as "end" | "start",
    typing: msg.typing ? { step: 2, interval: 50 } : false, // 调整打字速度，让换行更自然
    classNames: {
      content: `${
        msg.status === "loading"
          ? "animate-pulse bg-gradient-to-r from-blue-50 to-blue-100"
          : ""
      } whitespace-pre-wrap break-words max-w-full leading-relaxed`,
    },
  }));

  return (
    <Card
      title={
        <div className="flex items-center justify-between">
          <span>AI 助手</span>
          <div className="flex items-center space-x-2">
            <WifiOutlined
              className={`text-sm ${
                apiConnected === true
                  ? "text-green-500"
                  : apiConnected === false
                  ? "text-red-500"
                  : "text-gray-400"
              }`}
              title={
                apiConnected === true
                  ? "Coze API 已连接"
                  : apiConnected === false
                  ? "API 连接失败，使用本地模式"
                  : "检查连接中..."
              }
            />
            {apiConnected === false && (
              <Button
                type="text"
                size="small"
                onClick={checkAPIConnection}
                title="重新检查连接"
              >
                重连
              </Button>
            )}
          </div>
        </div>
      }
      className="chat-container flex flex-col"
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
          .ant-bubble-content {
            white-space: pre-wrap !important;
            word-wrap: break-word !important;
            overflow-wrap: break-word !important;
            word-break: break-word !important;
            max-width: 100% !important;
            line-height: 1.6 !important;
          }
          .ant-bubble {
            max-width: 80% !important;
          }
          .ant-bubble[data-placement="start"] {
            max-width: 85% !important;
          }
          .ant-bubble[data-placement="end"] {
            max-width: 75% !important;
          }
        `,
        }}
      />
      <div className="flex-1 flex flex-col min-h-0">
        {/* 聊天区域 */}
        <div className="flex-1 p-4 overflow-y-auto">
          <Bubble.List
            items={bubbleItems}
            style={{
              height: "100%",
              maxWidth: "100%",
            }}
            className="w-full"
          />
        </div>

        {/* 快捷操作按钮 */}
        <div className="px-4 py-2 border-t">
          <Button
            type="primary"
            ghost
            size="small"
            onClick={handleAnalyzeTabs}
            disabled={loading || currentTabs.length === 0}
            className="mb-2 w-full"
            loading={loading}
          >
            智能分析标签页 ({currentTabs.length})
          </Button>
        </div>

        {/* 输入区域 */}
        <div className="p-4 border-t">
          <Sender
            placeholder={
              apiConnected === false
                ? "AI 服务不可用，使用本地模式..."
                : "输入您的问题..."
            }
            onSubmit={handleUserInput}
            loading={loading}
          />
        </div>
      </div>
    </Card>
  );
}

// 降级回复函数（当 API 不可用时使用）
async function generateFallbackResponse(
  userInput: string,
  tabs: chrome.tabs.Tab[]
): Promise<string> {
  const responses = {
    greeting: ["你好", "您好", "hello", "hi"],
    help: ["帮助", "帮忙", "help"],
    tabs: ["标签", "标签页", "tab", "tabs"],
    analysis: ["分析", "分组", "整理", "analyze", "group"],
    search: ["搜索", "查找", "search", "find"],
  };

  const input = userInput.toLowerCase();

  // 检查是否是标签页分析相关的请求
  const isTabAnalysisRequest =
    input.includes("分析") ||
    input.includes("标签") ||
    input.includes("分组") ||
    input.includes("整理");

  if (isTabAnalysisRequest && tabs.length > 0) {
    return `我发现您当前有 ${tabs.length} 个标签页。由于 AI 服务暂时不可用，建议您点击下方的"智能分析标签页"按钮进行本地分析。`;
  }

  if (isTabAnalysisRequest && tabs.length === 0) {
    return "看起来您当前没有打开的标签页需要分析。请打开一些标签页后再试。";
  }

  if (responses.greeting.some((word) => input.includes(word))) {
    return "您好！我是您的智能标签页管理助手。目前 AI 服务暂时不可用，但我仍可以为您提供基础的标签页管理功能。";
  }

  if (responses.help.some((word) => input.includes(word))) {
    return "我可以帮您：\n• 智能分析和分组标签页\n• 查找特定的标签页\n• 提供浏览建议\n\n注：AI 服务暂时不可用，部分功能可能受限。";
  }

  if (responses.tabs.some((word) => input.includes(word))) {
    return `您当前有 ${tabs.length} 个标签页。虽然 AI 服务暂时不可用，但您仍可以使用本地分析功能来管理它们。`;
  }

  return "抱歉，AI 服务暂时不可用。您可以尝试使用标签页分析功能，或者稍后再试。";
}
