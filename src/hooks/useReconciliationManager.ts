import { useState, useEffect } from 'react';
import axios from 'axios';
import { useReconciliation, FileResult } from './useReconciliation';
import { useAuth } from './useAuth';

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

export const useReconciliationManager = () => {
  // Import useAuth here to check authentication status
  const { isAuthenticated, token } = useAuth();

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
  const [errorType, setErrorType] = useState<string | undefined>(undefined);
  const [uploading, setUploading] = useState(false);
  const [reconciling, setReconciling] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [reconciliationResults, setReconciliationResults] = useState<FileResult | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
const [totalPages, setTotalPages] = useState(1);
const [perPage] = useState(50);

  // Use the enhanced reconciliation hook
const {
  setUploadedFile,
  currentStep,
  progress,
  progressStatus,
  results,
  startComparison,
  resetAll: resetReconciliation,
} = useReconciliation(reconciliationMode, startDate, endDate);

  // Sync results from useReconciliation hook to reconciliationResults
  useEffect(() => {
    try {
      if (results && currentStep === 'complete') {
        // Transform results from useReconciliation to FileResult format
        const fileResult: FileResult = {
          totalRecords: results.totalRecords || 0,
          matched: results.matched || 0,
          discrepancies: results.discrepancies || 0,
          missing: results.missing || results.docOnlyCount || 0,
          mismatched: results.mismatched || results.dbOnlyCount || 0,
          critical: results.critical || 0,
          high: results.high || 0,
          medium: results.medium || 0,
          low: results.low || 0,
          totalDebitVariance: results.totalDebitVariance || 0,
          totalCreditVariance: results.totalCreditVariance || 0,
          netVariance: results.netVariance || 0,
          balanceStatus: results.balanceStatus || 'unknown',
          comparisonTime: results.comparisonTime || 'N/A',
          timestamp: results.timestamp || new Date().toISOString(),
          user: results.user || 'Unknown',
          records: Array.isArray(results.records) ? results.records : [],
          reference: results.reference,
          fileRecords: results.fileRecords || results.totalRecords || 0,
          docOnlyCount: results.docOnlyCount || results.missing || 0,
          dbOnlyCount: results.dbOnlyCount || results.mismatched || 0,
        };
        setReconciliationResults(fileResult);
        setReconciling(false); // Stop reconciling state when complete
        console.log('useReconciliationManager: Synced results from useReconciliation hook', fileResult);
      } else if (currentStep === 'idle') {
        setReconciling(false); // Stop reconciling state on idle
      }
    } catch (error) {
      console.error('useReconciliationManager: Error syncing results', error);
      setReconciling(false);
    }
  }, [results, currentStep]);

  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

  // Fetch transactions and summary on component mount and when filters change
  // Only make API calls when authenticated
  const getAuthHeaders = () =>
    token
      ? {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      : {};

  useEffect(() => {
    console.log(
      'useReconciliationManager: useEffect triggered, isAuthenticated:',
      isAuthenticated,
      'token present:',
      !!token
    );
    if (isAuthenticated && token) {
      console.log('useReconciliationManager: User authenticated, fetching data');
      fetchTransactions();
      fetchSummary();
    } else {
      console.log('useReconciliationManager: User not authenticated or missing token, skipping API calls');
    }
  }, [startDate, endDate, reconciliationMode, useEntireDocument, currentPage, isAuthenticated, token]);

  // Update reconciling state based on currentStep
  useEffect(() => {
    setReconciling(currentStep === 'processing');
  }, [currentStep]);

  // Note: Results syncing is handled in the useEffect above (lines 70-102)
  // This duplicate useEffect has been removed to prevent conflicts

  const fetchTransactions = async () => {
    if (!token) {
      console.warn('useReconciliationManager: Cannot fetch transactions without auth token');
      return;
    }

    try {
      console.log('useReconciliationManager: Fetching transactions');
      setLoading(true);
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      params.append('page', currentPage.toString());
      params.append('per_page', perPage.toString());

      console.log('useReconciliationManager: API call to', `${API_BASE}/transactions?${params}`);
      const response = await axios.get(
        `${API_BASE}/transactions?${params}`,
        getAuthHeaders()
      );
      console.log('useReconciliationManager: Transactions fetched successfully, count:', response.data.data?.length || 0);
      setTransactions(response.data.data || []);
      setTotalPages(response.data.last_page || 1);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        console.error('useReconciliationManager: Error fetching transactions:', {
          message: err.message,
          status: err.response?.status,
          statusText: err.response?.statusText,
          data: err.response?.data,
          url: err.config?.url
        });
        
        const errorMessage = err.response?.data?.message || 'Failed to fetch transactions. Please try again.';
        setError(errorMessage);
        setErrorType(err.response?.data?.error_type || 'transactions_fetch_error');
      } else {
        console.error('useReconciliationManager: Unexpected error fetching transactions:', err);
        setError('An unexpected error occurred while fetching transactions.');
      }
    } finally {
      setLoading(false);
      console.log('useReconciliationManager: Fetch transactions complete');
    }
  };

  const fetchSummary = async () => {
    if (!token) {
      console.warn('useReconciliationManager: Cannot fetch summary without auth token');
      return;
    }

    try {
      console.log('useReconciliationManager: Fetching transaction summary');
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);

      console.log('useReconciliationManager: API call to', `${API_BASE}/transaction-summary?${params}`);
      const response = await axios.get(
        `${API_BASE}/transaction-summary?${params}`,
        getAuthHeaders()
      );
      console.log('useReconciliationManager: Summary fetched successfully');
      setSummary(response.data);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        console.error('useReconciliationManager: Error fetching summary:', {
          message: err.message,
          status: err.response?.status,
          statusText: err.response?.statusText,
          data: err.response?.data,
          url: err.config?.url
        });
        
        // Only set error if it's not a 401/403 (auth issues are handled elsewhere)
        if (err.response?.status && err.response.status >= 500) {
          setError('Failed to fetch transaction summary. Please try again later.');
          setErrorType('summary_fetch_error');
        }
      } else {
        console.error('useReconciliationManager: Unexpected error fetching summary:', err);
      }
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!token) {
      console.warn('useReconciliationManager: Cannot upload file without auth token');
      setError('Authentication required. Please log in again.');
      return;
    }

    console.log('useReconciliationManager: Starting file upload for:', file.name);

    // For period mode, check dates unless using entire document
    if (reconciliationMode === 'by_period' && !useEntireDocument && (!startDate || !endDate)) {
      setError('Please select both start and end dates before uploading, or check "Use entire document"');
      return;
    }

    try {
      setUploading(true);
      setReconciling(true); // Start reconciling state
      setError(null);
      setErrorType(undefined);
      setUploadedFileName(file.name);
      setReconciliationResults(null); // Clear previous results

      console.log('useReconciliationManager: Setting uploaded file in reconciliation hook', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      });
      setUploadedFile(file);

      console.log('useReconciliationManager: Starting reconciliation comparison');
      // Use the enhanced reconciliation hook's startComparison method
      // Pass the file directly to avoid async state update issues
      try {
        await startComparison(file); // Pass file directly to avoid state timing issues
        console.log('useReconciliationManager: startComparison completed successfully');
      } catch (comparisonError: any) {
        console.error('useReconciliationManager: startComparison error', comparisonError);
        throw comparisonError; // Re-throw to be caught by outer catch
      }

      console.log('useReconciliationManager: Reconciliation initiated; awaiting hook updates');
    } catch (err: any) {
      console.error('useReconciliationManager: Upload error:', err);
      setError('Upload failed. Please check your file and try again.');
      setErrorType('file_upload_error');
      setUploadedFileName(null);
      setUploadedFile(null);
      setReconciling(false);
    } finally {
      setUploading(false);
      console.log('useReconciliationManager: File upload process complete');
    }
  };

  const handleReconcile = async () => {
    // For period mode, check dates unless using entire document
    if (reconciliationMode === 'by_period' && !useEntireDocument && (!startDate || !endDate)) {
      setError('Please select both start and end dates, or check "Use entire document"');
      return;
    }

    // Manual reconciliation doesn't require a file upload - it analyzes existing database records

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

      if (!token) {
        console.warn('useReconciliationManager: Cannot reconcile without auth token');
        setError('Authentication required. Please log in again.');
        return;
      }

      // Call reconciliation API and capture the result
      const response = await axios.post(
        `${API_BASE}/reconcile-manual`,
        reconcileData,
        getAuthHeaders()
      );

      // Transform the response to FileResult format and set it
      if (response.data) {
        const result: FileResult = {
          totalRecords: response.data.totalRecords || 0,
          matched: response.data.matched || 0,
          discrepancies: response.data.discrepancies || 0,
          missing: response.data.missing || 0,
          mismatched: response.data.mismatched || 0,
          critical: response.data.critical || 0,
          high: response.data.high || 0,
          medium: response.data.medium || 0,
          low: response.data.low || 0,
          totalDebitVariance: response.data.totalDebitVariance || 0,
          totalCreditVariance: response.data.totalCreditVariance || 0,
          netVariance: response.data.netVariance || 0,
          balanceStatus: response.data.balanceStatus || 'unknown',
          comparisonTime: response.data.comparisonTime || 'N/A',
          timestamp: response.data.timestamp || new Date().toISOString(),
          user: response.data.user || 'Unknown',
          records: response.data.records || [],
          reference: response.data.reference,
          fileRecords: response.data.fileRecords || response.data.totalRecords || 0,
          docOnlyCount: response.data.docOnlyCount || 0,
          dbOnlyCount: response.data.dbOnlyCount || 0,
        };
        setReconciliationResults(result);
        console.log('useReconciliationManager: Reconciliation results set', result);
      }

      // Refresh data after reconciliation
      await fetchTransactions();
      await fetchSummary();
      setCurrentPage(1); // Reset to first page after reconciliation

    } catch (err: any) {
      console.error('Reconciliation error:', err);

      // Handle validation errors
      if (err.response?.status === 422 && err.response?.data?.validation_errors) {
        const validationMessages = err.response.data.validation_errors.map((error: any) => error.message).join(' ');
        setError(validationMessages);
        setErrorType('validation_error');
      } else {
        // Handle other error types
        setError(err.response?.data?.message || 'Reconciliation failed. Please try again.');
        setErrorType(err.response?.data?.error_type || 'reconciliation_processing_error');
      }
    } finally {
      setReconciling(false);
    }
  };

  const exportPDF = async () => {
    try {
      setError(null);
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);

      if (!token) {
        console.warn('useReconciliationManager: Cannot export PDF without auth token');
        setError('Authentication required. Please log in again.');
        return;
      }

      const response = await axios.post(
        `${API_BASE}/export-pdf`,
        {
          transactions: transactions,
          summary: summary,
          filters: { startDate, endDate, reconciliationMode },
        },
        {
          responseType: 'blob',
          ...getAuthHeaders(),
        }
      );

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
  };

  const resetUpload = () => {
    setUploadedFileName(null);
    setReconciliationResults(null);
    setError(null);
    setErrorType(undefined);
    resetReconciliation();
  };

  return {
    // State
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
    perPage,
    progress,
    progressStatus,

    // Actions
    handleFileUpload,
    handleReconcile,
    exportPDF,
    resetUpload,
    fetchTransactions,
    fetchSummary,
  };
};