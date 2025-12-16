import axios from 'axios';

// Backend API base URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

console.log('[API] Using API_BASE_URL:', API_BASE_URL);
console.log('[API] VITE_API_URL from env:', import.meta.env.VITE_API_URL);

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token setter function to be called from React components with Clerk token
let getAuthToken: (() => Promise<string | null>) | null = null;

export const setAuthTokenGetter = (getter: () => Promise<string | null>) => {
  getAuthToken = getter;
};

// Add request interceptor to include Clerk Bearer token
apiClient.interceptors.request.use(
  async (config) => {
    if (getAuthToken) {
      const token = await getAuthToken();
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.error('Unauthorized - Please sign in');
    }
    return Promise.reject(error);
  }
);

// API methods
export const api = {
  // Query endpoints
  executeQuery: async (question: string) => {
    const response = await apiClient.post('/api/query', { question });
    return response.data;
  },

  approveQuery: async (sql: string, question: string) => {
    const response = await apiClient.post('/api/query/approve', { sql, question });
    return response.data;
  },

  explainQueryResults: async (question: string, results: any[], columns: string[]) => {
    const response = await apiClient.post('/api/query/explain', { question, results, columns });
    return response.data;
  },

  // Dashboard stats
  getStats: async () => {
    const response = await apiClient.get('/api/admin/stats');
    return response.data;
  },

  // Recent queries
  getRecentQueries: async () => {
    const response = await apiClient.get('/api/admin/recent-queries');
    return response.data;
  },

  // Connection management
  getConnections: async () => {
    const response = await apiClient.get('/api/admin/connections');
    return response.data;
  },

  addConnection: async (connection: any) => {
    const response = await apiClient.post('/api/admin/connections', connection);
    return response.data;
  },

  updateConnection: async (id: string, connection: any) => {
    const response = await apiClient.put(`/api/admin/connections/${id}`, connection);
    return response.data;
  },

  deleteConnection: async (id: string) => {
    const response = await apiClient.delete(`/api/admin/connections/${id}`);
    return response.data;
  },

  testConnection: async (id: string) => {
    const response = await apiClient.post(`/api/admin/connections/${id}/test`);
    return response.data;
  },

  // Audit logs
  getAuditLogs: async (filters?: { status?: string; limit?: number }) => {
    const response = await apiClient.get('/api/admin/audit-logs', { params: filters });
    return response.data;
  },

  // Analytics
  getAnalytics: async () => {
    const response = await apiClient.get('/api/admin/analytics');
    return response.data;
  },

  // Settings
  getSettings: async () => {
    const response = await apiClient.get('/api/admin/settings');
    return response.data;
  },

  updateSettings: async (settings: any) => {
    const response = await apiClient.put('/api/admin/settings', settings);
    return response.data;
  },

  // Saved Queries
  getSavedQueries: async () => {
    const response = await apiClient.get('/api/admin/saved-queries');
    return response.data;
  },

  createSavedQuery: async (query: any) => {
    const response = await apiClient.post('/api/admin/saved-queries', query);
    return response.data;
  },

  updateSavedQuery: async (id: string, updates: any) => {
    const response = await apiClient.put(`/api/admin/saved-queries/${id}`, updates);
    return response.data;
  },

  deleteSavedQuery: async (id: string) => {
    const response = await apiClient.delete(`/api/admin/saved-queries/${id}`);
    return response.data;
  },

  // Collaboration - Share
  shareQuery: async (queryId: string, options: any) => {
    const response = await apiClient.post(`/api/admin/queries/${queryId}/share`, options);
    return response.data;
  },

  getSharedQuery: async (token: string) => {
    const response = await apiClient.get(`/api/admin/shared/${token}`);
    return response.data;
  },

  // Collaboration - Comments
  getComments: async (queryId: string) => {
    const response = await apiClient.get(`/api/admin/queries/${queryId}/comments`);
    return response.data;
  },

  addComment: async (queryId: string, comment: any) => {
    const response = await apiClient.post(`/api/admin/queries/${queryId}/comments`, comment);
    return response.data;
  },

  deleteComment: async (commentId: string) => {
    const response = await apiClient.delete(`/api/admin/comments/${commentId}`);
    return response.data;
  },

  // Collaboration - Workspaces
  getWorkspaces: async () => {
    const response = await apiClient.get('/api/admin/workspaces');
    return response.data;
  },

  createWorkspace: async (workspace: any) => {
    const response = await apiClient.post('/api/admin/workspaces', workspace);
    return response.data;
  },

  updateWorkspace: async (id: string, updates: any) => {
    const response = await apiClient.put(`/api/admin/workspaces/${id}`, updates);
    return response.data;
  },

  deleteWorkspace: async (id: string) => {
    const response = await apiClient.delete(`/api/admin/workspaces/${id}`);
    return response.data;
  },

  getWorkspaceMembers: async (workspaceId: string) => {
    const response = await apiClient.get(`/api/admin/workspaces/${workspaceId}/members`);
    return response.data;
  },

  addWorkspaceMember: async (workspaceId: string, member: any) => {
    const response = await apiClient.post(`/api/admin/workspaces/${workspaceId}/members`, member);
    return response.data;
  },

  removeWorkspaceMember: async (workspaceId: string, userId: string) => {
    const response = await apiClient.delete(`/api/admin/workspaces/${workspaceId}/members/${userId}`);
    return response.data;
  },

  // AI Assistant
  sendAIMessage: async (data: { message: string; context?: any[] }) => {
    const response = await apiClient.post('/api/admin/ai-chat', data);
    return response.data;
  },

  // Multi-Agent System
  processAgentRequest: async (message: string, connectionId: string) => {
    const response = await apiClient.post('/api/admin/agent/process', { message, connectionId });
    return response.data;
  },

  getAgentStatus: async () => {
    const response = await apiClient.get('/api/admin/agent/status');
    return response.data;
  },

  getAgentCapabilities: async () => {
    const response = await apiClient.get('/api/admin/agent/capabilities');
    return response.data;
  },
};

export default apiClient;
