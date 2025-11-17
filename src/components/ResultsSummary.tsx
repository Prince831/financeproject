import React, { useState } from 'react';
import axios from 'axios';
import { Calculator, Database, CheckCircle2, AlertTriangle, TrendingUp, Download, FileJson, Mail } from 'lucide-react';
import { FileResult } from '../hooks/useReconciliation';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

interface ResultsSummaryProps {
  results: FileResult;
  darkMode: boolean;
  selectedTab: string;
  setSelectedTab: (tab: string) => void;
  reportFormat: string;
  setReportFormat: (format: string) => void;
  exportFormat: string;
  setExportFormat: (format: string) => void;
  isDownloading: boolean;
  onDownloadReport: (format: string) => void;
  onExportData: () => void;
  onEmailReport: () => void;
  formatCurrency: (value: number) => string;
  reconciliationMode?: 'by_period' | 'by_transaction_id';
}

export const ResultsSummary: React.FC<ResultsSummaryProps> = ({
  results,
  darkMode,
  selectedTab,
  setSelectedTab,
  reportFormat,
  setReportFormat,
  exportFormat,
  setExportFormat,
  isDownloading,
  onDownloadReport,
  onExportData,
  onEmailReport,
  formatCurrency,
  reconciliationMode = 'standard',
}) => {
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  const [isEmailSending, setIsEmailSending] = useState(false);

  const summaryTotals = results.summary;

  const handleEmailClick = () => {
    setShowEmailModal(true);
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailAddress.trim()) return;

    setIsEmailSending(true);
    try {
      await axios.post(`${API_BASE}/email-report`, {
        reportData: results,
        email: emailAddress.trim()
      });
      alert(`Report sent successfully to: ${emailAddress}`);
      setShowEmailModal(false);
      setEmailAddress('');
    } catch (error: any) {
      console.error('Email send failed:', error);
      alert(error.response?.data?.message || 'Failed to send email. Please try again.');
    } finally {
      setIsEmailSending(false);
    }
  };

  return (
    <div className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} rounded-xl border shadow-lg p-8 backdrop-blur-sm`}>
      <div className="flex items-center gap-4 mb-6">
        <div className="p-3 bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-xl shadow-lg">
          <Calculator className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Reconciliation Summary</h3>
          <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Analysis completed in {results.comparisonTime}</p>
          {results.reference && (
            <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-500'} mt-1`}>Reference: {results.reference}</p>
          )}
        </div>
      </div>

      {/* Report Header Information */}
      <div className={`mb-6 p-4 ${darkMode ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-200'} border rounded-lg`}>
        <h4 className={`text-lg font-semibold mb-3 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Report Details</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <p className={`text-sm font-medium ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Date & Time</p>
            <p className={`text-base font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              {new Date(results.timestamp).toLocaleString('en-GB', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              })}
            </p>
          </div>
          <div>
            <p className={`text-sm font-medium ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Reference</p>
            <p className={`text-base font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{results.reference || 'N/A'}</p>
          </div>
          <div>
            <p className={`text-sm font-medium ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Mode</p>
            <p className={`text-base font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              {reconciliationMode === 'by_period' ? 'By Period' : 'By Transaction ID'}
            </p>
          </div>
        </div>
      </div>

      {/* Financial Summary Section */}
      <div className={`mb-6 p-4 ${darkMode ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-200'} border rounded-lg`}>
        <h4 className={`text-lg font-semibold mb-3 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Financial Summary</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className={`p-4 ${darkMode ? 'bg-green-900/20 border-green-700' : 'bg-green-50 border-green-200'} border rounded-lg`}>
            <p className={`text-sm font-medium ${darkMode ? 'text-green-300' : 'text-green-700'}`}>Total Document Net</p>
            <p className={`text-2xl font-bold ${darkMode ? 'text-green-200' : 'text-green-800'}`}>
              {summaryTotals ? formatCurrency(parseFloat(summaryTotals.total_document_net || '0')) : formatCurrency(0)}
            </p>
          </div>
          <div className={`p-4 ${darkMode ? 'bg-blue-900/20 border-blue-700' : 'bg-blue-50 border-blue-200'} border rounded-lg`}>
            <p className={`text-sm font-medium ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>Total Database Net</p>
            <p className={`text-2xl font-bold ${darkMode ? 'text-blue-200' : 'text-blue-800'}`}>
              {summaryTotals ? formatCurrency(parseFloat(summaryTotals.total_database_net || '0')) : formatCurrency(0)}
            </p>
          </div>
          <div className={`p-4 ${darkMode ? 'bg-purple-900/20 border-purple-700' : 'bg-purple-50 border-purple-200'} border rounded-lg`}>
            <p className={`text-sm font-medium ${darkMode ? 'text-purple-200' : 'text-purple-700'}`}>Overall Net Change</p>
            <p className={`text-2xl font-bold ${summaryTotals && parseFloat(summaryTotals.total_net_change || '0') >= 0 ? (darkMode ? 'text-green-200' : 'text-green-700') : (darkMode ? 'text-red-200' : 'text-red-600')}`}>
              {summaryTotals ? formatCurrency(parseFloat(summaryTotals.total_net_change || '0')) : formatCurrency(results.netVariance || 0)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className={`p-6 ${darkMode ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-200'} border rounded-xl shadow-sm`}>
          <div className="flex items-center gap-3 mb-2">
            <Database className="w-5 h-5 text-blue-600" />
            <p className={`text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>Total Records</p>
          </div>
          <p className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{results.totalRecords}</p>
        </div>
        <div className={`p-6 ${darkMode ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-200'} border rounded-xl shadow-sm`}>
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <p className={`text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>Matched</p>
          </div>
          <p className="text-3xl font-bold text-green-600">{results.matched}</p>
        </div>
        <div className={`p-6 ${darkMode ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-200'} border rounded-xl shadow-sm`}>
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <p className={`text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>Discrepancies</p>
          </div>
          <p className="text-3xl font-bold text-red-600">{results.discrepancies}</p>
        </div>
        <div className={`p-6 ${darkMode ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-200'} border rounded-xl shadow-sm`}>
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-5 h-5 text-purple-600" />
            <p className={`text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
              {reconciliationMode === 'kowri' ? 'Net Change' : 'Balance Status'}
            </p>
          </div>
          {reconciliationMode === 'by_period' ? (
            <p className={`text-lg font-bold ${summaryTotals.netVariance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(summaryTotals.netVariance)}
            </p>
          ) : (
            <p className={`text-lg font-bold ${results.balanceStatus === 'In Balance' ? 'text-green-600' : 'text-red-600'}`}>
              {results.balanceStatus}
            </p>
          )}
        </div>
      </div>

      {/* Tabs - Dynamic based on actual severity levels in results */}
      <div className="flex gap-2 mt-4 flex-wrap">
        {/* Always show 'all' tab */}
        <button key="all" onClick={() => setSelectedTab('all')} className={`px-4 py-1 text-sm rounded-lg border transition-colors duration-200 ${
          selectedTab === 'all'
            ? 'bg-blue-600 text-white border-blue-600'
            : darkMode
              ? 'bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600 hover:text-white'
              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
        }`}>
          All
        </button>
        {/* Only show severity tabs if they exist in the results */}
        {results.summary?.critical > 0 && (
          <button key="critical" onClick={() => setSelectedTab('critical')} className={`px-4 py-1 text-sm rounded-lg border transition-colors duration-200 ${
            selectedTab === 'critical'
              ? 'bg-red-600 text-white border-red-600'
              : darkMode
                ? 'bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600 hover:text-white'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
          }`}>
            Critical ({results.summary.critical})
          </button>
        )}
        {results.summary?.high > 0 && (
          <button key="high" onClick={() => setSelectedTab('high')} className={`px-4 py-1 text-sm rounded-lg border transition-colors duration-200 ${
            selectedTab === 'high'
              ? 'bg-orange-600 text-white border-orange-600'
              : darkMode
                ? 'bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600 hover:text-white'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
          }`}>
            High ({results.summary.high})
          </button>
        )}
        {results.summary?.medium > 0 && (
          <button key="medium" onClick={() => setSelectedTab('medium')} className={`px-4 py-1 text-sm rounded-lg border transition-colors duration-200 ${
            selectedTab === 'medium'
              ? 'bg-yellow-600 text-white border-yellow-600'
              : darkMode
                ? 'bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600 hover:text-white'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
          }`}>
            Medium ({results.summary.medium})
          </button>
        )}
        {results.summary?.low > 0 && (
          <button key="low" onClick={() => setSelectedTab('low')} className={`px-4 py-1 text-sm rounded-lg border transition-colors duration-200 ${
            selectedTab === 'low'
              ? 'bg-blue-600 text-white border-blue-600'
              : darkMode
                ? 'bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600 hover:text-white'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
          }`}>
            Low ({results.summary.low})
          </button>
        )}
        <div className="ml-auto flex gap-2 flex-wrap">
          <select
            value={reportFormat}
            onChange={e => setReportFormat(e.target.value)}
            className={`px-2 py-1 border rounded-lg text-sm transition-colors duration-200 ${
              darkMode
                ? 'bg-slate-700 border-slate-600 text-slate-300'
                : 'bg-white border-slate-300 text-slate-900'
            }`}
          >
            <option value="pdf">PDF</option>
            <option value="xlsx">Excel</option>
          </select>
          <button onClick={() => onDownloadReport(reportFormat)} className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm flex items-center gap-1 hover:bg-blue-700 transition-colors duration-200">{isDownloading ? 'Downloading...' : 'Download'} <Download className="w-4 h-4" /></button>
          <select
            value={exportFormat}
            onChange={e => setExportFormat(e.target.value)}
            className={`px-2 py-1 border rounded-lg text-sm transition-colors duration-200 ${
              darkMode
                ? 'bg-slate-700 border-slate-600 text-slate-300'
                : 'bg-white border-slate-300 text-slate-900'
            }`}
          >
            <option value="json">JSON</option>
            <option value="csv">CSV</option>
          </select>
          <button onClick={onExportData} className="px-3 py-1 bg-purple-600 text-white rounded-lg text-sm flex items-center gap-1 hover:bg-purple-700 transition-colors duration-200">
            <FileJson className="w-4 h-4" /> Export
          </button>
          <button onClick={handleEmailClick} className="px-3 py-1 bg-green-600 text-white rounded-lg text-sm flex items-center gap-1 hover:bg-green-700 transition-colors duration-200"><Mail className="w-4 h-4" /> Email</button>
        </div>
      </div>

      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border rounded-xl p-6 w-full max-w-md mx-4`}>
            <h3 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Email Report</h3>
            <form onSubmit={handleEmailSubmit}>
              <div className="mb-4">
                <label htmlFor="email" className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={emailAddress}
                  onChange={(e) => setEmailAddress(e.target.value)}
                  placeholder="Enter email address"
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    darkMode
                      ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400'
                      : 'bg-white border-slate-300 text-slate-900 placeholder-slate-500'
                  }`}
                  required
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowEmailModal(false)}
                  className={`px-4 py-2 border rounded-lg text-sm font-medium transition-colors duration-200 ${
                    darkMode
                      ? 'border-slate-600 text-slate-300 hover:bg-slate-700'
                      : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isEmailSending || !emailAddress.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  {isEmailSending ? 'Sending...' : 'Send Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};