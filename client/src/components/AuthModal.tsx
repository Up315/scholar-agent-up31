import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, X, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (user: { id: number; name: string }) => void;
}

type AuthMode = "login" | "register" | "forgot";

export default function AuthModal({ open, onOpenChange, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setError("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
    }
  }, [open, mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "login") {
        const res = await fetch("/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ username: email, password }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          toast.success("登录成功", { description: `欢迎回来，${data.user.name}` });
          onSuccess(data.user);
          onOpenChange(false);
        } else {
          setError(data.error || "登录失败");
        }
      } else if (mode === "register") {
        if (password !== confirmPassword) {
          setError("两次输入的密码不一致");
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setError("密码长度至少6位");
          setLoading(false);
          return;
        }
        const res = await fetch("/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ username: email, password }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          toast.success("注册成功", { description: `欢迎，${data.user.name}` });
          onSuccess(data.user);
          onOpenChange(false);
        } else {
          setError(data.error || "注册失败");
        }
      } else if (mode === "forgot") {
        setError("密码重置功能暂未开放，请联系管理员");
        setLoading(false);
        return;
      }
    } catch (err) {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    switch (mode) {
      case "login": return "登录";
      case "register": return "注册";
      case "forgot": return "找回密码";
    }
  };

  const getButtonText = () => {
    if (loading) {
      return mode === "login" ? "登录中..." : mode === "register" ? "注册中..." : "发送中...";
    }
    return mode === "login" ? "登录" : mode === "register" ? "注册" : "发送重置链接";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-[420px] p-0 gap-0 bg-white rounded-2xl shadow-2xl border-0 overflow-hidden"
        showCloseButton={false}
      >
        <div className="relative">
          <button
            onClick={() => onOpenChange(false)}
            className="absolute top-5 right-5 p-2 rounded-full hover:bg-gray-100 transition-colors z-10"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>

          <div className="pt-10 pb-8 px-10">
            <DialogHeader className="mb-8">
              <div className="flex items-center justify-center mb-5">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                    <path d="M2 17l10 5 10-5" />
                    <path d="M2 12l10 5 10-5" />
                  </svg>
                </div>
              </div>
              <DialogTitle className="text-center text-2xl font-semibold text-gray-900">
                {getTitle()}
              </DialogTitle>
              <p className="text-center text-sm text-gray-500 mt-2">
                {mode === "login" && "欢迎回来，请登录您的账号"}
                {mode === "register" && "创建新账号，开始您的旅程"}
                {mode === "forgot" && "输入您的邮箱，我们将发送重置链接"}
              </p>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-4">
                <Input
                  type="text"
                  placeholder="手机号/邮箱"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12 px-4 bg-gray-50 border-gray-200 focus:border-purple-400 focus:ring-purple-400 focus:bg-white transition-all rounded-xl text-base"
                />

                {mode !== "forgot" && (
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="密码"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="h-12 px-4 pr-12 bg-gray-50 border-gray-200 focus:border-purple-400 focus:ring-purple-400 focus:bg-white transition-all rounded-xl text-base"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                )}

                {mode === "register" && (
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="确认密码"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="h-12 px-4 bg-gray-50 border-gray-200 focus:border-purple-400 focus:ring-purple-400 focus:bg-white transition-all rounded-xl text-base"
                  />
                )}
              </div>

              {mode === "login" && (
                <div className="flex items-center justify-between py-1">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <Checkbox 
                      checked={rememberMe} 
                      onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                      className="data-[state=checked]:bg-purple-500 data-[state=checked]:border-purple-500"
                    />
                    <span className="text-sm text-gray-600">记住我</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setMode("forgot")}
                    className="text-sm text-purple-600 hover:text-purple-700 hover:underline transition-colors"
                  >
                    忘记密码？
                  </button>
                </div>
              )}

              {error && (
                <div className="bg-red-50 text-red-500 text-sm px-4 py-3 rounded-xl text-center">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 text-white font-medium rounded-xl shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/30 transition-all duration-300 disabled:opacity-50 text-base"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {getButtonText()}
                  </span>
                ) : (
                  getButtonText()
                )}
              </Button>
            </form>

            <div className="mt-8 pt-6 border-t border-gray-100 text-center text-sm text-gray-500">
              {mode === "login" && (
                <>
                  还没有账号？
                  <button
                    type="button"
                    onClick={() => setMode("register")}
                    className="text-purple-600 hover:text-purple-700 hover:underline ml-1 font-medium"
                  >
                    立即注册
                  </button>
                </>
              )}
              {mode === "register" && (
                <>
                  已有账号？
                  <button
                    type="button"
                    onClick={() => setMode("login")}
                    className="text-purple-600 hover:text-purple-700 hover:underline ml-1 font-medium"
                  >
                    立即登录
                  </button>
                </>
              )}
              {mode === "forgot" && (
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className="text-purple-600 hover:text-purple-700 hover:underline font-medium"
                >
                  返回登录
                </button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
