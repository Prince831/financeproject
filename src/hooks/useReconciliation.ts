import { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

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
  records: Discrepancy[];
  reference?: string;
}

export interface Discrepancy {
  id: string;
  field: string;
  documentValue: string;
  databaseValue: string | null;
  difference: string;
  type: string;
  severity: string;
  account: string;
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
  // Load initial state from localStorage
  const getInitialState = (key: string, defaultValue: any) => {
    try {
      const item = localStorage.getItem(`auditSync_${key}`);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  };

  const [uploadedFile, setUploadedFile] = useState<File | null>(() => getInitialState('uploadedFile', null));
  const [isDragging, setIsDragging] = useState(false);
  const [currentStep, setCurrentStep] = useState<'idle' | 'processing' | 'complete'>(() => getInitialState('currentStep', 'idle'));
  const [progress, setProgress] = useState(() => getInitialState('progress', 0));
  const [progressStatus, setProgressStatus] = useState<ProgressStatus | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [results, setResults] = useState<FileResult | null>(() => getInitialState('results', null));
  const [error, setError] = useState<string | null>(() => getInitialState('error', null));
  const [errorType, setErrorType] = useState<string | undefined>(() => getInitialState('errorType', undefined));
  const [isDownloading, setIsDownloading] = useState(false);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('auditSync_uploadedFile', JSON.stringify(uploadedFile));
  }, [uploadedFile]);

  useEffect(() => {
    localStorage.setItem('auditSync_currentStep', JSON.stringify(currentStep));
  }, [currentStep]);

  useEffect(() => {
    localStorage.setItem('auditSync_progress', JSON.stringify(progress));
  }, [progress]);

  useEffect(() => {
    localStorage.setItem('auditSync_results', JSON.stringify(results));
  }, [results]);

  useEffect(() => {
    localStorage.setItem('auditSync_error', JSON.stringify(error));
  }, [error]);

  useEffect(() => {
    localStorage.setItem('auditSync_errorType', JSON.stringify(errorType));
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
    try {
      const response = await axios.get(`${API_BASE}/reconciliation-progress?session_id=${sessionId}`);
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

  const startComparison = async () => {
    if (!uploadedFile) return setError('Please upload a file first.');
    if (reconciliationMode === 'by_period' && (!startDate || !endDate)) {
      return setError('Please select both start and end dates for period-based reconciliation.');
    }

    // Generate unique session ID for this reconciliation
    const newSessionId = `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
    formData.append('file', uploadedFile);
    formData.append('mode', reconciliationMode);
    formData.append('session_id', newSessionId);
    if (reconciliationMode === 'by_period') {
      formData.append('start_date', startDate);
      formData.append('end_date', endDate);
    }

    try {
      // Start the reconciliation process
      const res = await axios.post(`${API_BASE}/reconcile`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
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

      // Start polling for progress updates
      const pollInterval = setInterval(async () => {
        const progressData = await pollProgress(newSessionId);
        if (progressData && (progressData.completed || progressData.error)) {
          clearInterval(pollInterval);
        }
      }, 1000); // Poll every second

      // Set a timeout to stop polling after 5 minutes
      setTimeout(() => {
        clearInterval(pollInterval);
        if (currentStep === 'processing') {
          setError('Reconciliation is taking longer than expected. Please check back later.');
          setCurrentStep('idle');
          setProgress(0);
        }
      }, 300000);

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
    setIsDownloading(true);
    try {
      const res = await axios.post(`${API_BASE}/download-report`, { reportData: results, format: reportFormat }, { responseType: 'blob' });
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
    try {
      await axios.post(`${API_BASE}/email-report`, { reportData: results });
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