import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';
import { 
  ChevronRight,
  Eye,
  EyeOff,
  Lock,
  X,
  Check
} from 'lucide-react';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';

interface Connection {
  id: string;
  name: string;
  provider: string;
  is_active: boolean;
  created_at: string;
  connection_string?: string;
  host?: string;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const providerConfig: Record<string, { icon: string; label: string; gradient: string; isImage?: boolean }> = {
  local: { icon: 'https://www.postgresql.org/media/img/about/press/elephant.png', label: 'PostgreSQL (Local)', gradient: 'from-blue-50 to-blue-100', isImage: true },
  supabase: { icon: 'data:image/svg+xml,%3Csvg width="109" height="113" viewBox="0 0 109 113" fill="none" xmlns="http://www.w3.org/2000/svg"%3E%3Cpath d="M63.7076 110.284C60.8481 113.885 55.0502 111.912 54.9813 107.314L53.9738 40.0627L99.1935 40.0627C107.384 40.0627 111.952 49.5228 106.859 55.9374L63.7076 110.284Z" fill="url(%23paint0_linear)"/%3E%3Cpath d="M63.7076 110.284C60.8481 113.885 55.0502 111.912 54.9813 107.314L53.9738 40.0627L99.1935 40.0627C107.384 40.0627 111.952 49.5228 106.859 55.9374L63.7076 110.284Z" fill="url(%23paint1_linear)" fill-opacity="0.2"/%3E%3Cpath d="M45.317 2.07103C48.1765 -1.53037 53.9745 0.442937 54.0434 5.041L54.4849 72.2922H9.83113C1.64038 72.2922 -2.92775 62.8321 2.1655 56.4175L45.317 2.07103Z" fill="%233ECF8E"/%3E%3Cdefs%3E%3ClinearGradient id="paint0_linear" x1="53.9738" y1="54.974" x2="94.1635" y2="71.8295" gradientUnits="userSpaceOnUse"%3E%3Cstop stop-color="%23249361"/%3E%3Cstop offset="1" stop-color="%233ECF8E"/%3E%3C/linearGradient%3E%3ClinearGradient id="paint1_linear" x1="36.1558" y1="30.578" x2="54.4844" y2="65.0806" gradientUnits="userSpaceOnUse"%3E%3Cstop/%3E%3Cstop offset="1" stop-opacity="0"/%3E%3C/linearGradient%3E%3C/defs%3E%3C/svg%3E', label: 'Supabase', gradient: 'from-emerald-50 to-emerald-100', isImage: true },
  neon: { icon: 'data:image/svg+xml,%3Csvg width="158" height="45" viewBox="0 0 158 45" fill="none" xmlns="http://www.w3.org/2000/svg"%3E%3Cpath fill-rule="evenodd" clip-rule="evenodd" d="M0 7.61152C0 3.40779 3.44137 0 7.68651 0H36.8952C41.1404 0 44.5817 3.40779 44.5817 7.61152V32.2111C44.5817 36.5601 39.0241 38.4476 36.3287 35.014L27.902 24.2798V37.2964C27.902 41.0798 24.8048 44.1468 20.9842 44.1468H7.68651C3.44137 44.1468 0 40.739 0 36.5353V7.61152ZM7.68651 6.08921C6.83748 6.08921 6.14921 6.77077 6.14921 7.61152V36.5353C6.14921 37.376 6.83748 38.0576 7.68651 38.0576H21.2148C21.6393 38.0576 21.7528 37.7168 21.7528 37.2964V19.8412C21.7528 15.4922 27.3104 13.6047 30.0059 17.0383L38.4325 27.7725V7.61152C38.4325 6.77077 38.5129 6.08921 37.6639 6.08921H7.68651Z" fill="%23191919"/%3E%3Cpath d="M36.8954 0C41.1406 0 44.5819 3.40779 44.5819 7.61152V32.2111C44.5819 36.5601 39.0243 38.4476 36.3289 35.014L27.9022 24.2798V37.2964C27.9022 41.0798 24.805 44.1468 20.9844 44.1468C21.4089 44.1468 21.753 43.806 21.753 43.3857V19.8412C21.753 15.4922 27.3106 13.6047 30.0061 17.0383L38.4327 27.7725V1.5223C38.4327 0.681558 37.7445 0 36.8954 0Z" fill="%23191919"/%3E%3Cpath d="M75.1561 13.0033V24.5502L63.8496 13.0033H57.9648V31.8884H63.332V19.4782L75.6465 31.8884H80.5232V13.0033H75.1561Z" fill="%231A1A1A"/%3E%3Cpath d="M90.4725 27.6797V24.3343H102.487V20.3145H90.4725V17.212H105.048V13.0033H84.9964V31.8884H105.348V27.6797H90.4725Z" fill="%231A1A1A"/%3E%3Cpath d="M119.61 32.5089C127.157 32.5089 132.061 28.8398 132.061 22.4458C132.061 16.0519 127.157 12.3828 119.61 12.3828C112.063 12.3828 107.187 16.0519 107.187 22.4458C107.187 28.8398 112.063 32.5089 119.61 32.5089ZM119.61 28.0304C115.415 28.0304 112.826 26.007 112.826 22.4458C112.826 18.8847 115.442 16.8613 119.61 16.8613C123.806 16.8613 126.394 18.8847 126.394 22.4458C126.394 26.007 123.806 28.0304 119.61 28.0304Z" fill="%231A1A1A"/%3E%3Cpath d="M152.632 13.0033V24.5502L141.326 13.0033H135.441V31.8884H140.808V19.4782L153.123 31.8884H157.999V13.0033H152.632Z" fill="%231A1A1A"/%3E%3C/svg%3E', label: 'Neon', gradient: 'from-purple-50 to-purple-100', isImage: true },
  railway: { icon: 'https://railway.com/brand/logo-dark.svg', label: 'Railway', gradient: 'from-pink-50 to-pink-100', isImage: true },
  rds: { icon: 'https://a0.awsstatic.com/libra-css/images/logos/aws_logo_smile_1200x630.png', label: 'AWS RDS', gradient: 'from-orange-50 to-orange-100', isImage: true },
  // Legacy support
  postgres: { icon: 'https://www.postgresql.org/media/img/about/press/elephant.png', label: 'PostgreSQL', gradient: 'from-blue-50 to-blue-100', isImage: true },
  postgresql: { icon: 'https://www.postgresql.org/media/img/about/press/elephant.png', label: 'PostgreSQL', gradient: 'from-blue-50 to-blue-100', isImage: true },
  mysql: { icon: 'https://labs.mysql.com/common/logos/mysql-logo.svg', label: 'MySQL', gradient: 'from-orange-50 to-orange-100', isImage: true },
  snowflake: { icon: 'https://www.svgrepo.com/show/354381/snowflake.svg', label: 'Snowflake', gradient: 'from-cyan-50 to-cyan-100', isImage: true },
  mongodb: { icon: 'https://www.svgrepo.com/show/331488/mongodb.svg', label: 'MongoDB', gradient: 'from-green-50 to-green-100', isImage: true },
};

export default function Connections() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const { toast, showToast, hideToast } = useToast();
  const searchQuery = ''; // For now, no search filtering
  const [showNewConnectionForm, setShowNewConnectionForm] = useState(false);
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  const [editingConnection, setEditingConnection] = useState<Connection | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [sslEnabled, setSslEnabled] = useState(true);
  const [showProviderDropdown, setShowProviderDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState({
    name: '',
    provider: '',
    connectionString: ''
  });

  useEffect(() => {
    document.title = 'Connections';
  }, []);

  const { data: connectionsData, isLoading, error } = useQuery<{ connections: Connection[] } | Connection[]>({
    queryKey: ['connections'],
    queryFn: async () => {
      const token = await getToken();
      console.log('Fetching connections with token:', token ? 'Token exists' : 'No token');
      console.log('API URL:', API_URL);
      const response = await fetch(`${API_URL}/api/admin/connections`, {
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });
      console.log('Response status:', response.status);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`Failed to fetch connections: ${response.status} ${errorText}`);
      }
      const data = await response.json();
      console.log('Connections data:', data);
      return data;
    },
    enabled: isSignedIn && isLoaded,
    retry: 3,
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Handle both response formats: { connections: [...] } or [...]
  const connections = Array.isArray(connectionsData) 
    ? connectionsData 
    : connectionsData?.connections || [];

  const addConnectionMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const token = await getToken();
      const response = await fetch(`${API_URL}/api/admin/connections`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to add connection');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] });
      setFormData({ name: '', provider: '', connectionString: '' });
      showToast('success', 'Connection added successfully!');
    },
    onError: (error: Error) => {
      showToast('error', 'Failed to add connection: ' + error.message);
    },
  });

  const updateConnectionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const token = await getToken();
      const response = await fetch(`${API_URL}/api/admin/connections/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update connection');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] });
      setFormData({ name: '', provider: '', connectionString: '' });
      setEditingConnection(null);
      showToast('success', 'Connection updated successfully!');
    },
    onError: (error: Error) => {
      showToast('error', 'Failed to update connection: ' + error.message);
    },
  });

  const deleteConnectionMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      const response = await fetch(`${API_URL}/api/admin/connections/${id}`, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${token}`
        },
      });
      if (!response.ok) throw new Error('Failed to delete connection');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] });
      showToast('success', 'Connection deleted successfully!');
    },
    onError: (error: Error) => {
      showToast('error', 'Failed to delete connection: ' + error.message);
    },
  });

  const activateConnectionMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      const response = await fetch(`${API_URL}/api/admin/connections/${id}/activate`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`
        },
      });
      if (!response.ok) throw new Error('Failed to activate connection');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] });
      showToast('success', 'Connection activated successfully!');
    },
    onError: (error: Error) => {
      showToast('error', 'Failed to activate connection: ' + error.message);
    },
  });

  const testConnectionMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const token = await getToken();
      const response = await fetch(`${API_URL}/api/admin/connections/test`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to test connection');
      }
      return response.json();
    },
    onSuccess: () => {
      showToast('success', 'Connection successful!');
    },
    onError: (error: Error) => {
      showToast('error', 'Connection failed: ' + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name && formData.provider && formData.connectionString) {
      if (editingConnection) {
        updateConnectionMutation.mutate({ id: editingConnection.id, data: formData });
      } else {
        addConnectionMutation.mutate(formData);
      }
      setShowNewConnectionForm(false);
    } else {
      showToast('warning', 'Please fill in all required fields');
    }
  };

  const handleEditConnection = (conn: Connection) => {
    setEditingConnection(conn);
    setFormData({
      name: conn.name,
      provider: conn.provider,
      connectionString: conn.connection_string || ''
    });
    setShowNewConnectionForm(true);
  };

  const handleCloseForm = () => {
    setShowNewConnectionForm(false);
    setEditingConnection(null);
    setFormData({ name: '', provider: '', connectionString: '' });
  };

  const handleTestConnection = () => {
    if (formData.name && formData.provider && formData.connectionString) {
      testConnectionMutation.mutate(formData);
    } else {
      showToast('warning', 'Please fill in all required fields before testing');
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowProviderDropdown(false);
      }
    };

    if (showProviderDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showProviderDropdown]);

  const filteredConnections = connections?.filter((conn: Connection) =>
    conn.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conn.provider.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Show loading state while Clerk is initializing
  if (!isLoaded) {
    return (
      <main className="flex-1 flex items-center justify-center bg-[#F5F5F7]">
        <div className="text-center">
          <div className="inline-block size-12 border-4 border-[#007AFF] border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </main>
    );
  }

  // Redirect to sign in if not authenticated
  if (!isSignedIn) {
    return (
      <main className="flex-1 flex items-center justify-center bg-[#F5F5F7]">
        <div className="text-center max-w-md px-4">
          <div className="size-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-[#007AFF]" />
          </div>
          <h3 className="text-xl font-bold text-[#111111] mb-2">Authentication Required</h3>
          <p className="text-gray-600 mb-4">Please sign in to manage your database connections.</p>
          <button 
            onClick={() => navigate('/sign-in')}
            className="px-6 py-2 bg-[#007AFF] text-white rounded-full font-medium hover:bg-[#0051D5] transition-colors"
          >
            Sign In
          </button>
        </div>
      </main>
    );
  }

  // Show loading state while fetching connections
  if (isLoading) {
    return (
      <main className="flex-1 flex items-center justify-center bg-[#F5F5F7] h-screen">
        <div className="text-center bg-white rounded-[1.25rem] px-12 py-8 shadow-[0_4px_12px_rgba(0,0,0,0.03)]">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#007AFF] border-t-transparent mx-auto mb-4"></div>
          <p className="text-sm text-slate-800 font-medium">Loading...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex-1 flex items-center justify-center bg-[#F5F5F7]">
        <div className="text-center bg-white rounded-[1.25rem] px-12 py-8 shadow-[0_4px_12px_rgba(0,0,0,0.03)] max-w-md">
          <div className="size-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-[#111111] mb-2">Failed to load connections</h3>
          <p className="text-sm text-gray-600 mb-6">{(error as Error).message}</p>
          <button 
            onClick={() => queryClient.invalidateQueries({ queryKey: ['connections'] })}
            className="px-6 py-2.5 bg-[#007AFF] text-white rounded-full font-medium hover:bg-[#0051D5] transition-all shadow-[0_2px_8px_rgba(0,122,255,0.3)] hover:shadow-[0_4px_12px_rgba(0,122,255,0.4)]"
          >
            Try Again
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col h-full relative overflow-y-auto bg-[#F5F5F7]">
      {/* Setup Guide Modal */}
      {showSetupGuide && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <svg className="w-5 h-5 text-[#007AFF]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1zm0 13.5c-1.1-.35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5v11.5z"/>
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-[#111111]">Connection Setup Guide</h2>
              </div>
              <button 
                onClick={() => setShowSetupGuide(false)}
                className="size-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* PostgreSQL */}
              <div className="bg-blue-50 rounded-2xl p-5 border border-blue-100">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 flex items-center justify-center">
                    <img src="https://blog.skillfactory.ru/wp-content/uploads/2023/02/postgresql_elephant.svg-5325977.png" alt="PostgreSQL" className="w-full h-full object-contain" />
                  </div>
                  <h3 className="text-lg font-bold text-[#111111]">PostgreSQL</h3>
                </div>
                <div className="bg-white rounded-lg p-3 font-mono text-sm text-gray-700 border border-blue-200">
                  postgresql://username:password@host:5432/database
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  Example: <code className="text-xs bg-white px-2 py-1 rounded">postgresql://admin:pass123@db.example.com:5432/mydb</code>
                </p>
              </div>

              {/* MySQL */}
              <div className="bg-orange-50 rounded-2xl p-5 border border-orange-100">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">🐬</span>
                  <h3 className="text-lg font-bold text-[#111111]">MySQL</h3>
                </div>
                <div className="bg-white rounded-lg p-3 font-mono text-sm text-gray-700 border border-orange-200">
                  mysql://username:password@host:3306/database
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  Example: <code className="text-xs bg-white px-2 py-1 rounded">mysql://root:secret@localhost:3306/production</code>
                </p>
              </div>

              {/* Snowflake */}
              <div className="bg-cyan-50 rounded-2xl p-5 border border-cyan-100">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">❄️</span>
                  <h3 className="text-lg font-bold text-[#111111]">Snowflake</h3>
                </div>
                <div className="bg-white rounded-lg p-3 font-mono text-sm text-gray-700 border border-cyan-200">
                  snowflake://username:password@account.region/database?warehouse=WH
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  Example: <code className="text-xs bg-white px-2 py-1 rounded">snowflake://user@myorg-account123.us-east-1/analytics</code>
                </p>
              </div>

              {/* MongoDB */}
              <div className="bg-green-50 rounded-2xl p-5 border border-green-100">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">🍃</span>
                  <h3 className="text-lg font-bold text-[#111111]">MongoDB</h3>
                </div>
                <div className="bg-white rounded-lg p-3 font-mono text-sm text-gray-700 border border-green-200">
                  mongodb://username:password@host:27017/database
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  Example: <code className="text-xs bg-white px-2 py-1 rounded">mongodb+srv://user:pass@cluster0.mongodb.net/mydb</code>
                </p>
              </div>

              {/* Security Tips */}
              <div className="bg-gray-50 rounded-2xl p-5 border border-gray-200">
                <div className="flex items-start gap-3">
                  <Lock className="text-[#007AFF] w-5 h-5 mt-0.5 flex-shrink-0" strokeWidth={2} />
                  <div>
                    <h4 className="text-[#111111] font-bold text-sm mb-2">Security Best Practices</h4>
                    <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                      <li>Use read-only database users when possible</li>
                      <li>Enable SSL/TLS for all connections</li>
                      <li>Rotate credentials regularly</li>
                      <li>Use environment variables for sensitive data</li>
                      <li>Restrict database access by IP address</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="p-8 max-w-[1400px] mx-auto w-full flex flex-col gap-8 pb-20">
        {/* Page Title */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="flex flex-col gap-1 max-w-2xl">
            <div className="flex flex-col gap-1 max-w-2xl">
              <h1 className="text-3xl font-bold text-[#111111] tracking-tight">Database Connections</h1>
            </div>
          <div className="hidden">
              <a 
                href="https://bcworks.in.net/about_tudb" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center justify-center w-7 h-7 rounded-full hover:bg-gray-100 transition-colors group"
                title="Learn more about TUDB"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 group-hover:text-[#007AFF] transition-colors">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                  <path d="M12 17h.01"></path>
                </svg>
              </a>
            </div>
            <p className="text-[#86868B] text-[15px]">Manage data sources for query generation.</p>
          </div>
          <button 
            onClick={() => navigate('/setup-guide')}
            className="flex items-center gap-2 px-4 py-1.5 bg-white text-[#1D1D1F] text-[13px] font-medium rounded-full shadow-sm border border-black/10 hover:bg-gray-50 transition-all active:scale-95"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1zm0 13.5c-1.1-.35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5v11.5z"/>
              <path d="M17.5 10.5c.88 0 1.73.09 2.5.26V9.24c-.79-.15-1.64-.24-2.5-.24-1.7 0-3.24.29-4.5.83v1.66c1.13-.64 2.7-.99 4.5-.99zM13 12.49v1.66c1.13-.64 2.7-.99 4.5-.99.88 0 1.73.09 2.5.26V11.9c-.79-.15-1.64-.24-2.5-.24-1.7 0-3.24.3-4.5.83zM17.5 14.33c-1.7 0-3.24.29-4.5.83v1.66c1.13-.64 2.7-.99 4.5-.99.88 0 1.73.09 2.5.26v-1.52c-.79-.16-1.64-.24-2.5-.24z"/>
            </svg>
            <span>Setup Guide</span>
          </button>
        </div>

        {/* Grid Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
          {/* Connections Cards */}
          <div className="xl:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredConnections?.map((conn: Connection) => {
              const config = providerConfig[conn.provider.toLowerCase()] || {
                icon: '💾',
                label: conn.provider,
                gradient: 'from-gray-50 to-gray-100'
              };
              const isActive = conn.is_active;

              return (
                <div
                  key={conn.id}
                  className="group bg-white rounded-2xl p-6 shadow-[0_8px_24px_rgba(0,0,0,0.08)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.12)] hover:-translate-y-1 transition-all duration-300 relative border border-white/50"
                >
                  {/* More Menu */}
                  <div className="absolute top-4 right-4">
                    <button 
                      onClick={() => handleEditConnection(conn)}
                      className="size-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-[#111111] transition-colors"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                      </svg>
                    </button>
                  </div>

                  {/* Header */}
                  <div className="flex items-start gap-4 mb-5">
                    <div className={`size-14 rounded-2xl bg-gradient-to-br ${config.gradient} flex items-center justify-center shadow-inner border border-black/5 overflow-hidden p-2`}>
                      {config.isImage ? (
                        <img src={config.icon} alt={config.label} className="w-full h-full object-contain" />
                      ) : (
                        <span className="text-3xl">{config.icon}</span>
                      )}
                    </div>
                    <div>
                      <h3 className="text-[#111111] font-bold text-[17px] leading-tight">{conn.name}</h3>
                      <p className="text-[#86868B] text-[13px] font-medium mt-0.5">{config.label}</p>
                      <div className="flex items-center gap-1.5 mt-2">
                        {isActive ? (
                          <>
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                            </span>
                            <span className="text-green-600 text-[11px] font-semibold uppercase tracking-wide">Active</span>
                          </>
                        ) : (
                          <>
                            <span className="h-2 w-2 rounded-full bg-gray-300"></span>
                            <span className="text-gray-400 text-[11px] font-semibold uppercase tracking-wide">Inactive</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="space-y-2 mb-6 bg-gray-50/50 rounded-xl p-3 border border-gray-100/50">
                    <div className="flex justify-between items-center text-[12px]">
                      <span className="text-gray-500 font-medium">Host</span>
                      <span className="text-[#111111] font-mono opacity-80 truncate ml-2">
                        {conn.host || 'db-prod-01.aws...'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[12px]">
                      <span className="text-gray-500 font-medium">Added</span>
                      <span className="text-[#111111] opacity-80">
                        {new Date(conn.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 mt-auto">
                    {!isActive ? (
                      <>
                        <button
                          onClick={() => activateConnectionMutation.mutate(conn.id)}
                          className="flex-1 bg-[#007AFF] hover:bg-[#0062C4] text-white text-[13px] font-medium py-1.5 rounded-full shadow-md shadow-blue-500/20 transition-colors flex items-center justify-center gap-1.5"
                        >
                          Set Active
                        </button>
                        <button
                          onClick={() => handleEditConnection(conn)}
                          className="px-4 bg-gray-100/80 hover:bg-gray-200 text-gray-500 text-[13px] font-medium py-1.5 rounded-full transition-colors"
                        >
                          <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
                          </svg>
                        </button>
                      </>
                    ) : (
                      <>
                        <button 
                          onClick={() => handleEditConnection(conn)}
                          className="flex-1 bg-gray-100/80 hover:bg-gray-200 text-[#1D1D1F] text-[13px] font-medium py-1.5 rounded-full transition-colors"
                        >
                          Edit Config
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Delete this connection?')) {
                              deleteConnectionMutation.mutate(conn.id);
                            }
                          }}
                          className="px-4 bg-gray-100/80 hover:bg-red-50 hover:text-red-600 text-gray-400 text-[13px] font-medium py-1.5 rounded-full transition-colors"
                          aria-label="Delete"
                        >
                          <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                          </svg>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Add New Card */}
            <div 
              onClick={() => setShowNewConnectionForm(true)}
              className="border-2 border-dashed border-gray-200 rounded-2xl p-6 flex flex-col items-center justify-center text-center gap-4 min-h-[260px] hover:bg-white/50 hover:border-[#007AFF]/30 transition-all cursor-pointer group"
            >
              <div className="size-14 rounded-full bg-white shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="text-gray-400 group-hover:text-[#007AFF] transition-colors" viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
                  <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                </svg>
              </div>
              <div>
                <h3 className="text-[#111111] font-semibold text-[15px]">Add another source</h3>
                <p className="text-[#86868B] text-[13px] mt-1">Connect to SQL, NoSQL or Data Lakes</p>
              </div>
            </div>
          </div>

          {/* New Connection Form */}
          {showNewConnectionForm && (
            <div className="xl:col-span-1">
              <div className="sticky top-28 flex flex-col gap-5">
                <div className="bg-white rounded-2xl shadow-xl shadow-black/5 overflow-hidden ring-1 ring-black/5">
                  <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between backdrop-blur-sm">
                    <div className="flex items-center gap-2">
                      <svg className="text-[#007AFF] w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/>
                      </svg>
                      <h2 className="text-[#111111] font-bold text-[15px]">{editingConnection ? 'Edit Connection' : 'New Connection'}</h2>
                    </div>
                    <button 
                      type="button"
                      onClick={handleCloseForm}
                      className="size-6 flex items-center justify-center rounded-full bg-gray-200 text-gray-500 hover:bg-gray-300 hover:text-gray-800 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" strokeWidth={2} />
                    </button>
                  </div>
                <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
                  {/* Provider - Custom macOS Dropdown */}
                  <div className="flex flex-col gap-2">
                    <label className="text-[12px] font-semibold text-[#86868B] uppercase tracking-wide pl-1">Provider</label>
                    <div className="relative" ref={dropdownRef}>
                      <button
                        type="button"
                        onClick={() => setShowProviderDropdown(!showProviderDropdown)}
                        className="w-full bg-white border border-[#E5E5E7] rounded-xl py-3 pl-4 pr-10 text-left text-[14px] font-medium transition-all shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:border-[#007AFF]/50 focus:border-[#007AFF] focus:ring-4 focus:ring-[#007AFF]/10 focus:outline-none"
                      >
                        <span className={formData.provider ? 'text-[#111111]' : 'text-[#86868B]'}>
                          {formData.provider 
                            ? providerConfig[formData.provider]?.label || formData.provider
                            : 'Select Provider'}
                        </span>
                        <ChevronRight 
                          className={`absolute right-4 top-1/2 -translate-y-1/2 text-[#86868B] w-4 h-4 transition-transform ${showProviderDropdown ? 'rotate-[-90deg]' : 'rotate-90'}`}
                          strokeWidth={2.5} 
                        />
                      </button>

                      {/* macOS Style Dropdown Menu */}
                      {showProviderDropdown && (
                        <div className="absolute z-50 w-full mt-2 bg-white/95 backdrop-blur-2xl border border-[#E5E5E7] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden">
                          <div className="py-2">
                            {[
                              { value: '', label: 'Select Provider', logo: null },
                              { value: 'local', label: 'PostgreSQL (Local)', logo: 'https://www.postgresql.org/media/img/about/press/elephant.png' },
                              { value: 'mysql', label: 'MySQL', logo: 'https://labs.mysql.com/common/logos/mysql-logo.svg' },
                              { value: 'supabase', label: 'Supabase', logo: 'data:image/svg+xml,%3Csvg width="109" height="113" viewBox="0 0 109 113" fill="none" xmlns="http://www.w3.org/2000/svg"%3E%3Cpath d="M63.7076 110.284C60.8481 113.885 55.0502 111.912 54.9813 107.314L53.9738 40.0627L99.1935 40.0627C107.384 40.0627 111.952 49.5228 106.859 55.9374L63.7076 110.284Z" fill="url(%23paint0_linear)"/%3E%3Cpath d="M63.7076 110.284C60.8481 113.885 55.0502 111.912 54.9813 107.314L53.9738 40.0627L99.1935 40.0627C107.384 40.0627 111.952 49.5228 106.859 55.9374L63.7076 110.284Z" fill="url(%23paint1_linear)" fill-opacity="0.2"/%3E%3Cpath d="M45.317 2.07103C48.1765 -1.53037 53.9745 0.442937 54.0434 5.041L54.4849 72.2922H9.83113C1.64038 72.2922 -2.92775 62.8321 2.1655 56.4175L45.317 2.07103Z" fill="%233ECF8E"/%3E%3Cdefs%3E%3ClinearGradient id="paint0_linear" x1="53.9738" y1="54.974" x2="94.1635" y2="71.8295" gradientUnits="userSpaceOnUse"%3E%3Cstop stop-color="%23249361"/%3E%3Cstop offset="1" stop-color="%233ECF8E"/%3E%3C/linearGradient%3E%3ClinearGradient id="paint1_linear" x1="36.1558" y1="30.578" x2="54.4844" y2="65.0806" gradientUnits="userSpaceOnUse"%3E%3Cstop/%3E%3Cstop offset="1" stop-opacity="0"/%3E%3C/linearGradient%3E%3C/defs%3E%3C/svg%3E' },
                              { value: 'neon', label: 'Neon', logo: 'data:image/svg+xml,%3Csvg width="158" height="45" viewBox="0 0 158 45" fill="none" xmlns="http://www.w3.org/2000/svg"%3E%3Cpath fill-rule="evenodd" clip-rule="evenodd" d="M0 7.61152C0 3.40779 3.44137 0 7.68651 0H36.8952C41.1404 0 44.5817 3.40779 44.5817 7.61152V32.2111C44.5817 36.5601 39.0241 38.4476 36.3287 35.014L27.902 24.2798V37.2964C27.902 41.0798 24.8048 44.1468 20.9842 44.1468H7.68651C3.44137 44.1468 0 40.739 0 36.5353V7.61152ZM7.68651 6.08921C6.83748 6.08921 6.14921 6.77077 6.14921 7.61152V36.5353C6.14921 37.376 6.83748 38.0576 7.68651 38.0576H21.2148C21.6393 38.0576 21.7528 37.7168 21.7528 37.2964V19.8412C21.7528 15.4922 27.3104 13.6047 30.0059 17.0383L38.4325 27.7725V7.61152C38.4325 6.77077 38.5129 6.08921 37.6639 6.08921H7.68651Z" fill="%23191919"/%3E%3Cpath d="M36.8954 0C41.1406 0 44.5819 3.40779 44.5819 7.61152V32.2111C44.5819 36.5601 39.0243 38.4476 36.3289 35.014L27.9022 24.2798V37.2964C27.9022 41.0798 24.805 44.1468 20.9844 44.1468C21.4089 44.1468 21.753 43.806 21.753 43.3857V19.8412C21.753 15.4922 27.3106 13.6047 30.0061 17.0383L38.4327 27.7725V1.5223C38.4327 0.681558 37.7445 0 36.8954 0Z" fill="%23191919"/%3E%3Cpath d="M75.1561 13.0033V24.5502L63.8496 13.0033H57.9648V31.8884H63.332V19.4782L75.6465 31.8884H80.5232V13.0033H75.1561Z" fill="%231A1A1A"/%3E%3Cpath d="M90.4725 27.6797V24.3343H102.487V20.3145H90.4725V17.212H105.048V13.0033H84.9964V31.8884H105.348V27.6797H90.4725Z" fill="%231A1A1A"/%3E%3Cpath d="M119.61 32.5089C127.157 32.5089 132.061 28.8398 132.061 22.4458C132.061 16.0519 127.157 12.3828 119.61 12.3828C112.063 12.3828 107.187 16.0519 107.187 22.4458C107.187 28.8398 112.063 32.5089 119.61 32.5089ZM119.61 28.0304C115.415 28.0304 112.826 26.007 112.826 22.4458C112.826 18.8847 115.442 16.8613 119.61 16.8613C123.806 16.8613 126.394 18.8847 126.394 22.4458C126.394 26.007 123.806 28.0304 119.61 28.0304Z" fill="%231A1A1A"/%3E%3Cpath d="M152.632 13.0033V24.5502L141.326 13.0033H135.441V31.8884H140.808V19.4782L153.123 31.8884H157.999V13.0033H152.632Z" fill="%231A1A1A"/%3E%3C/svg%3E' },
                              { value: 'railway', label: 'Railway', logo: 'https://railway.com/brand/logo-dark.svg' },
                              { value: 'rds', label: 'AWS RDS', logo: 'https://a0.awsstatic.com/libra-css/images/logos/aws_logo_smile_1200x630.png' },
                            ].map((option, index) => (
                              <button
                                key={option.value || 'empty'}
                                type="button"
                                onClick={() => {
                                  setFormData({ ...formData, provider: option.value });
                                  setShowProviderDropdown(false);
                                }}
                                className={`w-full text-left px-4 py-2.5 text-[14px] font-medium transition-colors flex items-center gap-3 group ${
                                  formData.provider === option.value
                                    ? 'bg-[#007AFF]/10 text-[#007AFF]'
                                    : 'text-[#111111] hover:bg-[#F5F5F7]'
                                } ${index === 0 ? 'text-[#86868B]' : ''}`}
                              >
                                <div className="flex items-center gap-3">
                                  {option.logo && (
                                    <img src={option.logo} alt={option.label} className="w-5 h-5 object-contain" />
                                  )}
                                  <span>{option.label}</span>
                                </div>
                                {formData.provider === option.value && (
                                  <Check className="w-4 h-4 text-[#007AFF]" strokeWidth={2.5} />
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Nickname */}
                  <div className="flex flex-col gap-2">
                    <label className="text-[12px] font-semibold text-[#86868B] uppercase tracking-wide pl-1">Nickname</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Finance DB Replica"
                      className="w-full bg-[#F5F5F7] border-transparent rounded-lg py-2.5 px-3 text-[#111111] placeholder-gray-400 focus:border-[#007AFF]/50 focus:ring-4 focus:ring-[#007AFF]/10 text-[14px] transition-shadow"
                    />
                  </div>

                  {/* Connection URI */}
                  <div className="flex flex-col gap-2">
                    <label className="text-[12px] font-semibold text-[#86868B] uppercase tracking-wide flex items-center justify-between pl-1">
                      Connection URI
                      <span className="text-[11px] text-[#007AFF] cursor-pointer hover:underline font-normal capitalize">Help</span>
                    </label>
                    <div className="relative group">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={formData.connectionString}
                        onChange={(e) => setFormData({ ...formData, connectionString: e.target.value })}
                        placeholder="postgres://user:pass@host:5432/db"
                        className="w-full bg-[#F5F5F7] border-transparent rounded-lg py-2.5 pl-3 pr-10 text-[#111111] placeholder-gray-400 focus:border-[#007AFF]/50 focus:ring-4 focus:ring-[#007AFF]/10 text-[13px] font-mono tracking-tight transition-shadow"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#007AFF] transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-[18px] h-[18px]" strokeWidth={2} /> : <Eye className="w-[18px] h-[18px]" strokeWidth={2} />}
                      </button>
                    </div>
                  </div>

                  {/* SSL Toggle */}
                  <div className="flex items-center justify-between py-2 px-1">
                    <div className="flex flex-col">
                      <span className="text-[14px] text-[#111111] font-medium">Enable SSL</span>
                      <span className="text-[12px] text-[#86868B]">Require secure transport</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={sslEnabled}
                        onChange={(e) => setSslEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#007AFF]/30 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:shadow-sm after:transition-all peer-checked:bg-green-500"></div>
                    </label>
                  </div>

                  <div className="h-px bg-gray-100 my-1"></div>

                  {/* Actions */}
                  <div className="flex flex-col gap-3">
                    <button
                      type="button"
                      onClick={handleTestConnection}
                      disabled={testConnectionMutation.isPending}
                      className="w-full py-2.5 rounded-full bg-white border border-gray-200 hover:bg-gray-50 text-[#111111] text-[13px] font-semibold transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M15.9 5c-.17 0-.32.09-.41.23l-.07.15-5.18 11.65c-.16.29-.26.61-.26.96 0 1.11.9 2.01 2.01 2.01.96 0 1.77-.68 1.96-1.59l.01-.03L16.4 5.5c0-.28-.22-.5-.5-.5zM1 9l2 2c2.88-2.88 6.79-4.08 10.53-3.62l1.19-2.68C9.89 3.84 4.74 5.27 1 9zm20 2l2-2c-1.64-1.64-3.55-2.82-5.59-3.57l-.53 2.82c1.5.62 2.9 1.53 4.12 2.75zm-4 4l2-2c-.8-.8-1.7-1.42-2.66-1.89l-.55 2.92c.42.27.83.59 1.21.97zM5 13l2 2c1.13-1.13 2.56-1.79 4.03-2l1.28-2.88c-2.63-.08-5.3.87-7.31 2.88z"/>
                      </svg>
                      {testConnectionMutation.isPending ? 'Testing...' : 'Test Connection'}
                    </button>
                    <button
                      type="submit"
                      disabled={addConnectionMutation.isPending || updateConnectionMutation.isPending}
                      className="w-full py-2.5 rounded-full bg-[#007AFF] hover:bg-[#0062C4] text-white text-[13px] font-semibold transition-colors flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {(addConnectionMutation.isPending || updateConnectionMutation.isPending) ? 'Saving...' : (editingConnection ? 'Update Connection' : 'Save Connection')}
                    </button>
                  </div>
                </form>
              </div>

              {/* Security Note */}
              <div className="bg-white/60 backdrop-blur-md border border-white rounded-2xl p-5 flex gap-3 items-start shadow-sm">
                <Lock className="text-[#007AFF] w-5 h-5 mt-0.5" strokeWidth={2} />
                <div>
                  <h4 className="text-[#111111] font-bold text-[13px] mb-1">Security Note</h4>
                  <p className="text-[#86868B] text-[12px] leading-relaxed">
                    Credentials are encrypted at rest using AES-256. Read-only access recommended.
                  </p>
                </div>
              </div>
            </div>
          </div>
          )}
        </div> {/* End Grid Layout */}
      </div> {/* End Main Content */}

      {/* Toast Notification */}
      {toast.show && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={hideToast}
        />
      )}
    </main>
  );
}
