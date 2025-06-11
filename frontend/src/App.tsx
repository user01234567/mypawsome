import React, { useState, useEffect, createContext } from "react";
import { Outlet } from "react-router-dom";

export const TopbarContext = createContext({
  setTopbarContent: (_content: React.ReactNode) => {},
});

export const SidebarContext = createContext({
  openSidebar: (_content: React.ReactNode) => {},
  closeSidebar: () => {},
});

function SettingsSidebarContent() {
  return (
    <div style={{ padding: "2em 1.5em" }}>
      <h2 className="font-bold text-xl mb-4">Settings</h2>
      <p>
        Customize your Tierlist Universe, nya~!<br />
        (More settings coming soon…)
      </p>
      {/* Add real settings here when ready! */}
    </div>
  );
}

function App() {
  // --- Topbar content puzzle piece ---
  const [topbarContent, setTopbarContent] = useState<React.ReactNode>("xXSample Text 420_HD");
  const [sidebarContent, setSidebarContent] = useState<React.ReactNode | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
    const openSidebar = (content: React.ReactNode) => {
    setSidebarContent(content);
    setSidebarOpen(true);
  };
  const closeSidebar = () => setSidebarOpen(false);
  // --- Theme: Neon/Dark ---
  const [isNeon, setIsNeon] = useState(true); // Default: neon

  // --- Set body class for theme ---
  useEffect(() => {
    if (isNeon) {
      document.body.classList.add("neon");
      document.body.classList.remove("dark");
    } else {
      document.body.classList.remove("neon");
      document.body.classList.add("dark");
    }
  }, [isNeon]);

  return (
    <TopbarContext.Provider value={{ setTopbarContent }}>
      <div className="app-root">
        {/* --- TOP BAR --- */}
        <header className="app-header flex items-center justify-between gap-3 p-4">
          {/* LEFT: Logo */}
          <a href="/" className="app-logo">
            <span className="gradient-logo-text">Tierlist UwU</span>
          </a>
          {/* (Optional: Add settings cog here, right after logo, if desired) */}
            <button
                className="sidebar-cog-btn"
                aria-label="Toggle Settings"
                onClick={() => {
                    if (sidebarOpen) {
                        closeSidebar();
                    } else {
                        openSidebar(<SettingsSidebarContent />);
                    }
                }}
                style={{ marginLeft: "0.6em" }}
                type="button"
            >
              {/* 🛠️ Inline SVG cogwheel */}
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none"
                stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"
                style={{ verticalAlign: "middle" }}>
                <circle cx="12" cy="12" r="3.7" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51c.37.16.78.16 1.15 0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82c.16.37.16.78 0 1.15a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
            </button>
          {/* CENTER: Dynamic Topbar Content */}
          <div className="app-topbar-center flex-1 flex justify-center items-center min-w-0">
            {topbarContent}
          </div>

          {/* RIGHT: Theme Toggle */}
          <div className="flex gap-2 items-center">
            <button
              className={`neon-mode-btn${isNeon ? " active" : ""}`}
              onClick={() => setIsNeon(true)}
              aria-label="Neon Blacklight Mode"
              type="button"
            >
              <span role="img" aria-label="neon">🌈</span>
            </button>
            <button
              className={`dark-mode-btn${!isNeon ? " active" : ""}`}
              onClick={() => setIsNeon(false)}
              aria-label="Dark Mode"
              type="button"
            >
              <span role="img" aria-label="moon">🌙</span>
            </button>
            {/* Add user/profile, notification, etc here if you like */}
          </div>
        </header>
            {/* --- SIDEBAR RENDERING --- */}
        {sidebarOpen && (
          <div className="sidebar-modal" onClick={closeSidebar}>
            <aside
              className="sidebar-content-panel"
              onClick={e => e.stopPropagation()} // Don't close when clicking inside
            >
              {sidebarContent}
            </aside>
          </div>
        )}
        {/* --- MAIN CONTENT --- */}
        <main>
          <Outlet />
        </main>
      </div>
    </TopbarContext.Provider>
  );
}

export default App;
