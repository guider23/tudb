import { useQuery } from '@tanstack/react-query';
import { useState, useMemo, useEffect } from 'react';
import { api } from '../lib/api';
import { useUser } from '@clerk/clerk-react';

export default function Dashboard() {
  const [selectedTimeRange, setSelectedTimeRange] = useState('24h');
  const { user } = useUser();

  useEffect(() => {
    document.title = 'Overview';
  }, []);

  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: api.getStats,
    refetchInterval: 30000,
    refetchOnMount: true,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: recentQueriesData, isLoading: queriesLoading, error: queriesError } = useQuery({
    queryKey: ['recent-queries'],
    queryFn: api.getRecentQueries,
    refetchInterval: 10000,
    refetchOnMount: true,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Calculate metrics with real data
  const totalQueries = stats?.totalQueries ?? 0;
  const avgResponseTime = stats?.avgResponseTime ?? 0;
  const activeConnections = stats?.activeConnections ?? 0;

  // Calculate trends (compare with previous period)
  const queryTrend = useMemo(() => {
    if (!stats?.recentActivity || stats.recentActivity.length === 0) return { percent: 0, isUp: false };
    
    const activities = stats.recentActivity;
    const mid = Math.floor(activities.length / 2);
    const recentSum = activities.slice(mid).reduce((sum: number, item: any) => sum + parseInt(item.queries || 0), 0);
    const olderSum = activities.slice(0, mid).reduce((sum: number, item: any) => sum + parseInt(item.queries || 0), 0);
    
    if (olderSum === 0) return { percent: recentSum > 0 ? 100 : 0, isUp: recentSum > 0 };
    
    const percentChange = Math.round(((recentSum - olderSum) / olderSum) * 100);
    return { percent: Math.abs(percentChange), isUp: percentChange > 0 };
  }, [stats]);

  const responseTrend = useMemo(() => {
    // Lower response time is better, so we invert the logic
    const avgTime = avgResponseTime;
    if (avgTime === 0) return { percent: 0, isUp: true, text: 'No data' };
    if (avgTime < 50) return { percent: Math.round((50 - avgTime) / 50 * 100), isUp: true, text: 'faster than avg' };
    if (avgTime < 100) return { percent: Math.round((avgTime - 50) / 50 * 100), isUp: false, text: 'slower than avg' };
    return { percent: Math.round((avgTime - 100) / 100 * 100), isUp: false, text: 'needs optimization' };
  }, [avgResponseTime]);

  // Process chart data for SVG
  const chartData = useMemo(() => {
    if (!stats?.recentActivity || stats.recentActivity.length === 0) {
      return { points: [], maxValue: 100, pathData: '', areaPathData: '', hasData: false };
    }

    const activities = stats.recentActivity.map((item: any) => ({
      time: item.time,
      queries: parseInt(item.queries || 0)
    }));

    const maxValue = Math.max(...activities.map((a: any) => a.queries), 1);
    const width = 1000;
    const height = 300;
    const padding = 20;

    // Generate SVG path
    const points = activities.map((item: any, index: number) => {
      const x = (index / (activities.length - 1 || 1)) * width;
      const y = height - ((item.queries / maxValue) * (height - padding * 2)) - padding;
      return { x, y, value: item.queries, time: item.time };
    });

    // Create smooth bezier curve path
    let pathData = `M${points[0]?.x || 0},${points[0]?.y || height}`;
    for (let i = 0; i < points.length - 1; i++) {
      const curr = points[i];
      const next = points[i + 1];
      const midX = (curr.x + next.x) / 2;
      pathData += ` C${midX},${curr.y} ${midX},${next.y} ${next.x},${next.y}`;
    }

    // Create area fill path
    const areaPathData = pathData + ` L${width},${height} L0,${height} Z`;

    return { points, maxValue, pathData, areaPathData, hasData: true };
  }, [stats]);

  // Get latest query with highest value for tooltip
  const tooltipData = useMemo(() => {
    if (chartData.points.length === 0) return null;
    const maxPoint = chartData.points.reduce((max: any, point: any) => 
      point.value > max.value ? point : max
    , chartData.points[0]);
    return maxPoint;
  }, [chartData]);

  // Show loading state while loading
  if (statsLoading || queriesLoading) {
    return (
      <div className="flex items-center justify-center h-screen backdrop-blur-xl">
        <div className="text-center bg-white rounded-[1.25rem] px-12 py-8 shadow-[0_4px_12px_rgba(0,0,0,0.03)]">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#007AFF] border-t-transparent mx-auto mb-4"></div>
          <p className="text-sm text-slate-800 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  // Show error state after retries exhausted
  if (statsError || queriesError) {
    return (
      <div className="flex items-center justify-center h-screen backdrop-blur-xl">
        <div className="text-center bg-white rounded-[1.25rem] px-12 py-8 shadow-[0_4px_12px_rgba(0,0,0,0.03)] max-w-md">
          <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-base text-slate-800 font-semibold mb-2">Unable to load dashboard</p>
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

  return (
    <div className="flex-1 overflow-y-auto p-8 pt-4 pb-20 scroll-smooth">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Metric Card 1 - Total Queries */}
          <div className="bg-white rounded-[1.25rem] shadow-[0_4px_12px_rgba(0,0,0,0.03)] p-6 flex flex-col justify-between h-40 relative overflow-hidden group hover:shadow-[0_8px_16px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-200">
            <div className="flex items-start justify-between z-10">
              <div className="flex flex-col gap-1">
                <span className="text-[13px] font-medium text-slate-500">Total Queries</span>
                <span className="text-3xl font-semibold text-slate-900 tracking-tight">
                  {totalQueries.toLocaleString()}
                </span>
              </div>
              <div className="w-8 h-8 rounded-full bg-blue-50 text-[#007AFF] flex items-center justify-center">
                <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-auto z-10">
              {queryTrend.percent > 0 && (
                <span className={`${queryTrend.isUp ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'} text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1`}>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {queryTrend.isUp ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    )}
                  </svg>
                  {queryTrend.percent}%
                </span>
              )}
              <span className="text-[11px] text-slate-400">
                {totalQueries > 0 ? 'vs previous period' : 'No queries yet'}
              </span>
            </div>
            <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-gradient-to-br from-blue-100 to-indigo-50 rounded-full opacity-50 blur-xl group-hover:scale-110 transition-transform duration-500"></div>
          </div>

          {/* Metric Card 2 - Avg Response Time */}
          <div className="bg-white rounded-[1.25rem] shadow-[0_4px_12px_rgba(0,0,0,0.03)] p-6 flex flex-col justify-between h-40 relative overflow-hidden group hover:shadow-[0_8px_16px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-200">
            <div className="flex items-start justify-between z-10">
              <div className="flex flex-col gap-1">
                <span className="text-[13px] font-medium text-slate-500">Avg Response Time</span>
                <span className="text-3xl font-semibold text-slate-900 tracking-tight">{avgResponseTime}ms</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center">
                <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-auto z-10">
              {avgResponseTime > 0 && responseTrend.percent > 0 && (
                <span className={`${responseTrend.isUp ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'} text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1`}>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {responseTrend.isUp ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    )}
                  </svg>
                  {responseTrend.percent}%
                </span>
              )}
              <span className="text-[11px] text-slate-400">{responseTrend.text}</span>
            </div>
            <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-gradient-to-br from-orange-100 to-yellow-50 rounded-full opacity-50 blur-xl group-hover:scale-110 transition-transform duration-500"></div>
          </div>

          {/* Metric Card 3 - Active Nodes */}
          <div className="bg-white rounded-[1.25rem] shadow-[0_4px_12px_rgba(0,0,0,0.03)] p-6 flex flex-col justify-between h-40 relative overflow-hidden group hover:shadow-[0_8px_16px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-200">
            <div className="flex items-start justify-between z-10">
              <div className="flex flex-col gap-1">
                <span className="text-[13px] font-medium text-slate-500">Active Nodes</span>
                <span className="text-3xl font-semibold text-slate-900 tracking-tight">{activeConnections}/4</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-500 flex items-center justify-center">
                <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                </svg>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-auto z-10">
              <span className={`${activeConnections > 0 ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'} text-[11px] font-semibold px-2 py-0.5 rounded-full`}>
                {activeConnections > 0 ? 'Active' : 'No Connections'}
              </span>
              <span className="text-[11px] text-slate-400">
                {activeConnections > 0 ? 'Connected' : 'Setup required'}
              </span>
            </div>
            <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-gradient-to-br from-purple-100 to-pink-50 rounded-full opacity-50 blur-xl group-hover:scale-110 transition-transform duration-500"></div>
          </div>
        </div>

        {/* Main Chart Section */}
        <div className="bg-white rounded-[1.25rem] shadow-[0_4px_12px_rgba(0,0,0,0.03)] p-1">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Query Volume</h2>
              <p className="text-[12px] text-slate-500">Requests per hour over the last 24 hours</p>
            </div>
            <div className="flex bg-slate-100/80 p-0.5 rounded-lg">
              <button 
                onClick={() => setSelectedTimeRange('24h')}
                className={`px-3 py-1 text-[11px] font-medium rounded-md transition-colors ${
                  selectedTimeRange === '24h' 
                    ? 'bg-white shadow-sm text-slate-900' 
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                24h
              </button>
              <button 
                onClick={() => setSelectedTimeRange('7d')}
                className={`px-3 py-1 text-[11px] font-medium rounded-md transition-colors ${
                  selectedTimeRange === '7d' 
                    ? 'bg-white shadow-sm text-slate-900' 
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                7d
              </button>
              <button 
                onClick={() => setSelectedTimeRange('30d')}
                className={`px-3 py-1 text-[11px] font-medium rounded-md transition-colors ${
                  selectedTimeRange === '30d' 
                    ? 'bg-white shadow-sm text-slate-900' 
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                30d
              </button>
            </div>
          </div>
          <div className="p-6 h-80 w-full relative">
            {chartData.hasData ? (
              <>
                {/* Custom SVG Chart with Real Data */}
                <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 1000 300">
                  <defs>
                    <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#007AFF" stopOpacity="0.15" />
                      <stop offset="100%" stopColor="#007AFF" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {/* Grid Lines */}
                  <line stroke="#f1f5f9" strokeWidth="1" x1="0" x2="1000" y1="299" y2="299" />
                  <line stroke="#f1f5f9" strokeDasharray="4 4" strokeWidth="1" x1="0" x2="1000" y1="225" y2="225" />
                  <line stroke="#f1f5f9" strokeDasharray="4 4" strokeWidth="1" x1="0" x2="1000" y1="150" y2="150" />
                  <line stroke="#f1f5f9" strokeDasharray="4 4" strokeWidth="1" x1="0" x2="1000" y1="75" y2="75" />
                  {/* Area Fill */}
                  <path 
                    d={chartData.areaPathData}
                    fill="url(#chartGradient)" 
                  />
                  {/* Line Stroke */}
                  <path 
                    d={chartData.pathData}
                    fill="none" 
                    stroke="#007AFF" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth="3" 
                  />
                  {/* Interactive Dots */}
                  {chartData.points.map((point: any, idx: number) => (
                    <circle 
                      key={idx}
                      cx={point.x} 
                      cy={point.y} 
                      fill={idx === chartData.points.length - 1 ? "#007AFF" : "white"} 
                      r={idx === chartData.points.length - 1 ? "6" : "4"} 
                      stroke={idx === chartData.points.length - 1 ? "white" : "#007AFF"} 
                      strokeWidth="2"
                    >
                      {idx === chartData.points.length - 1 && (
                        <animate attributeName="r" dur="2s" repeatCount="indefinite" values="6;8;6" />
                      )}
                    </circle>
                  ))}
                </svg>
                {/* Tooltip with Real Data */}
                {tooltipData && (
                  <div 
                    className="absolute bg-white/90 backdrop-blur-md shadow-[0_4px_24px_-1px_rgba(0,0,0,0.06)] rounded-lg px-3 py-2 border border-slate-100"
                    style={{
                      left: `${(tooltipData.x / 1000) * 100}%`,
                      top: `${(tooltipData.y / 300) * 100}%`,
                      transform: 'translate(-50%, -100%)',
                      marginTop: '-10px'
                    }}
                  >
                    <p className="text-[10px] text-slate-500 mb-0.5">{tooltipData.time}</p>
                    <p className="text-[13px] font-bold text-slate-800">{tooltipData.value} queries</p>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <svg className="w-16 h-16 text-slate-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <p className="text-sm text-slate-500 font-medium">No query activity yet</p>
                  <p className="text-xs text-slate-400 mt-1">Start making queries to see the chart</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity List */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-lg font-semibold text-slate-900 tracking-tight">Recent Activity</h3>
            <button onClick={() => window.location.href = '/saved-queries'} className="text-[13px] font-medium text-[#007AFF] hover:text-[#007AFF]/80">View All</button>
          </div>
          <div className="bg-white rounded-[1.25rem] shadow-[0_4px_12px_rgba(0,0,0,0.03)] overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="py-3 px-6 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Query</th>
                  <th className="py-3 px-6 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">User</th>
                  <th className="py-3 px-6 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Time</th>
                  <th className="py-3 px-6 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {/* Render actual data or empty state */}
                {(recentQueriesData?.queries && recentQueriesData.queries.length > 0) ? (
                  recentQueriesData.queries.slice(0, 5).map((item: any, idx: number) => {
                    const statusConfig = {
                      success: { bg: 'bg-indigo-50', text: 'text-indigo-600', badgeBg: 'bg-green-50', badgeText: 'text-green-700', badgeBorder: 'border-green-100', dotBg: 'bg-green-500', icon: 'search', label: 'Success' },
                      blocked: { bg: 'bg-orange-50', text: 'text-orange-600', badgeBg: 'bg-orange-50', badgeText: 'text-orange-700', badgeBorder: 'border-orange-100', dotBg: 'bg-orange-500', icon: 'block', label: 'Blocked' },
                      error: { bg: 'bg-red-50', text: 'text-red-600', badgeBg: 'bg-red-50', badgeText: 'text-red-700', badgeBorder: 'border-red-100', dotBg: 'bg-red-500', icon: 'error', label: 'Failed' }
                    };
                    const config = statusConfig[item.status as keyof typeof statusConfig] || statusConfig.error;
                    
                    // Get user initials
                    const userName = user?.firstName || user?.fullName || 'User';
                    const userInitials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                    
                    return (
                      <tr key={idx} className="group hover:bg-slate-50 transition-colors">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg ${config.bg} ${config.text} flex items-center justify-center shrink-0`}>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                {config.icon === 'search' && (
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                )}
                                {config.icon === 'block' && (
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                )}
                                {config.icon === 'error' && (
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                )}
                              </svg>
                            </div>
                            <span className="text-[13px] font-medium text-slate-900 font-mono truncate max-w-md" title={item.query}>
                              "{item.query}"
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            {user?.imageUrl ? (
                              <img 
                                src={user.imageUrl} 
                                alt={userName}
                                className="w-6 h-6 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-[11px] font-semibold">
                                {userInitials}
                              </div>
                            )}
                            <span className="text-[13px] text-slate-600">{userName}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className="text-[13px] text-slate-500">{item.time}</span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium ${config.badgeBg} ${config.badgeText} border ${config.badgeBorder}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${config.dotBg}`}></span>
                            {config.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4} className="py-12 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <svg className="w-12 h-12 text-slate-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                        </svg>
                        <p className="text-sm text-slate-500 font-medium">No recent queries</p>
                        <p className="text-xs text-slate-400 mt-1">Your query history will appear here</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
