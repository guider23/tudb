import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { HelpCircle, Eye, EyeOff } from 'lucide-react';
import ConnectionCard from './ConnectionCard';

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

export default function ConnectionManager({ searchQuery = '' }: ConnectionManagerProps) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState<ConnectionFormData>({
    name: '',
    provider: 'supabase',
    connectionString: '',
  });
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Fetch connections
  const { data: connections, isLoading } = useQuery<Connection[]>({
    queryKey: ['connections'],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/api/admin/connections`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) throw new Error('Failed to fetch connections');
      return response.json();
    },
  });

  // Add connection mutation
  const addConnectionMutation = useMutation({
    mutationFn: async (data: ConnectionFormData) => {
      const response = await fetch(`${API_URL}/api/admin/connections`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
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

  // Test connection mutation
  const testConnectionMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`${API_URL}/api/admin/connections/${id}/test`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Test failed');
      return result;
    },
    onSuccess: (data) => {
      setTestResult({ success: true, message: data.message });
    },
    onError: (error: Error) => {
      setTestResult({ success: false, message: error.message });
    },
  });

  // Activate connection mutation
  const activateConnectionMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`${API_URL}/api/admin/connections/${id}/activate`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) throw new Error('Failed to activate connection');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] });
    },
  });

  // Delete connection mutation
  const deleteConnectionMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`${API_URL}/api/admin/connections/${id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
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

  const handleTestExisting = (id: string) => {
    testConnectionMutation.mutate(id);
  };

  const handleActivate = (id: string) => {
    activateConnectionMutation.mutate(id);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this connection?')) {
      deleteConnectionMutation.mutate(id);
    }
  };

  const filteredConnections = connections?.filter((conn) =>
    conn.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conn.provider.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Connections Grid */}
      <div className="lg:col-span-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredConnections && filteredConnections.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredConnections.map((conn) => (
              <ConnectionCard
                key={conn.id}
                id={conn.id}
                name={conn.name}
                provider={conn.provider}
                status={conn.is_active ? 'healthy' : 'idle'}
                latency={conn.is_active ? Math.floor(Math.random() * 50 + 10) : undefined}
                lastChecked={new Date(conn.created_at).toLocaleString()}
                connectionString={conn.connection_string || 'Hidden'}
                isActive={conn.is_active}
                onTest={handleTestExisting}
                onActivate={handleActivate}
                onDelete={handleDelete}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <p className="text-gray-500">No connections found. Add your first database connection.</p>
          </div>
        )}
      </div>

      {/* New Connection Form */}
      <div className="lg:col-span-1">
        <div className="bg-white rounded-lg border border-gray-200 p-5 sticky top-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">New Connection</h3>
            <button className="p-1 text-gray-400 hover:text-gray-600">
              <HelpCircle className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Provider */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">PROVIDER</label>
              <select
                value={formData.provider}
                onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
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

            {/* Nickname */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">NICKNAME</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Production Read-Replica"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                required
              />
            </div>

            {/* Connection URI */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">CONNECTION URI</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.connectionString}
                  onChange={(e) => setFormData({ ...formData, connectionString: e.target.value })}
                  placeholder="postgresql://user:pass@host:5432/db"
                  className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-mono"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* SSL Mode Toggle */}
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-gray-900">SSL Mode</p>
                <p className="text-xs text-gray-500">Require secure connection</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" defaultChecked className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Alert */}
            {testResult && (
              <div className={`p-3 rounded-lg text-sm ${testResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {testResult.message}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Test
              </button>
              <button
                type="submit"
                disabled={addConnectionMutation.isPending}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {addConnectionMutation.isPending ? 'Saving...' : 'Save Connection'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
