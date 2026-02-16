import { useEffect, useState, useRef } from "react";
import Header from "./header";
import Sidebar from "./sidebar";

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Sidebar area-vai identify panna ref use pannuvom
  const sidebarRef = useRef(null);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // --- OUTSIDE CLICK LOGIC ---
  useEffect(() => {
    function handleClickOutside(event) {
      // Sidebar thiranthu irukkum pothu, click pannurathu sidebar-ku velila iruntha...
      if (sidebarOpen && sidebarRef.current && !sidebarRef.current.contains(event.target)) {
        // Header-la irukkira menu button-ai click pannalum close aagakoodathu (Athu toggle logic)
        // Check if the click was on the menu button in Header (optional but safer)
        if (!event.target.closest('button')) {
          setSidebarOpen(false);
        }
      }
    }

    // Click event-ai document-la listen pannuvom
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [sidebarOpen]);

  return (
    <div className="h-screen bg-slate-50 text-slate-900 overflow-hidden font-sans">
      
      {/* HEADER */}
      <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

      <div className="flex h-[calc(100vh-4rem)] relative">
        
        {/* MOBILE OVERLAY */}
        {sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-slate-900/40 z-30 lg:hidden"
          />
        )}

        {/* SIDEBAR with REF */}
        <aside
          ref={sidebarRef}
          className={`
            fixed lg:relative z-40 h-full
            bg-white border-r border-slate-200
            transition-all duration-300 ease-in-out
            ${sidebarOpen ? "w-72 translate-x-0 opacity-100" : "w-0 -translate-x-full lg:translate-x-0 opacity-0 lg:border-none"}
          `}
        >
          <div className="w-72 h-full">
            <Sidebar onClose={() => setSidebarOpen(false)} />
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8 transition-all duration-300">
          <div className="max-w-[1600px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}