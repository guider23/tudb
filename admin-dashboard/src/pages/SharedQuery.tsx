import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Loader2, AlertCircle, Play, Lock, ExternalLink, Eye, Edit3, Clock, Copy } from 'lucide-react';
import { api } from '../lib/api';

export default function SharedQuery() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [copiedSQL, setCopiedSQL] = useState(false);

  useEffect(() => {
    document.title = 'Shared Query';
  }, []);

  // Fetch shared query details
  const { data: sharedQuery, isLoading, error } = useQuery({
    queryKey: ['shared-query', token],
    queryFn: async () => {
      const response = await api.getSharedQuery(token!);
      return response;
    },
    enabled: !!token,
    retry: 1,
  });

  const handleCopyQuestion = () => {
    if (sharedQuery?.question) {
      navigator.clipboard.writeText(sharedQuery.question);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopySQL = () => {
    if (sharedQuery?.sql) {
      navigator.clipboard.writeText(sharedQuery.sql);
      setCopiedSQL(true);
      setTimeout(() => setCopiedSQL(false), 2000);
    }
  };

  const handleUseQuery = () => {
    if (sharedQuery?.question) {
      navigate(`/query?q=${encodeURIComponent(sharedQuery.question)}`);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center p-6">
        <div className="text-center bg-white rounded-[1.25rem] px-12 py-8 shadow-[0_4px_12px_rgba(0,0,0,0.03)]">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#007AFF] border-t-transparent mx-auto mb-4"></div>
          <p className="text-sm text-slate-800 font-medium">Loading shared query...</p>
        </div>
      </div>
    );
  }

  if (error || !sharedQuery) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center p-6">
        <div className="text-center bg-white rounded-[1.25rem] px-12 py-8 shadow-[0_4px_12px_rgba(0,0,0,0.03)] max-w-md">
          <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6" />
          </div>
          <p className="text-base text-slate-800 font-semibold mb-2">Query Not Found</p>
          <p className="text-sm text-slate-500 mb-4">
            This shared query link is invalid or has expired.
          </p>
          <button
            onClick={() => navigate('/query')}
            className="px-4 py-2 bg-[#007AFF] text-white rounded-lg text-sm font-medium hover:bg-[#0051D5] transition-colors inline-flex items-center gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            Go to Query Interface
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        {/* macOS Window */}
        <div className="bg-white rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.1)] overflow-hidden border border-gray-200">
          {/* Window Controls Bar */}
          <div className="h-12 bg-gray-100/80 backdrop-blur-xl border-b border-gray-200 flex items-center justify-between px-4">
            <div className="flex space-x-2">
              <div className="w-3 h-3 rounded-full bg-[#FF5F57] border border-[#E0443E]"></div>
              <div className="w-3 h-3 rounded-full bg-[#FEBC2E] border border-[#D89E24]"></div>
              <div className="w-3 h-3 rounded-full bg-[#28C840] border border-[#1AAB29]"></div>
            </div>
            <div className="text-sm font-semibold text-gray-600 flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Shared Query Details
            </div>
            <div className="w-14"></div>
          </div>

          {/* Content */}
          <div className="p-6 md:p-8 space-y-8">
            {/* Title and Badges */}
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                {/* Permission Badge */}
                {sharedQuery.permissions === 'edit' ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-purple-100 text-purple-700 border border-purple-200">
                    <Edit3 className="w-3.5 h-3.5" />
                    Can Edit
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">
                    <Eye className="w-3.5 h-3.5" />
                    View Only
                  </span>
                )}
                
                {/* Expiration Badge */}
                {sharedQuery.expires_at && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                    <Clock className="w-3.5 h-3.5" />
                    Expires {new Date(sharedQuery.expires_at).toLocaleDateString()}
                  </span>
                )}
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">{sharedQuery.name}</h1>
            </div>

            {/* Question */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide ml-1">
                Natural Language Question
              </label>
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-gray-700 leading-relaxed shadow-sm">
                {sharedQuery.question}
              </div>
            </div>

            {/* SQL */}
            {sharedQuery.sql && (
              <div className="space-y-2 group">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide ml-1">
                    Generated SQL
                  </label>
                  <button
                    onClick={handleCopySQL}
                    className="text-xs text-[#007AFF] hover:text-blue-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    {copiedSQL ? 'Copied!' : 'Copy SQL'}
                  </button>
                </div>
                <div className="relative">
                  <pre className="p-5 bg-white rounded-xl border border-gray-300 text-sm font-mono overflow-x-auto shadow-inner text-[#111111] whitespace-pre-wrap">
                    {sharedQuery.sql}
                  </pre>
                  <div className="absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-bold bg-gray-200 text-gray-700 opacity-70">
                    SQL
                  </div>
                </div>
              </div>
            )}

            {/* Metadata */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-4 border-t border-gray-100 gap-4">
              <div className="flex items-center gap-4 text-sm text-gray-500">
                {sharedQuery.folder && (
                  <span className="px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 font-medium text-xs border border-blue-200">
                    📁 {sharedQuery.folder}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4 text-gray-400" />
                  Shared {new Date(sharedQuery.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {/* Actions Footer */}
          <div className="bg-gray-50/50 p-6 md:px-8 md:py-6 border-t border-gray-200 flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleCopyQuestion}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-medium shadow-sm transition-all active:scale-[0.98]"
            >
              <Copy className="w-4 h-4" />
              {copied ? 'Copied!' : 'Copy Question'}
            </button>
            <button
              onClick={handleUseQuery}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-[#007AFF] hover:bg-blue-600 text-white font-medium shadow-sm transition-all active:scale-[0.98]"
            >
              <Play className="w-4 h-4" fill="currentColor" />
              Use This Query
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            Want to create your own queries?{' '}
            <button
              onClick={() => navigate('/sign-in')}
              className="text-[#007AFF] hover:underline font-medium"
            >
              Sign in to TUDB
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
