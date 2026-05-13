import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { User, Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import API from "../api/axios";
import toast from "react-hot-toast";
import logo from "../assets/logo.png";

function Register() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!agreeTerms) {
      toast.error("Please agree to the Terms and Privacy Policy");
      return;
    }
    setIsLoading(true);

    try {
      const res = await API.post("/auth/register", formData);
      toast.success("Registration successful. Please login.");
      navigate("/login");
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Registration failed. Please check if the server is running.";
      console.error("Register error:", errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const getPasswordStrength = (pass) => {
    if (!pass) return 0;
    let strength = 0;
    if (pass.length >= 8) strength += 25;
    if (/[A-Z]/.test(pass)) strength += 25;
    if (/[0-9]/.test(pass)) strength += 25;
    if (/[^A-Za-z0-9]/.test(pass)) strength += 25;
    return strength;
  };

  const strength = getPasswordStrength(formData.password);
  const strengthColor = strength === 100 ? "bg-emerald-500" : "bg-red-500";
  const strengthText = strength === 100 ? "Strong password" : "Weak password";

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#F0F2FF]">
      {/* Background Decor */}
      <div className="absolute inset-0 bg-gradient-to-tr from-[#E6E9FF] via-[#F0F2FF] to-[#FAF9FF]" />
      <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-200/30 blur-[120px]" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-purple-200/30 blur-[120px]" />

      <div className="relative w-full max-w-[520px] px-6 py-12">
        <div className="flex flex-col items-center mb-10">
          <div className="mb-6 h-14 w-14 overflow-hidden rounded-2xl bg-white p-2 shadow-sm ring-1 ring-slate-100">
             <img src={logo} alt="SyncPad" className="h-full w-full object-contain" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">SyncPad</h1>
          <p className="mt-2 text-sm font-medium text-slate-500">Elevate your digital workspace</p>
        </div>

        <div className="rounded-[32px] bg-white p-8 shadow-[0_30px_60px_rgba(0,0,0,0.06)] border border-white sm:p-10">
          <h2 className="text-2xl font-bold text-slate-900">Create your account</h2>
          <p className="mt-2 text-sm font-medium text-slate-500">Sign up to start organizing your digital life.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Full Name</label>
              <div className="group relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                  <User size={18} />
                </div>
                <input
                  type="text"
                  name="name"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full rounded-2xl border border-slate-100 bg-slate-50/50 py-3.5 pl-12 pr-4 text-sm text-slate-900 outline-none transition-all focus:border-indigo-400/50 focus:bg-white focus:ring-4 focus:ring-indigo-100/50"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Email Address</label>
              <div className="group relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  name="email"
                  placeholder="name@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full rounded-2xl border border-slate-100 bg-slate-50/50 py-3.5 pl-12 pr-4 text-sm text-slate-900 outline-none transition-all focus:border-indigo-400/50 focus:bg-white focus:ring-4 focus:ring-indigo-100/50"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Password</label>
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
              
              {formData.password && (
                <div className="mt-3">
                  <div className="flex h-1.5 w-full gap-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full transition-all duration-500 ${strength >= 25 ? strengthColor : "bg-transparent"}`} style={{ width: "25%" }} />
                    <div className={`h-full transition-all duration-500 ${strength >= 50 ? strengthColor : "bg-transparent"}`} style={{ width: "25%" }} />
                    <div className={`h-full transition-all duration-500 ${strength >= 75 ? strengthColor : "bg-transparent"}`} style={{ width: "25%" }} />
                    <div className={`h-full transition-all duration-500 ${strength === 100 ? strengthColor : "bg-transparent"}`} style={{ width: "25%" }} />
                  </div>
                  <p className="mt-2 text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
                    <span className={`h-1.5 w-1.5 rounded-full ${strength === 100 ? "bg-emerald-500" : "bg-red-500"}`} />
                    {strengthText}
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-start gap-3 py-2">
              <div className="relative flex h-5 w-5 items-center justify-center shrink-0">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="peer h-5 w-5 cursor-pointer appearance-none rounded-lg border border-slate-200 bg-slate-50 transition-all checked:bg-indigo-600 checked:border-indigo-600"
                />
                <svg className="absolute h-3 w-3 text-white opacity-0 peer-checked:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-xs font-medium leading-5 text-slate-500">
                I agree to the <button type="button" className="text-indigo-600 hover:underline">Terms of Service</button> and <button type="button" className="text-indigo-600 hover:underline">Privacy Policy</button>.
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="group relative flex w-full items-center justify-center overflow-hidden rounded-2xl bg-indigo-600 px-6 py-4 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition-all hover:scale-[1.01] hover:bg-indigo-700 disabled:opacity-70"
            >
              <span className="relative z-10 flex items-center gap-2">
                {isLoading ? "Creating account..." : "Create Account"}
                {!isLoading && <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />}
              </span>
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm font-medium text-slate-500">
              Already have an account?{" "}
              <Link
                to="/login"
                className="font-bold text-indigo-600 hover:text-indigo-700 underline-offset-4 hover:underline"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;