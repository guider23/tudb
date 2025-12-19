import { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { UserButton, useUser } from '@clerk/clerk-react';
import {
  LayoutDashboard,
  Database,
  MessageSquare,
  Settings,
  Search,
  HelpCircle,
  Bookmark,
  Microscope,
} from 'lucide-react';

const generalNavigation = [
  { name: 'Queries', href: '/query', icon: MessageSquare },
  { name: 'Saved Queries', href: '/saved-queries', icon: Bookmark },
  { name: 'Inspect', href: '/inspect', icon: Microscope },
  { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Connections', href: '/connections', icon: Database },
];

const systemNavigation = [
  { name: 'Settings', href: '/settings', icon: Settings },
];

export default function Layout() {
  const { user } = useUser();
  const location = useLocation();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter navigation items based on search query
  const filteredGeneralNav = generalNavigation.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredSystemNav = systemNavigation.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get page title based on current route
  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/dashboard') return 'Dashboard';
    if (path === '/connections') return 'Connections Manager';
    if (path === '/query') return 'Query Interface';
    if (path === '/saved-queries') return 'Saved Queries';
    if (path === '/inspect') return 'Database Inspector';
    if (path === '/settings') return 'Settings';
    return 'Dashboard';
  };

  // Handle fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Close window
  const handleClose = () => {
    window.close();
  };

  return (
    <div className="flex h-screen bg-[#F5F5F7] overflow-hidden selection:bg-[#007AFF] selection:text-white">
      {/* macOS Sidebar with Glassmorphism */}
      <aside
        className={`flex-shrink-0 flex flex-col border-r border-black/5 h-full z-20 transition-all duration-300 ${
          isSidebarCollapsed ? 'w-0 opacity-0' : 'w-64 opacity-100'
        }`}
        style={{
          background: 'rgba(242, 242, 247, 0.6)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        {/* Traffic Light Controls - macOS Window Buttons */}
        <div className="h-12 flex items-center px-5 gap-2 select-none">
          <button
            onClick={handleClose}
            className="w-3 h-3 rounded-full bg-[#FF5F57] border border-[#E0443E] hover:brightness-110 transition-all group relative"
            title="Close Window"
          >
            <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <svg width="6" height="6" viewBox="0 0 6 6" className="text-[#8B0000]">
                <path d="M0 0 L6 6 M6 0 L0 6" stroke="currentColor" strokeWidth="1" />
              </svg>
            </span>
          </button>
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="w-3 h-3 rounded-full bg-[#FEBC2E] border border-[#D89E24] hover:brightness-110 transition-all group relative"
            title="Toggle Sidebar"
          >
            <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <svg width="6" height="2" viewBox="0 0 6 2" className="text-[#8B6914]">
                <rect width="6" height="2" fill="currentColor" />
              </svg>
            </span>
          </button>
          <button
            onClick={toggleFullscreen}
            className="w-3 h-3 rounded-full bg-[#28C840] border border-[#1AAB29] hover:brightness-110 transition-all group relative"
            title="Toggle Fullscreen"
          >
            <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <svg width="6" height="6" viewBox="0 0 6 6" className="text-[#0F5323]">
                <path d="M1 1 L5 1 L5 5 L1 5 Z" fill="none" stroke="currentColor" strokeWidth="1" />
                <path d="M0 3 L3 0 M3 6 L6 3" stroke="currentColor" strokeWidth="1" />
              </svg>
            </span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="px-4 mb-3">
          <div className="relative">
            <Search className="absolute left-2 top-1.5 text-[#86868B] w-[18px] h-[18px]" strokeWidth={2} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search"
              className="w-full bg-black/5 border-none rounded-lg py-1.5 pl-8 pr-3 text-sm placeholder-[#86868B]/70 focus:ring-2 focus:ring-[#007AFF]/30 focus:bg-white transition-all shadow-sm text-[#111111]"
            />
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 px-3 space-y-1 overflow-y-auto">
          {/* General Section */}
          {filteredGeneralNav.length > 0 && (
            <>
              <div className="px-3 py-1 text-[11px] font-semibold text-[#86868B] uppercase tracking-wider mb-1">
                General
              </div>
              {filteredGeneralNav.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-1.5 rounded-lg transition-colors group ${
                  isActive
                    ? 'bg-[#007AFF] text-white shadow-sm'
                    : 'text-[#86868B] hover:bg-black/5'
                }`
              }
            >
              <item.icon className="w-[18px] h-[18px]" strokeWidth={2} />
              <span className="text-[13px] font-medium">{item.name}</span>
            </NavLink>
          ))}
            </>
          )}

          {filteredGeneralNav.length > 0 && filteredSystemNav.length > 0 && <div className="h-4"></div>}

          {/* System Section */}
          {filteredSystemNav.length > 0 && (
            <>
              <div className="px-3 py-1 text-[11px] font-semibold text-[#86868B] uppercase tracking-wider mb-1">
                System
              </div>
              {filteredSystemNav.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-1.5 rounded-lg transition-colors group ${
                  isActive
                    ? 'bg-[#007AFF] text-white shadow-sm'
                    : 'text-[#86868B] hover:bg-black/5'
                }`
              }
            >
              <item.icon className="w-[18px] h-[18px]" strokeWidth={2} />
              <span className="text-[13px] font-medium">{item.name}</span>
            </NavLink>
          ))}
            </>
          )}

          {/* No Results Message */}
          {searchQuery && filteredGeneralNav.length === 0 && filteredSystemNav.length === 0 && (
            <div className="px-3 py-4 text-center text-[13px] text-[#86868B]">
              No results found for "{searchQuery}"
            </div>
          )}
        </div>

        {/* User Profile Footer */}
        <div className="p-3 border-t border-black/5">
          <div 
            className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-black/5 transition-colors cursor-pointer"
            onClick={(e) => {
              // Find and click the UserButton avatar
              const avatarButton = e.currentTarget.querySelector('button[data-clerk-element="userButton"]') as HTMLElement;
              if (avatarButton) {
                avatarButton.click();
              } else {
                // Fallback: click any button in the UserButton
                const anyButton = e.currentTarget.querySelector('button') as HTMLElement;
                anyButton?.click();
              }
            }}
          >
            <div className="flex-shrink-0 pointer-events-none">
              <UserButton
                appearance={{
                  elements: {
                    rootBox: "pointer-events-auto",
                    avatarBox: "w-8 h-8 rounded-full border border-black/10 shadow-sm",
                    userButtonPopoverCard: "shadow-[0_8px_24px_rgba(0,0,0,0.12)] rounded-xl border border-black/5",
                    userButtonPopoverActionButton: "hover:bg-black/5 text-sm rounded-lg",
                    userButtonPopoverActionButtonText: "text-sm font-medium",
                    userButtonPopoverActionButtonIcon: "w-4 h-4",
                    userButtonPopoverFooter: "hidden",
                    userPreviewMainIdentifier: "text-sm font-semibold text-[#111111]",
                    userPreviewSecondaryIdentifier: "text-xs text-[#86868B]"
                  }
                }}
                afterSignOutUrl="/sign-in"
                showName={false}
              />
            </div>
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-[13px] font-medium text-[#111111] leading-tight truncate">
                {user?.firstName || 'Admin User'}
              </span>
              <span className="text-[11px] text-[#86868B] truncate">
                {user?.primaryEmailAddress?.emailAddress || 'admin@tudb.io'}
              </span>
            </div>
            <svg width="16" height="16" viewBox="0 0 16 16" className="text-[#86868B] flex-shrink-0">
              <path d="M4 6 L8 10 L12 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Breadcrumb Header - macOS Style */}
        <header
          className="sticky top-0 z-20 flex items-center justify-between px-8 py-4 border-b border-black/5"
          style={{
            background: 'rgba(255, 255, 255, 0.7)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
          }}
        >
          <div className="flex items-center gap-2 text-[#86868B] text-[13px]">
            {/* Toggle Sidebar Button (when collapsed) */}
            {isSidebarCollapsed && (
              <button
                onClick={() => setIsSidebarCollapsed(false)}
                className="mr-2 p-1.5 rounded-md hover:bg-black/5 text-[#86868B] hover:text-[#111111] transition-colors"
                title="Show Sidebar"
              >
                <LayoutDashboard className="w-5 h-5" strokeWidth={2} />
              </button>
            )}
            <span className="hover:text-[#111111] cursor-pointer transition-colors">Home</span>
            <svg className="w-3 h-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-[#111111] font-medium">{getPageTitle()}</span>
          </div>

          {/* Header Actions */}
          <div className="flex items-center gap-3">
            <a 
              href="https://bcworks.in.net/about_tudb" 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5 text-[#86868B] hover:text-[#111111] transition-all"
              title="About TUDB"
            >
              <HelpCircle className="w-[18px] h-[18px]" strokeWidth={2} />
            </a>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto scroll-smooth">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
