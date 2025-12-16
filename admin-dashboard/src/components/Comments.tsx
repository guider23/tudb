import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageCircle, Send, Trash2, User, Loader2 } from 'lucide-react';
import { api } from '../lib/api';

interface Comment {
  id: string;
  user_name: string;
  comment_text: string;
  created_at: string;
}

interface CommentsProps {
  queryId: string;
  onClose: () => void;
}

export default function Comments({ queryId, onClose }: CommentsProps) {
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState('');

  // Fetch comments
  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['comments', queryId],
    queryFn: () => api.getComments(queryId),
  });

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: (text: string) => api.addComment(queryId, { comment_text: text }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', queryId] });
      setNewComment('');
    },
  });

  // Delete comment mutation
  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: string) => api.deleteComment(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', queryId] });
    },
  });

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    addCommentMutation.mutate(newComment);
  };

  const handleDeleteComment = (id: string) => {
    deleteCommentMutation.mutate(id);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-[1.25rem] shadow-[0_8px_30px_rgba(0,0,0,0.12)] max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <MessageCircle className="w-5 h-5 text-[#007AFF]" />
            <h2 className="text-lg font-semibold text-slate-800">Comments</h2>
            <span className="text-sm text-slate-500">({comments.length})</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-[#007AFF] animate-spin" />
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-12">
              <MessageCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No comments yet</p>
              <p className="text-sm text-slate-400 mt-1">Be the first to add a comment</p>
            </div>
          ) : (
            comments.map((comment: Comment) => (
              <div key={comment.id} className="bg-slate-50 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex gap-3 flex-1">
                    <div className="w-8 h-8 rounded-full bg-[#007AFF]/10 flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-[#007AFF]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-slate-800 text-sm">{comment.user_name}</span>
                        <span className="text-xs text-slate-400">
                          {new Date(comment.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600">{comment.comment_text}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteComment(comment.id)}
                    disabled={deleteCommentMutation.isPending}
                    className="text-slate-400 hover:text-red-500 transition-colors p-1 disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <form onSubmit={handleAddComment} className="p-6 border-t border-slate-100">
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-[#007AFF]/10 flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-[#007AFF]" />
            </div>
            <div className="flex-1 flex gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1 px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 focus:border-[#007AFF] text-sm"
              />
              <button
                type="submit"
                disabled={!newComment.trim() || addCommentMutation.isPending}
                className="px-4 py-2 bg-[#007AFF] text-white rounded-xl hover:bg-[#0051D5] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 text-sm font-medium"
              >
                {addCommentMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                {addCommentMutation.isPending ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
