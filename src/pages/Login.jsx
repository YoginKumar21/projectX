import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import API from "../api/axios";
import toast from "react-hot-toast";
import logo from "../assets/logo.png";
import { reconnectSocket } from "../socket";

function Login() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await API.post("/auth/login", formData);

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("userId", res.data.user.id);
      localStorage.setItem("userEmail", res.data.user.email);
      localStorage.setItem("userName", res.data.user.name);
      localStorage.setItem("userAvatar", res.data.user.avatar || "");
      localStorage.setItem("userBanner", res.data.user.banner || "");

      window.dispatchEvent(new Event("syncpad-user-updated"));

      // Dynamically reconnect and authorize the WebSocket connection with the new token
      reconnectSocket();

      toast.success("Login successful");
      navigate("/dashboard");
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Login failed. Please check if the server is running and your credentials are correct.";
      console.error("Login error:", errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#E6E9FF]">
      {/* Dynamic Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#F0F2FF] via-[#E6E9FF] to-[#F5F3FF]" />
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-200/40 blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-200/40 blur-[120px]" />

      <div className="relative w-full max-w-[480px] px-6 py-12">
        <div className="rounded-[32px] bg-white/80 p-8 shadow-[0_30px_60px_rgba(0,0,0,0.05)] backdrop-blur-xl border border-white/50 sm:p-10">
          <div className="mb-10 flex flex-col items-center">
            <div className="mb-6 h-16 w-16 overflow-hidden rounded-2xl bg-white p-2 shadow-sm ring-1 ring-slate-100">
              <img src={logo} alt="SyncPad" className="h-full w-full object-contain" />
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">
              Welcome Back
            </h2>
            <p className="mt-2 text-sm font-medium text-slate-500">
              Sign in to your SyncPad workspace
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Email Address
              </label>
              <div className="group relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  name="email"
                  placeholder="name@company.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full rounded-2xl border border-slate-100 bg-slate-50/50 py-3.5 pl-12 pr-4 text-sm text-slate-900 outline-none transition-all focus:border-indigo-400/50 focus:bg-white focus:ring-4 focus:ring-indigo-100/50"
                />
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-semibold text-slate-700">
                  Password
                </label>
                <button
                  type="button"
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-700"
                >
                  Forgot password?
                </button>
              </div>
              <div className="group relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                  <Lock size={18} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="w-full rounded-2xl border border-slate-100 bg-slate-50/50 py-3.5 pl-12 pr-12 text-sm text-slate-900 outline-none transition-all focus:border-indigo-400/50 focus:bg-white focus:ring-4 focus:ring-indigo-100/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex items-center">
              <label className="flex cursor-pointer items-center gap-3">
                <div className="relative flex h-5 w-5 items-center justify-center">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="peer h-5 w-5 cursor-pointer appearance-none rounded-lg border border-slate-200 bg-slate-50 transition-all checked:bg-indigo-600 checked:border-indigo-600"
                  />
                  <svg className="absolute h-3 w-3 text-white opacity-0 peer-checked:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-slate-500">Keep me logged in</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="group relative flex w-full items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition-all hover:scale-[1.01] hover:shadow-indigo-300 disabled:opacity-70"
            >
              <span className="relative z-10 flex items-center gap-2">
                {isLoading ? "Signing in..." : "Login"}
                {!isLoading && <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />}
              </span>
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm font-medium text-slate-500">
              Don't have an account?{" "}
              <Link
                to="/register"
                className="font-bold text-indigo-600 hover:text-indigo-700 underline-offset-4 hover:underline"
              >
                Register
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;