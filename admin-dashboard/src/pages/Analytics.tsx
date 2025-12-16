import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import {
  TrendingUp,
  Users,
  Database,
  Clock,
  Activity,
} from 'lucide-react';
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { api } from '../lib/api';

export default function Analytics() {
  useEffect(() => {
    document.title = 'Analytics';
  }, []);

  const { data: analyticsData, isLoading, error } = useQuery({
    queryKey: ['analytics'],
    queryFn: api.getAnalytics,
    refetchInterval: 30000,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen backdrop-blur-xl">
        <div className="text-center bg-white rounded-[1.25rem] px-12 py-8 shadow-[0_4px_12px_rgba(0,0,0,0.03)]">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#007AFF] border-t-transparent mx-auto mb-4"></div>
          <p className="text-sm text-slate-800 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen backdrop-blur-xl">
        <div className="text-center bg-white rounded-[1.25rem] px-12 py-8 shadow-[0_4px_12px_rgba(0,0,0,0.03)] max-w-md">
          <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-base text-slate-800 font-semibold mb-2">Unable to load analytics</p>
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

  const metrics = analyticsData?.metrics || {};
  const queryTypes = analyticsData?.queryTypes || [];
  const performance = analyticsData?.performance || [];
  const topQueries = analyticsData?.topQueries || [];
  const failedQueries = analyticsData?.failedQueries || [];
  
  // Check if all queries failed
  const hasFailedQueries = metrics.errorRate === 100 && metrics.totalQueries > 0;
  const hasNoSuccessfulQueries = metrics.successRate === 0 && metrics.totalQueries > 0;

  return (
    <div className="flex-1 flex flex-col">
      <div className="p-8 space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="page-title">Analytics</h1>
        <p className="page-subtitle">Detailed insights into query patterns and system performance</p>
      </div>

      {/* Failed Queries Alert */}
      {hasFailedQueries && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-amber-900 mb-1">All Queries Failed</h3>
              <p className="text-sm text-amber-800 mb-2">
                Your {metrics.totalQueries} queries failed to execute. Metrics like Avg Query Time and Tables Accessed require successful query executions.
              </p>
              {failedQueries.length > 0 && (
                <div className="text-xs text-amber-700 bg-white/50 rounded p-2 mt-2">
                  <p className="font-semibold mb-1">Common failed queries:</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    {failedQueries.slice(0, 3).map((fq: any, idx: number) => (
                      <li key={idx}>"{fq.query}" ({fq.count}x)</li>
                    ))}
                  </ul>
                </div>
              )}
              <p className="text-xs text-amber-700 mt-2">
                💡 Tip: Try simple queries like "List all tables" or "Show 5 rows from [table_name]" to see analytics populate.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          {
            name: 'Total Queries',
            value: metrics.totalQueries?.toLocaleString() || '0',
            change: '+12%',
            icon: Activity,
            bgColor: 'bg-brand-50',
            iconColor: 'text-brand-600',
          },
          {
            name: 'Unique Users',
            value: metrics.uniqueUsers || '0',
            change: '+8%',
            icon: Users,
            bgColor: 'bg-purple-50',
            iconColor: 'text-purple-600',
          },
          {
            name: 'Avg Query Time',
            value: hasNoSuccessfulQueries ? '—' : `${metrics.avgQueryTime || 0}ms`,
            change: hasNoSuccessfulQueries ? 'N/A' : '-15%',
            icon: Clock,
            bgColor: 'bg-success-50',
            iconColor: 'text-success-600',
          },
          {
            name: 'Tables Accessed',
            value: hasNoSuccessfulQueries ? '—' : (metrics.tablesAccessed || '0'),
            change: hasNoSuccessfulQueries ? 'N/A' : '+3',
            icon: Database,
            bgColor: 'bg-amber-50',
            iconColor: 'text-amber-600',
          },
        ].map((metric) => (
          <div key={metric.name} className="stat-card">
            <div className={`${metric.bgColor} ${metric.iconColor} p-3 rounded-lg inline-flex mb-4`}>
              <metric.icon className="w-5 h-5" />
            </div>
            <p className="text-xs font-semibold text-neutral-600 uppercase tracking-wide mb-2">
              {metric.name}
            </p>
            <div className="flex items-end justify-between">
              <p className="text-2xl font-bold text-neutral-900">{metric.value}</p>
              <span className="text-sm font-medium text-success-600 flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                {metric.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Query Types */}
        <div className="card p-6">
          <h2 className="section-title">Query Distribution</h2>
          <div className="h-80">
            {queryTypes.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Database className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
                  <p className="text-sm text-neutral-500">No query type data yet</p>
                  <p className="text-xs text-neutral-400 mt-1">Execute successful queries to see distribution</p>
                </div>
              </div>
            ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={queryTypes}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }: any) => `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`}
                  outerRadius={100}
                  fill="#3B82F6"
                  dataKey="count"
                >
                  {queryTypes.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    padding: '12px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Performance Trends */}
        <div className="card p-6">
          <h2 className="section-title">Performance Trends</h2>
          <div className="h-80">
            {performance.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Clock className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
                  <p className="text-sm text-neutral-500">No performance data yet</p>
                  <p className="text-xs text-neutral-400 mt-1">Execute successful queries to see trends</p>
                </div>
              </div>
            ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={performance}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis
                  dataKey="time"
                  tick={{ fill: '#9CA3AF', fontSize: 12 }}
                  axisLine={{ stroke: '#E5E7EB' }}
                />
                <YAxis
                  tick={{ fill: '#9CA3AF', fontSize: 12 }}
                  axisLine={{ stroke: '#E5E7EB' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    padding: '12px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="avgTime"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  name="Avg Time (ms)"
                  dot={{ fill: '#3B82F6', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Top Queries */}
      <div className="card p-6">
        <h2 className="section-title">Most Frequent Queries</h2>
        <div className="space-y-3">
          {topQueries.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-neutral-500">No query data available yet</p>
            </div>
          ) : (
            topQueries.map((query: any, idx: number) => (
            <div
              key={idx}
              className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg border border-neutral-200 hover:border-neutral-300 transition-all"
            >
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="w-8 h-8 bg-brand-50 text-brand-700 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-neutral-900 truncate">{query.query}</p>
                  <p className="text-xs text-neutral-500 mt-1">
                    {query.count} executions • Avg: {query.avgTime}ms
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 flex-shrink-0">
                <div className="text-right">
                  <p className="text-sm font-bold text-neutral-900">{query.count}</p>
                  <p className="text-xs text-neutral-500">queries</p>
                </div>
                <div className="w-24 bg-neutral-200 rounded-full h-2">
                  <div
                    className="bg-brand-600 h-2 rounded-full transition-all"
                    style={{ 
                      width: `${topQueries.length > 0 ? (query.count / topQueries[0].count) * 100 : 0}%` 
                    }}
                  />
                </div>
              </div>
            </div>
            ))
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
