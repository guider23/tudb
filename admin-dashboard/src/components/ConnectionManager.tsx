import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Eye, EyeOff, Database, AlertCircle, MoreVertical, Trash2 } from 'lucide-react';

interface Connection {
  id: string;
  name: string;
  provider: string;
  is_active: boolean;
  created_at: string;
  connection_string?: string;
}

interface ConnectionFormData {
  name: string;
  provider: string;
  connectionString: string;
}

interface ConnectionManagerProps {
  searchQuery?: string;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const providerConfig: Record<string, { color: string; bgColor: string; label: string; icon: string }> = {
  supabase: { color: 'text-emerald-600', bgColor: 'bg-emerald-50', label: 'Supabase', icon: '🟢' },
  neon: { color: 'text-cyan-600', bgColor: 'bg-cyan-50', label: 'Neon Tech', icon: '⚡' },
  railway: { color: 'text-purple-600', bgColor: 'bg-purple-50', label: 'Railway', icon: '🚂' },
  rds: { color: 'text-orange-600', bgColor: 'bg-orange-50', label: 'AWS RDS', icon: '☁️' },
  local: { color: 'text-neutral-600', bgColor: 'bg-neutral-100', label: 'Local', icon: '💻' },
  mysql: { color: 'text-blue-600', bgColor: 'bg-blue-50', label: 'MySQL', icon: '🐬' },
  planetscale: { color: 'text-indigo-600', bgColor: 'bg-indigo-50', label: 'PlanetScale', icon: '🌐' },
  localmysql: { color: 'text-amber-600', bgColor: 'bg-amber-50', label: 'Local MySQL', icon: '🔧' },
};

export default function ConnectionManager({ searchQuery = '' }: ConnectionManagerProps) {
  const queryClient = useQueryClient();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState<ConnectionFormData>({
    name: '',
    provider: 'supabase',
    connectionString: '',
  });
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const { data: connections, isLoading } = useQuery<Connection[]>({
    queryKey: ['connections'],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/api/admin/connections`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Failed to fetch connections');
      return response.json();
    },
  });

  const addConnectionMutation = useMutation({
    mutationFn: async (data: ConnectionFormData) => {
      const response = await fetch(`${API_URL}/api/admin/connections`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add connection');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] });
      setFormData({ name: '', provider: 'supabase', connectionString: '' });
      setTestResult(null);
    },
  });

  const activateConnectionMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`${API_URL}/api/admin/connections/${id}/activate`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Failed to activate connection');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] });
    },
  });

  const deleteConnectionMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`${API_URL}/api/admin/connections/${id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Failed to delete connection');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.connectionString) {
      setTestResult({ success: false, message: 'Name and connection string are required' });
      return;
    }
    addConnectionMutation.mutate(formData);
  };

  const filteredConnections = connections?.filter((conn) =>
    conn.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conn.provider.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Connections Grid */}
      <div className="lg:col-span-2 space-y-3">
        {filteredConnections && filteredConnections.length > 0 ? (
          filteredConnections.map((conn) => {
            const provider = providerConfig[conn.provider] || { 
              color: 'text-neutral-600', 
              bgColor: 'bg-neutral-100', 
              label: conn.provider,
              icon: '💾'
            };
            return (
              <div key={conn.id} className="card p-5 hover:shadow-md transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className={`${provider.bgColor} w-12 h-12 rounded-lg flex items-center justify-center text-2xl flex-shrink-0`}>
                      {provider.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-base font-semibold text-neutral-900 truncate">{conn.name}</h3>
                        {conn.is_active && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-success-50 text-success-700 text-xs font-semibold rounded-md border border-success-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-success-500"></span>
                            Active
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-medium ${provider.color}`}>{provider.label}</span>
                        <span className="text-neutral-400">•</span>
                        <span className="text-xs text-neutral-500">Added {new Date(conn.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <button className="text-neutral-400 hover:text-neutral-600 p-1.5 rounded-lg hover:bg-neutral-100 transition-colors flex-shrink-0">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
                <div className="mt-4 pt-4 border-t border-neutral-200 flex items-center gap-2">
                  {!conn.is_active && (
                    <button
                      onClick={() => activateConnectionMutation.mutate(conn.id)}
                      className="btn-primary text-sm px-4 py-2"
                      disabled={activateConnectionMutation.isPending}
                    >
                      Set as Active
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this connection?')) {
                        deleteConnectionMutation.mutate(conn.id);
                      }
                    }}
                    className="btn-ghost text-error-600 hover:bg-error-50 text-sm px-3 py-2"
                    disabled={deleteConnectionMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="card p-12 text-center">
            <Database className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
            <p className="text-neutral-600 font-medium">No connections found</p>
            <p className="text-sm text-neutral-500 mt-1">Add your first database connection to get started</p>
          </div>
        )}
      </div>

      {/* New Connection Form */}
      <div className="lg:col-span-1">
        <div className="card p-6 sticky top-6">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-brand-50 rounded-lg flex items-center justify-center">
              <Plus className="w-5 h-5 text-brand-600" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-900">New Connection</h3>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">Provider</label>
              <select
                value={formData.provider}
                onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                className="select"
              >
                <option value="supabase">Supabase (PostgreSQL)</option>
                <option value="neon">Neon (PostgreSQL)</option>
                <option value="railway">Railway (PostgreSQL)</option>
                <option value="rds">AWS RDS (PostgreSQL)</option>
                <option value="local">Local PostgreSQL</option>
                <option value="mysql">MySQL / AWS RDS MySQL</option>
                <option value="planetscale">PlanetScale (MySQL)</option>
                <option value="localmysql">Local MySQL</option>
              </select>
            </div>

            <div>
              <label className="label">Nickname</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Production Database"
                className="input"
                required
              />
            </div>

            <div>
              <label className="label">Connection URI</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.connectionString}
                  onChange={(e) => setFormData({ ...formData, connectionString: e.target.value })}
                  placeholder="postgresql://user:pass@host:5432/db"
                  className="input pr-10 font-mono text-xs"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {testResult && (
              <div className={`p-4 rounded-lg text-sm flex items-start gap-2 ${
                testResult.success 
                  ? 'bg-success-50 text-success-700' 
                  : 'bg-error-50 text-error-700'
              }`}>
                {!testResult.success && <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
                <span>{testResult.message}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={addConnectionMutation.isPending}
              className="btn-primary w-full"
            >
              {addConnectionMutation.isPending ? 'Saving...' : 'Save Connection'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
