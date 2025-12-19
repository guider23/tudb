import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { Table, ChevronRight, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '@clerk/clerk-react';
import TableDataEditor from '../components/TableDataEditor';

interface Connection {
  id: number;
  name: string;
  provider: string;
  is_active: boolean;
}

const providerConfig: Record<string, { icon: string; label: string }> = {
  supabase: { icon: 'https://img.icons8.com/color/512/supabase.png', label: 'Supabase' },
  neon: { icon: 'https://neon.tech/favicon/favicon.png', label: 'Neon' },
  railway: { icon: 'https://railway.app/brand/logo-light.png', label: 'Railway' },
  rds: { icon: 'https://a0.awsstatic.com/libra-css/images/logos/aws_logo_smile_179x109.png', label: 'AWS RDS' },
  planetscale: { icon: 'https://avatars.githubusercontent.com/u/35612527', label: 'PlanetScale' },
  azuremysql: { icon: 'https://swimburger.net/media/ppnn3pcl/azure.png', label: 'Azure MySQL' },
  herokupostgres: { icon: 'https://cdn.worldvectorlogo.com/logos/heroku-4.svg', label: 'Heroku Postgres' },
  googlecloudsql: { icon: 'https://marketplace.crowdstrike.com/content/dam/crowdstrike/marketplace/en-us/images/Googlecloud_icon_square.png', label: 'Google Cloud SQL (PostgreSQL)' },
  azurepostgres: { icon: 'https://swimburger.net/media/ppnn3pcl/azure.png', label: 'Azure PostgreSQL' },
  digitaloceanpostgres: { icon: 'https://www.vectorlogo.zone/logos/digitalocean/digitalocean-icon.svg', label: 'DigitalOcean PostgreSQL' },
  aivenpostgres: { icon: 'https://assets.topadvisor.com/media/_solution_logo_09222023_26755928.png', label: 'Aiven PostgreSQL' },
  render: { icon: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSSlZQ5lkKr_NTo29xqy0X5VQSQknoPuhuu3A&s', label: 'Render PostgreSQL' },
  cockroachdb: { icon: 'https://www.vectorlogo.zone/logos/cockroachlabs/cockroachlabs-icon.svg', label: 'CockroachDB' },
  timescalecloud: { icon: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR1QlKlW-KT-OZe6dffDTgSEf3abClfbRdtYA&s', label: 'Timescale Cloud' },
  googlecloudsqlmysql: { icon: 'https://marketplace.crowdstrike.com/content/dam/crowdstrike/marketplace/en-us/images/Googlecloud_icon_square.png', label: 'Google Cloud SQL (MySQL)' },
  digitaloceanmysql: { icon: 'https://www.vectorlogo.zone/logos/digitalocean/digitalocean-icon.svg', label: 'DigitalOcean MySQL' },
  aivenmysql: { icon: 'https://assets.topadvisor.com/media/_solution_logo_09222023_26755928.png', label: 'Aiven MySQL' },
  auroramysql: { icon: 'https://a0.awsstatic.com/libra-css/images/logos/aws_logo_smile_179x109.png', label: 'AWS Aurora MySQL' },
  postgres: { icon: 'https://www.postgresql.org/media/img/about/press/elephant.png', label: 'PostgreSQL' },
  postgresql: { icon: 'https://www.postgresql.org/media/img/about/press/elephant.png', label: 'PostgreSQL' },
  mysql: { icon: 'https://labs.mysql.com/common/logos/mysql-logo.svg', label: 'MySQL' },
}

export default function Inspect() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedConnection, setSelectedConnection] = useState<Connection | null>(null);
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'connections' | 'tables' | 'data'>('connections');

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const loadConnections = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await getToken();
      const response = await fetch(`${API_URL}/api/admin/connections`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load connections');
      }

      const data = await response.json();
      setConnections(data.connections || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  const handleConnectionSelect = useCallback(async (connection: Connection) => {
    setSelectedConnection(connection);
    setView('tables');
    setLoading(true);
    setError(null);

    try {
      const token = await getToken();
      
      await fetch(`${API_URL}/api/admin/connections/${connection.id}/activate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const response = await fetch(`${API_URL}/api/inspect/tables`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load tables');
      }

      const data = await response.json();
      setTables(data.tables || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  const handleTableSelect = useCallback((tableName: string) => {
    setSelectedTable(tableName);
    setView('data');
  }, []);

  const handleBack = useCallback(() => {
    if (view === 'data') {
      setView('tables');
      setSelectedTable(null);
    } else if (view === 'tables') {
      setView('connections');
      setSelectedConnection(null);
      setTables([]);
    }
  }, [view]);

  useEffect(() => {
    console.warn('⚠️ DEVELOPMENT ENVIRONMENT - This is for dev - don\'t run any unknown commands by siddarth');
    if (isLoaded && isSignedIn) {
      loadConnections();
    }
  }, [isLoaded, isSignedIn, loadConnections]);

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-[#007AFF]" />
      </div>
    );
  }

  const activeConnection = useMemo(() => connections.find(c => c.is_active), [connections]);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Database Inspector
        </h1>
      </div>

      {/* Breadcrumb Navigation */}
      {view !== 'connections' && (
        <div className="mb-6 flex items-center gap-2 text-sm bg-gray-50 p-3 rounded-lg border border-gray-200">
          <button
            onClick={() => {
              setView('connections');
              setSelectedConnection(null);
              setSelectedTable(null);
              setTables([]);
            }}
            className="text-blue-600 hover:text-blue-800 font-medium hover:underline"
          >
            Databases
          </button>
          {selectedConnection && (
            <>
              <ChevronRight className="w-4 h-4 text-gray-400" />
              <button
                onClick={() => {
                  setView('tables');
                  setSelectedTable(null);
                }}
                className={view === 'tables' ? 'text-gray-900 font-medium' : 'text-blue-600 hover:text-blue-800 font-medium hover:underline'}
              >
                {selectedConnection.name}
              </button>
            </>
          )}
          {selectedTable && (
            <>
              <ChevronRight className="w-4 h-4 text-gray-400" />
              <span className="text-gray-900 font-medium">{selectedTable}</span>
            </>
          )}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
          <div>
            <p className="font-medium text-red-900">Error</p>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-[#007AFF]" />
        </div>
      )}

      {/* Connections view */}
      {!loading && view === 'connections' && (() => {
        const providerInfo = activeConnection ? providerConfig[activeConnection.provider] : null;
        
        if (!activeConnection) {
          return (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No active database connection found.</p>
              <p className="text-gray-500 text-sm mt-1">Activate a connection in the Connections page.</p>
            </div>
          );
        }

        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <button
              onClick={() => handleConnectionSelect(activeConnection)}
              className="group p-6 bg-white border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:shadow-xl transition-all text-left relative overflow-hidden"
            >
              <div className="absolute top-3 right-3">
                <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                  Active
                </span>
              </div>
              <div className="mb-4 mt-2">
                {providerInfo?.icon ? (
                  <img 
                    src={providerInfo.icon} 
                    alt={providerInfo.label}
                    className="w-16 h-16 object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                    {activeConnection.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <h3 className="font-bold text-gray-900 text-xl mb-1 group-hover:text-blue-600 transition-colors">
                {activeConnection.name}
              </h3>
              <p className="text-sm text-gray-600">
                {providerInfo?.label || activeConnection.provider}
              </p>
            </button>
          </div>
        );
      })()}

      {/* Tables view */}
      {!loading && view === 'tables' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {tables.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <Table className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No tables found in this database.</p>
            </div>
          ) : (
            tables.map((tableName) => (
              <button
                key={tableName}
                onClick={() => handleTableSelect(tableName)}
                className="p-5 bg-white border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:shadow-lg transition-all text-left group"
              >
                <Table className="w-7 h-7 text-gray-400 group-hover:text-blue-600 transition-colors mb-3" />
                <h3 className="font-medium text-gray-900 truncate">
                  {tableName}
                </h3>
              </button>
            ))
          )}
        </div>
      )}

      {/* Table data view */}
      {!loading && view === 'data' && selectedTable && (
        <TableDataEditor tableName={selectedTable} />
      )}
    </div>
  );
}
