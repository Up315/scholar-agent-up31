import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { 
  Calculator, 
  Cloud, 
  Clock, 
  Sparkles, 
  MessageSquare,
  BookOpen,
  Code,
  ArrowRight,
  Zap,
  Diamond,
  LogOut,
  User
} from "lucide-react";
import AuthModal from "@/components/AuthModal";

const chatTypes = [
  {
    id: "general",
    icon: MessageSquare,
    title: "智能助手",
    description: "通用对话助手，回答各类问题",
  },
  {
    id: "math",
    icon: Calculator,
    title: "数学计算",
    description: "精确执行复杂数学计算",
  },
  {
    id: "weather",
    icon: Cloud,
    title: "天气查询",
    description: "获取全国城市实时天气",
  },
  {
    id: "time",
    icon: Clock,
    title: "时间助手",
    description: "时区转换与时间查询",
  },
  {
    id: "study",
    icon: BookOpen,
    title: "学习辅导",
    description: "学术问题解答与知识讲解",
  },
  {
    id: "code",
    icon: Code,
    title: "编程助手",
    description: "代码编写与调试帮助",
  },
];

export default function Home() {
  const [, navigate] = useLocation();
  const [selectedMode, setSelectedMode] = useState<"normal" | "autonomous">("normal");
  const [user, setUser] = useState<{ id: number; name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  useEffect(() => {
    fetch("/api/me", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setUser(data.user);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    await fetch("/api/logout", { method: "POST", credentials: "include" });
    setUser(null);
  };

  const handleSelectChatType = (typeId: string) => {
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    sessionStorage.setItem("chatType", typeId);
    sessionStorage.setItem("agentMode", selectedMode);
    navigate("/chat");
  };

  const handleAuthSuccess = (userData: { id: number; name: string }) => {
    setUser(userData);
  };

  if (loading) {
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
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-50/50 via-transparent to-transparent pointer-events-none"></div>
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#f1f5f9_1px,transparent_1px),linear-gradient(to_bottom,#f1f5f9_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)] pointer-events-none"></div>

      <header className="relative z-20 flex-shrink-0 border-b border-slate-100 bg-white/80 backdrop-blur-xl">
        <div className="w-full h-16 px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-md shadow-purple-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-semibold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              Scholar Agent
            </span>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-50">
                  <User className="w-4 h-4 text-purple-600" />
                  <span className="text-sm text-purple-700 font-medium">{user.name}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-slate-500 hover:text-red-500 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>退出</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => setAuthModalOpen(true)}
                className="px-5 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              >
                登录
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="relative z-10 flex-1 overflow-y-auto">
        <div className="w-full min-h-full flex flex-col items-center justify-center px-6 py-8 sm:py-12">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-50 border border-purple-100 text-purple-600 text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              AI 智能对话平台
            </div>
            
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 mb-4 tracking-tight">
              选择你的
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600"> AI 助手</span>
            </h1>
            
            <p className="text-slate-600 text-base sm:text-lg leading-relaxed">
              根据你的需求选择合适的对话类型，获得更精准的帮助
            </p>
          </div>

          <div className="mb-8">
            <div className="inline-flex items-center rounded-full border-2 border-slate-200 bg-white shadow-sm overflow-hidden">
              <button
                onClick={() => setSelectedMode("normal")}
                className={`relative flex items-center justify-center gap-2 w-40 py-4 text-lg font-medium transition-all duration-300 border-r-2 border-slate-200 ${
                  selectedMode === "normal"
                    ? "bg-purple-100 text-purple-700"
                    : "text-slate-600 hover:text-slate-800 hover:bg-slate-50"
                }`}
              >
                <Diamond className="w-5 h-5" />
                <span>快速模式</span>
              </button>
              <button
                onClick={() => setSelectedMode("autonomous")}
                className={`relative flex items-center justify-center gap-2 w-40 py-4 text-lg font-medium transition-all duration-300 ${
                  selectedMode === "autonomous"
                    ? "bg-purple-100 text-purple-700"
                    : "text-slate-600 hover:text-slate-800 hover:bg-slate-50"
                }`}
              >
                <Zap className="w-5 h-5" />
                <span>专家模式</span>
              </button>
            </div>
            <p className="text-center text-sm text-slate-400 mt-3">
              {selectedMode === "normal" 
                ? "一问一答，快速响应" 
                : "AI自主规划，多步骤执行"}
            </p>
          </div>

          <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {chatTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => handleSelectChatType(type.id)}
                className="group h-full w-full p-6 rounded-2xl bg-white border border-slate-100 shadow-sm hover:border-purple-200 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 text-center flex flex-col items-center"
              >
                <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center mb-4 transition-colors duration-300 group-hover:bg-purple-100">
                  <type.icon className="w-6 h-6 text-purple-600 group-hover:text-purple-700 transition-colors duration-300" />
                </div>
                
                <h3 className="text-lg font-semibold text-slate-900 mb-1.5">{type.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{type.description}</p>
                
                <div className="mt-4 flex items-center justify-center gap-1 text-purple-600 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  开始对话
                  <ArrowRight className="w-4 h-4" />
                </div>
              </button>
            ))}
          </div>

          <div className="mt-12 text-center">
            <p className="text-slate-400 text-sm">
              由先进的 AI 技术驱动 • 安全可靠 • 隐私保护
            </p>
          </div>
        </div>
      </main>

      <footer className="relative z-20 flex-shrink-0 border-t border-slate-100 bg-white/60 backdrop-blur-sm mt-12">
        <div className="w-full h-14 px-6 flex items-center justify-center">
          <p className="text-slate-400 text-sm">
            © 2026 Scholar Agent. All rights reserved.
          </p>
        </div>
      </footer>

      <AuthModal
        open={authModalOpen}
        onOpenChange={setAuthModalOpen}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
}
