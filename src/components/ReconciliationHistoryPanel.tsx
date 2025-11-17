import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Clock, FileText, Download, AlertTriangle, RefreshCw } from 'lucide-react';
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
      const response = await axios.get<PaginatedResponse<HistoryReport>>(
        `${API_BASE}/reports`,
        getAuthHeaders()
      );

      const data = Array.isArray(response.data)
        ? response.data
        : response.data.data || [];
      setReports(data);
    } catch (err: any) {
      console.error('Failed to fetch reconciliation history:', err);
      setError('Unable to load reconciliation history.');
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
    <div className="bg-white rounded-3xl shadow-2xl border border-blue-50 overflow-hidden">
      <div className="bg-gradient-to-r from-npontu-600 to-blue-600 p-6 text-white">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/70">History</p>
              <h3 className="text-2xl font-semibold font-display">Previous Reconciliations</h3>
            </div>
            <button
              onClick={fetchReports}
              className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide bg-white/15 hover:bg-white/25 px-4 py-2 rounded-xl transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label className="text-xs uppercase tracking-wider text-white/70 mb-1 block">
                Search by Reference
              </label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="e.g. TXN-2024-00045"
                className="w-full px-4 py-3 text-sm rounded-2xl border border-white/30 bg-white/15 placeholder:text-white/70 focus:outline-none focus:ring-2 focus:ring-white/60"
              />
            </div>
            <div className="w-full sm:w-48">
              <label className="text-xs uppercase tracking-wider text-white/70 mb-1 block">Mode</label>
              <select
                value={selectedMode}
                onChange={(e) => setSelectedMode(e.target.value as 'all' | 'by_period' | 'by_transaction_id')}
                className="w-full px-4 py-3 text-sm rounded-2xl border border-white/30 bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/60"
              >
                <option value="all">All</option>
                <option value="by_period">By Period</option>
                <option value="by_transaction_id">By Transaction ID</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-5 bg-white">
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

        {filteredReports.slice(0, 6).map((report) => {
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
          const documentNet =
            report.summary?.total_document_net ??
            report.payload?.summary?.total_document_net ??
            report.payload?.summary?.total_document_net ??
            '—';
          const topDiscrepancyRecord = report.payload?.records?.[0];

          return (
            <div
              key={report.reference}
              className="border border-slate-100 rounded-2xl p-5 space-y-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center">
                    <Clock className="w-6 h-6 text-npontu-600" />
                  </div>
                <div>
                    <p className="text-xs uppercase tracking-wider text-slate-500">{report.reference}</p>
                    <p className="text-base font-semibold text-slate-900">
                      {new Date(report.reconciliation_date).toLocaleString('en-GB')}
                    </p>
                    <p className="text-xs text-slate-500">
                      {report.reconciliation_mode === 'by_period' ? 'By Period' : 'By Transaction ID'}
                    </p>
                  <p className="text-xs text-slate-400">
                    {report.user_name ? `By ${report.user_name}` : ' '}
                    {report.file_name ? ` • ${report.file_name}` : ''}
                  </p>
                  {(report.filters?.start_date || report.filters?.end_date) && (
                    <p className="text-xs text-slate-400">
                      Range: {report.filters?.start_date || '—'} → {report.filters?.end_date || '—'}
                    </p>
                  )}
                  </div>
                </div>
                <span
                  className={`inline-flex items-center justify-center px-3 py-1 text-xs font-semibold rounded-full ${
                    report.status === 'completed'
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-amber-50 text-amber-700'
                  }`}
                >
                  {report.status?.replace('_', ' ') || 'completed'}
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs uppercase tracking-wide text-slate-400">File Records</p>
                  <p className="text-lg font-semibold text-slate-900">
                    {Number.isFinite(totalRecords) ? totalRecords.toLocaleString() : '—'}
                  </p>
                </div>
                <div className="bg-rose-50 rounded-xl p-3">
                  <p className="text-xs uppercase tracking-wide text-rose-600/70">File-only (missing in DB)</p>
                  <p className="text-lg font-semibold text-rose-600">
                    {Number.isFinite(docOnly) ? docOnly.toLocaleString() : '0'}
                  </p>
                </div>
                <div className="bg-blue-50 rounded-xl p-3">
                  <p className="text-xs uppercase tracking-wide text-blue-600/70">Database-only</p>
                  <p className="text-lg font-semibold text-blue-700">
                    {Number.isFinite(dbOnly) ? dbOnly.toLocaleString() : '0'}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Document Net</p>
                  <p className="text-lg font-semibold text-slate-900">
                    {documentNet}
                  </p>
                </div>
              </div>

              {topDiscrepancyRecord && (
                <div className="text-xs text-slate-500 bg-slate-50 rounded-xl p-3">
                  Top discrepancy:{' '}
                  <span className="font-semibold">{topDiscrepancyRecord.transaction_id}</span>
                  {topDiscrepancyRecord.discrepancy_count
                    ? ` (${topDiscrepancyRecord.discrepancy_count} mismatched fields)`
                    : null}
                </div>
              )}

              <div className="flex flex-wrap gap-3 justify-end">
                <button
                  onClick={() => handleDownload(report.reference, 'pdf')}
                  className="inline-flex items-center px-4 py-2.5 text-sm font-medium text-white bg-npontu-600 rounded-xl hover:bg-npontu-700 transition-colors"
                >
                  <Download className="w-4 h-4 mr-2" />
                  PDF
                </button>
                <button
                  onClick={() => handleDownload(report.reference, 'xlsx')}
                  className="inline-flex items-center px-4 py-2.5 text-sm font-medium text-npontu-700 border border-npontu-200 rounded-xl hover:bg-npontu-50 transition-colors"
                >
                  <FileText className="w-4 h-4 mr-2" />
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

