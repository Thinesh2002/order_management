import { useEffect, useState } from "react";
import Header from "./header";
import Sidebar from "./sidebar";

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  return (
    <div className="min-h-screen bg-slate-950 text-[#242424]">
      <Header onMenuClick={() => setSidebarOpen((prev) => !prev)} />

      <div className="flex min-h-[calc(100vh-4rem)]">
        <div className="hidden w-60 shrink-0 lg:block">
          <Sidebar onClose={() => setSidebarOpen(false)} />
        </div>

        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <div
          className={`fixed inset-y-0 left-0 z-50 w-60 transform transition-transform duration-300 lg:hidden ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <Sidebar onClose={() => setSidebarOpen(false)} />
        </div>

        <main className="min-w-0 flex-1 bg-[#f8fafc]  px-4 py-4 sm:px-6 lg:px-8">
          <div className="">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
