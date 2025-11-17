import React, { useMemo, useState } from 'react';
import { AlertTriangle, Search, Download, FileText } from 'lucide-react';
import { FileResult } from '../hooks/useReconciliation';
import axios from 'axios';
import { useAuth } from '../hooks/useAuth';

interface DiscrepancyReportProps {
  results: FileResult;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

export const DiscrepancyReport: React.FC<DiscrepancyReportProps> = ({ results }) => {
  const [query, setQuery] = useState('');
  const [downloading, setDownloading] = useState<'pdf' | 'xlsx' | null>(null);
  const { token } = useAuth();

  const handleDownload = async (format: 'pdf' | 'xlsx') => {
    if (!token) {
      alert('Please log in to download reports.');
      return;
    }

    setDownloading(format);
    try {
      const response = await axios.post(
        `${API_BASE}/download-report`,
        {
          reference: results.reference || null,
          reportData: results.reference ? null : results, // If no reference, send full data
          format,
        },
        {
          responseType: 'blob',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const filename = results.reference
        ? `reconciliation_${results.reference}.${format}`
        : `reconciliation_${new Date().toISOString().split('T')[0]}.${format}`;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Failed to download report:', err);
      alert('Unable to download the report. Please try again.');
    } finally {
      setDownloading(null);
    }
  };

  const fileRecords = results.records || [];

  const discrepancyRecords = useMemo(() => {
    // Filter for records that are file-only OR database-only (discrepancies only)
    const unmatched = fileRecords.filter(
      (record) =>
        record.source === 'document' || // File-only: in file but not in database
        record.source === 'database' || // Database-only: in database but not in file
        record.status?.toLowerCase().includes('missing in database') ||
        record.status?.toLowerCase().includes('missing in uploaded file')
    );

    if (!query.trim()) return unmatched;

    const normalized = query.trim().toLowerCase();
    return unmatched.filter((record) => {
      const transactionIdMatch = record.transaction_id.toLowerCase().includes(normalized);
      const docDescriptionMatch = record.document_record?.description
        ?.toString()
        .toLowerCase()
        .includes(normalized);
      const dbDescriptionMatch = record.database_record?.description
        ?.toString()
        .toLowerCase()
        .includes(normalized);
      return transactionIdMatch || docDescriptionMatch || dbDescriptionMatch;
    });
  }, [fileRecords, query]);

  const totalRecords = results.fileRecords ?? results.totalRecords ?? fileRecords.length;
  const docOnlyCount =
    results.docOnlyCount ??
    discrepancyRecords.filter((record) => record.source === 'document').length;
  const dbOnlyCount =
    results.dbOnlyCount ??
    fileRecords.filter((record) => record.source === 'database').length;

  const formatCurrency = (value: string | number | undefined) => {
    const parsed = typeof value === 'string' ? parseFloat(value) : value ?? 0;
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: 'GHS',
    }).format(Number.isFinite(parsed) ? parsed : 0);
  };

  const getDocumentAmount = (record: typeof fileRecords[number]) => {
    // For file-only records, use document values
    if (record.document_record) {
      if (record.document_record.debit_amount) {
        return -Math.abs(Number(record.document_record.debit_amount));
      }
      if (record.document_record.credit_amount) {
        return Math.abs(Number(record.document_record.credit_amount));
      }
      return Number(record.document_net || 0);
    }
    // For database-only records, use database values
    if (record.database_record) {
      if (record.database_record.debit_amount) {
        return -Math.abs(Number(record.database_record.debit_amount));
      }
      if (record.database_record.credit_amount) {
        return Math.abs(Number(record.database_record.credit_amount));
      }
      return Number(record.database_net || 0);
    }
    return Number(record.document_net || record.database_net || 0);
  };

  const getRecordDate = (record: typeof fileRecords[number]) => {
    if (record.document_record?.transaction_date) {
      return new Date(record.document_record.transaction_date).toLocaleDateString('en-GB');
    }
    if (record.database_record?.transaction_date) {
      return new Date(record.database_record.transaction_date).toLocaleDateString('en-GB');
    }
    return '—';
  };

  const getRecordDescription = (record: typeof fileRecords[number]) => {
    return record.document_record?.description || record.database_record?.description || '—';
  };

  const getRecordStatus = (record: typeof fileRecords[number]) => {
    if (record.source === 'document') {
      return { text: 'Missing in database', className: 'bg-rose-100 text-rose-800' };
    }
    if (record.source === 'database') {
      return { text: 'Missing in uploaded file', className: 'bg-blue-100 text-blue-800' };
    }
    if (record.status?.toLowerCase().includes('missing in database')) {
      return { text: 'Missing in database', className: 'bg-rose-100 text-rose-800' };
    }
    if (record.status?.toLowerCase().includes('missing in uploaded file')) {
      return { text: 'Missing in uploaded file', className: 'bg-blue-100 text-blue-800' };
    }
    return { text: 'Discrepancy', className: 'bg-yellow-100 text-yellow-800' };
  };

  return (
    <div className="bg-white rounded-2xl shadow-floating border border-npontu-200 overflow-hidden">
      <div className="bg-gradient-to-r from-purple-600 to-indigo-700 p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm opacity-80">Reconciliation Report</p>
            <h3 className="text-2xl font-semibold font-display">Unmatched Transactions</h3>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm opacity-70">Generated</p>
              <p className="font-mono text-lg">{new Date(results.timestamp).toLocaleString('en-GB')}</p>
            </div>
            <div className="flex gap-2 ml-4">
              <button
                onClick={() => handleDownload('pdf')}
                disabled={downloading === 'pdf'}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-white/20 hover:bg-white/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Download PDF Report"
              >
                {downloading === 'pdf' ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Downloading...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    PDF
                  </>
                )}
              </button>
              <button
                onClick={() => handleDownload('xlsx')}
                disabled={downloading === 'xlsx'}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-white/20 hover:bg-white/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Download Excel Report"
              >
                {downloading === 'xlsx' ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Downloading...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4 mr-2" />
                    Excel
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
            <p className="text-xs uppercase tracking-wide text-slate-500">Uploaded File Records</p>
            <p className="text-3xl font-semibold text-slate-900 mt-1">{totalRecords.toLocaleString()}</p>
          </div>
          <div className="rounded-xl border border-rose-200 p-4 bg-rose-50">
            <p className="text-xs uppercase tracking-wide text-rose-700">
              File-only (missing in database)
            </p>
            <p className="text-3xl font-semibold text-rose-800 mt-1">{docOnlyCount.toLocaleString()}</p>
          </div>
          <div className="rounded-xl border border-blue-200 p-4 bg-blue-50">
            <p className="text-xs uppercase tracking-wide text-blue-700">
              Database-only (not in file)
            </p>
            <p className="text-3xl font-semibold text-blue-800 mt-1">{dbOnlyCount.toLocaleString()}</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center w-full sm:w-80 border border-slate-200 rounded-xl overflow-hidden">
            <Search className="w-5 h-5 text-slate-500 ml-3" />
            <label htmlFor="discrepancy-search" className="sr-only">
              Filter discrepancies by Transaction ID or description
            </label>
            <input
              type="text"
              id="discrepancy-search"
              name="discrepancySearch"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter by Transaction ID or description"
              className="flex-1 px-3 py-2 text-sm focus:outline-none"
              aria-label="Filter discrepancies by Transaction ID or description"
            />
          </div>
          <div className="text-sm text-slate-500">
            Showing {discrepancyRecords.length.toLocaleString()} discrepancy record{discrepancyRecords.length !== 1 ? 's' : ''} ({docOnlyCount.toLocaleString()} file-only, {dbOnlyCount.toLocaleString()} database-only)
          </div>
        </div>

        {discrepancyRecords.length === 0 ? (
          <div className="border border-emerald-200 rounded-xl bg-emerald-50 p-6 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-white flex items-center justify-center mb-3">
              <AlertTriangle className="w-6 h-6 text-emerald-500" />
            </div>
            <p className="text-lg font-semibold text-emerald-700">No discrepancies detected</p>
            <p className="text-sm text-emerald-600">All uploaded records were found in the database.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-100 text-slate-600">
                  <th className="px-4 py-3 font-semibold">Transaction ID</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Amount</th>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Description</th>
                </tr>
              </thead>
              <tbody>
                {discrepancyRecords.map((record) => {
                  const status = getRecordStatus(record);
                  return (
                    <tr key={record.transaction_id} className="border-b border-slate-100">
                      <td className="px-4 py-3 font-semibold text-slate-900">{record.transaction_id}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${status.className}`}>
                          {status.text}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-900">{formatCurrency(getDocumentAmount(record))}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {getRecordDate(record)}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {getRecordDescription(record)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

