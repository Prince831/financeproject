import React from 'react';
import { FileText, RefreshCcw, Loader2, AlertCircle } from "lucide-react";
import { ErrorMessage } from './ErrorMessage';

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

interface ReconciliationTableProps {
  transactions: Transaction[];
  summary: TransactionSummary | null;
  loading: boolean;
  error: string | null;
  errorType?: string;
  reconciling: boolean;
  uploadedFileName: string | null;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  totalPages: number;
  onReconcile: () => void;
  onExportPDF: () => void;
  onRetry?: () => void;
}

export default function ReconciliationTable({
  transactions,
  summary,
  loading,
  error,
  errorType,
  reconciling,
  uploadedFileName,
  currentPage,
  setCurrentPage,
  totalPages,
  onReconcile,
  onExportPDF,
  onRetry,
}: ReconciliationTableProps) {
  console.log('ReconciliationTable: Rendering with', transactions.length, 'transactions, loading:', loading, 'error:', error);
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Account Statement</h2>
          <p className="text-gray-600 mt-1">Review and reconcile your account transactions</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={onExportPDF}
            className="bg-white border border-npontu-300 text-npontu-700 py-3 px-6 rounded-xl hover:bg-npontu-50 focus:outline-none focus:ring-2 focus:ring-npontu-500 focus:ring-offset-2 transition-all duration-300 font-semibold shadow-card flex items-center hover:scale-[1.02]"
          >
            <FileText className="w-5 h-5 mr-2" />
            Export PDF
          </button>
          <button
            onClick={onReconcile}
            disabled={reconciling}
            className="bg-gradient-to-r from-accent to-purple-700 text-white py-3 px-6 rounded-xl hover:from-accent hover:to-purple-800 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 transition-all duration-300 font-semibold shadow-floating flex items-center disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02]"
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

      <ErrorMessage
        error={error}
        setError={() => {}} // We'll handle this in the parent
        darkMode={false}
        onRetry={onRetry || (() => {})}
        errorType={errorType}
      />

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
      <div className="bg-white rounded-2xl shadow-floating border border-npontu-200 overflow-hidden transform hover:scale-[1.01] transition-all duration-300">
        <div className="bg-gradient-to-r from-npontu-600 to-npontu-800 p-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-black/10 backdrop-blur-sm"></div>
          <div className="relative">
            <h3 className="text-xl font-semibold text-white font-display">Npontu Technologies</h3>
            <p className="text-npontu-100 text-sm mt-1">Professional Account Statement Details</p>
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
          <div className="mt-8 bg-gradient-card p-6 rounded-xl border border-npontu-200 shadow-inner-warm">
            <h4 className="text-lg font-semibold text-npontu-900 mb-6 text-center font-display">Transaction Summary</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-red-50 rounded-xl border border-red-200 shadow-card">
                <div className="text-sm text-red-600 font-medium mb-2">Total Debits</div>
                <div className="text-3xl font-bold text-red-700">{summary ? formatCurrency(summary.total_debit_amount) : '€0.00'}</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-xl border border-green-200 shadow-card">
                <div className="text-sm text-green-600 font-medium mb-2">Total Credits</div>
                <div className="text-3xl font-bold text-green-700">{summary ? formatCurrency(summary.total_credit_amount) : '€0.00'}</div>
              </div>
              <div className="text-center p-4 bg-npontu-50 rounded-xl border border-npontu-200 shadow-card">
                <div className="text-sm text-npontu-600 font-medium mb-2">Net Change</div>
                <div className="text-3xl font-bold text-npontu-700">{summary ? formatCurrency(summary.total_credit_amount - summary.total_debit_amount) : '€0.00'}</div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}