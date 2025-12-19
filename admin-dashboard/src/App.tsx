import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/clerk-react';
import { useState, useEffect } from 'react';
import { Monitor, Smartphone } from 'lucide-react';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Connections from './pages/Connections';
import QueryInterface from './pages/QueryInterface';
import Settings from './pages/Settings';
import SavedQueries from './pages/SavedQueries';
import SetupGuide from './pages/SetupGuide';
import Inspect from './pages/Inspect';
import SignInPage from './pages/SignIn';
import SignUpPage from './pages/SignUp';
import SharedQuery from './pages/SharedQuery';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30000,
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SignedIn>{children}</SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}

// Mobile/Tablet Detection Component
function MobileWarning() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5F5F7] via-white to-[#F5F5F7] flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        {/* Glassmorphic Card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-[24px] shadow-[0_8px_32px_rgba(0,0,0,0.08)] border border-white/20 p-8 text-center">
          {/* Icon */}
          <div className="relative mb-6 flex justify-center">
            <div className="relative inline-block">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#007AFF] to-[#0051D5] flex items-center justify-center shadow-[0_8px_24px_rgba(0,122,255,0.3)]">
                <Monitor className="w-10 h-10 text-white" strokeWidth={2} />
              </div>
              <div className="absolute -bottom-1 -right-2 w-12 h-12 rounded-full bg-white shadow-lg flex items-center justify-center border-2 border-[#F5F5F7]">
                <Smartphone className="w-6 h-6 text-[#86868B]" strokeWidth={2} />
              </div>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-[#111111] mb-3 tracking-tight">
            Desktop Only
          </h1>

          {/* Message */}
          <p className="text-[15px] text-[#86868B] leading-relaxed mb-6">
            TUDB is optimized for desktop experience. Please access this application from your PC for the best performance.
          </p>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-black/10 to-transparent mb-6"></div>

          {/* Coming Soon Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-r from-[#007AFF]/10 to-[#0051D5]/10 border border-[#007AFF]/20">
            <div className="w-2 h-2 rounded-full bg-[#007AFF] animate-pulse"></div>
            <span className="text-sm font-semibold text-[#007AFF]">
              Android App Coming Soon
            </span>
          </div>

          {/* Footer Note */}
          <p className="text-xs text-[#86868B]/70 mt-6">
            We're working on a mobile app to bring TUDB to your pocket
          </p>
        </div>

        {/* Floating Elements */}
        <div className="absolute top-20 left-10 w-32 h-32 bg-blue-400/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-20 right-10 w-40 h-40 bg-purple-400/10 rounded-full blur-3xl pointer-events-none"></div>
      </div>
    </div>
  );
}

function App() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const mobileKeywords = ['android', 'webos', 'iphone', 'ipad', 'ipod', 'blackberry', 'windows phone'];
      const isMobileDevice = mobileKeywords.some(keyword => userAgent.includes(keyword));
      const isSmallScreen = window.innerWidth < 1024; // Less than 1024px width
      
      setIsMobile(isMobileDevice || isSmallScreen);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Show mobile warning if detected
  if (isMobile) {
    return <MobileWarning />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/sign-in/*" element={<SignInPage />} />
          <Route path="/sign-up/*" element={<SignUpPage />} />
          <Route path="/shared/:token" element={<SharedQuery />} />

          {/* Protected Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/query" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="connections" element={<Connections />} />
            <Route path="query" element={<QueryInterface />} />
            <Route path="saved-queries" element={<SavedQueries />} />
            <Route path="inspect" element={<Inspect />} />
            <Route path="settings" element={<Settings />} />
            <Route path="setup-guide" element={<SetupGuide />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
