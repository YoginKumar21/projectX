import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Sidebar from "./Sidebar.jsx";
import Topbar from "./Topbar.jsx";

function AppShell({
  children,
  searchTerm = "",
  setSearchTerm = () => {},
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (e) => {
      const sidebar = document.getElementById("mobile-sidebar");
      const toggle = document.getElementById("mobile-toggle");
      if (isSidebarOpen && sidebar && !sidebar.contains(e.target) && !toggle.contains(e.target)) {
        setIsSidebarOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isSidebarOpen]);

  return (
    <div className="min-h-screen bg-[#f7f9fb] dark:bg-[#0b1120] font-body-md text-[#191c1e] dark:text-[#f1f5f9] transition-colors duration-300 relative overflow-x-hidden">
      {/* Premium Background Accents */}
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[120px] pointer-events-none z-0" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-secondary/5 blur-[120px] pointer-events-none z-0" />
      
      {/* Sidebar Overlay for Mobile */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[45] lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      <div id="mobile-sidebar">
        <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      </div>
      
      <Topbar
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
      />
      
      <main 
        className={`mt-[64px] min-h-[calc(100vh-64px)] p-[20px] relative z-10 transition-all duration-300 ease-in-out ${
          "lg:ml-[240px]"
        }`}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={window.location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

export default AppShell;