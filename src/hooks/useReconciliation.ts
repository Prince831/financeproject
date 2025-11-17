import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from './useAuth';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

export interface FieldComparison {
  label: string;
  documentValue: string;
  databaseValue: string;
  difference: string;
  severity: string;
  hasDifference: boolean;
}

export interface TransactionComparison {
  transaction_id: string;
  fields: Record<string, FieldComparison>;
  document_net: string;
  database_net: string;
  net_change: string;
  discrepancy_count: number;
  source?: 'document' | 'database';
  status?: string;
  document_record?: Record<string, any> | null;
  database_record?: Record<string, any> | null;
}

export interface ReconciliationSummary {
  total_document_net: string;
  total_database_net: string;
  total_net_change: string;
  total_transactions: number;
  discrepancy_count: number;
}

export interface FileResult {
  totalRecords: number;
  matched: number;
  discrepancies: number;
  missing: number;
  mismatched: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  totalDebitVariance: number;
  totalCreditVariance: number;
  netVariance: number;
  balanceStatus: string;
  comparisonTime: string;
  timestamp: string;
  user: string;
  records: TransactionComparison[];
  summary?: ReconciliationSummary;
  reference?: string;
  docOnlyCount?: number;
  dbOnlyCount?: number;
  fileRecords?: number;
}

export interface HistoryItem {
  id: number;
  filename: string;
  date: string;
  user: string;
  discrepancies: number;
  amount: number;
  status: string;
}

export interface ProgressStatus {
  step: string;
  progress: number;
  message: string;
  completed: boolean;
  error?: boolean;
  result?: any;
}

export const useReconciliation = (reconciliationMode: 'by_period' | 'by_transaction_id', startDate: string, endDate: string) => {
  const { token, isAuthenticated } = useAuth();

  const getAuthHeaders = () =>
    token
      ? {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      : {};

  // Load initial state from localStorage
  const getInitialState = (key: string, defaultValue: any) => {
    try {
      const item = localStorage.getItem(`auditSync_${key}`);
      if (!item) return defaultValue;
      
      // Special handling for uploadedFile - we only store metadata, not the actual File
      if (key === 'uploadedFile') {
        // Return null since we can't recreate a File object from localStorage
        return null;
      }
      
      const parsed = JSON.parse(item);
      return parsed;
    } catch (error) {
      // Silently fail and return default - don't log errors on every render
      return defaultValue;
    }
  };

  const [uploadedFile, setUploadedFile] = useState<File | null>(() => getInitialState('uploadedFile', null));
  const [isDragging, setIsDragging] = useState(false);
  const [currentStep, setCurrentStep] = useState<'idle' | 'processing' | 'complete'>(() => getInitialState('currentStep', 'idle'));
  const [progress, setProgress] = useState(() => getInitialState('progress', 0));
  const [progressStatus, setProgressStatus] = useState<ProgressStatus | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  // sessionId is used for progress polling and API communication
  const [results, setResults] = useState<FileResult | null>(() => getInitialState('results', null));
  const [error, setError] = useState<string | null>(() => getInitialState('error', null));
  const [errorType, setErrorType] = useState<string | undefined>(() => getInitialState('errorType', undefined));
  const [isDownloading, setIsDownloading] = useState(false);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    try {
      // File objects cannot be stringified, so only save metadata
      if (uploadedFile) {
        const fileMetadata = {
          name: uploadedFile.name,
          size: uploadedFile.size,
          type: uploadedFile.type,
          lastModified: uploadedFile.lastModified,
        };
        localStorage.setItem('auditSync_uploadedFile', JSON.stringify(fileMetadata));
      } else {
        localStorage.removeItem('auditSync_uploadedFile');
      }
    } catch {
      // Silently fail - localStorage might be disabled or full
    }
  }, [uploadedFile]);

  useEffect(() => {
    try {
      localStorage.setItem('auditSync_currentStep', JSON.stringify(currentStep));
    } catch {
      // Silently fail - localStorage might be disabled or full
    }
  }, [currentStep]);

  useEffect(() => {
    try {
      localStorage.setItem('auditSync_progress', JSON.stringify(progress));
    } catch {
      // Silently fail - localStorage might be disabled or full
    }
  }, [progress]);

  useEffect(() => {
    try {
      if (results) {
        localStorage.setItem('auditSync_results', JSON.stringify(results));
      } else {
        localStorage.removeItem('auditSync_results');
      }
    } catch {
      // Silently fail - localStorage might be disabled, full, or results might be too large
      // Try to remove the item if it exists
      try {
        localStorage.removeItem('auditSync_results');
      } catch {
        // Ignore errors when removing
      }
    }
  }, [results]);

  useEffect(() => {
    try {
      localStorage.setItem('auditSync_error', JSON.stringify(error));
    } catch {
      // Silently fail - localStorage might be disabled or full
    }
  }, [error]);

  useEffect(() => {
    try {
      localStorage.setItem('auditSync_errorType', JSON.stringify(errorType));
    } catch {
      // Silently fail - localStorage might be disabled or full
    }
  }, [errorType]);

  const resetAll = () => {
    setUploadedFile(null);
    setResults(null);
    setCurrentStep('idle');
    setProgress(0);
    setProgressStatus(null);
    setSessionId(null);
    setError(null);
    setErrorType(undefined);
    // Clear localStorage for reconciliation state
    localStorage.removeItem('auditSync_uploadedFile');
    localStorage.removeItem('auditSync_currentStep');
    localStorage.removeItem('auditSync_progress');
    localStorage.removeItem('auditSync_results');
    localStorage.removeItem('auditSync_error');
    localStorage.removeItem('auditSync_errorType');
  };

  // Poll for progress updates
  const pollProgress = async (sessionId: string) => {
    if (!token) {
      console.warn('useReconciliation: Cannot poll progress without auth token');
      return null;
    }

    try {
      const response = await axios.get(
        `${API_BASE}/reconciliation-progress?session_id=${sessionId}`,
        getAuthHeaders()
      );
      const progressData = response.data;

      setProgressStatus(progressData);
      setProgress(progressData.progress);

      if (progressData.completed && progressData.result) {
        setResults(progressData.result);
        setCurrentStep('complete');
      } else if (progressData.error) {
        setError(progressData.message);
        setCurrentStep('idle');
        setProgress(0);
      }

      return progressData;
    } catch (err) {
      console.error('Error polling progress:', err);
      return null;
    }
  };

  // Clear all uploaded files and results on fresh app start - user must upload fresh each time
  useEffect(() => {
    // Always clear uploaded file and results on app restart for fresh start experience
    localStorage.removeItem('auditSync_uploadedFile');
    localStorage.removeItem('auditSync_results');
    localStorage.removeItem('auditSync_currentStep');
    localStorage.removeItem('auditSync_progress');
    localStorage.removeItem('auditSync_error');
    localStorage.removeItem('auditSync_errorType');

    // Reset state to clean slate
    setUploadedFile(null);
    setResults(null);
    setCurrentStep('idle');
    setProgress(0);
    setError(null);
    setErrorType(undefined);
  }, []);

  const startComparison = async (fileOverride?: File) => {
    // Use fileOverride if provided, otherwise use uploadedFile from state
    const fileToUse = fileOverride || uploadedFile;
    
    console.log('useReconciliation: startComparison called', {
      isAuthenticated,
      hasToken: !!token,
      hasFile: !!fileToUse,
      hasFileOverride: !!fileOverride,
      hasUploadedFile: !!uploadedFile,
      reconciliationMode,
      startDate,
      endDate
    });

    if (!isAuthenticated || !token) {
      console.error('useReconciliation: Not authenticated');
      setError('Authentication required. Please log in again.');
      return;
    }

    if (!fileToUse) {
      console.error('useReconciliation: No file provided');
      setError('Please upload a file first.');
      return;
    }
    
    if (reconciliationMode === 'by_period' && (!startDate || !endDate)) {
      console.error('useReconciliation: Missing dates for period mode');
      setError('Please select both start and end dates for period-based reconciliation.');
      return;
    }

    // Generate unique session ID for this reconciliation
    const newSessionId = `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log('useReconciliation: Generated session ID', newSessionId);
    setSessionId(newSessionId);
    setCurrentStep('processing');
    setProgress(0);
    setProgressStatus({
      step: 'uploading',
      progress: 0,
      message: 'Starting file upload...',
      completed: false
    });
    setError(null);
    setErrorType(undefined);

    const formData = new FormData();
    formData.append('file', fileToUse);
    formData.append('mode', reconciliationMode);
    formData.append('session_id', newSessionId);
    if (reconciliationMode === 'by_period') {
      formData.append('start_date', startDate);
      formData.append('end_date', endDate);
    }

    try {
      console.log('useReconciliation: Starting API call to /reconcile', {
        file: fileToUse.name,
        fileSize: fileToUse.size,
        mode: reconciliationMode,
        sessionId: newSessionId
      });

      // Start the reconciliation process
      const response = await axios.post(`${API_BASE}/reconcile`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        timeout: 300000, // 5 minutes timeout for large files
        onUploadProgress: (progressEvent) => {
          const percent = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
          setProgress(percent * 0.1); // Upload is 10% of total progress
          setProgressStatus({
            step: 'uploading',
            progress: percent * 0.1,
            message: `Uploading file... ${percent}%`,
            completed: false
          });
        }
      });

      console.log('useReconciliation: API response received', {
        status: response.status,
        hasData: !!response.data,
        dataKeys: response.data ? Object.keys(response.data) : [],
        totalRecords: response.data?.totalRecords,
        hasResult: response.data?.totalRecords !== undefined
      });

      // Check if response contains result (synchronous completion)
      if (response.data && response.data.totalRecords !== undefined) {
        console.log('useReconciliation: Reconciliation completed synchronously', {
          totalRecords: response.data.totalRecords,
          matched: response.data.matched,
          discrepancies: response.data.discrepancies,
          fileRecords: response.data.fileRecords,
          docOnlyCount: response.data.docOnlyCount,
          dbOnlyCount: response.data.dbOnlyCount
        });
        setResults(response.data);
        setCurrentStep('complete');
        setProgress(100);
        setProgressStatus({
          step: 'complete',
          progress: 100,
          message: 'Reconciliation completed successfully!',
          completed: true,
          result: response.data
        });
        console.log('useReconciliation: Results set, step set to complete');
        return; // Exit early if we got the result directly
      }

      console.log('useReconciliation: No direct result, starting polling');

      // If no direct result, start polling for progress updates
      let pollInterval: NodeJS.Timeout | null = null;
      let pollTimeout: NodeJS.Timeout | null = null;
      let pollCount = 0;
      const maxPolls = 300; // 5 minutes max (300 seconds * 1 second intervals)
      
      pollInterval = setInterval(async () => {
        try {
          pollCount++;
          const progressData = await pollProgress(newSessionId);
          if (progressData) {
            console.log('useReconciliation: Progress update received', {
              step: progressData.step,
              progress: progressData.progress,
              completed: progressData.completed,
              error: progressData.error,
              pollCount
            });
            
            if (progressData.completed) {
              console.log('useReconciliation: Reconciliation completed via polling');
              if (pollInterval) clearInterval(pollInterval);
              if (pollTimeout) clearTimeout(pollTimeout);
              return;
            }
            
            if (progressData.error) {
              console.error('useReconciliation: Reconciliation error via polling', progressData);
              setError(progressData.message || 'Reconciliation failed');
              setCurrentStep('idle');
              setProgress(0);
              if (pollInterval) clearInterval(pollInterval);
              if (pollTimeout) clearTimeout(pollTimeout);
              return;
            }
          }
          
          // Safety check: stop polling after max attempts
          if (pollCount >= maxPolls) {
            console.warn('useReconciliation: Max polling attempts reached');
            if (pollInterval) clearInterval(pollInterval);
            if (pollTimeout) clearTimeout(pollTimeout);
            setError('Reconciliation is taking longer than expected. Please check the history for results.');
            setCurrentStep('idle');
          }
        } catch (err) {
          console.error('useReconciliation: Error during polling', err);
          // Don't stop polling on individual errors, but log them
        }
      }, 1000); // Poll every second

      // Set a timeout to stop polling after 5 minutes (safety net)
      pollTimeout = setTimeout(() => {
        if (pollInterval) clearInterval(pollInterval);
        if (currentStep === 'processing') {
          console.error('useReconciliation: Reconciliation timed out after 5 minutes');
          setError('Reconciliation is taking longer than expected. The process may still be running in the background. Please check the history for results.');
          setCurrentStep('idle');
          setProgress(0);
        }
      }, 300000); // 5 minutes for large file processing

    } catch (err: any) {
      console.error('Reconciliation error:', err);

      // Handle validation errors
      if (err.response?.status === 422 && err.response?.data?.validation_errors) {
        const validationMessages = err.response.data.validation_errors.map((error: any) => error.message).join(' ');
        setError(validationMessages);
        setErrorType('validation_error');
      } else {
        // Handle other error types
        setError(err.response?.data?.message || 'Reconciliation failed. Please check your file and try again.');
        setErrorType(err.response?.data?.error_type || 'reconciliation_processing_error');
      }

      setCurrentStep('idle');
      setProgress(0);
      setProgressStatus(null);
      setSessionId(null);
    }
  };

  const handleDownloadReport = async (reportFormat: string) => {
    if (!results) return;
    if (!token) {
      console.warn('useReconciliation: Cannot download report without auth token');
      setError('Authentication required. Please log in again.');
      return;
    }
    setIsDownloading(true);
    try {
      const res = await axios.post(
        `${API_BASE}/download-report`,
        { reportData: results, format: reportFormat },
        {
          responseType: 'blob',
          ...getAuthHeaders(),
        }
      );
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `reconciliation_report.${reportFormat}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to download report.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleEmailReport = async () => {
    if (!results) return;
    if (!token) {
      console.warn('useReconciliation: Cannot email report without auth token');
      setError('Authentication required. Please log in again.');
      return;
    }
    try {
      await axios.post(
        `${API_BASE}/email-report`,
        { reportData: results },
        getAuthHeaders()
      );
      alert('Report emailed successfully.');
    } catch (err: any) {
      console.error(err);
      // Don't set error for email failures - just log and show user-friendly message
      alert('Email functionality is disabled for unauthenticated access.');
    }
  };

  return {
    uploadedFile,
    setUploadedFile,
    isDragging,
    setIsDragging,
    currentStep,
    progress,
    progressStatus,
    results,
    error,
    errorType,
    setError,
    isDownloading,
    resetAll,
    startComparison,
    handleDownloadReport,
    handleEmailReport,
  };
};