import React, { useMemo, Suspense, lazy, useEffect } from 'react';
import { useReconciliation } from './hooks/useReconciliation';
import { useUIState } from './hooks/useUIState';
import { useUtils } from './hooks/useUtils';
import { Navigation } from './components/Navigation';
import { HistoryPanel } from './components/HistoryPanel';
import { FileUpload } from './components/FileUpload';
import { ProcessingIndicator } from './components/ProcessingIndicator';
import { ResultsSummary } from './components/ResultsSummary';
import { DiscrepanciesTable } from './components/DiscrepanciesTable';
import { FilePreviewModal } from './components/FilePreviewModal';
import { ErrorMessage } from './components/ErrorMessage';

// Lazy load heavy components
const TrendsChart = lazy(() => import('./components/TrendsChart').then(module => ({ default: module.TrendsChart })));

export default function DocumentComparisonPortal() {
  const {
    selectedTab,
    setSelectedTab,
    reportFormat,
    setReportFormat,
    showHistory,
    setShowHistory,
    comparisonHistory,
    setComparisonHistory,
    showPreview,
    setShowPreview,
    darkMode,
    exportFormat,
    setExportFormat,
    reconciliationMode,
    setReconciliationMode,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    toggleDarkMode,
  } = useUIState();

  const {
    uploadedFile,
    setUploadedFile,
    isDragging,
    setIsDragging,
    currentStep,
    progress,
    results,
    error,
    setError,
    isDownloading,
    resetAll,
    startComparison,
    handleDownloadReport,
    handleEmailReport,
  } = useReconciliation(reconciliationMode, startDate, endDate);

  const {
    getSeverityColor,
    formatCurrency,
    exportData,
  } = useUtils();

  // Filtered discrepancies
  const filteredDiscrepancies = results?.records
    ?.filter(d => selectedTab === 'all' || d.severity.toLowerCase() === selectedTab)
    || [];

  const handleRetry = () => {
    setError(null);
    resetAll();
  };

  const handleModeSwitch = (newMode: 'by_period' | 'by_transaction_id') => {
    // Clear results when switching modes to prevent confusion
    resetAll();
    setReconciliationMode(newMode);
  };

  // Clear all reconciliation state on app restart for fresh user experience
  useEffect(() => {
    // Clear all reconciliation-related localStorage on app start
    localStorage.removeItem('auditSync_uploadedFile');
    localStorage.removeItem('auditSync_results');
    localStorage.removeItem('auditSync_currentStep');
    localStorage.removeItem('auditSync_progress');
    localStorage.removeItem('auditSync_error');
  }, []); // Empty dependency array - runs once on mount

  const handlePreview = () => {
    if (uploadedFile) {
      setShowPreview(true);
    }
  };

  const handleExportData = () => {
    if (!results) return;
    exportData(results, exportFormat);
  };

  return (
    <div className={`min-h-screen w-screen ${darkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}`}>
      <Navigation
        showHistory={showHistory}
        setShowHistory={setShowHistory}
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
        reconciliationMode={reconciliationMode}
        setReconciliationMode={handleModeSwitch}
      />

      <div className="w-full px-6 lg:px-8 py-8 min-h-[calc(100vh-80px)] flex flex-col">
        <HistoryPanel
          showHistory={showHistory}
          setShowHistory={setShowHistory}
          comparisonHistory={comparisonHistory}
          darkMode={darkMode}
          formatCurrency={formatCurrency}
        />

        <div className="flex-1 flex items-center justify-center w-full">
          <div className="w-full max-w-6xl mx-auto">
            <FileUpload
              uploadedFile={uploadedFile}
              setUploadedFile={setUploadedFile}
              isDragging={isDragging}
              setIsDragging={setIsDragging}
              darkMode={darkMode}
              reconciliationMode={reconciliationMode}
              startDate={startDate}
              endDate={endDate}
              setStartDate={setStartDate}
              setEndDate={setEndDate}
              onPreview={handlePreview}
              onReconcile={startComparison}
              resetAll={resetAll}
            />

            {currentStep === 'processing' && (
              <ProcessingIndicator
                progress={progress}
                darkMode={darkMode}
              />
            )}

            {results && currentStep === 'complete' && (
              <>
                {reconciliationMode === 'by_period' ? (
                  <>
                    <DiscrepanciesTable
                      discrepancies={filteredDiscrepancies}
                      darkMode={darkMode}
                      getSeverityColor={getSeverityColor}
                    />

                    <ResultsSummary
                      results={results}
                      darkMode={darkMode}
                      selectedTab={selectedTab}
                      setSelectedTab={setSelectedTab}
                      reportFormat={reportFormat}
                      setReportFormat={setReportFormat}
                      exportFormat={exportFormat}
                      setExportFormat={setExportFormat}
                      isDownloading={isDownloading}
                      onDownloadReport={handleDownloadReport}
                      onExportData={handleExportData}
                      onEmailReport={handleEmailReport}
                      formatCurrency={formatCurrency}
                      reconciliationMode={reconciliationMode}
                    />
                  </>
                ) : (
                  <>
                    <ResultsSummary
                      results={results}
                      darkMode={darkMode}
                      selectedTab={selectedTab}
                      setSelectedTab={setSelectedTab}
                      reportFormat={reportFormat}
                      setReportFormat={setReportFormat}
                      exportFormat={exportFormat}
                      setExportFormat={setExportFormat}
                      isDownloading={isDownloading}
                      onDownloadReport={handleDownloadReport}
                      onExportData={handleExportData}
                      onEmailReport={handleEmailReport}
                      formatCurrency={formatCurrency}
                      reconciliationMode={reconciliationMode}
                    />

                    <DiscrepanciesTable
                      discrepancies={filteredDiscrepancies}
                      darkMode={darkMode}
                      getSeverityColor={getSeverityColor}
                    />
                  </>
                )}
              </>
            )}
          </div>
        </div>

        <FilePreviewModal
          showPreview={showPreview}
          setShowPreview={setShowPreview}
          uploadedFile={uploadedFile}
          darkMode={darkMode}
        />

        <ErrorMessage
          error={error}
          setError={setError}
          darkMode={darkMode}
          onRetry={handleRetry}
        />
      </div>
    </div>
  );
}
