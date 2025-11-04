import React, { useState, useEffect, Suspense, lazy } from 'react';
import axios from 'axios';
import { Activity, X, FileText, CheckCircle2, TrendingUp, BarChart3, ChevronDown, ChevronUp } from 'lucide-react';
import { HistoryItem } from '../hooks/useReconciliation';

// Lazy load TrendsChart
const TrendsChart = lazy(() => import('./TrendsChart').then(module => ({ default: module.TrendsChart })));

const API_BASE = 'http://127.0.0.1:8001/api';

interface ReconciliationReport {
  id: number;
  reference: string;
  reconciliation_date: string;
  total_records: number;
  matched_records: number;
  discrepancies: number;
  total_debit: number;
  total_credit: number;
  net_change: number;
  status: string;
  created_at: string;
}

interface HistoryPanelProps {
  showHistory: boolean;
  setShowHistory: (show: boolean) => void;
  comparisonHistory: HistoryItem[];
  darkMode: boolean;
  formatCurrency: (value: number) => string;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({
  showHistory: panelVisible,
  setShowHistory: setPanelVisible,
  comparisonHistory,
  darkMode,
  formatCurrency,
}) => {
  const [showTrends, setShowTrends] = useState(false);
  const [showHistoryList, setShowHistoryList] = useState(true);
  const [reports, setReports] = useState<ReconciliationReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [perPage] = useState(10);

  useEffect(() => {
    if (panelVisible) {
      fetchReports();
    }
  }, [panelVisible]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.append('page', currentPage.toString());
      params.append('per_page', perPage.toString());

      const response = await axios.get(`${API_BASE}/reports?${params}`);
      setReports(response.data.data || []);
      setTotalPages(response.data.last_page || 1);
    } catch (err: any) {
      console.error('Failed to fetch reports:', err);
      setError('Failed to load reconciliation history');
    } finally {
      setLoading(false);
    }
  };

  if (!panelVisible) return null;

  return (
    <div className={`mb-6 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} rounded-xl border shadow-lg p-6 backdrop-blur-sm animate-in slide-in-from-top-4 duration-300`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowHistoryList(!showHistoryList)}
            className={`p-2 rounded-lg transition-colors hover:scale-105 ${
              darkMode ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
            }`}
            title={showHistoryList ? 'Collapse History' : 'Expand History'}
          >
            {showHistoryList ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
          <h3 className={`text-xl font-bold flex items-center gap-3 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            <div className="p-2 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg animate-pulse">
              <Activity className="w-5 h-5 text-white" />
            </div>
            Reconciliation History (Page {currentPage} of {totalPages})
          </h3>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowTrends(!showTrends)}
            className={`p-2 rounded-lg transition-colors hover:scale-105 ${
              showTrends
                ? 'bg-blue-600 text-white'
                : darkMode
                  ? 'hover:bg-slate-700 text-slate-400'
                  : 'hover:bg-slate-100 text-slate-600'
            }`}
            title={showTrends ? 'Hide Trends' : 'Show Trends'}
          >
            <TrendingUp className="w-5 h-5" />
          </button>
          <button onClick={() => setPanelVisible(false)} className={`p-2 rounded-lg transition-colors hover:scale-105 ${darkMode ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-600'}`}>
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
      {showHistoryList && (
        <div className="space-y-3 mb-6">
          {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
            <p className={`${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Loading reconciliation history...</p>
          </div>
        ) : error ? (
          <div className={`text-center py-8 ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
            <p>{error}</p>
            <button
              onClick={fetchReports}
              className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        ) : reports.length === 0 ? (
          <div className={`text-center py-8 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            <Activity className="w-12 h-12 mx-auto mb-3 opacity-50 animate-bounce" />
            <p>No reconciliation history available</p>
          </div>
        ) : (
          <>
            {reports.map((report, index) => (
              <div key={report.id} className={`flex items-center justify-between p-4 ${darkMode ? 'bg-slate-700/50 hover:bg-slate-700' : 'bg-slate-50 hover:bg-slate-100'} rounded-lg transition-all duration-200 cursor-pointer border ${darkMode ? 'border-slate-600' : 'border-slate-200'} hover:shadow-md hover:scale-[1.02] animate-in slide-in-from-left-4 duration-500`} style={{ animationDelay: `${index * 100}ms` }}>
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="p-2 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-sm">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className={`font-semibold text-sm truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>{report.reference}</div>
                    <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                      {new Date(report.reconciliation_date).toLocaleDateString()} • {report.total_records} records
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                  <div className="text-right">
                    <div className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{formatCurrency(Math.abs(report.net_change))}</div>
                    <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{report.discrepancies} discrepancies</div>
                  </div>
                  <CheckCircle2 className="w-5 h-5 text-green-600 animate-pulse" />
                </div>
              </div>
            ))}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-slate-200">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    currentPage === 1
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  Previous
                </button>

                <span className={`text-sm px-3 py-1 rounded-md ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                  Page {currentPage} of {totalPages}
                </span>

                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    currentPage === totalPages
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
        </div>
      )}

      {showTrends && (
        <div className="mt-6">
          <Suspense fallback={
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          }>
            <TrendsChart darkMode={darkMode} />
          </Suspense>
        </div>
      )}
    </div>
  );
};