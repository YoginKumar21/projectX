import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

const navItems = [
  { label: "Dashboard", icon: "dashboard", to: "/dashboard" },
  { label: "My Notes", icon: "description", to: "/notes" },
  { label: "Code Editor", icon: "code", to: "/editor" },
  { label: "Summarizer", icon: "auto_awesome", to: "/summarizer" },
  { label: "Profile", icon: "person", to: "/profile" },
  { label: "Plans & Pricing", icon: "workspace_premium", to: "/pricing" },
];

function Sidebar({ isOpen, setIsOpen }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.clear();
    toast.success("Logged out successfully");
    navigate("/login");
  };

  const location = useLocation();

  return (
    <aside 
      className={`fixed left-0 top-0 h-screen bg-white dark:bg-[#0f172a] border-r border-slate-100 dark:border-slate-800 flex flex-col py-4 z-50 transition-all duration-500 ease-[0.22,1,0.36,1] ${
        isOpen ? "translate-x-0 w-[240px]" : "-translate-x-full lg:translate-x-0 lg:w-[240px]"
      }`}
    >
      <div className="px-6 mb-8 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 bg-primary/10 p-1">
            <img
              alt="SyncPad Brand Logo"
              className="w-full h-full object-contain"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDGH1HI5lucTMgOkxKOWboW-ut3b-1sHheB-PcOp-JfSRoZfbxEF6EaOheSmJn8uj0s53ZuLD-hPTVAtZHCz7Ykdun5UA0FJzKrd37tjm_VgE7ApNNvizFzkFZ50g3ZD34_el-pU2CagCatnaD5jhXT14wg77wLlfNf0TAO9Ox-wZ-yhs6tuD0V9VnlwlX985RV3uxnSk3cHlN4-E2Y68EI__VSYs9x1THz0crUTGGOhERLFht8M9P9Y27LtN86o7GLf-WZi5vZSxzB"
            />
          </div>
          <div>
            <h1 className="text-lg font-bold text-primary tracking-tight">SyncPad</h1>
            <p className="text-[8px] uppercase tracking-[0.2em] text-on-surface-variant font-black">
              Workspace
            </p>
          </div>
        </div>
        
        {/* Mobile Close Button */}
        {/* Mobile Close Button */}
        <button 
          onClick={() => setIsOpen(false)}
          className="lg:hidden p-1.5 hover:bg-surface-container-high rounded-lg text-on-surface-variant transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>
      </div>

      <nav className="flex-1 flex flex-col px-3">
        <div className="space-y-0.5">
          {navItems.map((item) => (
            <NavLink
              key={item.label}
              to={item.to}
              onClick={() => setIsOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-300 group ${
                  isActive
                    ? "text-primary bg-primary/10 shadow-sm shadow-primary/5"
                    : "text-on-surface-variant hover:bg-surface-container-low"
                }`
              }
            >
              <span
                className={`material-symbols-outlined text-[20px] transition-transform duration-300 group-hover:scale-110 ${
                  "font-variation-settings: 'FILL' 1"
                }`}
              >
                {item.icon}
              </span>
              <span className="font-medium text-sm">
                {item.label}
              </span>
            </NavLink>
          ))}
        </div>
        
        <div className="mt-6 px-3">
          <button
            onClick={() => {
              setIsOpen(false);
              if (location.pathname === "/notes") {
                navigate("/notes?create=true");
              } else {
                navigate("/dashboard?create=true");
              }
            }}
            className="w-full py-2.5 bg-primary text-on-primary rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all duration-300"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            New Note
          </button>
        </div>
      </nav>

      <div className="mt-auto px-4 pt-4 border-t border-outline-variant/5 space-y-3">
        {/* Upgrade Teaser Banner */}
        <NavLink
          to="/pricing"
          onClick={() => setIsOpen(false)}
          className="block w-full rounded-xl overflow-hidden group cursor-pointer"
        >
          <div className="relative px-4 py-3 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-primary/20 rounded-xl hover:border-primary/40 transition-all duration-300">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-primary/15 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-primary/25 transition-colors">
                <span className="material-symbols-outlined text-primary text-[16px]">workspace_premium</span>
              </div>
              <div>
                <p className="text-[10px] font-black text-on-surface uppercase tracking-wider leading-none mb-0.5">Upgrade Plan</p>
                <p className="text-[9px] text-on-surface-variant leading-none">Unlock AI Summaries & more</p>
              </div>
              <span className="material-symbols-outlined text-primary text-[14px] ml-auto group-hover:translate-x-0.5 transition-transform">chevron_right</span>
            </div>
          </div>
        </NavLink>

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 text-on-surface-variant hover:text-error transition-all duration-300 w-full group py-2 px-2"
        >
          <span className="material-symbols-outlined text-[20px] transition-transform group-hover:-translate-x-1">logout</span>
          <span className="text-sm font-bold">Logout</span>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;