import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Folder, Star, Clock, Search, Plus, Trash2, Play, Edit2, FolderPlus, Share2 } from 'lucide-react';
import { api } from '../lib/api';
import ShareModal from '../components/ShareModal';

interface SavedQuery {
  id: string;
  name: string;
  question: string;
  sql: string;
  folder: string | null;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

export default function SavedQueries() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [showFavorites, setShowFavorites] = useState(false);
  const [showRecent, setShowRecent] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [shareModalQuery, setShareModalQuery] = useState<SavedQuery | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingQuery, setEditingQuery] = useState<SavedQuery | null>(null);
  const [formData, setFormData] = useState({ name: '', question: '', sql: '', folder: '' });

  useEffect(() => {
    document.title = 'Saved Queries';
  }, []);

  // Fetch saved queries
  const { data: queries, isLoading, error } = useQuery({
    queryKey: ['saved-queries'],
    queryFn: () => api.getSavedQueries(),
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Fetch recent queries for suggestions
  const { data: recentQueriesData } = useQuery({
    queryKey: ['recent-queries'],
    queryFn: () => api.getRecentQueries(),
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Delete query mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteSavedQuery(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-queries'] });
    },
  });

  // Toggle favorite mutation
  const toggleFavoriteMutation = useMutation({
    mutationFn: ({ id, isFavorite }: { id: string; isFavorite: boolean }) => 
      api.updateSavedQuery(id, { is_favorite: !isFavorite }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-queries'] });
    },
  });

  // Create query mutation
  const createMutation = useMutation({
    mutationFn: (data: any) => api.createSavedQuery(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-queries'] });
      setShowCreateModal(false);
      setFormData({ name: '', question: '', sql: '', folder: '' });
    },
  });

  // Update query mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) => api.updateSavedQuery(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-queries'] });
      setEditingQuery(null);
      setFormData({ name: '', question: '', sql: '', folder: '' });
    },
  });

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen backdrop-blur-xl">
        <div className="text-center bg-white rounded-[1.25rem] px-12 py-8 shadow-[0_4px_12px_rgba(0,0,0,0.03)]">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#007AFF] border-t-transparent mx-auto mb-4"></div>
          <p className="text-sm text-slate-800 font-medium">Loading saved queries...</p>
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
          <p className="text-base text-slate-800 font-semibold mb-2">Unable to load saved queries</p>
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

  // Create folder
  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    // In a real app, you'd save this to backend
    setNewFolderName('');
    setIsCreatingFolder(false);
  };

  // Share query handler
  const handleShare = async (options: { permissions: 'view' | 'edit'; expiresAt?: string }) => {
    if (!shareModalQuery) return '';
    const response = await api.shareQuery(shareModalQuery.id, options);
    return response.token;
  };

  // Handle create new query
  const handleCreateQuery = () => {
    setFormData({ name: '', question: '', sql: '', folder: '' });
    setShowCreateModal(true);
  };

  // Handle edit query
  const handleEditQuery = (query: SavedQuery) => {
    setFormData({
      name: query.name,
      question: query.question,
      sql: query.sql,
      folder: query.folder || '',
    });
    setEditingQuery(query);
  };

  // Handle save (create or update)
  const handleSave = () => {
    if (!formData.name.trim() || !formData.question.trim()) {
      alert('Name and question are required');
      return;
    }

    if (editingQuery) {
      updateMutation.mutate({ id: editingQuery.id, updates: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  // Handle run query
  const handleRunQuery = (query: SavedQuery) => {
    // Navigate to query interface with pre-filled question
    window.location.href = `/query?q=${encodeURIComponent(query.question)}`;
  };

  // Get unique folders
  const folders: string[] = queries 
    ? Array.from(new Set(queries.filter((q: SavedQuery) => q.folder).map((q: SavedQuery) => q.folder!)))
    : [];

  // Filter queries
  let filteredQueries = queries
    ?.filter((q: SavedQuery) => {
      const matchesSearch = q.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          q.question.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFolder = !selectedFolder || q.folder === selectedFolder;
      const matchesFavorites = !showFavorites || q.is_favorite;
      return matchesSearch && matchesFolder && matchesFavorites;
    }) || [];

  // If showing recent, sort by updated_at and take top 10
  if (showRecent) {
    filteredQueries = [...filteredQueries]
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 10);
  }

  const favoriteQueries = queries?.filter((q: SavedQuery) => q.is_favorite) || [];

  return (
    <div className="space-y-6 p-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-[32px] font-bold text-[#111111] tracking-tight">Saved Queries</h1>
          <p className="text-[15px] text-[#86868B] mt-1">Manage and organize your frequently used queries</p>
        </div>
        <button
          onClick={handleCreateQuery}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#007AFF] text-white rounded-[22px] text-[13px] font-semibold shadow-lg hover:bg-[#0051D5] active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          New Query
        </button>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Sidebar */}
        <div className="col-span-3">
          <div
            className="p-5 rounded-[20px] border border-black/[0.06] space-y-2"
            style={{
              background: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.1)',
            }}
          >
            {/* All Queries */}
            <button
              onClick={() => {
                setSelectedFolder(null);
                setShowFavorites(false);
                setShowRecent(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                !selectedFolder && !showFavorites && !showRecent
                  ? 'bg-[#007AFF] text-white shadow-md'
                  : 'text-[#111111] hover:bg-black/5'
              }`}
            >
              <Folder className="w-4 h-4" />
              All Queries
              <span className="ml-auto text-xs">{queries?.length || 0}</span>
            </button>

            {/* Favorites */}
            <button
              onClick={() => {
                setShowFavorites(true);
                setShowRecent(false);
                setSelectedFolder(null);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                showFavorites
                  ? 'bg-[#FF9500] text-white shadow-md'
                  : 'text-[#111111] hover:bg-black/5'
              }`}
            >
              <Star className="w-4 h-4" />
              Favorites
              <span className="ml-auto text-xs">{favoriteQueries.length}</span>
            </button>

            {/* Recent */}
            <button
              onClick={() => {
                setShowRecent(true);
                setSelectedFolder(null);
                setShowFavorites(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                showRecent
                  ? 'bg-[#34C759] text-white shadow-md'
                  : 'text-[#111111] hover:bg-black/5'
              }`}
            >
              <Clock className="w-4 h-4" />
              Recent
            </button>

            <div className="h-px bg-black/5 my-3"></div>

            {/* Folders */}
            <div className="space-y-1">
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-xs font-semibold text-[#86868B] uppercase tracking-wider">Folders</span>
                <button
                  onClick={() => setIsCreatingFolder(true)}
                  className="p-1 hover:bg-black/5 rounded transition-colors"
                >
                  <FolderPlus className="w-3.5 h-3.5 text-[#86868B]" />
                </button>
              </div>

              {isCreatingFolder && (
                <div className="px-3 py-2">
                  <input
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleCreateFolder()}
                    placeholder="Folder name..."
                    className="w-full px-2 py-1 text-sm border border-[#007AFF] rounded-md focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30"
                    autoFocus
                  />
                </div>
              )}

              {folders.map((folder: string) => (
                <button
                  key={folder}
                  onClick={() => {
                    setSelectedFolder(folder);
                    setShowFavorites(false);
                    setShowRecent(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedFolder === folder
                      ? 'bg-[#007AFF]/10 text-[#007AFF]'
                      : 'text-[#111111] hover:bg-black/5'
                  }`}
                >
                  <Folder className="w-4 h-4" />
                  {folder}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="col-span-9 space-y-6">
          {/* Search */}
          <div
            className="p-5 rounded-[20px] border border-black/[0.06]"
            style={{
              background: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#86868B]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search queries..."
                className="w-full pl-10 pr-4 py-2.5 bg-white/60 border border-black/10 rounded-[12px] text-sm placeholder-[#86868B] focus:bg-white focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/20 transition-all"
              />
            </div>
          </div>

          {/* Quick Suggestions */}
          {!searchQuery && !selectedFolder && recentQueriesData && recentQueriesData.length > 0 && (
            <div className="mb-6 p-5 rounded-[20px] border border-[#007AFF]/20 bg-gradient-to-br from-[#007AFF]/5 to-[#5856D6]/5"
              style={{
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
              }}
            >
              <h3 className="text-sm font-semibold text-[#111111] mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#007AFF]" />
                Recent Queries - Save them for quick access!
              </h3>
              <div className="space-y-2">
                {recentQueriesData.slice(0, 3).map((item: any, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setFormData({
                        name: `Query from ${new Date(item.timestamp).toLocaleDateString()}`,
                        question: item.query || item.question,
                        sql: '',
                        folder: '',
                      });
                      setShowCreateModal(true);
                    }}
                    className="w-full text-left p-3 rounded-xl bg-white/50 hover:bg-white/80 border border-black/[0.06] transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-[#111111] flex-1 line-clamp-1">{item.query || item.question}</p>
                      <Plus className="w-4 h-4 text-[#007AFF] opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Query List */}
          <div className="space-y-3">
            {isLoading ? (
              <div className="text-center py-12 text-[#86868B]">
                <div className="animate-spin w-8 h-8 border-2 border-[#007AFF] border-t-transparent rounded-full mx-auto mb-3"></div>
                Loading queries...
              </div>
            ) : filteredQueries.length === 0 ? (
              <div
                className="p-12 rounded-[20px] border border-dashed border-black/10 text-center"
                style={{
                  background: 'rgba(255, 255, 255, 0.6)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                }}
              >
                <Folder className="w-12 h-12 text-[#86868B] mx-auto mb-3 opacity-50" />
                <p className="text-[#86868B] text-sm">No saved queries yet</p>
              </div>
            ) : (
              filteredQueries.map((query: SavedQuery) => (
                <div
                  key={query.id}
                  className="p-5 rounded-[20px] border border-black/[0.06] hover:border-[#007AFF]/30 transition-all group"
                  style={{
                    background: 'rgba(255, 255, 255, 0.9)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                  }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-[15px] font-semibold text-[#111111]">{query.name}</h3>
                        {query.is_favorite && (
                          <Star className="w-4 h-4 text-[#FF9500] fill-[#FF9500]" />
                        )}
                      </div>
                      <p className="text-sm text-[#86868B] line-clamp-2">{query.question}</p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => toggleFavoriteMutation.mutate({ id: query.id, isFavorite: query.is_favorite })}
                        className="p-2 hover:bg-black/5 rounded-lg transition-colors"
                        title="Toggle favorite"
                      >
                        <Star className={`w-4 h-4 ${query.is_favorite ? 'text-[#FF9500] fill-[#FF9500]' : 'text-[#86868B]'}`} />
                      </button>
                      <button
                        onClick={() => setShareModalQuery(query)}
                        className="p-2 hover:bg-black/5 rounded-lg transition-colors"
                        title="Share query"
                      >
                        <Share2 className="w-4 h-4 text-[#86868B]" />
                      </button>

                      <button
                        onClick={() => handleEditQuery(query)}
                        className="p-2 hover:bg-black/5 rounded-lg transition-colors"
                        title="Edit query"
                      >
                        <Edit2 className="w-4 h-4 text-[#86868B]" />
                      </button>
                      <button
                        onClick={() => handleRunQuery(query)}
                        className="p-2 hover:bg-black/5 rounded-lg transition-colors"
                        title="Run query"
                      >
                        <Play className="w-4 h-4 text-[#007AFF]" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Delete this query?')) {
                            deleteMutation.mutate(query.id);
                          }
                        }}
                        className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete query"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </div>

                  {query.sql && (
                    <div className="bg-black/5 rounded-lg p-3 mt-3">
                      <code className="text-xs text-[#111111] font-mono line-clamp-2">{query.sql}</code>
                    </div>
                  )}

                  <div className="flex items-center gap-4 mt-3 text-xs text-[#86868B]">
                    {query.folder && (
                      <span className="flex items-center gap-1">
                        <Folder className="w-3 h-3" />
                        {query.folder}
                      </span>
                    )}
                    <span>Updated {new Date(query.updated_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Share Modal */}
      {shareModalQuery && (
        <ShareModal
          query={shareModalQuery}
          onClose={() => setShareModalQuery(null)}
          onShare={handleShare}
        />
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || editingQuery) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => {
            setShowCreateModal(false);
            setEditingQuery(null);
            setFormData({ name: '', question: '', sql: '', folder: '' });
          }}
        >
          <div
            className="relative w-full max-w-2xl mx-4 bg-white/90 backdrop-blur-xl rounded-[22px] shadow-2xl border border-white/20"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-200/50">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingQuery ? 'Edit Query' : 'Create New Query'}
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Top Customers Query"
                  className="w-full px-4 py-2.5 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 focus:border-[#007AFF] transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Question *</label>
                <input
                  type="text"
                  value={formData.question}
                  onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                  placeholder="e.g., Show me top 10 customers by revenue"
                  className="w-full px-4 py-2.5 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 focus:border-[#007AFF] transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">SQL (Optional)</label>
                <textarea
                  value={formData.sql}
                  onChange={(e) => setFormData({ ...formData, sql: e.target.value })}
                  placeholder="SELECT * FROM customers ORDER BY revenue DESC LIMIT 10"
                  rows={4}
                  className="w-full px-4 py-2.5 bg-white/50 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 focus:border-[#007AFF] transition-all font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Folder (Optional)</label>
                <input
                  type="text"
                  value={formData.folder}
                  onChange={(e) => setFormData({ ...formData, folder: e.target.value })}
                  placeholder="e.g., Sales Reports"
                  className="w-full px-4 py-2.5 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 focus:border-[#007AFF] transition-all"
                />
              </div>
            </div>
            <div className="p-6 border-t border-gray-200/50 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingQuery(null);
                  setFormData({ name: '', question: '', sql: '', folder: '' });
                }}
                className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={createMutation.isPending || updateMutation.isPending}
                className="px-5 py-2.5 bg-[#007AFF] text-white rounded-xl font-medium hover:bg-[#0051D5] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createMutation.isPending || updateMutation.isPending
                  ? 'Saving...'
                  : editingQuery
                  ? 'Update Query'
                  : 'Create Query'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
