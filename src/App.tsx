import React, { useState, useEffect } from 'react';
import { Upload, FileText, RefreshCcw, Calendar, DollarSign, Filter, Loader2, AlertCircle, LogOut } from "lucide-react";
import axios from 'axios';
import { useAuth } from './hooks/useAuth';
import AuthPage from './components/AuthPage';

interface Transaction {
  id: number;
  transaction_id: string;
  account_number: string;
  account_name: string;
  debit_amount: number;
  credit_amount: number;
  transaction_type: string;
  transaction_date: string;
  description: string;
  reference_number: string;
  balance: number;
  status: string;
}

interface TransactionSummary {
  total_transactions: number;
  total_debit_amount: number;
  total_credit_amount: number;
  opening_balance: number;
  closing_balance: number;
  debit_transactions: number;
  credit_transactions: number;
  date_range: {
    start: string | null;
    end: string | null;
  };
}

export default function App() {
  const { isAuthenticated, user, logout, isLoading: authLoading } = useAuth();

  // Show auth page if not authenticated
  if (!isAuthenticated && !authLoading) {
    return <AuthPage />;
  }

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-npontu-50 via-white to-professional-blue-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-npontu-200 border-t-npontu-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-npontu-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dateTolerance, setDateTolerance] = useState('');
  const [amountTolerance, setAmountTolerance] = useState('');
  const [reconciliationMode, setReconciliationMode] = useState<'by_period' | 'by_transaction_id'>('by_period');
  const [useEntireDocument, setUseEntireDocument] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<TransactionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [reconciling, setReconciling] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [reconciliationResults, setReconciliationResults] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [perPage] = useState(10);

  const API_BASE = 'http://127.0.0.1:8002/api';

  // Fetch transactions and summary on component mount and when filters change
  useEffect(() => {
    fetchTransactions();
    fetchSummary();
  }, [startDate, endDate, reconciliationMode, useEntireDocument, currentPage]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      params.append('page', currentPage.toString());
      params.append('per_page', perPage.toString());

      const response = await axios.get(`${API_BASE}/transactions?${params}`);
      setTransactions(response.data.data || []);
      setTotalPages(response.data.last_page || 1);
    } catch (err) {
      setError('Failed to fetch transactions');
      console.error('Error fetching transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);

      const response = await axios.get(`${API_BASE}/transaction-summary?${params}`);
      setSummary(response.data);
    } catch (err) {
      console.error('Error fetching summary:', err);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // For period mode, check dates unless using entire document
    if (reconciliationMode === 'by_period' && !useEntireDocument && (!startDate || !endDate)) {
      setError('Please select both start and end dates before uploading, or check "Use entire document"');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('mode', reconciliationMode);

    // Only add dates if not using entire document
    if (reconciliationMode === 'by_period' && !useEntireDocument) {
      formData.append('start_date', startDate);
      formData.append('end_date', endDate);
    }

    try {
      setUploading(true);
      setError(null);
      setUploadedFileName(file.name);

      const response = await axios.post(`${API_BASE}/reconcile`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      // Store reconciliation results
      setReconciliationResults(response.data);

      // Refresh data after reconciliation
      await fetchTransactions();
      await fetchSummary();

      alert(`File "${file.name}" uploaded successfully! Reconciliation completed with ${response.data.discrepancies || 0} discrepancies found.`);

    } catch (err: any) {
      setError(err.response?.data?.message || 'Upload failed');
      setUploadedFileName(null);
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleReconcile = async () => {
    // For period mode, check dates unless using entire document
    if (reconciliationMode === 'by_period' && !useEntireDocument && (!startDate || !endDate)) {
      setError('Please select both start and end dates, or check "Use entire document"');
      return;
    }

    // Check if a file has been uploaded
    if (!uploadedFileName) {
      setError('Please upload a Kowri file before reconciling');
      return;
    }

    try {
      setReconciling(true);
      setError(null);

      // Prepare reconciliation request
      const reconcileData = {
        mode: reconciliationMode,
        start_date: reconciliationMode === 'by_period' && !useEntireDocument ? startDate : null,
        end_date: reconciliationMode === 'by_period' && !useEntireDocument ? endDate : null,
        date_tolerance: dateTolerance || 0,
        amount_tolerance: amountTolerance || 0.00,
        use_entire_document: useEntireDocument
      };

      // Call reconciliation API
      const response = await axios.post(`${API_BASE}/reconcile-manual`, reconcileData);

      // Store reconciliation results
      setReconciliationResults(response.data);

      // Refresh data after reconciliation
      await fetchTransactions();
      await fetchSummary();
      setCurrentPage(1); // Reset to first page after reconciliation

      // Show detailed results
      const results = response.data;
      alert(`Reconciliation completed!\n\n` +
            `✅ Matched: ${results.matched || 0} transactions\n` +
            `⚠️ Discrepancies: ${results.discrepancies || 0} transactions\n` +
            `📊 Total Processed: ${results.total_processed || 0} transactions\n\n` +
            `Check the transaction table for detailed results.`);

    } catch (err: any) {
      setError(err.response?.data?.message || 'Reconciliation failed');
      console.error('Reconciliation error:', err);
    } finally {
      setReconciling(false);
    }
  };

  const formatCurrency = (amount: number) => {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'EUR'
      }).format(amount);
    } catch (error) {
      // Fallback for older browsers
      return `€${amount.toFixed(2)}`;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      // Fallback for older browsers
      return dateString;
    }
  };

  return (
    <div className="w-full min-h-screen relative overflow-hidden">
      {/* Npontu Technologies Header */}
      <div className="relative bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 text-white">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-lg">
                <svg viewBox="0 0 24 24" className="w-8 h-8 text-blue-600" fill="currentColor">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-display font-bold">Npontu Technologies</h1>
                <p className="text-blue-100 text-sm">Financial Technology Solutions</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="hidden md:flex items-center space-x-2">
                <span className="text-blue-100 text-sm">Welcome, {user?.name}</span>
                <div className="w-8 h-8 bg-blue-400 rounded-full flex items-center justify-center">
                  <span className="text-xs font-semibold">{user?.name?.charAt(0).toUpperCase()}</span>
                </div>
              </div>
              <button
                onClick={logout}
                className="flex items-center space-x-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden md:inline text-sm">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="relative w-full max-w-7xl mx-auto p-6 space-y-8">
        {/* Page Title */}
        <div className="text-center mb-12">
          <div className="inline-block p-1 bg-gradient-to-r from-npontu-500 to-npontu-600 rounded-2xl shadow-floating mb-6">
            <div className="bg-white rounded-xl px-8 py-4 shadow-card">
              <h1 className="text-4xl font-display font-bold bg-gradient-to-r from-npontu-600 to-npontu-800 bg-clip-text text-transparent mb-2">
                Npontu Reconciliation
              </h1>
              <p className="text-warm-grey-600 font-medium">Advanced transaction reconciliation platform</p>
            </div>
          </div>
        </div>

        {/* Statement Filters Card */}
        <div className="bg-white rounded-2xl shadow-floating border border-blue-200 overflow-hidden transform hover:scale-[1.02] transition-all duration-300">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
            <div className="relative flex items-center space-x-3">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <Filter className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white font-display">Statement Filters</h3>
            </div>
          </div>
          <div className="p-8">
            <div className="space-y-6">
              {/* Reconciliation Mode Selection */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-gray-700">Reconciliation Mode</label>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="reconciliationMode"
                      value="by_period"
                      checked={reconciliationMode === 'by_period'}
                      onChange={(e) => setReconciliationMode(e.target.value as 'by_period')}
                      className="mr-2"
                    />
                    <span className="text-sm">By Period</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="reconciliationMode"
                      value="by_transaction_id"
                      checked={reconciliationMode === 'by_transaction_id'}
                      onChange={(e) => setReconciliationMode(e.target.value as 'by_transaction_id')}
                      className="mr-2"
                    />
                    <span className="text-sm">By Transaction ID</span>
                  </label>
                </div>
              </div>

              {/* Date Filters - Only show for period mode */}
              {reconciliationMode === 'by_period' && (
                <div className="space-y-3">
                  <label className="flex items-center text-sm font-semibold text-gray-700">
                    <input
                      type="checkbox"
                      checked={useEntireDocument}
                      onChange={(e) => setUseEntireDocument(e.target.checked)}
                      className="mr-2"
                    />
                    Use entire document (no date filtering)
                  </label>

                  {!useEntireDocument && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <label className="flex items-center text-sm font-semibold text-gray-700">
                          <Calendar className="w-4 h-4 mr-2" />
                          Start Date
                        </label>
                        <input
                          type="date"
                          className="w-full px-4 py-3 border border-blue-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 bg-gradient-card shadow-inner-warm"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="flex items-center text-sm font-semibold text-gray-700">
                          <Calendar className="w-4 h-4 mr-2" />
                          End Date
                        </label>
                        <input
                          type="date"
                          className="w-full px-4 py-3 border border-blue-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 bg-gradient-card shadow-inner-warm"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="flex items-center text-sm font-semibold text-gray-700">
                          <Calendar className="w-4 h-4 mr-2" />
                          Date Tolerance (days)
                        </label>
                        <input
                          type="number"
                          className="w-full px-4 py-3 border border-blue-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 bg-gradient-card shadow-inner-warm"
                          value={dateTolerance}
                          onChange={(e) => setDateTolerance(e.target.value)}
                          placeholder="0"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="flex items-center text-sm font-semibold text-gray-700">
                          <DollarSign className="w-4 h-4 mr-2" />
                          Amount Tolerance
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          className="w-full px-4 py-3 border border-blue-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 bg-gradient-card shadow-inner-warm"
                          value={amountTolerance}
                          onChange={(e) => setAmountTolerance(e.target.value)}
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Generate Statement Button */}
              <div className="flex justify-end">
                <button
                  onClick={async () => {
                    try {
                      setError(null);
                      const params = new URLSearchParams();
                      if (startDate) params.append('start_date', startDate);
                      if (endDate) params.append('end_date', endDate);

                      const response = await axios.get(`${API_BASE}/generate-statement?${params}`);
                      alert('Statement generated successfully! Use the filters to view the filtered data.');
                      await fetchTransactions();
                      await fetchSummary();
                      setCurrentPage(1); // Reset to first page after filtering
                    } catch (err: any) {
                      setError('Failed to generate statement');
                      console.error('Statement generation error:', err);
                    }
                  }}
                  className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 px-6 rounded-xl hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-300 font-semibold font-display shadow-card hover:scale-[1.02]"
                >
                  Generate Statement
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* System Entries Card */}
        <div className="bg-white rounded-2xl shadow-floating border border-blue-200 overflow-hidden transform hover:scale-[1.02] transition-all duration-300">
          <div className="bg-gradient-to-r from-blue-500 to-green-600 p-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
            <div className="relative flex items-center space-x-3">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <Upload className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white font-display">System Entries</h3>
            </div>
          </div>
          <div className="p-8">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-warm-grey-600 mb-2">
                  Upload your Kowri file to compare with system transactions.
                </p>
                <p className="text-sm text-warm-grey-500">
                  Supported formats: CSV, PDF, XLSX
                </p>
                {uploadedFileName && (
                  <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <p className="text-sm text-green-800 font-medium">
                        File uploaded: <span className="font-semibold">{uploadedFileName}</span>
                      </p>
                    </div>
                    {reconciliationResults && (
                      <p className="text-xs text-green-600 mt-1">
                        Reconciliation completed with {reconciliationResults.discrepancies || 0} discrepancies found
                      </p>
                    )}
                  </div>
                )}
              </div>
              <label className="bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 px-6 rounded-xl hover:shadow-floating focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-300 font-semibold font-display shadow-card flex items-center cursor-pointer hover:scale-[1.02]">
                {uploading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5 mr-2" />
                    Upload Kowri File
                  </>
                )}
                <input
                  type="file"
                  className="hidden"
                  accept=".csv,.xlsx,.xls,.txt"
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
              </label>
            </div>
          </div>
        </div>

        {/* Account Statement Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Account Statement</h2>
              <p className="text-gray-600 mt-1">Review and reconcile your account transactions</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={async () => {
                  try {
                    setError(null);
                    const params = new URLSearchParams();
                    if (startDate) params.append('start_date', startDate);
                    if (endDate) params.append('end_date', endDate);

                    const response = await axios.post(`${API_BASE}/export-pdf`, {
                      transactions: transactions,
                      summary: summary,
                      filters: { startDate, endDate, reconciliationMode }
                    }, { responseType: 'blob' });

                    // Create download link
                    const url = window.URL.createObjectURL(new Blob([response.data]));
                    const link = document.createElement('a');
                    link.href = url;
                    link.setAttribute('download', `npontu-statement-${new Date().toISOString().split('T')[0]}.pdf`);
                    document.body.appendChild(link);
                    link.click();
                    link.remove();

                    alert('PDF exported successfully!');
                  } catch (err: any) {
                    setError('Failed to export PDF');
                    console.error('PDF export error:', err);
                  }
                }}
                className="bg-white border border-npontu-300 text-npontu-700 py-3 px-6 rounded-xl hover:bg-npontu-50 focus:outline-none focus:ring-2 focus:ring-npontu-500 focus:ring-offset-2 transition-all duration-300 font-semibold shadow-card flex items-center hover:scale-[1.02]"
              >
                <FileText className="w-5 h-5 mr-2" />
                Export PDF
              </button>
              <button
                onClick={handleReconcile}
                disabled={reconciling}
                className="bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-6 rounded-xl hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-300 font-semibold shadow-floating flex items-center disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02]"
              >
                {reconciling ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Reconciling...
                  </>
                ) : (
                  <>
                    <RefreshCcw className="w-5 h-5 mr-2" />
                    Reconcile
                  </>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <p className="text-red-800 font-medium">{error}</p>
              </div>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                    <p className="text-blue-800 font-medium">Loading transactions...</p>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <p className="text-blue-800 font-medium">
                      Page {currentPage} of {totalPages} • {transactions.length} entries shown
                    </p>
                  </>
                )}
              </div>

              {/* Pagination Controls */}
              {!loading && totalPages > 1 && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>

                  <span className="text-sm text-gray-600">
                    Page {currentPage} of {totalPages}
                  </span>

                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Transaction Table */}
          <div className="bg-white rounded-2xl shadow-floating border border-blue-200 overflow-hidden transform hover:scale-[1.01] transition-all duration-300">
            <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-6 relative overflow-hidden">
              <div className="absolute inset-0 bg-black/10 backdrop-blur-sm"></div>
              <div className="relative">
                <h3 className="text-xl font-semibold text-white font-display">Npontu Technologies</h3>
                <p className="text-blue-100 text-sm mt-1">Professional Account Statement Details</p>
              </div>
            </div>
            <div className="p-8">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left p-4 font-semibold text-gray-900">Date & Time</th>
                      <th className="text-left p-4 font-semibold text-gray-900">Description</th>
                      <th className="text-left p-4 font-semibold text-gray-900">Reference</th>
                      <th className="text-right p-4 font-semibold text-gray-900">Debit</th>
                      <th className="text-right p-4 font-semibold text-gray-900">Credit</th>
                      <th className="text-right p-4 font-semibold text-gray-900">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center p-12">
                          <div className="flex flex-col items-center space-y-3">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                              <FileText className="w-8 h-8 text-gray-400" />
                            </div>
                            <div className="text-center">
                              <p className="text-gray-500 font-medium">No transactions found</p>
                              <p className="text-gray-400 text-sm mt-1">Upload a statement or adjust your filters to see transactions</p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      transactions.map((transaction, index) => (
                        <tr key={transaction.id} className={index % 2 === 0 ? 'bg-gray-50 hover:bg-gray-100' : 'bg-white hover:bg-gray-50'}>
                          <td className="p-4">{formatDate(transaction.transaction_date)}</td>
                          <td className="p-4">{transaction.description}</td>
                          <td className="p-4">{transaction.reference_number}</td>
                          <td className="p-4 text-right">{transaction.debit_amount > 0 ? formatCurrency(transaction.debit_amount) : '-'}</td>
                          <td className="p-4 text-right">{transaction.credit_amount > 0 ? formatCurrency(transaction.credit_amount) : '-'}</td>
                          <td className="p-4 text-right">{formatCurrency(transaction.balance)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Summary Row */}
              <div className="mt-8 bg-gradient-card p-6 rounded-xl border border-blue-200 shadow-inner-warm">
                <h4 className="text-lg font-semibold text-blue-900 mb-6 text-center font-display">Transaction Summary</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center p-4 bg-red-50 rounded-xl border border-red-200 shadow-card">
                    <div className="text-sm text-red-600 font-medium mb-2">Total Debits</div>
                    <div className="text-3xl font-bold text-red-700">{summary ? formatCurrency(summary.total_debit_amount) : '€0.00'}</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-xl border border-green-200 shadow-card">
                    <div className="text-sm text-green-600 font-medium mb-2">Total Credits</div>
                    <div className="text-3xl font-bold text-green-700">{summary ? formatCurrency(summary.total_credit_amount) : '€0.00'}</div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-xl border border-blue-200 shadow-card">
                    <div className="text-sm text-blue-600 font-medium mb-2">Net Change</div>
                    <div className="text-3xl font-bold text-blue-700">{summary ? formatCurrency(summary.total_credit_amount - summary.total_debit_amount) : '€0.00'}</div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
