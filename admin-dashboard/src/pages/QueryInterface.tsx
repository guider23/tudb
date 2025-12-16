import { useState, useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Table, AlertCircle, Shield, History, Download, Code, MessageSquare, Play, X, BarChart3, Bookmark, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '@clerk/clerk-react';
import { api, setAuthTokenGetter } from '../lib/api';
import VisualizationPanel from '../components/VisualizationPanel';
import ExportModal from '../components/ExportModal';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';

interface QueryResult {
  columns: string[];
  rows: any[];
  rowCount: number;
  executionTime: number;
}

export default function QueryInterface() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const queryClient = useQueryClient();
  const { toast, showToast, hideToast } = useToast();
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState<QueryResult | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [activeTab, setActiveTab] = useState<'table' | 'visualization' | 'explain'>('table');
  const [showExportModal, setShowExportModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [currentSQL, setCurrentSQL] = useState<string>('');
  const [pendingApproval, setPendingApproval] = useState<any>(null);
  const [showSQLModal, setShowSQLModal] = useState(false);
  const [aiExplanation, setAiExplanation] = useState<string>('');
  const [isExplaining, setIsExplaining] = useState(false);

  // Check for pre-filled query from URL
  useEffect(() => {
    document.title = 'Query Interface';
    
    const params = new URLSearchParams(window.location.search);
    const prefilledQuery = params.get('q');
    if (prefilledQuery) {
      setQuestion(decodeURIComponent(prefilledQuery));
      // Clear the URL parameter
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Fetch settings to check if destructive operations are allowed
  const { data: settingsData } = useQuery({
    queryKey: ['settings'],
    queryFn: api.getSettings,
    enabled: isSignedIn,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Fetch query history
  const { data: historyData } = useQuery({
    queryKey: ['query-history'],
    queryFn: () => api.getAuditLogs({ limit: 10 }),
    enabled: showHistory && isSignedIn,
    refetchInterval: false,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Set up the auth token getter for the API client
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      setAuthTokenGetter(getToken);
    }
  }, [isLoaded, isSignedIn, getToken]);

  const queryMutation = useMutation({
    mutationFn: async (userQuestion: string) => {
      const response = await api.executeQuery(userQuestion);
      return response;
    },
    onSuccess: (data) => {
      // The backend returns: { status, query, results, rowCount, explanation, summary }
      if (data.status === 'success' && data.results) {
        const columns = data.results.length > 0 ? Object.keys(data.results[0]) : [];
        setResult({
          columns,
          rows: data.results,
          rowCount: data.rowCount,
          executionTime: data.executionTime || 0,
        });
        setCurrentSQL(data.query || '');
        setPendingApproval(null);
        showToast('success', `Query executed successfully! ${data.rowCount} rows returned.`);
      } else if (data.status === 'approval_required') {
        // Show approval modal
        setPendingApproval(data);
        showToast('info', 'Query generated. Please review and approve to execute.');
      } else if (data.status === 'blocked') {
        showToast('warning', data.error || 'Query blocked by safety checks');
      }
      // Invalidate dashboard queries to update stats and recent queries
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['recent-queries'] });
    },
    onError: (error: any) => {
      console.error('Query error:', error);
      const errorMessage = error.response?.data?.error 
        || error.response?.data?.message 
        || error.message 
        || 'Could not process your query';
      const suggestion = error.response?.data?.suggestion || 'Please check your database connection in the Connections page.';
      showToast('error', `${errorMessage}. ${suggestion}`);
    },
  });

  // Approval mutation
  const approvalMutation = useMutation({
    mutationFn: async () => {
      if (!pendingApproval) throw new Error('No pending approval');
      return api.approveQuery(pendingApproval.query, pendingApproval.question);
    },
    onSuccess: (data) => {
      if (data.status === 'success' && data.results) {
        const columns = data.results.length > 0 ? Object.keys(data.results[0]) : [];
        setResult({
          columns,
          rows: data.results,
          rowCount: data.rowCount,
          executionTime: data.executionTime || 0,
        });
        setCurrentSQL(data.query || '');
        setPendingApproval(null);
        showToast('success', `Query executed successfully! ${data.rowCount} rows returned.`);
      }
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['recent-queries'] });
      queryClient.invalidateQueries({ queryKey: ['query-history'] });
    },
    onError: (error: any) => {
      showToast('error', error.message || 'Failed to execute approved query');
    },
  });

  // Explain mutation - sends question + table data to Bedrock for AI explanation
  const explainMutation = useMutation({
    mutationFn: async () => {
      setIsExplaining(true);
      const response = await api.explainQueryResults(question, result?.rows || [], result?.columns || []);
      return response;
    },
    onSuccess: (data) => {
      setAiExplanation(data.explanation || 'No explanation available.');
      setActiveTab('explain');
      setIsExplaining(false);
      showToast('success', 'AI explanation generated!');
    },
    onError: (error: any) => {
      setIsExplaining(false);
      showToast('error', error.message || 'Failed to generate explanation');
    },
  });

  // Save query mutation
  const saveQueryMutation = useMutation({
    mutationFn: async (data: { name: string; folder?: string }) => {
      return api.createSavedQuery({
        name: data.name,
        question,
        sql: currentSQL,
        folder: data.folder || null,
        is_favorite: false,
      });
    },
    onSuccess: () => {
      showToast('success', 'Query saved successfully!');
      setShowSaveModal(false);
      queryClient.invalidateQueries({ queryKey: ['savedQueries'] });
    },
    onError: (error: any) => {
      showToast('error', error.message || 'Failed to save query');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (question.trim()) {
      queryMutation.mutate(question);
    }
  };

  // Keyboard shortcut: Cmd+Enter or Ctrl+Enter to submit
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        if (question.trim() && !queryMutation.isPending) {
          queryMutation.mutate(question);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [question, queryMutation]);

  const exampleQueries = [
    'Show me all customers from Tamil Nadu',
    'Top 5 products by revenue',
    'Orders placed in the last 30 days',
    'Average order amount by customer',
  ];

  // Show loading while Clerk initializes
  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-full backdrop-blur-xl">
        <div className="text-center bg-white rounded-[1.25rem] px-12 py-8 shadow-[0_4px_12px_rgba(0,0,0,0.03)]">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#007AFF] border-t-transparent mx-auto mb-4"></div>
          <p className="text-sm text-slate-800 font-medium">Loading query interface...</p>
        </div>
      </div>
    );
  }

  // Show auth required if not signed in
  if (!isSignedIn) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#F5F5F7]">
        <div className="text-center max-w-md px-4">
          <Shield className="w-16 h-16 text-[#007AFF] mx-auto mb-4" />
          <h3 className="text-xl font-bold text-[#111111] mb-2">Authentication Required</h3>
          <p className="text-gray-600 mb-4">Please sign in to use the query interface.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full relative overflow-y-auto bg-[#F5F5F7]">
      <div className="p-8 max-w-[1400px] mx-auto w-full flex flex-col gap-8 pb-20">
        {/* Page Title */}
        <div className="flex flex-col gap-1 max-w-2xl">
          <h1 className="text-3xl font-bold text-[#111111] tracking-tight">Natural Language Query</h1>
          <p className="text-[#86868B] text-[15px]">
            Ask questions in plain English and let the engine generate SQL.
          </p>
        </div>

      {/* Query Input Card - Glassmorphic */}
      <div className="macos-glass-card">
        <div className="bg-white/60 rounded-[18px] p-6 border border-white/40">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Input Label with Icon */}
            <div className="flex justify-between items-center px-1">
              <label className="text-sm font-semibold text-[#111111] tracking-tight flex items-center gap-2" htmlFor="query-input">
                <MessageSquare className="w-[18px] h-[18px] text-[#007AFF]" strokeWidth={2} />
                Your Question
              </label>
              <span className="text-xs text-[#86868B] bg-black/5 px-2 py-0.5 rounded-full font-medium">
                ⌘ + Enter to run
              </span>
            </div>

            {/* Textarea with macOS styling */}
            <div className="relative group">
              <textarea
                id="query-input"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="e.g., Show me the top 10 users by signup date who have made a purchase in the last 30 days..."
                className="w-full min-h-[120px] resize-none rounded-xl bg-[#F5F5F7] border-transparent text-[#111111] placeholder-[#86868B]/60 focus:bg-white focus:border-[#007AFF]/50 focus:ring-4 focus:ring-[#007AFF]/20 p-4 text-[15px] leading-relaxed transition-all shadow-inner disabled:opacity-60"
                rows={4}
                disabled={queryMutation.isPending}
              />
            </div>

            {/* Action Row */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-1">
              {/* Safety Badge - Only show when destructive ops are NOT allowed */}
              {settingsData && !settingsData.allowDestructiveOps && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-50/80 border border-orange-100 text-xs text-orange-700 w-full md:w-auto">
                  <Shield className="w-4 h-4" strokeWidth={2} />
                  <span className="font-medium">
                    Safety Mode: <span className="font-bold">DELETE</span> / <span className="font-bold">DROP</span> blocked
                  </span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setShowHistory(!showHistory)}
                  className={`h-9 px-4 rounded-full border shadow-sm text-[13px] font-medium transition-all flex items-center gap-1.5 ${
                    showHistory 
                      ? 'bg-[#007AFF] text-white border-[#007AFF]' 
                      : 'bg-white border-black/10 text-[#111111] hover:bg-gray-50 active:bg-gray-100'
                  }`}
                >
                  <History className="w-[18px] h-[18px]" strokeWidth={2} />
                  History
                </button>
                <button
                  type="submit"
                  disabled={!question.trim() || queryMutation.isPending}
                  className="h-9 pl-4 pr-5 rounded-full bg-[#007AFF] hover:bg-[#0051D5] text-white text-[13px] font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition-all flex items-center gap-1.5 transform active:scale-95 focus:ring-2 focus:ring-offset-2 focus:ring-[#007AFF] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {queryMutation.isPending ? (
                    <>
                      <Loader2 className="w-[18px] h-[18px] animate-spin" strokeWidth={2} />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Play className="w-[18px] h-[18px]" strokeWidth={2} fill="currentColor" />
                      Execute
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Example Queries - Pill Style */}
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="text-xs text-[#86868B] font-medium py-1.5 mr-1">Suggestions:</span>
              {exampleQueries.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => setQuestion(example)}
                  className="px-3 py-1 rounded-full bg-white/80 border border-black/5 hover:border-[#007AFF]/30 text-xs text-[#86868B] hover:text-[#007AFF] shadow-sm hover:shadow-md transition-all"
                >
                  {example}
                </button>
              ))}
            </div>
          </form>
        </div>
      </div>

      {/* History Panel */}
      {showHistory && (
        <div className="macos-glass-card overflow-hidden">
          <div className="px-6 py-4 border-b border-black/5 bg-white/40 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <h3 className="text-base font-semibold text-[#111111]">Query History</h3>
              <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[11px] font-bold border border-blue-200">
                {historyData?.logs?.length || 0} queries
              </span>
            </div>
            <button
              onClick={() => setShowHistory(false)}
              className="p-1.5 rounded-md hover:bg-black/5 text-[#86868B] hover:text-[#111111] transition-colors"
            >
              <X className="w-5 h-5" strokeWidth={2} />
            </button>
          </div>
          <div className="p-6 max-h-[400px] overflow-y-auto">
            {historyData?.logs && historyData.logs.length > 0 ? (
              <div className="space-y-3">
                {historyData.logs.map((log: any, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setQuestion(log.question);
                      setShowHistory(false);
                    }}
                    className="w-full text-left p-4 rounded-xl bg-white/60 hover:bg-white border border-black/5 hover:border-[#007AFF]/30 transition-all group"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        log.status === 'success' ? 'bg-green-100 text-green-700' :
                        log.status === 'blocked' ? 'bg-orange-100 text-orange-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {log.status}
                      </span>
                      <span className="text-xs text-[#86868B]">{new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                    <p className="text-sm text-[#111111] group-hover:text-[#007AFF] transition-colors line-clamp-2">
                      {log.question}
                    </p>
                    {log.sql && (
                      <p className="text-xs text-[#86868B] mt-2 font-mono bg-black/5 px-2 py-1 rounded line-clamp-1">
                        {log.sql}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <History className="w-12 h-12 text-[#86868B] mx-auto mb-3 opacity-50" />
                <p className="text-[#86868B] text-sm">No query history yet</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error State - macOS Style */}
      {queryMutation.isError && (
        <div className="macos-glass-card overflow-hidden flex flex-col border border-red-200 bg-red-50/30">
          <div className="bg-red-500/10 px-5 py-3 border-b border-red-100 flex items-center gap-2">
            <AlertCircle className="w-[18px] h-[18px] text-red-500" strokeWidth={2} />
            <h4 className="text-red-600 text-sm font-semibold">Execution Failed</h4>
          </div>
          <div className="p-6 flex-1 flex flex-col justify-center">
            <p className="text-[#111111] text-sm mb-3">
              Could not process your query. Please check the syntax or try rephrasing.
            </p>
            <div className="bg-white/80 rounded-lg p-3 text-xs font-mono text-red-600 border border-red-100 shadow-sm">
              {(queryMutation.error as any)?.message || 'An error occurred while processing your query'}
            </div>
          </div>
        </div>
      )}

      {/* Results Table - macOS Style */}
      {result && (
        <div className="macos-glass-card overflow-hidden flex flex-col min-h-[400px] border border-white/60">
          {/* Results Header */}
          <div className="px-6 py-4 border-b border-black/5 bg-white/40 flex flex-wrap justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <h3 className="text-base font-semibold text-[#111111]">Query Results</h3>
              <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[11px] font-bold border border-green-200 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                Success
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs text-[#86868B]">
              <span className="font-medium bg-black/5 px-2 py-1 rounded-md">
                {result.rowCount} rows • {result.executionTime}ms
              </span>
              <div className="h-4 w-px bg-black/10"></div>
              <div className="flex gap-1">
                <button
                  onClick={() => setShowSaveModal(true)}
                  className="p-1.5 rounded-md hover:bg-black/5 text-[#86868B] hover:text-[#111111] transition-colors"
                  title="Save Query"
                >
                  <Bookmark className="w-[18px] h-[18px]" strokeWidth={2} />
                </button>
                <button
                  onClick={() => setShowExportModal(true)}
                  className="p-1.5 rounded-md hover:bg-black/5 text-[#86868B] hover:text-[#111111] transition-colors"
                  title="Export Data"
                >
                  <Download className="w-[18px] h-[18px]" strokeWidth={2} />
                </button>
                <button
                  onClick={() => setShowSQLModal(true)}
                  className="p-1.5 rounded-md hover:bg-black/5 text-[#86868B] hover:text-[#111111] transition-colors"
                  title="View SQL"
                >
                  <Code className="w-[18px] h-[18px]" strokeWidth={2} />
                </button>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-black/5 bg-white/30">
            <button
              onClick={() => setActiveTab('table')}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all relative ${
                activeTab === 'table'
                  ? 'text-[#007AFF] bg-white/60'
                  : 'text-[#86868B] hover:text-[#111111] hover:bg-white/30'
              }`}
            >
              <Table className="w-4 h-4" strokeWidth={2} />
              Table View
              {activeTab === 'table' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#007AFF]"></div>
              )}
            </button>
            <button
              onClick={() => setActiveTab('visualization')}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all relative ${
                activeTab === 'visualization'
                  ? 'text-[#007AFF] bg-white/60'
                  : 'text-[#86868B] hover:text-[#111111] hover:bg-white/30'
              }`}
            >
              <BarChart3 className="w-4 h-4" strokeWidth={2} />
              Visualization
              {activeTab === 'visualization' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#007AFF]"></div>
              )}
            </button>
            <button
              onClick={() => {
                if (!aiExplanation) {
                  explainMutation.mutate();
                } else {
                  setActiveTab('explain');
                }
              }}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all relative ${
                activeTab === 'explain'
                  ? 'text-[#007AFF] bg-white/60'
                  : 'text-[#86868B] hover:text-[#111111] hover:bg-white/30'
              }`}
              disabled={isExplaining}
            >
              {isExplaining ? (
                <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} />
              ) : (
                <Sparkles className="w-4 h-4" strokeWidth={2} />
              )}
              {isExplaining ? 'Generating...' : 'Explain'}
              {activeTab === 'explain' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#007AFF]"></div>
              )}
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'table' ? (
            <div className="overflow-x-auto flex-1 bg-white/30">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-black/5 bg-gray-50/50">
                    {result.columns.map((column) => (
                      <th
                        key={column}
                        className="px-6 py-3 text-xs font-semibold text-[#86868B] uppercase tracking-wider"
                      >
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5 bg-white/40">
                  {result.rows.map((row, idx) => (
                    <tr
                      key={idx}
                      className={`group cursor-default transition-colors hover:bg-[#007AFF]/5 ${
                        idx % 2 === 1 ? 'bg-gray-50/30' : ''
                      }`}
                    >
                      {result.columns.map((column) => (
                        <td key={column} className="px-6 py-3.5 text-sm text-[#111111]/85">
                          {row[column] !== null && row[column] !== undefined
                            ? String(row[column])
                            : '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : activeTab === 'visualization' ? (
            <div className="p-6 bg-white/30 flex-1">
              <VisualizationPanel data={result.rows} columns={result.columns} />
            </div>
          ) : activeTab === 'explain' ? (
            <div className="p-8 bg-white/30 flex-1 overflow-y-auto">
              {aiExplanation ? (
                <div className="max-w-4xl mx-auto">
                  <div className="flex items-start gap-4 mb-6">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-5 h-5 text-white" strokeWidth={2} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-[#111111] mb-2">AI Analysis</h3>
                      <div className="prose prose-sm max-w-none text-[#111111] text-[15px] leading-relaxed">
                        <ReactMarkdown
                          components={{
                            p: ({node, ...props}) => <p className="mb-4 text-[#111111]" {...props} />,
                            ul: ({node, ...props}) => <ul className="list-disc ml-6 mb-4 text-[#111111]" {...props} />,
                            ol: ({node, ...props}) => <ol className="list-decimal ml-6 mb-4 text-[#111111]" {...props} />,
                            li: ({node, ...props}) => <li className="mb-2 text-[#111111]" {...props} />,
                            strong: ({node, ...props}) => <strong className="font-semibold text-[#111111]" {...props} />,
                            code: ({node, ...props}) => <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono text-[#111111]" {...props} />,
                            pre: ({node, ...props}) => <pre className="bg-white border border-gray-300 rounded-lg p-4 overflow-x-auto mb-4" {...props} />,
                          }}
                        >
                          {aiExplanation}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 p-4 bg-blue-50/50 border border-blue-100 rounded-xl">
                    <p className="text-xs text-blue-700">
                      <span className="font-semibold">Note:</span> This explanation was generated by AI based on your question and the query results.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center mb-4">
                    <Sparkles className="w-8 h-8 text-white" strokeWidth={2} />
                  </div>
                  <h4 className="text-[#111111] text-base font-semibold mb-2">Generate AI Explanation</h4>
                  <p className="text-[#86868B] text-sm mb-4">Get AI insights about your query results</p>
                  <button
                    onClick={() => explainMutation.mutate()}
                    disabled={isExplaining}
                    className="px-6 py-3 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 text-white font-semibold text-sm hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isExplaining ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Generate Explanation
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          ) : null}

          {/* Empty State */}
          {result.rowCount === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-12 h-12 rounded-full bg-black/5 flex items-center justify-center mb-3">
                <Table className="w-6 h-6 text-[#86868B]" strokeWidth={2} />
              </div>
              <h4 className="text-[#111111] text-sm font-semibold">No results found</h4>
              <p className="text-[#86868B] text-xs mt-1">Try adjusting your query</p>
            </div>
          )}

          {/* Pagination Footer */}
          {result.rowCount > 0 && (
            <div className="px-6 py-3 border-t border-black/5 bg-white/40 flex justify-between items-center">
              <span className="text-[11px] text-[#86868B] font-medium">
                Showing 1-{Math.min(result.rowCount, 10)} of {result.rowCount} results
              </span>
              <div className="flex gap-2">
                <button
                  className="px-3 py-1 rounded-md bg-white border border-black/10 text-[#86868B] hover:text-[#111111] text-xs font-medium shadow-sm disabled:opacity-50"
                  disabled
                >
                  Previous
                </button>
                <button className="px-3 py-1 rounded-md bg-white border border-black/10 text-[#86868B] hover:text-[#111111] text-xs font-medium shadow-sm">
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* No Results Yet - Empty State */}
      {!result && !queryMutation.isError && !queryMutation.isPending && (
        <div className="macos-glass-card rounded-[20px] p-8 flex flex-col items-center justify-center text-center min-h-[300px] border border-dashed border-black/10">
          <div className="w-16 h-16 rounded-full bg-black/5 flex items-center justify-center mb-4">
            <Table className="w-8 h-8 text-[#86868B]" strokeWidth={2} />
          </div>
          <h4 className="text-[#111111] text-base font-semibold">No results yet</h4>
          <p className="text-[#86868B] text-sm mt-2">Run a query to see data here</p>
        </div>
      )}

      {/* Approval Modal - macOS Style */}
      {pendingApproval && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.1)] max-w-3xl w-full border border-gray-200 max-h-[90vh] overflow-hidden flex flex-col">
            {/* macOS Window Controls */}
            <div className="h-12 bg-gray-100/80 backdrop-blur-xl border-b border-gray-200 flex items-center justify-between px-4 flex-shrink-0">
              <div className="flex space-x-2">
                <button
                  onClick={() => setPendingApproval(null)}
                  className="w-3 h-3 rounded-full bg-[#FF5F57] border border-[#E0443E] hover:brightness-110 transition-all"
                />
                <div className="w-3 h-3 rounded-full bg-[#FEBC2E] border border-[#D89E24]"></div>
                <div className="w-3 h-3 rounded-full bg-[#28C840] border border-[#1AAB29]"></div>
              </div>
              <div className="text-sm font-semibold text-gray-600 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Approve Query Execution
              </div>
              <div className="w-14"></div>
            </div>
            
            {/* Content Area */}
            <div className="p-6 md:p-8 overflow-y-auto flex-1">

              {/* Notice Badge */}
              <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-amber-900">Manual Approval Required</p>
                  <p className="text-xs text-amber-700 mt-1">Review the query below before execution</p>
                </div>
              </div>

              {/* Question */}
              <div className="mb-6">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Your Question</label>
                <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 border border-gray-200">
                  {pendingApproval.question}
                </div>
              </div>

              {/* Generated SQL */}
              <div className="mb-6">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Generated SQL</label>
                <div className="bg-white rounded-xl p-4 overflow-x-auto border border-gray-300 shadow-inner">
                  <pre className="text-sm text-[#111111] font-mono whitespace-pre-wrap">
                    {pendingApproval.query}
                  </pre>
                </div>
              </div>

              {/* Explanation */}
              {pendingApproval.explanation && (
                <div className="mb-6">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Query Explanation</label>
                  <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-900 border border-blue-200">
                    {pendingApproval.explanation}
                  </div>
                </div>
              )}

              {/* Info badges */}
              <div className="flex flex-wrap gap-3 mb-6">
                {pendingApproval.isDestructive && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-red-100 text-red-700 border border-red-200">
                    <Shield className="w-3.5 h-3.5" />
                    Destructive Operation
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">
                  Max {pendingApproval.estimatedRows} rows
                </span>
              </div>
            </div>

            {/* Actions Footer */}
            <div className="bg-gray-50/50 p-6 md:px-8 md:py-6 border-t border-gray-200 flex gap-3 flex-shrink-0">
              <button
                type="button"
                onClick={() => setPendingApproval(null)}
                className="flex-1 px-4 py-3 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-medium shadow-sm transition-all active:scale-[0.98]"
              >
                Cancel
              </button>
              <button
                onClick={() => approvalMutation.mutate()}
                disabled={approvalMutation.isPending}
                className="flex-1 px-4 py-3 rounded-lg bg-[#007AFF] hover:bg-blue-600 text-white font-medium shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                {approvalMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Executing...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" fill="currentColor" />
                    Approve & Execute
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Query Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-black/5">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-lg font-bold text-[#111111]">Save Query</h3>
                <p className="text-sm text-[#86868B] mt-1">Save this query for later use</p>
              </div>
              <button
                onClick={() => setShowSaveModal(false)}
                className="p-2 rounded-lg hover:bg-black/5 text-[#86868B] hover:text-[#111111] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const name = formData.get('name') as string;
                const folder = formData.get('folder') as string;
                saveQueryMutation.mutate({ name, folder: folder || undefined });
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-semibold text-[#111111] mb-2">
                  Query Name *
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="e.g., Top 10 Users by Signup Date"
                  className="w-full px-4 py-2.5 rounded-lg bg-[#F5F5F7] border-transparent text-[#111111] placeholder-[#86868B]/60 focus:bg-white focus:border-[#007AFF]/50 focus:ring-4 focus:ring-[#007AFF]/20 text-sm transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#111111] mb-2">
                  Folder (Optional)
                </label>
                <input
                  type="text"
                  name="folder"
                  placeholder="e.g., Reports, Analytics, etc."
                  className="w-full px-4 py-2.5 rounded-lg bg-[#F5F5F7] border-transparent text-[#111111] placeholder-[#86868B]/60 focus:bg-white focus:border-[#007AFF]/50 focus:ring-4 focus:ring-[#007AFF]/20 text-sm transition-all"
                />
              </div>

              <div className="bg-[#F5F5F7] rounded-lg p-3 text-xs">
                <p className="text-[#86868B] font-medium mb-1">Question:</p>
                <p className="text-[#111111] line-clamp-2">{question}</p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSaveModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-white border border-black/10 text-[#111111] font-medium text-sm hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveQueryMutation.isPending}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-[#007AFF] text-white font-semibold text-sm hover:bg-[#0051D5] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {saveQueryMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Bookmark className="w-4 h-4" />
                      Save Query
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && result && (
        <ExportModal
          data={result.rows}
          columns={result.columns}
          onClose={() => setShowExportModal(false)}
        />
      )}

      {/* SQL View Modal */}
      {showSQLModal && currentSQL && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden border border-gray-200">
            {/* macOS Window Controls */}
            <div className="h-12 bg-gray-100/80 backdrop-blur-xl border-b border-gray-200 flex items-center justify-between px-4">
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowSQLModal(false)}
                  className="w-3 h-3 rounded-full bg-[#FF5F57] border border-[#E0443E] hover:brightness-110 transition-all"
                />
                <div className="w-3 h-3 rounded-full bg-[#FEBC2E] border border-[#D89E24]"></div>
                <div className="w-3 h-3 rounded-full bg-[#28C840] border border-[#1AAB29]"></div>
              </div>
              <div className="text-sm font-semibold text-gray-600 flex items-center gap-2">
                <Code className="w-4 h-4" />
                Generated SQL
              </div>
              <div className="w-14"></div>
            </div>
            
            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-3rem)]">
              <div className="mb-4">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">SQL Query</label>
                <div className="bg-white rounded-xl p-4 overflow-x-auto border border-gray-300 shadow-inner">
                  <pre className="text-sm text-[#111111] font-mono whitespace-pre-wrap">
                    {currentSQL}
                  </pre>
                </div>
              </div>
              
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(currentSQL);
                    showToast('success', 'SQL copied to clipboard!');
                  }}
                  className="px-4 py-2 rounded-lg bg-[#007AFF] text-white font-medium text-sm hover:bg-blue-600 transition-all flex items-center gap-2"
                >
                  <Code className="w-4 h-4" />
                  Copy SQL
                </button>
                <button
                  onClick={() => setShowSQLModal(false)}
                  className="px-4 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-medium text-sm transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast.show && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={hideToast}
        />
      )}
      </div>
    </div>
  );
}
