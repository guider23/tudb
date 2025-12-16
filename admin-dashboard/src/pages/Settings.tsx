import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, Zap, Key, RefreshCw, Check } from 'lucide-react';
import { api } from '../lib/api';

export default function Settings() {
  const queryClient = useQueryClient();
  const [hasChanges, setHasChanges] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    document.title = 'Settings';
  }, []);

  const { data: settingsData, isLoading, error } = useQuery({
    queryKey: ['settings'],
    queryFn: api.getSettings,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const [settings, setSettings] = useState({
    allowDestructiveOps: false,
    requireApproval: true,
    maxRowLimit: 1000,
    queryTimeout: 5000,
    enableAuditLog: true,
    apiKey: 'tk_live_51Msz...x8a92m',
  });

  useEffect(() => {
    if (settingsData) {
      setSettings(settingsData);
      setHasChanges(false);
    }
  }, [settingsData]);

  const updateMutation = useMutation({
    mutationFn: api.updateSettings,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      setHasChanges(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      
      // Update local state with response
      if (data.settings) {
        setSettings(data.settings);
      }
    },
    onError: (error: any) => {
      console.error('Settings save error:', error);
      const message = error.response?.data?.message 
        || error.response?.data?.error
        || error.message 
        || 'Failed to save settings';
      const details = error.response?.status ? ` (Status: ${error.response.status})` : '';
      alert('Error saving settings: ' + message + details + '\n\nCheck console for details.');
    },
  });

  const regenerateKeyMutation = useMutation({
    mutationFn: async () => {
      const response = await api.updateSettings({ regenerateApiKey: true });
      return response;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      if (data.settings?.apiKey) {
        setSettings(prev => ({ ...prev, apiKey: data.settings.apiKey }));
        alert('API key regenerated successfully!\n\nNew key: ' + data.settings.apiKey + '\n\nPlease save this key securely.');
      }
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to regenerate API key';
      alert('Error: ' + message);
    },
  });

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen backdrop-blur-xl">
        <div className="text-center bg-white rounded-[1.25rem] px-12 py-8 shadow-[0_4px_12px_rgba(0,0,0,0.03)]">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#007AFF] border-t-transparent mx-auto mb-4"></div>
          <p className="text-sm text-slate-800 font-medium">Loading settings...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-screen backdrop-blur-xl">
        <div className="text-center bg-white rounded-[1.25rem] px-12 py-8 shadow-[0_4px_12px_rgba(0,0,0,0.03)] max-w-md">
          <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-base text-slate-800 font-semibold mb-2">Unable to load settings</p>
          <p className="text-sm text-slate-500 mb-4">Please check your connection and try again</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-[#007AFF] text-white rounded-lg text-sm font-medium hover:bg-[#0051D5] transition-colors"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-full backdrop-blur-xl">
        <div className="text-center bg-white rounded-[1.25rem] px-12 py-8 shadow-[0_4px_12px_rgba(0,0,0,0.03)]">
          <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-sm text-slate-800 font-medium mb-2">Unable to load settings</p>
          <p className="text-xs text-slate-500">Please check your connection and try again</p>
        </div>
      </div>
    );
  }

  const handleSettingChange = (updates: Partial<typeof settings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
    setHasChanges(true);
  };

  const handleSaveSettings = () => {
    if (!hasChanges) return;
    
    // Validate settings
    if (settings.maxRowLimit < 1 || settings.maxRowLimit > 10000) {
      alert('Maximum row limit must be between 1 and 10,000');
      return;
    }
    if (settings.queryTimeout < 100 || settings.queryTimeout > 60000) {
      alert('Query timeout must be between 100ms and 60,000ms');
      return;
    }

    updateMutation.mutate(settings);
  };

  const handleRegenerateKey = () => {
    const confirmed = confirm(
      'Are you sure you want to regenerate the API key?\n\n' +
      'This will invalidate the current key and all applications using it will need to be updated.\n\n' +
      'This action cannot be undone.'
    );
    
    if (confirmed) {
      regenerateKeyMutation.mutate();
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-full backdrop-blur-xl">
        <div className="text-center bg-white rounded-[1.25rem] px-12 py-8 shadow-[0_4px_12px_rgba(0,0,0,0.03)] max-w-md">
          <div className="size-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-[#111111] mb-2">Failed to load settings</h3>
          <p className="text-sm text-gray-600 mb-6">{(error as any).message || 'Unknown error'}</p>
          <button 
            onClick={() => queryClient.invalidateQueries({ queryKey: ['settings'] })}
            className="px-6 py-2.5 bg-[#007AFF] text-white rounded-full font-medium hover:bg-[#0051D5] transition-all shadow-[0_2px_8px_rgba(0,122,255,0.3)] hover:shadow-[0_4px_12px_rgba(0,122,255,0.4)]"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full backdrop-blur-xl">
        <div className="text-center bg-white rounded-[1.25rem] px-12 py-8 shadow-[0_4px_12px_rgba(0,0,0,0.03)]">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#007AFF] border-t-transparent mx-auto mb-4"></div>
          <p className="text-sm text-slate-800 font-medium">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="flex-1 h-full overflow-y-auto relative scroll-smooth bg-[#F5F5F7]">
      {/* Decorative Background Blurs */}
      <div className="fixed top-[-10%] right-[-5%] w-[500px] h-[500px] bg-blue-400/20 rounded-full blur-3xl pointer-events-none z-0"></div>
      <div className="fixed bottom-[-10%] left-[10%] w-[400px] h-[400px] bg-purple-400/20 rounded-full blur-3xl pointer-events-none z-0"></div>
      
      <div className="relative z-10 max-w-4xl mx-auto px-8 py-10 pb-32">
        {/* Page Header */}
        <header className="mb-10 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">Settings</h1>
            <p className="text-[15px] text-slate-500 font-normal max-w-lg leading-relaxed">
              Configure security, performance, and system behavior for your TUDB instance.
            </p>
          </div>
          <button
            onClick={handleSaveSettings}
            disabled={!hasChanges || updateMutation.isPending}
            className="bg-[#007AFF] hover:bg-[#0051D5] text-white text-sm font-semibold py-2 px-4 rounded-full transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[#007AFF] shrink-0"
          >
            {updateMutation.isPending ? 'Saving...' : 'Save Settings'}
          </button>
        </header>

        <div className="flex flex-col gap-8">
          {/* Section 1: Security */}
          <section className="bg-white/65 backdrop-blur-[20px] rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.05),0_1px_2px_rgba(0,0,0,0.05)] p-1">
            <div className="px-6 py-4 border-b border-black/5 flex items-center gap-3">
              <div className="bg-blue-500/10 p-1.5 rounded-lg text-blue-600">
                <Shield className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-semibold text-slate-800">Security</h2>
            </div>
            <div className="p-2">
              {/* List Item 1 */}
              <div className="flex items-center justify-between p-4 rounded-xl hover:bg-white/50 transition-colors">
                <div className="flex flex-col gap-1 pr-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[15px] font-medium text-slate-900">Allow Destructive Operations</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-600 uppercase tracking-wide">
                      Danger Zone
                    </span>
                  </div>
                  <span className="text-sm text-slate-500 leading-snug">
                    Permits dropping tables and bulk deletion via query interface.
                  </span>
                </div>
                <label className="shrink-0 cursor-pointer relative inline-block w-11 h-6">
                  <input
                    type="checkbox"
                    checked={settings.allowDestructiveOps}
                    onChange={(e) => handleSettingChange({ allowDestructiveOps: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-full h-full bg-[#E9E9EA] rounded-full transition-colors peer-checked:bg-[#34C759]"></div>
                  <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-[0_2px_4px_rgba(0,0,0,0.2)] transition-transform peer-checked:translate-x-5"></div>
                </label>
              </div>
              
              <div className="h-px bg-slate-200/50 mx-4"></div>
              
              {/* List Item 2 */}
              <div className="flex items-center justify-between p-4 rounded-xl hover:bg-white/50 transition-colors">
                <div className="flex flex-col gap-1 pr-4">
                  <span className="text-[15px] font-medium text-slate-900">Require Manual Approval</span>
                  <span className="text-sm text-slate-500 leading-snug">
                    Admins must approve high-latency queries before execution.
                  </span>
                </div>
                <label className="shrink-0 cursor-pointer relative inline-block w-11 h-6">
                  <input
                    type="checkbox"
                    checked={settings.requireApproval}
                    onChange={(e) => handleSettingChange({ requireApproval: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-full h-full bg-[#E9E9EA] rounded-full transition-colors peer-checked:bg-[#34C759]"></div>
                  <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-[0_2px_4px_rgba(0,0,0,0.2)] transition-transform peer-checked:translate-x-5"></div>
                </label>
              </div>
              
              <div className="h-px bg-slate-200/50 mx-4"></div>
              
              {/* List Item 3 */}
              <div className="flex items-center justify-between p-4 rounded-xl hover:bg-white/50 transition-colors">
                <div className="flex flex-col gap-1 pr-4">
                  <span className="text-[15px] font-medium text-slate-900">Enable Audit Logging</span>
                  <span className="text-sm text-slate-500 leading-snug">
                    Record all incoming requests and query executions to disk.
                  </span>
                </div>
                <label className="shrink-0 cursor-pointer relative inline-block w-11 h-6">
                  <input
                    type="checkbox"
                    checked={settings.enableAuditLog}
                    onChange={(e) => handleSettingChange({ enableAuditLog: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-full h-full bg-[#E9E9EA] rounded-full transition-colors peer-checked:bg-[#34C759]"></div>
                  <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-[0_2px_4px_rgba(0,0,0,0.2)] transition-transform peer-checked:translate-x-5"></div>
                </label>
              </div>
            </div>
          </section>

          {/* Section 2: Performance */}
          <section className="bg-white/65 backdrop-blur-[20px] rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.05),0_1px_2px_rgba(0,0,0,0.05)] p-1">
            <div className="px-6 py-4 border-b border-black/5 flex items-center gap-3">
              <div className="bg-orange-500/10 p-1.5 rounded-lg text-orange-600">
                <Zap className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-semibold text-slate-800">Performance</h2>
            </div>
            <div className="p-2">
              {/* Maximum Row Limit */}
              <div className="flex items-center justify-between p-4 rounded-xl hover:bg-white/50 transition-colors">
                <div className="flex flex-col gap-1 pr-4">
                  <span className="text-[15px] font-medium text-slate-900">Maximum Row Limit</span>
                  <span className="text-sm text-slate-500 leading-snug">
                    Hard limit for SELECT query results.
                  </span>
                </div>
                <input
                  type="number"
                  value={settings.maxRowLimit}
                  onChange={(e) => handleSettingChange({ maxRowLimit: parseInt(e.target.value) || 0 })}
                  placeholder="e.g. 1000"
                  min="1"
                  max="10000"
                  className="w-32 bg-white border border-slate-200 text-slate-900 rounded-lg px-3 py-2 shadow-sm focus:ring-2 focus:ring-[#007AFF]/20 focus:border-[#007AFF] text-sm transition-all"
                />
              </div>
              
              <div className="h-px bg-slate-200/50 mx-4"></div>
              
              {/* Query Timeout */}
              <div className="flex items-center justify-between p-4 rounded-xl hover:bg-white/50 transition-colors">
                <div className="flex flex-col gap-1 pr-4">
                  <span className="text-[15px] font-medium text-slate-900">Query Timeout</span>
                  <span className="text-sm text-slate-500 leading-snug">
                    Time before a running query is killed (in milliseconds).
                  </span>
                </div>
                <input
                  type="number"
                  value={settings.queryTimeout}
                  onChange={(e) => handleSettingChange({ queryTimeout: parseInt(e.target.value) || 0 })}
                  placeholder="e.g. 5000"
                  min="100"
                  max="60000"
                  className="w-32 bg-white border border-slate-200 text-slate-900 rounded-lg px-3 py-2 shadow-sm focus:ring-2 focus:ring-[#007AFF]/20 focus:border-[#007AFF] text-sm transition-all"
                />
              </div>
            </div>
          </section>

          {/* Section 3: API Configuration */}
          <section className="bg-white/65 backdrop-blur-[20px] rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.05),0_1px_2px_rgba(0,0,0,0.05)] p-1">
            <div className="px-6 py-4 border-b border-black/5 flex items-center gap-3">
              <div className="bg-purple-500/10 p-1.5 rounded-lg text-purple-600">
                <Key className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-semibold text-slate-800">API Configuration</h2>
            </div>
            <div className="p-2">
              {/* API Key Display */}
              <div className="flex items-center justify-between p-4 rounded-xl hover:bg-white/50 transition-colors">
                <div className="flex flex-col gap-1 pr-4 flex-1">
                  <span className="text-[15px] font-medium text-slate-900">Primary API Key</span>
                  <div className="flex items-center gap-2 mt-1">
                    <Key className="text-slate-400 w-4 h-4" />
                    <code className="text-sm text-slate-500 font-mono">{settings.apiKey}</code>
                  </div>
                  <span className="text-sm text-slate-500 leading-snug mt-1">
                    Use this key to authenticate requests from your backend.
                  </span>
                </div>
                <button
                  onClick={handleRegenerateKey}
                  disabled={regenerateKeyMutation.isPending}
                  className="shrink-0 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-sm font-medium py-2 px-4 rounded-full shadow-sm transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className={`w-4 h-4 ${regenerateKeyMutation.isPending ? 'animate-spin' : ''}`} />
                  {regenerateKeyMutation.isPending ? 'Regenerating...' : 'Regenerate'}
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>



      {/* Success Toast */}
      {showSuccess && (
        <div className="fixed top-8 right-8 z-50 animate-[slideIn_0.3s_ease-out]">
          <div className="bg-[#34C759] text-white px-6 py-3 rounded-full shadow-[0_4px_16px_rgba(52,199,89,0.4)] flex items-center gap-3">
            <Check className="w-5 h-5" />
            <span className="font-medium">Settings saved successfully!</span>
          </div>
        </div>
      )}
    </main>
  );
}
