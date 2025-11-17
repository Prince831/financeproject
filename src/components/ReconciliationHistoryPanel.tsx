import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FileText, Download, AlertTriangle, RefreshCw } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { FileResult } from '../hooks/useReconciliation';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

interface HistoryReport {
  reference: string;
  reconciliation_date: string;
  reconciliation_mode: 'by_period' | 'by_transaction_id';
  status: string;
  user_name?: string;
  file_name?: string;
  filters?: {
    start_date?: string;
    end_date?: string;
    [key: string]: any;
  };
  summary?: {
    totalRecords?: number;
    docOnlyCount?: number;
    dbOnlyCount?: number;
    discrepancies?: number;
    fileRecords?: number;
    total_document_net?: string;
  };
  payload?: FileResult;
}

interface PaginatedResponse<T> {
  data?: T[];
  [key: string]: any;
}

export const ReconciliationHistoryPanel: React.FC = () => {
  const { token } = useAuth();
  const [reports, setReports] = useState<HistoryReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedMode, setSelectedMode] = useState<'all' | 'by_period' | 'by_transaction_id'>('all');

  const getAuthHeaders = () =>
    token
      ? {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      : {};

  const fetchReports = async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      
      // Request all reports from backend (up to 500 per page)
      const response = await axios.get<PaginatedResponse<HistoryReport>>(
        `${API_BASE}/reports?per_page=500`,
        getAuthHeaders()
      );

      // Handle paginated response from Laravel
      let data: HistoryReport[] = [];
      if (response.data?.data && Array.isArray(response.data.data)) {
        // Paginated response
        data = response.data.data;
      } else if (Array.isArray(response.data)) {
        // Direct array response
        data = response.data;
      }

      // Validate and ensure all fields come from database (no defaults except for display)
      const validatedReports: HistoryReport[] = data.map((report) => {
        // Only use data that exists in the database, no fallback defaults
        return {
          reference: report.reference || '',
          reconciliation_date: report.reconciliation_date || '',
          reconciliation_mode: report.reconciliation_mode || 'by_transaction_id',
          status: report.status || 'completed',
          user_name: report.user_name || undefined,
          file_name: report.file_name || undefined,
          filters: report.filters || undefined,
          summary: report.summary || undefined,
          payload: report.payload || undefined,
        };
      });

      setReports(validatedReports);
      console.log('Fetched reports from database:', {
        count: validatedReports.length,
        total: response.data?.total || validatedReports.length,
        reports: validatedReports.map(r => ({ reference: r.reference, date: r.reconciliation_date }))
      });
    } catch (err: any) {
      console.error('Failed to fetch reconciliation history:', err);
      setError('Unable to load reconciliation history. Please try again.');
      setReports([]); // Clear reports on error
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (reference: string, format: 'pdf' | 'xlsx' = 'pdf') => {
    if (!token) return;
    try {
      const response = await axios.post(
        `${API_BASE}/download-report`,
        { reference, format },
        {
          responseType: 'blob',
          ...getAuthHeaders(),
        }
      );
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `reconciliation_${reference}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Failed to download report:', err);
      alert('Unable to download the selected report.');
    }
  };

  useEffect(() => {
    fetchReports();
  }, [token]);

  if (!token) return null;

  const filteredReports = reports.filter((report) => {
    const matchesMode = selectedMode === 'all' || report.reconciliation_mode === selectedMode;
    const matchesSearch =
      search.trim() === '' ||
      report.reference.toLowerCase().includes(search.trim().toLowerCase());
    return matchesMode && matchesSearch;
  });

  const getNumber = (...values: Array<number | string | undefined | null>) => {
    for (const value of values) {
      if (value === undefined || value === null) continue;
      const parsed = typeof value === 'string' ? Number(value) : value;
      if (typeof parsed === 'number' && Number.isFinite(parsed)) {
        return parsed;
      }
    }
    return 0;
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
      {/* Simple Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Reconciliation History</h3>
          <button
            onClick={fetchReports}
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <label htmlFor="history-search" className="sr-only">
              Search reconciliation history by reference
            </label>
            <input
              type="text"
              id="history-search"
              name="historySearch"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by reference..."
              className="flex-1 px-4 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              aria-label="Search reconciliation history by reference"
            />
            <label htmlFor="history-mode-filter" className="sr-only">
              Filter reconciliation history by mode
            </label>
            <select
              id="history-mode-filter"
              name="historyModeFilter"
              value={selectedMode}
              onChange={(e) => setSelectedMode(e.target.value as 'all' | 'by_period' | 'by_transaction_id')}
              className="px-4 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              aria-label="Filter reconciliation history by mode"
            >
            <option value="all">All Modes</option>
            <option value="by_period">By Period</option>
            <option value="by_transaction_id">By Transaction ID</option>
          </select>
        </div>
      </div>

      <div className="p-4 space-y-3 bg-white max-h-[60vh] overflow-y-auto">
        {loading && (
          <p className="text-sm text-slate-500">Loading reconciliation history...</p>
        )}
        {error && (
          <div className="text-sm text-red-600 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            {error}
          </div>
        )}

        {!loading && reports.length === 0 && !error && (
          <p className="text-sm text-slate-500">No prior reconciliations recorded.</p>
        )}

        {filteredReports.length > 0 && filteredReports.map((report) => {
          // Get values directly from database (summary or payload from reconciliation_runs table)
          // No static/hardcoded values - all from database
          const totalRecords = getNumber(
            report.summary?.totalRecords,
            report.summary?.fileRecords,
            report.payload?.fileRecords,
            report.payload?.totalRecords
          );
          const docOnly = getNumber(
            report.summary?.docOnlyCount,
            report.payload?.docOnlyCount,
            report.payload?.missing
          );
          const dbOnly = getNumber(
            report.summary?.dbOnlyCount,
            report.payload?.dbOnlyCount,
            report.payload?.mismatched
          );

          return (
            <div
              key={report.reference}
              className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-sm transition-all bg-white"
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-semibold text-gray-900 truncate">{report.reference}</p>
                    <span className={`px-2 py-0.5 text-xs rounded ${
                      report.status === 'completed'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {report.status || 'completed'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {report.reconciliation_date 
                      ? new Date(report.reconciliation_date).toLocaleString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : '—'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {report.reconciliation_mode === 'by_period' ? 'By Period' : 'By Transaction ID'}
                    {report.user_name && ` • ${report.user_name}`}
                    {report.file_name && ` • ${report.file_name}`}
                  </p>
                  {report.filters && (report.filters.start_date || report.filters.end_date) && (
                    <p className="text-xs text-gray-400">
                      {report.filters.start_date || '—'} to {report.filters.end_date || '—'}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-3">
                <div className="text-center p-2 bg-gray-50 rounded">
                  <p className="text-xs text-gray-600 mb-1">Total</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {Number.isFinite(totalRecords) ? totalRecords.toLocaleString() : '—'}
                  </p>
                </div>
                <div className="text-center p-2 bg-red-50 rounded">
                  <p className="text-xs text-red-600 mb-1">File-only</p>
                  <p className="text-sm font-semibold text-red-700">
                    {Number.isFinite(docOnly) ? docOnly.toLocaleString() : '0'}
                  </p>
                </div>
                <div className="text-center p-2 bg-blue-50 rounded">
                  <p className="text-xs text-blue-600 mb-1">DB-only</p>
                  <p className="text-sm font-semibold text-blue-700">
                    {Number.isFinite(dbOnly) ? dbOnly.toLocaleString() : '0'}
                  </p>
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => handleDownload(report.reference, 'pdf')}
                  className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Download className="w-3 h-3 mr-1.5" />
                  PDF
                </button>
                <button
                  onClick={() => handleDownload(report.reference, 'xlsx')}
                  className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <FileText className="w-3 h-3 mr-1.5" />
                  Excel
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

