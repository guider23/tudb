import { SignUp } from '@clerk/clerk-react'
import { useState, useEffect } from 'react'

export default function SignUpPage() {
  const [showcaseView, setShowcaseView] = useState<'query' | 'visualization' | 'history'>('query')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Set page title
    document.title = 'Sign Up';
    
    // Preload background image
    const img = new Image()
    img.src = 'https://lh3.googleusercontent.com/aida-public/AB6AXuDIMhyZ8GGWSL7XDhx230-MCcdokJmJBFuFpLcLrkIuVj5bTz94m-xlicGgli-uqBf-L_p8qFHoVvHbaQf_xmefaSZw4Y4ZN7xmZCHJBrXFc9oTS0Qlpd0pqSEUh_0vjJmhH48ZFfC5ktbJjlhC4CaK3dhhuyugqBIxgc4MWwOmwZCF6NylbaqKAUQWASQ9NoBWfkIuXhEsSkowDnCb3R-u1CisAmQWelVWIyGUAcnJFtFO2Tkhcqr18Blajxx8yZ0VYyLUl7wEArAZ'
    
    img.onload = () => {
      // Wait for Clerk component and other resources to be ready
      setTimeout(() => {
        setIsLoading(false)
      }, 800) // Small delay to ensure Clerk component is fully loaded
    }

    img.onerror = () => {
      // If image fails to load, still show the page
      setTimeout(() => {
        setIsLoading(false)
      }, 800)
    }
  }, [])

  // Show loading screen
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen backdrop-blur-xl" style={{ backgroundColor: '#FFFFFF' }}>
        <div className="text-center bg-white rounded-[1.25rem] px-12 py-8 shadow-[0_4px_12px_rgba(0,0,0,0.03)]">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#007AFF] border-t-transparent mx-auto mb-4"></div>
          <p className="text-sm text-slate-800 font-medium">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="text-gray-900 font-sans h-screen flex overflow-hidden transition-colors duration-200" style={{ backgroundColor: '#FFFFFF' }}>
      {/* Left Side - Clerk SignUp */}
      <div className="w-full lg:w-[42%] flex flex-col justify-center items-center px-8 sm:px-12 lg:px-16 xl:px-24 py-12 bg-white relative overflow-y-auto">
        <SignUp 
          routing="path"
          path="/sign-up"
          signInUrl="/sign-in"
          afterSignUpUrl="/dashboard"
        />
      </div>

      {/* Right Side - Showcase */}
      <div className="hidden lg:flex lg:w-[58%] h-screen items-center justify-center px-8 py-12" style={{ maxWidth: '1000px' }}>
        <div 
          className="w-[80%] max-w-2xl relative overflow-hidden flex flex-col justify-center items-center px-10 py-24 text-white rounded-2xl"
          style={{
            backgroundColor: '#0B1E3F',
            backgroundImage: 'url(https://lh3.googleusercontent.com/aida-public/AB6AXuDIMhyZ8GGWSL7XDhx230-MCcdokJmJBFuFpLcLrkIuVj5bTz94m-xlicGgli-uqBf-L_p8qFHoVvHbaQf_xmefaSZw4Y4ZN7xmZCHJBrXFc9oTS0Qlpd0pqSEUh_0vjJmhH48ZFfC5ktbJjlhC4CaK3dhhuyugqBIxgc4MWwOmwZCF6NylbaqKAUQWASQ9NoBWfkIuXhEsSkowDnCb3R-u1CisAmQWelVWIyGUAcnJFtFO2Tkhcqr18Blajxx8yZ0VYyLUl7wEArAZ), radial-gradient(at 90% 10%, hsla(160, 60%, 35%, 1) 0, transparent 50%), radial-gradient(at 10% 90%, hsla(220, 60%, 25%, 1) 0, transparent 50%), radial-gradient(at 50% 50%, hsla(200, 50%, 20%, 0.5) 0, transparent 50%)'
          }}
        >
        {/* Network Pattern Decorations */}
        <div className="absolute inset-0 pointer-events-none opacity-30">
          <div className="absolute top-1/4 right-1/4 w-3 h-3 bg-emerald-400 rounded-full shadow-[0_0_15px_rgba(52,211,153,0.8)]"></div>
          <div className="absolute top-1/4 right-1/4 w-48 h-[1px] bg-gradient-to-r from-emerald-400/0 via-emerald-400/50 to-emerald-400/0 transform rotate-45 origin-left"></div>
          <div className="absolute bottom-1/3 left-1/4 w-4 h-4 bg-blue-400 rounded-full shadow-[0_0_15px_rgba(96,165,250,0.8)]"></div>
          <div className="absolute bottom-1/3 left-1/4 w-64 h-[1px] bg-gradient-to-r from-blue-400/0 via-blue-400/30 to-blue-400/0 transform -rotate-15 origin-left"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-lg w-full">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 leading-tight tracking-tight">
            Unlock the Power <br /> of Data with tudb
          </h2>
          <p className="text-lg text-gray-200 mb-12 leading-relaxed opacity-90 font-light">
            Converse with your database in natural language. <br />
            Fast, accurate, and secure.
          </p>

          {/* Demo Query Card */}
          <div className="relative">
            <div className="bg-white rounded-xl shadow-2xl p-6 text-gray-800 w-full relative z-20 overflow-hidden" style={{ height: '320px' }}>
              {/* User Message */}
              <div className="flex justify-end mb-6">
                <div className="bg-gray-100 rounded-lg rounded-tr-none px-4 py-3 max-w-[90%] shadow-sm border border-gray-100">
                  <p className="text-sm font-medium text-gray-700">Show me the total sales for last month by region.</p>
                </div>
              </div>

              {/* AI Response - Conditional based on showcaseView */}
              {showcaseView === 'query' && (
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: '#10B981' }}>
                    <i className="ph-fill ph-database text-lg"></i>
                  </div>
                  <div className="bg-gray-50 rounded-lg rounded-tl-none p-4 w-full border border-gray-100 shadow-inner">
                    <code className="font-mono text-xs sm:text-sm leading-relaxed block">
                      <span style={{color: '#2563EB', fontWeight: '500'}}>SELECT</span> region, <span style={{color: '#9333EA'}}>SUM</span>(sales)<br />
                      <span style={{color: '#2563EB', fontWeight: '500'}}>FROM</span> orders<br />
                      <span style={{color: '#2563EB', fontWeight: '500'}}>WHERE</span> month = <span style={{color: '#16A34A'}}>'last_month'</span><br />
                      <span style={{color: '#2563EB', fontWeight: '500'}}>GROUP BY</span> region;
                    </code>
                  </div>
                </div>
              )}

              {showcaseView === 'visualization' && (
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: '#10B981' }}>
                    <i className="ph-fill ph-chart-bar text-lg"></i>
                  </div>
                  <div className="bg-gray-50 rounded-lg rounded-tl-none p-4 w-full border border-gray-100 shadow-inner">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-700 w-20">North</span>
                        <div className="flex-1 bg-gradient-to-r from-gray-800 to-gray-600 h-8 rounded flex items-center justify-end px-2" style={{ width: '85%' }}>
                          <span className="text-white text-xs font-semibold">,500</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-700 w-20">South</span>
                        <div className="flex-1 bg-gradient-to-r from-gray-700 to-gray-500 h-8 rounded flex items-center justify-end px-2" style={{ width: '68%' }}>
                          <span className="text-white text-xs font-semibold">,200</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-700 w-20">East</span>
                        <div className="flex-1 bg-gradient-to-r from-gray-900 to-gray-700 h-8 rounded flex items-center justify-end px-2" style={{ width: '92%' }}>
                          <span className="text-white text-xs font-semibold">,100</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-700 w-20">West</span>
                        <div className="flex-1 bg-gradient-to-r from-gray-700 to-gray-500 h-8 rounded flex items-center justify-end px-2" style={{ width: '75%' }}>
                          <span className="text-white text-xs font-semibold">,800</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {showcaseView === 'history' && (
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: '#10B981' }}>
                    <i className="ph-fill ph-clock-counter-clockwise text-lg"></i>
                  </div>
                  <div className="bg-gray-50 rounded-lg rounded-tl-none p-4 w-full border border-gray-100 shadow-inner">
                    <div className="space-y-2 text-sm text-gray-700">
                      <div className="flex items-start gap-2">
                        <span className="text-gray-400 text-xs mt-0.5">10:45 AM</span>
                        <p>Revenue analysis by product category</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-gray-400 text-xs mt-0.5">10:32 AM</span>
                        <p>Customer demographics breakdown</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-gray-400 text-xs mt-0.5">10:15 AM</span>
                        <p>Monthly sales trend visualization</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-gray-400 text-xs mt-0.5">09:58 AM</span>
                        <p>Top performing products last quarter</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="absolute -bottom-4 -right-4 bg-white rounded-lg shadow-xl p-2 flex gap-2 z-30 border border-gray-100">
              <div 
                onClick={() => setShowcaseView('visualization')}
                className={'w-8 h-8 flex items-center justify-center rounded cursor-pointer transition-colors ' + (showcaseView === 'visualization' ? 'text-white' : 'hover:bg-gray-50 text-gray-500')}
                style={showcaseView === 'visualization' ? { backgroundColor: '#10B981' } : {}}
              >
                <i className="ph ph-chart-bar text-xl"></i>
              </div>
              <div 
                onClick={() => setShowcaseView('query')}
                className={'w-8 h-8 flex items-center justify-center rounded cursor-pointer transition-colors ' + (showcaseView === 'query' ? 'text-white shadow-sm' : 'hover:bg-gray-50 text-gray-500')}
                style={showcaseView === 'query' ? { backgroundColor: '#10B981' } : {}}
              >
                <i className="ph ph-arrows-down-up text-xl"></i>
              </div>
              <div 
                onClick={() => setShowcaseView('history')}
                className={'w-8 h-8 flex items-center justify-center rounded cursor-pointer transition-colors ' + (showcaseView === 'history' ? 'text-white' : 'hover:bg-gray-50 text-gray-500')}
                style={showcaseView === 'history' ? { backgroundColor: '#10B981' } : {}}
              >
                <i className="ph ph-clock-counter-clockwise text-xl"></i>
              </div>
            </div>

            {/* Glow Effect */}
            <div className="absolute -inset-4 bg-emerald-500/20 blur-xl rounded-full -z-10"></div>
          </div>
        </div>
        </div>
      </div>
    </div>
  )
}
