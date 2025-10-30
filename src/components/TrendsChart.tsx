import React, { useState, useEffect, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

interface TrendData {
  date: string;
  discrepancies: number;
  total_records: number;
  discrepancy_rate: number;
  total_debit_variance: number;
  total_credit_variance: number;
  net_variance: number;
}

interface TrendsChartProps {
  darkMode: boolean;
}

export const TrendsChart: React.FC<TrendsChartProps> = ({ darkMode }) => {
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState(30);
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');

  useEffect(() => {
    fetchTrendData();
  }, [period]);

  // Memoize data processing to avoid unnecessary re-renders
  const processedData = useMemo(() => {
    return trendData.map(item => ({
      ...item,
      date: new Date(item.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      })
    }));
  }, [trendData]);

  const fetchTrendData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/discrepancy-trends?period=${period}`);
      setTrendData(response.data);
      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch trend data:', err);
      setError('Failed to load trend data');
    } finally {
      setLoading(false);
    }
  };

  const formatTooltipValue = (value: number, name: string) => {
    if (name === 'discrepancy_rate') {
      return [`${value}%`, 'Discrepancy Rate'];
    }
    if (name.includes('variance')) {
      return [`$${value.toFixed(2)}`, name.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())];
    }
    return [value, name.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())];
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border rounded-lg p-3 shadow-lg`}>
          <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            Date: {new Date(label).toLocaleDateString()}
          </p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {formatTooltipValue(entry.value, entry.dataKey)[1]}: {formatTooltipValue(entry.value, entry.dataKey)[0]}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-center py-8 ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
        <p>{error}</p>
        <button
          onClick={fetchTrendData}
          className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (trendData.length === 0) {
    return (
      <div className={`text-center py-8 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
        <p>No trend data available. Run more reconciliations to see trends.</p>
      </div>
    );
  }

  return (
    <div className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} rounded-xl border shadow-lg p-6`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            Discrepancy Trends
          </h3>
          <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            Track reconciliation discrepancies over time
          </p>
        </div>

        <div className="flex gap-3">
          <select
            value={period}
            onChange={(e) => setPeriod(Number(e.target.value))}
            className={`px-3 py-1 border rounded-lg text-sm ${
              darkMode
                ? 'bg-slate-700 border-slate-600 text-white'
                : 'bg-white border-slate-300 text-slate-900'
            }`}
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>

          <select
            value={chartType}
            onChange={(e) => setChartType(e.target.value as 'line' | 'bar')}
            className={`px-3 py-1 border rounded-lg text-sm ${
              darkMode
                ? 'bg-slate-700 border-slate-600 text-white'
                : 'bg-white border-slate-300 text-slate-900'
            }`}
          >
            <option value="line">Line Chart</option>
            <option value="bar">Bar Chart</option>
          </select>
        </div>
      </div>

      <div className="h-80" style={{ minHeight: '320px' }}>
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
          {chartType === 'line' ? (
            <LineChart data={trendData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={darkMode ? '#475569' : '#e2e8f0'}
              />
              <XAxis
                dataKey="date"
                stroke={darkMode ? '#cbd5e0' : '#64748b'}
                fontSize={12}
                tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              />
              <YAxis
                stroke={darkMode ? '#cbd5e0' : '#64748b'}
                fontSize={12}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line
                type="monotone"
                dataKey="discrepancies"
                stroke="#ef4444"
                strokeWidth={2}
                name="Discrepancies"
                dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="discrepancy_rate"
                stroke="#f59e0b"
                strokeWidth={2}
                name="Discrepancy Rate (%)"
                dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          ) : (
            <BarChart data={trendData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={darkMode ? '#475569' : '#e2e8f0'}
              />
              <XAxis
                dataKey="date"
                stroke={darkMode ? '#cbd5e0' : '#64748b'}
                fontSize={12}
                tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              />
              <YAxis
                stroke={darkMode ? '#cbd5e0' : '#64748b'}
                fontSize={12}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar
                dataKey="discrepancies"
                fill="#ef4444"
                name="Discrepancies"
                radius={[2, 2, 0, 0]}
              />
              <Bar
                dataKey="total_records"
                fill="#3b82f6"
                name="Total Records"
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={`p-3 ${darkMode ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-200'} border rounded-lg`}>
          <p className={`text-xs font-medium ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Average Discrepancies</p>
          <p className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            {trendData.length > 0 ? (trendData.reduce((sum, d) => sum + d.discrepancies, 0) / trendData.length).toFixed(1) : '0'}
          </p>
        </div>

        <div className={`p-3 ${darkMode ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-200'} border rounded-lg`}>
          <p className={`text-xs font-medium ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Average Discrepancy Rate</p>
          <p className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            {trendData.length > 0 ? (trendData.reduce((sum, d) => sum + d.discrepancy_rate, 0) / trendData.length).toFixed(1) : '0'}%
          </p>
        </div>

        <div className={`p-3 ${darkMode ? 'bg-slate-700 border-slate-600' : 'bg-slate-200'} border rounded-lg`}>
          <p className={`text-xs font-medium ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Total Reports</p>
          <p className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            {trendData.length}
          </p>
        </div>
      </div>
    </div>
  );
};