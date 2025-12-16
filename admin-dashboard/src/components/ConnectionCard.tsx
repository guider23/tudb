import { Database, MoreVertical, Activity, AlertCircle } from 'lucide-react';

interface ConnectionCardProps {
  id: string;
  name: string;
  provider: string;
  status: 'healthy' | 'idle' | 'error';
  latency?: number;
  lastChecked?: string;
  connectionString: string;
  isActive: boolean;
  onTest: (id: string) => void;
  onActivate: (id: string) => void;
  onDelete: (id: string) => void;
  onRetry?: (id: string) => void;
}

const providerColors: Record<string, string> = {
  supabase: 'bg-emerald-600',
  neon: 'bg-cyan-600',
  railway: 'bg-purple-600',
  rds: 'bg-orange-600',
  local: 'bg-slate-600',
  mysql: 'bg-blue-600',
  planetscale: 'bg-indigo-600',
  localmysql: 'bg-amber-600',
};

const providerLabels: Record<string, string> = {
  supabase: 'SUPABASE',
  neon: 'NEON',
  railway: 'RAILWAY',
  rds: 'AWS RDS',
  local: 'LOCAL',
  mysql: 'MYSQL',
  planetscale: 'PLANETSCALE',
  localmysql: 'LOCAL MYSQL',
};

export default function ConnectionCard({
  id,
  name,
  provider,
  status,
  latency,
  lastChecked,
  connectionString,
  isActive,
  onTest,
  onActivate,
  onDelete,
  onRetry,
}: ConnectionCardProps) {
  const providerColor = providerColors[provider] || 'bg-gray-600';
  const providerLabel = providerLabels[provider] || provider.toUpperCase();

  const getStatusConfig = () => {
    switch (status) {
      case 'healthy':
        return {
          bg: 'bg-green-50',
          text: 'text-green-700',
          dot: 'bg-green-500',
          label: 'Healthy',
          icon: Activity,
        };
      case 'idle':
        return {
          bg: 'bg-gray-50',
          text: 'text-gray-600',
          dot: 'bg-gray-400',
          label: 'Idle',
          icon: Activity,
        };
      case 'error':
        return {
          bg: 'bg-red-50',
          text: 'text-red-700',
          dot: 'bg-red-500',
          label: 'Error',
          icon: AlertCircle,
        };
      default:
        return {
          bg: 'bg-gray-50',
          text: 'text-gray-600',
          dot: 'bg-gray-400',
          label: 'Unknown',
          icon: Activity,
        };
    }
  };

  const statusConfig = getStatusConfig();
  const { icon: Icon } = statusConfig;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md transition-shadow duration-200">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 ${providerColor} rounded-lg flex items-center justify-center`}>
            <Database className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-gray-900">{name}</h3>
              {isActive && (
                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-medium rounded">
                  Active
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">{providerLabel}</p>
          </div>
        </div>
        <button className="p-1 hover:bg-gray-100 rounded transition-colors">
          <MoreVertical className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {/* Status and Latency */}
      {status === 'healthy' && latency !== undefined ? (
        <div className="mb-4">
          <div className="text-4xl font-semibold text-gray-900 mb-1">
            {latency}
            <span className="text-base font-normal text-gray-500 ml-1">ms</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 ${statusConfig.dot} rounded-full`} />
            <span className={`text-sm ${statusConfig.text}`}>{statusConfig.label}</span>
          </div>
        </div>
      ) : status === 'idle' ? (
        <div className="mb-4">
          <div className="text-2xl font-medium text-gray-400 mb-1">Idle</div>
          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 ${statusConfig.dot} rounded-full`} />
            <span className="text-sm text-gray-500">No traffic</span>
          </div>
        </div>
      ) : (
        <div className="mb-4">
          <div className="text-2xl font-medium text-red-600 mb-1">Error</div>
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <span className="text-sm text-red-700">Connection refused</span>
          </div>
        </div>
      )}

      {/* Connection Info */}
      <div className="flex items-center gap-2 text-xs text-gray-500 mb-4 pb-4 border-b border-gray-100">
        <Database className="w-3.5 h-3.5" />
        <span className="truncate">{connectionString.split('@')[1]?.split('/')[0] || 'localhost'}</span>
      </div>

      {/* Last Checked */}
      {lastChecked && (
        <div className="text-xs text-gray-500 mb-3">
          Last checked: {lastChecked}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        {status === 'error' && onRetry ? (
          <button
            onClick={() => onRetry(id)}
            className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        ) : !isActive ? (
          <button
            onClick={() => onActivate(id)}
            className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
          >
            Activate
          </button>
        ) : (
          <button
            onClick={() => onTest(id)}
            className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
          >
            Test
          </button>
        )}
        <button
          onClick={() => onDelete(id)}
          className="px-3 py-2 text-gray-400 text-sm font-medium rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
