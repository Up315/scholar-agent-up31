import { useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Send, Plus, ArrowLeft, MessageSquare, Calculator, Cloud, Clock, BookOpen, Code, Trash2, Zap, Diamond, Menu, X, MessageCircle, LogOut, User } from "lucide-react";
import { Streamdown } from "streamdown";
import { useLocation } from "wouter";
import AuthModal from "@/components/AuthModal";

interface Message {
  id: number;
  role: "user" | "assistant" | "tool";
  content: string;
  toolName?: string | null;
  createdAt: Date;
}

interface Conversation {
  id: number;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

const chatTypeConfig: Record<string, { icon: typeof MessageSquare; title: string; placeholder: string; examples: string[]; welcome: string }> = {
  general: { 
    icon: MessageSquare, 
    title: "智能助手", 
    placeholder: "有什么可以帮助你的？",
    examples: ["你好，请介绍一下你自己", "你能帮我做什么？"],
    welcome: "你好！我是你的智能助手，可以帮你解答各种问题、聊天交流。有什么想问的或者想聊的，随时告诉我哦~"
  },
  math: { 
    icon: Calculator, 
    title: "数学计算", 
    placeholder: "输入数学表达式，例如：计算 3.14 * 5 + 2",
    examples: ["计算 3.14 * 5 + 2", "计算 √144", "计算 2^10"],
    welcome: "你好！我是数学计算助手，可以帮你进行各种数学运算。加减乘除、开方、幂运算都没问题。快告诉我你想算什么吧~"
  },
  weather: { 
    icon: Cloud, 
    title: "天气查询", 
    placeholder: "输入城市名称查询天气，支持今天和明天天气",
    examples: ["北京今天天气怎么样？", "上海明天天气如何？", "广州的温度是多少？"],
    welcome: "你好！我是天气查询助手，可以帮你查询全国各地的天气情况。告诉我你想查哪个城市的天气，我会给你详细的天气信息和贴心的生活建议哦~"
  },
  time: { 
    icon: Clock, 
    title: "时间助手", 
    placeholder: "询问时间相关问题，例如：现在几点了？",
    examples: ["现在几点了？", "今天是星期几？", "今年有多少天？"],
    welcome: "你好！我是时间助手，可以告诉你当前时间，也能查询世界各地的时间。想知道日本几点？美国几点？尽管问我吧~"
  },
  study: { 
    icon: BookOpen, 
    title: "学习辅导", 
    placeholder: "提出你的学术问题...",
    examples: ["解释一下相对论", "什么是量子力学？", "帮我理解微积分"],
    welcome: "你好！我是学习辅导助手，可以帮你解答各种学术问题。无论是物理、数学、历史还是其他学科，有什么不懂的就来问我吧~"
  },
  code: { 
    icon: Code, 
    title: "编程助手", 
    placeholder: "描述你的编程问题...",
    examples: ["如何实现快速排序？", "解释一下闭包", "Python 列表推导式"],
    welcome: "你好！我是编程助手，可以帮你解答各种编程问题。算法、数据结构、代码调试、语言特性都可以问我。说说你遇到了什么编程难题吧~"
  },
};

export default function Chat() {
  const [, navigate] = useLocation();
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [chatType, setChatType] = useState<string>("general");
  const [autonomousMode, setAutonomousMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<{ id: number; name: string } | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/me", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setUser(data.user);
        } else {
          setAuthModalOpen(true);
        }
      })
      .catch(() => setAuthModalOpen(true))
      .finally(() => setAuthLoading(false));
  }, []);

  const handleLogout = async () => {
    await fetch("/api/logout", { method: "POST", credentials: "include" });
    setUser(null);
    setAuthModalOpen(true);
  };

  const handleAuthSuccess = (userData: { id: number; name: string }) => {
    setUser(userData);
  };

  const sendMessageMutation = trpc.chat.sendMessage.useMutation();
  const getHistoryQuery = trpc.chat.getHistory.useQuery(
    { conversationId: conversationId! },
    { enabled: !!conversationId }
  );
  const clearHistoryMutation = trpc.chat.clearHistory.useMutation();
  const getConversationsQuery = trpc.chat.getConversations.useQuery();
  const createConversationMutation = trpc.chat.createConversation.useMutation();
  const deleteConversationMutation = trpc.chat.deleteConversation.useMutation();

  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (getHistoryQuery.data) {
      const sortedMessages = getHistoryQuery.data
        .map((msg) => ({
          ...msg,
          createdAt: new Date(msg.createdAt),
        }))
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      setMessages(sortedMessages);
      setShowWelcomeUI(false);
    }
  }, [getHistoryQuery.data]);

  const [hasShownWelcome, setHasShownWelcome] = useState(false);
  const [showWelcomeUI, setShowWelcomeUI] = useState(true);

  useEffect(() => {
    const savedType = sessionStorage.getItem("chatType");
    const savedPrompt = sessionStorage.getItem("chatPrompt");
    const savedMode = sessionStorage.getItem("agentMode");
    
    if (savedType && chatTypeConfig[savedType]) {
      setChatType(savedType);
    }
    if (savedPrompt) {
      setInput(savedPrompt);
      sessionStorage.removeItem("chatPrompt");
    }
    if (savedMode === "autonomous") {
      setAutonomousMode(true);
    }
  }, []);

  useEffect(() => {
    if (!hasShownWelcome && !conversationId) {
      const config = chatTypeConfig[chatType];
      if (config && config.welcome) {
        setMessages([{
          id: Date.now(),
          role: "assistant",
          content: config.welcome,
          createdAt: new Date()
        }]);
        setHasShownWelcome(true);
      }
    }
  }, [chatType, hasShownWelcome, conversationId]);

  const handleNewConversation = async () => {
    setMessages([]);
    setInput("");
    setConversationId(null);
    setHasShownWelcome(false);
    setShowWelcomeUI(true);
    setSidebarOpen(false);
  };

  const handleSelectConversation = async (conv: Conversation) => {
    setConversationId(conv.id);
    setSidebarOpen(false);
  };

  const handleDeleteConversation = async (e: React.MouseEvent, convId: number) => {
    e.stopPropagation();
    try {
      await deleteConversationMutation.mutateAsync({ conversationId: convId });
      if (conversationId === convId) {
        handleNewConversation();
      }
      getConversationsQuery.refetch();
    } catch (error) {
      console.error("Error deleting conversation:", error);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    setShowWelcomeUI(false);

    const userMessage = input;
    const userMessageId = Date.now();
    
    setInput("");
    
    setMessages((prev) => [
      ...prev,
      { id: userMessageId, role: "user", content: userMessage, createdAt: new Date() },
    ]);
    
    setIsLoading(true);

    try {
      const result = await sendMessageMutation.mutateAsync({
        conversationId: conversationId || undefined,
        message: userMessage,
        autonomousMode: autonomousMode,
      });

      if (!conversationId) {
        setConversationId(result.conversationId);
        getConversationsQuery.refetch();
      }

      const newMessages: Message[] = [];
      const baseId = Date.now();
      
      for (let i = 0; i < result.toolCalls.length; i++) {
        const toolCall = result.toolCalls[i];
        newMessages.push({
          id: baseId + i,
          role: "tool",
          content: toolCall.toolOutput,
          toolName: toolCall.toolName,
          createdAt: new Date(),
        });
      }
      
      if (result.autonomousResult) {
        const statusIcon = result.autonomousResult.success ? "✅" : "❌";
        newMessages.push({
          id: baseId + result.toolCalls.length,
          role: "assistant",
          content: `${statusIcon} 任务${result.autonomousResult.success ? "完成" : "失败"}\n目标: ${result.autonomousResult.goal}\n完成步骤: ${result.autonomousResult.stepsCompleted}/${result.autonomousResult.totalSteps}\n\n${result.response}`,
          createdAt: new Date(),
        });
      } else {
        newMessages.push({
          id: baseId + result.toolCalls.length,
          role: "assistant",
          content: result.response,
          createdAt: new Date(),
        });
      }
      
      setMessages((prev) => [...prev, ...newMessages]);

    } catch (error) {
      console.error("Error sending message:", error);
      setMessages((prev) => [
        ...prev,
        { id: Date.now(), role: "assistant", content: "抱歉，遇到了一些问题。请稍后再试。", createdAt: new Date() },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = async () => {
    if (!conversationId) return;
    try {
      await clearHistoryMutation.mutateAsync({ conversationId });
      setMessages([]);
      setHasShownWelcome(false);
      setShowWelcomeUI(true);
    } catch (error) {
      console.error("Error clearing history:", error);
    }
  };

  const currentConfig = chatTypeConfig[chatType] || chatTypeConfig.general;
  const CurrentIcon = currentConfig.icon;
  const conversations = getConversationsQuery.data || [];

  const formatDate = (date: Date) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return "今天";
    if (days === 1) return "昨天";
    if (days < 7) return `${days}天前`;
    return d.toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
  };

  if (authLoading) {
    return (
      <div style={{ height: '100vh', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-500">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh', backgroundColor: '#f8fafc', display: 'flex', overflow: 'hidden' }}>
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-200 transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-800">历史对话</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(false)}
              className="text-slate-500 hover:text-slate-700"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* New Conversation Button */}
          <div className="p-4">
            <Button
              onClick={handleNewConversation}
              className="w-full gap-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 text-white"
            >
              <Plus className="w-4 h-4" />
              新对话
            </Button>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto px-2">
            {conversations.length === 0 ? (
              <div className="text-center text-slate-400 text-sm py-8">
                暂无历史对话
              </div>
            ) : (
              <div className="space-y-1">
                {conversations.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv)}
                    className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                      conversationId === conv.id
                        ? "bg-purple-100 text-purple-800"
                        : "hover:bg-slate-100 text-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <MessageCircle className="w-4 h-4 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{conv.title}</p>
                        <p className="text-xs text-slate-400">{formatDate(conv.updatedAt)}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => handleDeleteConversation(e, conv.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-500 h-6 w-6"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-50/50 via-transparent to-transparent pointer-events-none"></div>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#f1f5f9_1px,transparent_1px),linear-gradient(to_bottom,#f1f5f9_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)] pointer-events-none"></div>

        <header className="relative z-20 flex-shrink-0 border-b border-slate-100 bg-white/80 backdrop-blur-xl">
          <div className="w-full h-16 px-4 sm:px-6 flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setSidebarOpen(true)}
                className="text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-all duration-300"
              >
                <Menu className="w-5 h-5" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => navigate("/")}
                className="text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-all duration-300"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="h-6 w-px bg-slate-200 hidden sm:block" />
              <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center transition-all duration-300">
                <CurrentIcon className="w-5 h-5 text-purple-600" />
              </div>
              <h1 className="text-lg font-semibold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent hidden sm:block">
                {currentConfig.title}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              {user && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-50">
                  <User className="w-4 h-4 text-purple-600" />
                  <span className="text-sm text-purple-700 font-medium hidden sm:inline">{user.name}</span>
                </div>
              )}
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium ${
                autonomousMode 
                  ? "bg-purple-100 text-purple-700" 
                  : "bg-purple-100 text-purple-700"
              }`}>
                {autonomousMode ? (
                  <>
                    <Zap className="w-4 h-4" />
                    <span className="hidden sm:inline">专家模式</span>
                  </>
                ) : (
                  <>
                    <Diamond className="w-4 h-4" />
                    <span className="hidden sm:inline">快速模式</span>
                  </>
                )}
              </div>
              {user && (
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-slate-500 hover:text-red-500 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">退出</span>
                </button>
              )}
              {!showWelcomeUI && messages.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearHistory}
                  disabled={isLoading}
                  className="text-slate-500 hover:text-slate-700 hover:bg-slate-100 gap-1.5 transition-all duration-300"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="hidden sm:inline">清空</span>
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleNewConversation}
                className="gap-1.5 border-slate-200 hover:border-purple-200 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">新对话</span>
              </Button>
            </div>
          </div>
        </header>

        <main 
          ref={messagesContainerRef}
          className="relative z-10 flex-1 overflow-y-auto"
        >
          <div className="w-full px-4 sm:px-6 py-6 space-y-8">
            {showWelcomeUI && (
              <div className="flex flex-col items-center justify-center py-8 sm:py-12 gap-y-6">
                <div className="flex flex-col items-center gap-y-4">
                  <div className="w-20 h-20 rounded-2xl bg-purple-50 flex items-center justify-center shadow-sm">
                    <CurrentIcon className="w-10 h-10 text-purple-600" />
                  </div>
                  <div className="text-center space-y-2">
                    <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                      {currentConfig.title}
                    </h2>
                    <p className="text-slate-500 text-sm sm:text-base max-w-md mx-auto leading-relaxed">
                      {currentConfig.placeholder}
                    </p>
                  </div>
                </div>
                
                <div className="flex flex-wrap justify-center gap-2">
                  {currentConfig.examples.map((example, index) => (
                    <button
                      key={index}
                      onClick={() => setInput(example)}
                      className="px-4 py-2 rounded-lg bg-purple-50 text-purple-600 text-sm font-medium border border-purple-100 hover:bg-purple-100 hover:border-purple-200 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] px-5 sm:px-7 py-4 sm:py-6 rounded-2xl ${
                    msg.role === "user"
                      ? "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white rounded-br-lg shadow-lg shadow-purple-500/20"
                      : msg.role === "tool"
                        ? "bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 text-amber-900 rounded-bl-lg shadow-sm"
                        : "bg-white border border-slate-100 text-slate-700 rounded-bl-lg shadow-sm"
                  }`}
                >
                  {msg.role === "tool" && msg.toolName && (
                    <div className="flex items-center gap-2 mb-3 pb-3 border-b border-amber-200">
                      <span className="w-6 h-6 rounded-full bg-amber-200 flex items-center justify-center text-sm">🔧</span>
                      <span className="text-sm font-semibold text-amber-700">
                        {msg.toolName === "get_current_time" ? "时间查询" : 
                         msg.toolName === "weather_query" ? "天气查询" : 
                         msg.toolName === "calculator" ? "数学计算" : msg.toolName}
                      </span>
                    </div>
                  )}
                  <div className="text-base sm:text-lg leading-relaxed whitespace-pre-wrap">
                    {msg.role === "assistant" ? (
                      <Streamdown>{msg.content}</Streamdown>
                    ) : (
                      msg.content
                    )}
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-100 rounded-2xl rounded-bl-lg px-5 sm:px-7 py-4 sm:py-6 shadow-sm">
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
                    <span className="text-base sm:text-lg text-slate-600">正在查询中...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} className="h-4" />
          </div>
        </main>

        <footer className="relative z-20 flex-shrink-0 border-t border-slate-100 bg-white/80 backdrop-blur-xl">
          <div className="w-full px-4 sm:px-6 py-4 sm:py-5">
            <form onSubmit={handleSendMessage} className="flex gap-3 sm:gap-4">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={currentConfig.placeholder}
                disabled={isLoading}
                className="flex-1 h-12 sm:h-16 border-slate-200 focus:border-purple-400 focus:ring-purple-400 bg-white rounded-xl shadow-sm transition-all duration-300 text-base sm:text-lg px-4 sm:px-6"
              />
              <Button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="h-12 sm:h-16 px-6 sm:px-10 gap-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 shadow-lg shadow-purple-500/20 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 rounded-xl text-base sm:text-lg"
              >
                <Send className="w-5 h-5" />
                <span className="hidden sm:inline">发送</span>
              </Button>
            </form>
            <p className="text-xs sm:text-sm text-slate-400 text-center mt-3 sm:mt-4">
              Scholar Agent • 由 AI 驱动
            </p>
          </div>
        </footer>
      </div>

      <AuthModal
        open={authModalOpen}
        onOpenChange={setAuthModalOpen}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
}
