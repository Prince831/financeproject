import { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = 'http://127.0.0.1:8002/api';

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
  const [results, setResults] = useState<FileResult | null>(() => getInitialState('results', null));
  const [error, setError] = useState<string | null>(() => getInitialState('error', null));
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

  const resetAll = () => {
    setUploadedFile(null);
    setResults(null);
    setCurrentStep('idle');
    setProgress(0);
    setError(null);
    // Clear localStorage for reconciliation state
    localStorage.removeItem('auditSync_uploadedFile');
    localStorage.removeItem('auditSync_currentStep');
    localStorage.removeItem('auditSync_progress');
    localStorage.removeItem('auditSync_results');
    localStorage.removeItem('auditSync_error');
  };

  // Clear all uploaded files and results on fresh app start - user must upload fresh each time
  useEffect(() => {
    // Always clear uploaded file and results on app restart for fresh start experience
    localStorage.removeItem('auditSync_uploadedFile');
    localStorage.removeItem('auditSync_results');
    localStorage.removeItem('auditSync_currentStep');
    localStorage.removeItem('auditSync_progress');
    localStorage.removeItem('auditSync_error');

    // Reset state to clean slate
    setUploadedFile(null);
    setResults(null);
    setCurrentStep('idle');
    setProgress(0);
    setError(null);
  }, []);

  const startComparison = async () => {
    if (!uploadedFile) return setError('Please upload a file first.');
    if (reconciliationMode === 'by_period' && (!startDate || !endDate)) {
      return setError('Please select both start and end dates for period-based reconciliation.');
    }
    setCurrentStep('processing');
    setProgress(10);

    const formData = new FormData();
    formData.append('file', uploadedFile);
    formData.append('mode', reconciliationMode);
    if (reconciliationMode === 'by_period') {
      formData.append('start_date', startDate);
      formData.append('end_date', endDate);
    }

    try {
      const res = await axios.post(`${API_BASE}/reconcile`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000, // Increased to 60 seconds for better performance
        onUploadProgress: (progressEvent) => {
          const percent = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
          setProgress(percent / 2 + 10);
        }
      });

      setProgress(90);

      // Process results immediately
      setResults(res.data);
      setCurrentStep('complete');
      setProgress(100);
    } catch (err: any) {
      console.error('Reconciliation error:', err);
      setError(err.response?.data?.message || 'Reconciliation failed.');
      setCurrentStep('idle');
      setProgress(0);
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
    results,
    error,
    setError,
    isDownloading,
    resetAll,
    startComparison,
    handleDownloadReport,
    handleEmailReport,
  };
};