import { useState, useEffect, Component, ReactNode } from 'react';
import { LogOut, AlertCircle, ChevronDown, ChevronUp, FileText, Clock, X } from "lucide-react";
import { useAuth } from './hooks/useAuth';
import { useReconciliationManager } from './hooks/useReconciliationManager';
import { TransactionComparison } from './hooks/useReconciliation';
import AuthPage from './components/AuthPage';
import ReconciliationFilters from './components/ReconciliationFilters';
import ReconciliationUpload from './components/ReconciliationUpload';
import ReconciliationTable from './components/ReconciliationTable';
import { ProcessingIndicator } from './components/ProcessingIndicator';
import { DiscrepancyReport } from './components/DiscrepancyReport';
import { ReconciliationHistoryPanel } from './components/ReconciliationHistoryPanel';

console.log('App.tsx: File loaded');

// Error Boundary Component to prevent blank screens
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-npontu-50 via-white to-professional-blue-50">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-floating border border-red-200 p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h2>
            <p className="text-gray-600 mb-6">
              The application encountered an unexpected error. Please refresh the page to try again.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-npontu-600 text-white py-3 px-4 rounded-lg hover:bg-npontu-700 transition-colors font-medium"
              >
                Refresh Page
              </button>
              <button
                onClick={() => this.setState({ hasError: false })}
                className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Try Again
              </button>
            </div>
            {import.meta.env.DEV && this.state.error && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                  Error Details (Development)
                </summary>
                <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function App() {
    console.log('App: Rendering App component');
    const { isAuthenticated, user, logout, isLoading: authLoading } = useAuth();
    console.log('App: Auth state - isAuthenticated:', isAuthenticated, 'authLoading:', authLoading, 'user:', user);

  // Always call hooks before any conditional returns (Rules of Hooks)
  const [accountStatementCollapsed, setAccountStatementCollapsed] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const {
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    dateTolerance,
    setDateTolerance,
    amountTolerance,
    setAmountTolerance,
    reconciliationMode,
    setReconciliationMode,
    useEntireDocument,
    setUseEntireDocument,
    transactions,
    summary,
    loading,
    error,
    errorType,
    setError,
    uploading,
    reconciling,
    uploadedFileName,
    reconciliationResults,
    currentPage,
    setCurrentPage,
    totalPages,
    progress,
    progressStatus,
    handleFileUpload,
    handleReconcile,
    exportPDF,
    resetUpload,
  } = useReconciliationManager();

  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS (Rules of Hooks)

  // Global error handler to prevent blank screens
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('Global error caught:', event.error);
      // Don't prevent default - let React handle it, but log it
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason);
      // Don't prevent default - let React handle it, but log it
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  // Show auth page if not authenticated
  if (!isAuthenticated && !authLoading) {
    console.log('App: Showing AuthPage - not authenticated and not loading');
    return <AuthPage />;
  }

  // Show loading while checking authentication
  if (authLoading) {
    console.log('App: Showing loading spinner - authLoading is true');
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-npontu-50 via-white to-professional-blue-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-npontu-200 border-t-npontu-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-npontu-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }


  console.log('App: User authenticated, rendering main app');

  const unmatchedRecords =
    (reconciliationResults?.records ?? []).filter(
      (record: TransactionComparison) =>
        record.source === 'document' ||
        record.status?.toLowerCase().includes('missing in database')
    );
  const discrepancyCount = unmatchedRecords.length;

  return (
    <ErrorBoundary>
      <div className="w-full min-h-screen relative overflow-hidden">

      {/* Npontu Technologies Header */}
      <div className="relative bg-white bg-opacity-95 backdrop-blur-sm border-b border-gray-200 shadow-sm">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 lg:py-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3 sm:space-x-6">
              <img
                src="/images/npontu-logo.png"
                alt="Kowri Recon Logo"
                className="h-10 sm:h-12 w-auto"
              />
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 font-display">Kowri Recon</h1>
                <p className="text-gray-600 text-xs sm:text-sm">Financial Reconciliation System</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 w-full sm:w-auto relative">
               <div className="hidden md:flex items-center space-x-3">
                 <span className="text-gray-700 text-sm">Welcome, {user?.name}</span>
                 <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                   <span className="text-xs font-semibold text-gray-700">{user?.name?.charAt(0).toUpperCase()}</span>
                 </div>
               </div>
               <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
                 <button
                   onClick={() => setShowHistory((prev) => !prev)}
                   className="inline-flex items-center px-3 sm:px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors w-full sm:w-auto justify-center sm:justify-start"
                 >
                   <Clock className="w-4 h-4 mr-2" />
                   History
                 </button>
                 <button
                   onClick={logout}
                   className="inline-flex items-center px-3 sm:px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors w-full sm:w-auto justify-center sm:justify-start"
                 >
                   <LogOut className="w-4 h-4 mr-2" />
                   Logout
                 </button>
               </div>

             </div>
          </div>
        </div>
      </div>

      <div className="relative w-full max-w-7xl mx-auto p-6 space-y-8">
        {error && errorType === 'reconciliation_processing_error' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-500 mr-3" />
              <div>
                <h3 className="text-red-800 font-medium">Reconciliation Error</h3>
                <p className="text-red-600 text-sm mt-1">{error}</p>
                <button
                  onClick={() => setError(null)}
                  className="mt-2 text-red-700 hover:text-red-900 text-sm underline"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-floating border border-npontu-200 overflow-hidden">
          <div className="bg-gradient-to-r from-npontu-600 to-npontu-800 p-6 text-white">
            <h3 className="text-2xl font-semibold font-display">Advanced Reconciliation Workspace</h3>
            <p className="text-sm text-white/80">
              Configure filters, upload supporting documents, and run by-transaction comparisons in one view.
            </p>
          </div>
          <div className="p-6 space-y-6">
            <ReconciliationFilters
              reconciliationMode={reconciliationMode}
              setReconciliationMode={setReconciliationMode}
              useEntireDocument={useEntireDocument}
              setUseEntireDocument={setUseEntireDocument}
              startDate={startDate}
              setStartDate={setStartDate}
              endDate={endDate}
              setEndDate={setEndDate}
              dateTolerance={dateTolerance}
              setDateTolerance={setDateTolerance}
              amountTolerance={amountTolerance}
              setAmountTolerance={setAmountTolerance}
              variant="minimal"
            />

            {reconciliationMode === 'by_transaction_id' && (
              <ReconciliationUpload
                uploading={uploading}
                uploadedFileName={uploadedFileName}
                onFileUpload={handleFileUpload}
                onReset={resetUpload}
                onReconcile={handleReconcile}
                reconciling={reconciling}
                discrepancyCount={discrepancyCount}
                variant="minimal"
              />
            )}

            {reconciling && (
              <div className="flex justify-center border border-dashed border-slate-200 rounded-2xl p-4">
                <ProcessingIndicator
                  progress={progress}
                  progressStatus={progressStatus}
                  darkMode={false}
                />
              </div>
            )}
          </div>
        </div>

          {/* Account Statement Section - Always show this, even with errors */}
          <div className="bg-white rounded-2xl shadow-floating border border-npontu-200 overflow-hidden transform hover:scale-[1.02] transition-all duration-300">
            <div
              className="bg-gradient-to-r from-npontu-600 to-npontu-800 p-6 relative overflow-hidden cursor-pointer hover:bg-gradient-to-r hover:from-npontu-700 hover:to-npontu-900 transition-all duration-300"
              onClick={() => setAccountStatementCollapsed(!accountStatementCollapsed)}
            >
              <div className="absolute inset-0 bg-black/10 backdrop-blur-sm"></div>
              <div className="relative flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white font-display">Account Statement</h3>
                    <p className="text-npontu-100 text-sm mt-1">Review and reconcile your account transactions</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  {accountStatementCollapsed ? (
                    <ChevronDown className="w-6 h-6 text-white transition-transform duration-300" />
                  ) : (
                    <ChevronUp className="w-6 h-6 text-white transition-transform duration-300" />
                  )}
                </div>
              </div>
            </div>
            {!accountStatementCollapsed && (
              <div className="p-8">
                <ReconciliationTable
                  transactions={transactions}
                  summary={summary}
                  loading={loading}
                  error={error}
                  errorType={errorType}
                  currentPage={currentPage}
                  setCurrentPage={setCurrentPage}
                  totalPages={totalPages}
                  onExportPDF={exportPDF}
                  onRetry={() => setError(null)}
                />
              </div>
            )}
          </div>

        {!loading && transactions.length === 0 && !error && (
          <div className="bg-white rounded-2xl shadow-floating border border-npontu-200 p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Data Available</h3>
            <p className="text-gray-600 mb-4">
              No transactions are currently loaded. Try adjusting your filters or check your connection.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-npontu-600 text-white px-4 py-2 rounded-lg hover:bg-npontu-700 transition-colors"
            >
              Refresh Page
            </button>
          </div>
        )}

        {reconciliationResults && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-slate-600">
              <span className="text-sm font-semibold tracking-wide uppercase">Reports</span>
              <div className="h-px bg-slate-200 flex-1" />
            </div>
            <DiscrepancyReport results={reconciliationResults} />
          </div>
        )}
      </div>
      </div>
      {showHistory && (
        <div className="fixed inset-0 z-50 pointer-events-none">
          <div className="absolute inset-0" onClick={() => setShowHistory(false)} />
          <div
            className="pointer-events-auto absolute top-8 right-10 w-[min(90vw,560px)] bg-white border border-slate-200 rounded-3xl shadow-[0_20px_60px_rgba(15,23,42,0.25)]"
          >
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">History</p>
                <h3 className="text-lg font-semibold text-slate-900">Reconciliation Reports</h3>
              </div>
              <button
                onClick={() => setShowHistory(false)}
                className="text-slate-500 hover:text-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="max-h-[78vh] overflow-y-auto">
              <ReconciliationHistoryPanel />
            </div>
          </div>
        </div>
      )}
    </ErrorBoundary>
  );
}

export default App;
