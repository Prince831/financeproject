import { useState, useEffect } from 'react';
import axios from 'axios';
import { useReconciliation } from './useReconciliation';
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
  const { isAuthenticated } = useAuth();

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
  const [reconciliationResults, setReconciliationResults] = useState<any>(null);
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

  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

  // Fetch transactions and summary on component mount and when filters change
  // Only make API calls when authenticated
  useEffect(() => {
    console.log('useReconciliationManager: useEffect triggered, isAuthenticated:', isAuthenticated);
    if (isAuthenticated) {
      console.log('useReconciliationManager: User authenticated, fetching data');
      fetchTransactions();
      fetchSummary();
    } else {
      console.log('useReconciliationManager: User not authenticated, skipping API calls');
    }
  }, [startDate, endDate, reconciliationMode, useEntireDocument, currentPage, isAuthenticated]);

  // Update reconciling state based on currentStep
  useEffect(() => {
    setReconciling(currentStep === 'processing');
  }, [currentStep]);

  // Update reconciliation results when results change
  useEffect(() => {
    console.log('useReconciliationManager: Results updated:', results ? 'Results available' : 'No results');
    if (results) {
      setReconciliationResults(results);
    }
  }, [results]);

  const fetchTransactions = async () => {
    try {
      console.log('useReconciliationManager: Fetching transactions');
      setLoading(true);
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      params.append('page', currentPage.toString());
      params.append('per_page', perPage.toString());

      console.log('useReconciliationManager: API call to', `${API_BASE}/transactions?${params}`);
      const response = await axios.get(`${API_BASE}/transactions?${params}`);
      console.log('useReconciliationManager: Transactions fetched successfully, count:', response.data.data?.length || 0);
      setTransactions(response.data.data || []);
      setTotalPages(response.data.last_page || 1);
    } catch (err) {
      console.error('useReconciliationManager: Error fetching transactions:', err);
      setError('Failed to fetch transactions');
    } finally {
      setLoading(false);
      console.log('useReconciliationManager: Fetch transactions complete');
    }
  };

  const fetchSummary = async () => {
    try {
      console.log('useReconciliationManager: Fetching transaction summary');
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);

      console.log('useReconciliationManager: API call to', `${API_BASE}/transaction-summary?${params}`);
      const response = await axios.get(`${API_BASE}/transaction-summary?${params}`);
      console.log('useReconciliationManager: Summary fetched successfully');
      setSummary(response.data);
    } catch (err) {
      console.error('useReconciliationManager: Error fetching summary:', err);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    console.log('useReconciliationManager: Starting file upload for:', file.name);

    // For period mode, check dates unless using entire document
    if (reconciliationMode === 'by_period' && !useEntireDocument && (!startDate || !endDate)) {
      setError('Please select both start and end dates before uploading, or check "Use entire document"');
      return;
    }

    try {
      setUploading(true);
      setError(null);
      setErrorType(undefined);
      setUploadedFileName(file.name);

      console.log('useReconciliationManager: Setting uploaded file in reconciliation hook');
      setUploadedFile(file);

      console.log('useReconciliationManager: Starting reconciliation comparison');
      // Use the enhanced reconciliation hook's startComparison method
      await startComparison();

      console.log('useReconciliationManager: Reconciliation started, waiting for completion...');

      // Wait for reconciliation to complete by polling the results
      // This fixes the race condition where results weren't available immediately
      let attempts = 0;
      const maxAttempts = 30; // Reduced to 30 seconds for faster feedback

      console.log('useReconciliationManager: Starting completion polling...');

      while (attempts < maxAttempts) {
        console.log(`useReconciliationManager: Checking results (attempt ${attempts + 1}/${maxAttempts})`);

        // Check if reconciliation completed successfully
        if (results && currentStep === 'complete') {
          console.log('useReconciliationManager: Reconciliation completed successfully');
          setReconciliationResults(results);
          await fetchTransactions();
          await fetchSummary();
          break;
        }

        // Check if there was an error
        if (error && currentStep === 'idle') {
          console.log('useReconciliationManager: Reconciliation failed with error');
          // Error is already set by the reconciliation hook
          break;
        }

        // Wait 500ms before checking again (faster polling)
        await new Promise(resolve => setTimeout(resolve, 500));
        attempts++;
      }

      if (attempts >= maxAttempts) {
        console.error('useReconciliationManager: Reconciliation timed out after', maxAttempts, 'seconds');
        setError('Reconciliation is taking longer than expected. Please try again.');
        setUploadedFileName(null);
        setUploadedFile(null);
      } else {
        console.log('useReconciliationManager: Reconciliation completed in', attempts * 0.5, 'seconds');
      }

    } catch (err: any) {
      console.error('useReconciliationManager: Upload error:', err);
      setError('Upload failed. Please check your file and try again.');
      setErrorType('file_upload_error');
      setUploadedFileName(null);
      setUploadedFile(null);
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
      alert(`Manual reconciliation completed!\n\n` +
            `✅ Records analyzed: ${results.totalRecords || 0}\n` +
            `⚠️ Data quality issues found: ${results.discrepancies || 0}\n\n` +
            `Check below for detailed discrepancy information.`);

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

  const generateStatement = async () => {
    try {
      setError(null);
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);

      await axios.get(`${API_BASE}/generate-statement?${params}`);
      alert('Statement generated successfully! Use the filters to view the filtered data.');
      await fetchTransactions();
      await fetchSummary();
      setCurrentPage(1); // Reset to first page after filtering
    } catch (err: any) {
      setError('Failed to generate statement');
      console.error('Statement generation error:', err);
    }
  };

  const exportPDF = async () => {
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
    generateStatement,
    exportPDF,
    resetUpload,
    fetchTransactions,
    fetchSummary,
  };
};