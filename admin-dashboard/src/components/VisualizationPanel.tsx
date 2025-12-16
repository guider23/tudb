import { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { BarChart3, LineChart as LineChartIcon, PieChart as PieChartIcon, TrendingUp, Download } from 'lucide-react';

interface VisualizationPanelProps {
  data: any[];
  columns: string[];
}

type ChartType = 'bar' | 'line' | 'pie' | 'area' | 'scatter';

const COLORS = ['#007AFF', '#34C759', '#FF9500', '#FF3B30', '#AF52DE', '#5856D6', '#00C7BE', '#FF2D55'];

export default function VisualizationPanel({ data, columns }: VisualizationPanelProps) {
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [xAxis, setXAxis] = useState<string>(columns[0] || '');
  const [yAxis, setYAxis] = useState<string>(columns[1] || '');

  // Detect column types (numeric, date, string)
  const columnTypes = useMemo(() => {
    if (!data.length) return {};
    
    const types: Record<string, 'number' | 'date' | 'string'> = {};
    const sample = data[0];
    
    columns.forEach(col => {
      const value = sample[col];
      if (typeof value === 'number') {
        types[col] = 'number';
      } else if (value && !isNaN(Date.parse(value))) {
        types[col] = 'date';
      } else {
        types[col] = 'string';
      }
    });
    
    return types;
  }, [data, columns]);

  // Auto-suggest best chart type
  const suggestedChart = useMemo(() => {
    if (!xAxis || !yAxis) return 'bar';
    
    const xType = columnTypes[xAxis];
    const yType = columnTypes[yAxis];
    
    if (xType === 'date' && yType === 'number') return 'line';
    if (xType === 'string' && yType === 'number' && data.length <= 10) return 'pie';
    if (xType === 'number' && yType === 'number') return 'scatter';
    return 'bar';
  }, [xAxis, yAxis, columnTypes, data.length]);

  // Format chart data
  const chartData = useMemo(() => {
    if (!xAxis || !yAxis) return [];
    
    return data.map(row => ({
      name: String(row[xAxis]),
      value: Number(row[yAxis]) || 0,
      x: Number(row[xAxis]) || 0,
      y: Number(row[yAxis]) || 0,
    }));
  }, [data, xAxis, yAxis]);

  // Export chart as PNG
  const handleExport = () => {
    const chartElement = document.getElementById('visualization-chart');
    if (!chartElement) return;

    import('html-to-image').then(({ toPng }) => {
      toPng(chartElement, { backgroundColor: 'white' })
        .then(dataUrl => {
          const link = document.createElement('a');
          link.download = `chart-${Date.now()}.png`;
          link.href = dataUrl;
          link.click();
        })
        .catch(err => {
          console.error('Export failed:', err);
          alert('Failed to export chart');
        });
    });
  };

  const renderChart = () => {
    if (!chartData.length) {
      return (
        <div className="flex items-center justify-center h-96 text-[#86868B]">
          <div className="text-center">
            <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-sm">No data available for visualization</p>
          </div>
        </div>
      );
    }

    const commonProps = {
      data: chartData,
      margin: { top: 20, right: 30, left: 20, bottom: 60 },
    };

    switch (chartType) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E5EA" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} stroke="#86868B" fontSize={12} />
              <YAxis stroke="#86868B" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid rgba(0, 0, 0, 0.06)',
                  borderRadius: '12px',
                  padding: '12px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                }}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Bar dataKey="value" fill="#007AFF" radius={[8, 8, 0, 0]}>
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E5EA" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} stroke="#86868B" fontSize={12} />
              <YAxis stroke="#86868B" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid rgba(0, 0, 0, 0.06)',
                  borderRadius: '12px',
                  padding: '12px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                }}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Line type="monotone" dataKey="value" stroke="#007AFF" strokeWidth={3} dot={{ fill: '#007AFF', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                outerRadius={120}
                fill="#007AFF"
                dataKey="value"
              >
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid rgba(0, 0, 0, 0.06)',
                  borderRadius: '12px',
                  padding: '12px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'area':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart {...commonProps}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#007AFF" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#007AFF" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E5EA" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} stroke="#86868B" fontSize={12} />
              <YAxis stroke="#86868B" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid rgba(0, 0, 0, 0.06)',
                  borderRadius: '12px',
                  padding: '12px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                }}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Area type="monotone" dataKey="value" stroke="#007AFF" strokeWidth={2} fillOpacity={1} fill="url(#colorValue)" />
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'scatter':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E5EA" />
              <XAxis type="number" dataKey="x" name={xAxis} stroke="#86868B" fontSize={12} />
              <YAxis type="number" dataKey="y" name={yAxis} stroke="#86868B" fontSize={12} />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid rgba(0, 0, 0, 0.06)',
                  borderRadius: '12px',
                  padding: '12px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                }}
              />
              <Scatter name={yAxis} data={chartData} fill="#007AFF" />
            </ScatterChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  const chartTypes: { type: ChartType; icon: any; label: string }[] = [
    { type: 'bar', icon: BarChart3, label: 'Bar Chart' },
    { type: 'line', icon: LineChartIcon, label: 'Line Chart' },
    { type: 'pie', icon: PieChartIcon, label: 'Pie Chart' },
    { type: 'area', icon: TrendingUp, label: 'Area Chart' },
    { type: 'scatter', icon: TrendingUp, label: 'Scatter Plot' },
  ];

  return (
    <div className="space-y-6">
      {/* Chart Type Selector - macOS Style */}
      <div
        className="p-6 rounded-[20px] border border-black/[0.06]"
        style={{
          background: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.1)',
        }}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-[22px] font-semibold text-[#111111] mb-1">Visualization</h3>
            <p className="text-sm text-[#86868B]">
              Suggested: <span className="font-medium text-[#007AFF] capitalize">{suggestedChart}</span>
            </p>
          </div>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-[#007AFF] text-white rounded-[22px] text-sm font-medium hover:bg-[#0051D5] active:scale-95 transition-all shadow-lg"
          >
            <Download className="w-4 h-4" />
            Export PNG
          </button>
        </div>

        {/* Chart Type Buttons */}
        <div className="flex gap-2 mb-6">
          {chartTypes.map(({ type, icon: Icon, label }) => (
            <button
              key={type}
              onClick={() => setChartType(type)}
              className={`flex items-center gap-2 px-4 py-2 rounded-[22px] text-sm font-medium transition-all ${
                chartType === type
                  ? 'bg-[#007AFF] text-white shadow-lg'
                  : 'bg-black/5 text-[#111111] hover:bg-black/10'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Axis Selectors */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-[#111111] mb-2">X-Axis</label>
            <select
              value={xAxis}
              onChange={(e) => setXAxis(e.target.value)}
              className="w-full px-4 py-2 bg-white border border-black/10 rounded-[12px] text-sm text-[#111111] focus:ring-2 focus:ring-[#007AFF]/30 focus:border-[#007AFF] transition-all"
            >
              {columns.map(col => (
                <option key={col} value={col}>{col}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#111111] mb-2">Y-Axis</label>
            <select
              value={yAxis}
              onChange={(e) => setYAxis(e.target.value)}
              className="w-full px-4 py-2 bg-white border border-black/10 rounded-[12px] text-sm text-[#111111] focus:ring-2 focus:ring-[#007AFF]/30 focus:border-[#007AFF] transition-all"
            >
              {columns.map(col => (
                <option key={col} value={col}>{col}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Chart Display */}
      <div
        id="visualization-chart"
        className="p-8 rounded-[20px] border border-black/[0.06]"
        style={{
          background: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.1)',
        }}
      >
        {renderChart()}
      </div>
    </div>
  );
}
