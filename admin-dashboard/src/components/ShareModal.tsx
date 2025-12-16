import { useState } from 'react';
import { X, Link, Copy, Check, Calendar, Lock, Users } from 'lucide-react';

interface ShareModalProps {
  query: {
    id: string;
    name: string;
  };
  onClose: () => void;
  onShare: (options: ShareOptions) => Promise<string>;
}

interface ShareOptions {
  permissions: 'view' | 'edit';
  expiresAt?: string;
}

export default function ShareModal({ query, onClose, onShare }: ShareModalProps) {
  const [permissions, setPermissions] = useState<'view' | 'edit'>('view');
  const [expiresIn, setExpiresIn] = useState<string>('7days');
  const [shareLink, setShareLink] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerateLink = async () => {
    setIsLoading(true);
    try {
      // Calculate expiration date
      let expiresAt: string | undefined;
      if (expiresIn !== 'never') {
        const days = parseInt(expiresIn);
        const date = new Date();
        date.setDate(date.getDate() + days);
        expiresAt = date.toISOString();
      }

      const token = await onShare({ permissions, expiresAt });
      const link = `${window.location.origin}/shared/${token}`;
      setShareLink(link);
    } catch (error) {
      console.error('Failed to generate share link:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md mx-4 bg-white/90 backdrop-blur-xl rounded-[22px] shadow-2xl border border-white/20"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-[#007AFF]/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-[#007AFF]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Share Query</h2>
              <p className="text-sm text-gray-500">{query.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100/80 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Permissions */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-3 flex items-center space-x-2">
              <Lock className="w-4 h-4" />
              <span>Permissions</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setPermissions('view')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  permissions === 'view'
                    ? 'border-[#007AFF] bg-[#007AFF]/5'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-left">
                  <div className="font-medium text-gray-900 text-sm">View Only</div>
                  <div className="text-xs text-gray-500 mt-1">Can see query and results</div>
                </div>
              </button>
              <button
                onClick={() => setPermissions('edit')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  permissions === 'edit'
                    ? 'border-[#007AFF] bg-[#007AFF]/5'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-left">
                  <div className="font-medium text-gray-900 text-sm">Can Edit</div>
                  <div className="text-xs text-gray-500 mt-1">Can modify and save</div>
                </div>
              </button>
            </div>
          </div>

          {/* Expiration */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-3 flex items-center space-x-2">
              <Calendar className="w-4 h-4" />
              <span>Link Expiration</span>
            </label>
            <select
              value={expiresIn}
              onChange={(e) => setExpiresIn(e.target.value)}
              className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 focus:border-[#007AFF] transition-all"
            >
              <option value="1">1 day</option>
              <option value="7">7 days</option>
              <option value="30">30 days</option>
              <option value="never">Never expires</option>
            </select>
          </div>

          {/* Generate Link */}
          {!shareLink && (
            <button
              onClick={handleGenerateLink}
              disabled={isLoading}
              className="w-full py-3 bg-[#007AFF] text-white rounded-xl font-medium hover:bg-[#0051D5] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              <Link className="w-4 h-4" />
              <span>{isLoading ? 'Generating...' : 'Generate Share Link'}</span>
            </button>
          )}

          {/* Share Link */}
          {shareLink && (
            <div className="space-y-3">
              <div className="flex items-center space-x-2 p-3 bg-gray-50/50 rounded-xl border border-gray-200">
                <Link className="w-4 h-4 text-gray-500 flex-shrink-0" />
                <input
                  type="text"
                  value={shareLink}
                  readOnly
                  className="flex-1 bg-transparent text-sm text-gray-700 outline-none"
                />
              </div>
              <button
                onClick={handleCopyLink}
                className="w-full py-3 bg-gray-100 text-gray-900 rounded-xl font-medium hover:bg-gray-200 transition-all flex items-center justify-center space-x-2"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-green-600" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
