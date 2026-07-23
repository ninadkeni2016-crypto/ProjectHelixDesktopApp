import { useState } from "react";
import { Lock, Mail, User } from "lucide-react";
import { HelixLogo } from "./HelixLogo";
import { useUser } from "../context/UserContext";

export function LoginScreen() {
  const { login, register } = useUser();
  const [mode, setMode] = useState<"login" | "register">("register");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result =
      mode === "login"
        ? login(email, password)
        : register(name, email, password);

    if (result) {
      setError(result);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-6 font-['Inter',sans-serif]">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <HelixLogo size={72} className="rounded-2xl" />
          </div>
          <h1 className="text-2xl font-semibold text-white mb-2">Welcome to Project Helix</h1>
          <p className="text-sm text-blue-300/70">
            Sign in to access your files, AI history, and personalized dashboard.
          </p>
        </div>

        <div
          className="rounded-2xl border border-white/[0.08] backdrop-blur-xl p-6 shadow-2xl"
          style={{ background: "rgba(16,22,45,0.72)" }}
        >
          <div className="flex gap-2 p-1 rounded-xl bg-white/5 mb-6">
            <button
              type="button"
              onClick={() => { setMode("register"); setError(""); }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                mode === "register"
                  ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              Create Account
            </button>
            <button
              type="button"
              onClick={() => { setMode("login"); setError(""); }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                mode === "login"
                  ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              Sign In
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <div>
                <label className="block text-xs text-gray-500 font-mono uppercase tracking-wider mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Alex Morrison"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-200 placeholder-gray-600 outline-none focus:border-blue-500/50 transition-colors"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs text-gray-500 font-mono uppercase tracking-wider mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-200 placeholder-gray-600 outline-none focus:border-blue-500/50 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-500 font-mono uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-200 placeholder-gray-600 outline-none focus:border-blue-500/50 transition-colors"
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-sm font-semibold transition-all disabled:opacity-60"
            >
              {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Get Started"}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-white/[0.06] flex items-start gap-3">
            <HelixLogo size={20} className="flex-shrink-0 mt-0.5 rounded-md" />
            <p className="text-xs text-gray-500 leading-relaxed">
              Your data, chat history, and timeline are saved locally to your account.
              This setup screen appears only on your first launch.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
