import { useState, useMemo } from "react";
import { Lock, Mail, User, Eye, EyeOff, ShieldCheck, Sparkles, Check, X, ArrowRight, Loader2 } from "lucide-react";
import { HelixLogo } from "./HelixLogo";
import { useUser } from "../context/UserContext";

export function LoginScreen() {
  const { login, register, continueAsGuest } = useUser();
  const [mode, setMode] = useState<"login" | "register" | "guest">("register");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Real-time password strength evaluation
  const passwordChecks = useMemo(() => {
    return {
      hasMinLength: password.length >= 8,
      hasUpper: /[A-Z]/.test(password),
      hasLower: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecial: /[^A-Za-z0-9]/.test(password),
    };
  }, [password]);

  const strengthScore = useMemo(() => {
    if (!password) return 0;
    let score = 0;
    if (passwordChecks.hasMinLength) score++;
    if (passwordChecks.hasUpper && passwordChecks.hasLower) score++;
    if (passwordChecks.hasNumber) score++;
    if (passwordChecks.hasSpecial) score++;
    return score;
  }, [password, passwordChecks]);

  const strengthLabel = useMemo(() => {
    if (!password) return "";
    switch (strengthScore) {
      case 1: return { label: "Weak", color: "bg-red-500", text: "text-red-400" };
      case 2: return { label: "Fair", color: "bg-amber-500", text: "text-amber-400" };
      case 3: return { label: "Good", color: "bg-blue-500", text: "text-blue-400" };
      case 4: return { label: "Strong", color: "bg-emerald-500", text: "text-emerald-400" };
      default: return { label: "Too Short", color: "bg-red-500", text: "text-red-400" };
    }
  }, [password, strengthScore]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (mode === "register" && strengthScore < 2) {
      setError("Please choose a stronger password (minimum 8 characters).");
      return;
    }

    setLoading(true);

    const result =
      mode === "login"
        ? await login(email, password)
        : await register(name, email, password);

    if (result) {
      setError(result);
      setLoading(false);
    }
  };

  const handleGuestAccess = async () => {
    setLoading(true);
    setError("");
    try {
      await continueAsGuest();
    } catch (e: any) {
      setError("Failed to initialize guest sandbox.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-6 font-['Inter',sans-serif] relative overflow-hidden bg-[#080d1e]">
      {/* Background radial ambient glow */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center mb-3 relative group">
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 opacity-30 blur group-hover:opacity-60 transition duration-500" />
            <HelixLogo size={68} className="rounded-2xl relative" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Project Helix</h1>
          <p className="text-xs text-blue-300/80 font-mono mt-1 uppercase tracking-wider">
            Intelligent Desktop Companion & Security Suite
          </p>
        </div>

        {/* Auth Glass Card */}
        <div
          className="rounded-3xl border border-white/[0.08] backdrop-blur-2xl p-7 shadow-2xl transition-all"
          style={{ background: "rgba(13, 19, 43, 0.78)" }}
        >
          {/* Segmented Mode Switcher */}
          <div className="flex p-1 rounded-xl bg-black/30 border border-white/5 mb-6">
            <button
              type="button"
              onClick={() => { setMode("register"); setError(""); }}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all duration-200 active:scale-[0.98] ${
                mode === "register"
                  ? "bg-gradient-to-r from-blue-600/80 to-purple-600/80 text-white shadow-md border border-white/10"
                  : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
              }`}
            >
              Sign Up
            </button>
            <button
              type="button"
              onClick={() => { setMode("login"); setError(""); }}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all duration-200 active:scale-[0.98] ${
                mode === "login"
                  ? "bg-gradient-to-r from-blue-600/80 to-purple-600/80 text-white shadow-md border border-white/10"
                  : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode("guest"); setError(""); }}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all duration-200 active:scale-[0.98] ${
                mode === "guest"
                  ? "bg-white/15 text-blue-300 shadow-md border border-blue-500/30"
                  : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
              }`}
            >
              Guest
            </button>
          </div>

          <div key={mode} className="animate-fade-in">
            {mode === "guest" ? (
              /* Guest Sandbox Info & CTA */
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-2.5">
                  <div className="flex items-center gap-2 text-blue-400">
                    <Sparkles size={16} />
                    <span className="text-xs font-semibold uppercase tracking-wider font-mono">Isolated Sandbox</span>
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed">
                    Guest mode launches Project Helix in a strictly isolated session. Real hardware monitoring and local desktop utilities are fully operational without requiring an account.
                  </p>
                  <div className="space-y-1.5 pt-1 text-[11px] text-gray-400">
                    <div className="flex items-center gap-2">
                      <Check size={12} className="text-emerald-400" />
                      <span>Real-time PC monitoring (CPU, RAM, Disks, Network)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check size={12} className="text-emerald-400" />
                      <span>Duplicate detection & safe backup tools</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check size={12} className="text-emerald-400" />
                      <span>Zero telemetry shared across sessions</span>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5 animate-slide-down">
                    {error}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleGuestAccess}
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-all duration-200 btn-interactive active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 disabled:opacity-60"
                >
                  {loading ? <Loader2 size={15} className="animate-spin" /> : <ArrowRight size={15} />}
                  <span>Launch Guest Sandbox</span>
                </button>
              </div>
            ) : (
              /* Form for Login & Register */
              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === "register" && (
                  <div>
                    <label className="block text-[11px] text-gray-400 font-mono uppercase tracking-wider mb-1.5">
                      Your Name
                    </label>
                    <div className="relative">
                      <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Alex Morrison"
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-black/25 border border-white/10 text-xs text-gray-200 placeholder-gray-600 outline-none input-interactive hover:border-white/20 transition-all duration-200"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] text-gray-400 font-mono uppercase tracking-wider mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="alex@helix.desktop"
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-black/25 border border-white/10 text-xs text-gray-200 placeholder-gray-600 outline-none input-interactive hover:border-white/20 transition-all duration-200"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-gray-400 font-mono uppercase tracking-wider mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-black/25 border border-white/10 text-xs text-gray-200 placeholder-gray-600 outline-none input-interactive hover:border-white/20 transition-all duration-200"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-blue-300 transition-all duration-150 active:scale-90 p-0.5"
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>

                  {/* Password Strength Meter (Only on Registration) */}
                  {mode === "register" && password && (
                    <div className="mt-2 space-y-1.5 animate-slide-down">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-gray-500 font-mono uppercase tracking-wider">Strength</span>
                        {strengthLabel && (
                          <span className={`font-semibold ${strengthLabel.text}`}>{strengthLabel.label}</span>
                        )}
                      </div>
                      <div className="grid grid-cols-4 gap-1">
                        {[1, 2, 3, 4].map((step) => (
                          <div
                            key={step}
                            className={`h-1 rounded-full transition-all duration-300 ease-out ${
                              strengthScore >= step ? strengthLabel?.color || "bg-blue-500" : "bg-white/10"
                            }`}
                          />
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-2 pt-1 text-[10px] text-gray-500">
                        <span className={`transition-colors duration-200 ${passwordChecks.hasMinLength ? "text-emerald-400 font-medium" : ""}`}>
                          {passwordChecks.hasMinLength ? "✓" : "○"} 8+ chars
                        </span>
                        <span className={`transition-colors duration-200 ${passwordChecks.hasUpper && passwordChecks.hasLower ? "text-emerald-400 font-medium" : ""}`}>
                          {passwordChecks.hasUpper && passwordChecks.hasLower ? "✓" : "○"} Aa
                        </span>
                        <span className={`transition-colors duration-200 ${passwordChecks.hasNumber ? "text-emerald-400 font-medium" : ""}`}>
                          {passwordChecks.hasNumber ? "✓" : "○"} 123
                        </span>
                        <span className={`transition-colors duration-200 ${passwordChecks.hasSpecial ? "text-emerald-400 font-medium" : ""}`}>
                          {passwordChecks.hasSpecial ? "✓" : "○"} !@#
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {error && (
                  <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5 animate-slide-down">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-xs font-semibold transition-all duration-200 btn-interactive active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 disabled:opacity-60"
                >
                  {loading ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : mode === "login" ? (
                    "Sign In to Project Helix"
                  ) : (
                    "Create Encrypted Account"
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Security footnote */}
          <div className="mt-6 pt-4 border-t border-white/[0.06] flex items-center justify-between text-[10px] text-gray-500 font-mono">
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={12} className="text-emerald-400" /> End-to-End Cryptography
            </span>
            <span>v2.4.0-Sentinel</span>
          </div>
        </div>
      </div>
    </div>
  );
}
