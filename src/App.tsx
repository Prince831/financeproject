import React, { useState } from 'react';
import {
  Upload, Database, FileText, CheckCircle2, Download, ArrowRight, X,
  FileSpreadsheet, FileCode, Calculator, Search, ChevronDown, Mail,
  User, Clock, TrendingUp, AlertTriangle, DollarSign, Shield, Zap,
  Activity, RefreshCw, BarChart3, Eye, PieChart, BarChart, Moon, Sun,
  Smartphone, Monitor, RotateCcw, FileJson, File
} from 'lucide-react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

interface FileResult {
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
}

interface Discrepancy {
  id: string;
  field: string;
  documentValue: string;
  databaseValue: string | null;
  difference: string;
  type: string;
  severity: string;
  account: string;
}

interface HistoryItem {
  id: number;
  filename: string;
  date: string;
  user: string;
  discrepancies: number;
  amount: number;
  status: string;
}

export default function DocumentComparisonPortal() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [currentStep, setCurrentStep] = useState<'idle' | 'processing' | 'complete'>('idle');
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<FileResult | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedTab, setSelectedTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [reportFormat, setReportFormat] = useState('pdf');
  const [showHistory, setShowHistory] = useState(false);
  const [comparisonHistory, setComparisonHistory] = useState<HistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [exportFormat, setExportFormat] = useState('json');

  // Upload handlers
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) setUploadedFile(e.dataTransfer.files[0]);
  };
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) setUploadedFile(e.target.files[0]);
  };

  // Reset everything
  const resetAll = () => {
    setUploadedFile(null);
    setResults(null);
    setCurrentStep('idle');
    setProgress(0);
    setShowDetails(false);
    setSearchTerm('');
    setSelectedTab('all');
    setError(null);
    setShowPreview(false);
  };

  // Toggle dark mode
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
  };

  // Preview file
  const previewFile = () => {
    if (uploadedFile) {
      setShowPreview(true);
    }
  };

  // Export data
  const exportData = () => {
    if (!results) return;

    const dataToExport = exportFormat === 'json'
      ? JSON.stringify(results, null, 2)
      : convertToCSV(results.records);

    const blob = new Blob([dataToExport], {
      type: exportFormat === 'json' ? 'application/json' : 'text/csv'
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `reconciliation_data.${exportFormat}`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  // Convert records to CSV
  const convertToCSV = (records: Discrepancy[]) => {
    if (records.length === 0) return '';

    const headers = Object.keys(records[0]).join(',');
    const rows = records.map(record =>
      Object.values(record).map(value =>
        typeof value === 'string' && value.includes(',') ? `"${value}"` : value
      ).join(',')
    );

    return [headers, ...rows].join('\n');
  };

  // Start reconciliation
  const startComparison = async () => {
    if (!uploadedFile) return setError('Please upload a file first.');
    setCurrentStep('processing');
    setProgress(10);

    const formData = new FormData();
    formData.append('file', uploadedFile);

    try {
      const res = await axios.post(`${API_BASE}/reconcile`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percent = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
          setProgress(percent / 2 + 10); // upload portion
        }
      });

      setProgress(70);

      // Simulate processing delay
      setTimeout(() => {
        setResults(res.data);
        setCurrentStep('complete');
        setProgress(100);
        // Optionally fetch history
        fetchHistory();
      }, 1000);
    } catch (err: any) {
      console.error('Reconciliation error:', err);
      setError(err.response?.data?.message || 'Reconciliation failed.');
      setCurrentStep('idle');
      setProgress(0);
    }
  };

  // Fetch history - disabled since we're not creating history records
  const fetchHistory = async () => {
    // History functionality disabled - no database writes allowed
    console.log('History fetch disabled');
  };

  // Filtered discrepancies
  const filteredDiscrepancies: Discrepancy[] = results?.records
    ?.filter(d => selectedTab === 'all' || d.severity.toLowerCase() === selectedTab)
    .filter(d => searchTerm === '' || d.id.toLowerCase().includes(searchTerm.toLowerCase()) || d.account.toLowerCase().includes(searchTerm.toLowerCase()))
    || [];

  // Download report
  const handleDownloadReport = async () => {
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

  // Email report - disabled since email requires authentication
  const handleEmailReport = async () => {
    if (!results) return;
    try {
      await axios.post(`${API_BASE}/email-report`, { reportData: results });
      alert('Report emailed successfully.');
    } catch (err: any) {
      console.error(err);
      setError('Email functionality is disabled for unauthenticated access.');
    }
  };

  // Helpers
  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical': return 'bg-red-100 border-red-600 text-red-700';
      case 'high': return 'bg-orange-100 border-orange-600 text-orange-700';
      case 'medium': return 'bg-yellow-100 border-yellow-600 text-yellow-700';
      case 'low': return 'bg-slate-100 border-slate-600 text-slate-700';
      default: return 'bg-slate-100 border-slate-600 text-slate-700';
    }
  };
  const formatCurrency = (value: number) => new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS' }).format(value || 0);
  const getFileIcon = (filename: string) => {
    if (filename.endsWith('.pdf')) return FileText;
    if (filename.endsWith('.xlsx') || filename.endsWith('.xls')) return FileSpreadsheet;
    if (filename.endsWith('.csv')) return FileCode;
    return FileText;
  };

  return (
    <div className={`min-h-screen w-screen ${darkMode ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white' : 'bg-gradient-to-br from-slate-50 via-white to-slate-100'}`}>
      {/* Top Navigation */}
      <nav className={`${darkMode ? 'bg-slate-900/95 backdrop-blur-sm border-slate-700' : 'bg-white/95 backdrop-blur-sm border-slate-200'} border-b shadow-lg sticky top-0 z-40`}>
        <div className="w-full px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl shadow-lg">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">AuditSync Pro</h1>
              <p className={`${darkMode ? 'text-slate-400' : 'text-slate-600'} text-sm`}>Financial Reconciliation Platform</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowHistory(!showHistory)} className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-all duration-200 ${darkMode ? 'text-slate-300 hover:text-white hover:bg-slate-800' : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'} hover:shadow-md`}>
              <Clock className="w-4 h-4" /><span className="hidden sm:inline">History</span>
            </button>
            <button onClick={toggleDarkMode} className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-all duration-200 ${darkMode ? 'text-slate-300 hover:text-white hover:bg-slate-800' : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'} hover:shadow-md`}>
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              <span className="hidden sm:inline">{darkMode ? 'Light' : 'Dark'}</span>
            </button>
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border shadow-sm ${darkMode ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-700'}`}>
              <User className="w-4 h-4 text-slate-500" /><span className="text-sm font-medium hidden sm:inline">Anonymous</span>
            </div>
          </div>
        </div>
      </nav>

      <div className="w-full px-6 lg:px-8 py-8 min-h-[calc(100vh-80px)] flex flex-col">
        {/* History Panel */}
        {showHistory && (
          <div className={`mb-6 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} rounded-xl border shadow-lg p-6 backdrop-blur-sm animate-in slide-in-from-top-4 duration-300`}>
            <div className="flex items-center justify-between mb-6">
              <h3 className={`text-xl font-bold flex items-center gap-3 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                <div className="p-2 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg animate-pulse">
                  <Activity className="w-5 h-5 text-white" />
                </div>
                Reconciliation History
              </h3>
              <button onClick={() => setShowHistory(false)} className={`p-2 rounded-lg transition-colors hover:scale-105 ${darkMode ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-600'}`}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              {comparisonHistory.length === 0 ? (
                <div className={`text-center py-8 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  <Activity className="w-12 h-12 mx-auto mb-3 opacity-50 animate-bounce" />
                  <p>No reconciliation history available</p>
                </div>
              ) : (
                comparisonHistory.map((item, index) => (
                  <div key={item.id} className={`flex items-center justify-between p-4 ${darkMode ? 'bg-slate-700/50 hover:bg-slate-700' : 'bg-slate-50 hover:bg-slate-100'} rounded-lg transition-all duration-200 cursor-pointer border ${darkMode ? 'border-slate-600' : 'border-slate-200'} hover:shadow-md hover:scale-[1.02] animate-in slide-in-from-left-${index % 2 === 0 ? '4' : '8'} duration-500`} style={{ animationDelay: `${index * 100}ms` }}>
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="p-2 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-sm">
                        <FileText className="w-5 h-5 text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className={`font-semibold text-sm truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>{item.filename}</div>
                        <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{item.date} • By {item.user}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <div className="text-right">
                        <div className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{formatCurrency(item.amount)}</div>
                        <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{item.discrepancies} variances</div>
                      </div>
                      <CheckCircle2 className="w-5 h-5 text-green-600 animate-pulse" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Centered Upload + Results Section */}
        <div className="flex-1 flex items-center justify-center w-full">
          <div className="w-full max-w-6xl mx-auto">
            {/* File Upload */}
            <div className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} rounded-2xl border shadow-2xl overflow-hidden backdrop-blur-sm animate-in zoom-in-95 duration-500 hover:shadow-3xl transition-all duration-300`}>
              <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 p-8 border-b border-blue-500/20 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-pulse"></div>
                <div className="relative z-10">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-4">
                    <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm animate-bounce">
                      <Upload className="w-6 h-6" />
                    </div>
                    Upload Financial Document
                  </h2>
                  <p className="text-blue-100 text-base mt-3 font-medium">Automated reconciliation and variance analysis</p>
                </div>
              </div>
              <div className="p-8 sm:p-10 lg:p-12">
                {!uploadedFile ? (
                  <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} className={`relative border-2 border-dashed rounded-2xl p-16 text-center transition-all duration-500 transform ${isDragging ? 'border-blue-500 bg-blue-50/50 scale-105 shadow-2xl rotate-1' : `${darkMode ? 'border-slate-600 bg-slate-700/30 hover:bg-slate-700/50 hover:border-blue-400 hover:scale-102' : 'border-slate-300 bg-slate-50/50 hover:bg-slate-100/50 hover:border-blue-400 hover:scale-102'} hover:shadow-xl`}`}>
                    <input type="file" onChange={handleFileSelect} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept=".pdf,.xlsx,.xls,.csv,.doc,.docx" />
                    <div className="pointer-events-none">
                      <div className={`w-24 h-24 mx-auto mb-8 ${darkMode ? 'text-blue-400' : 'text-blue-600'} transition-all duration-500 ${isDragging ? 'scale-125 animate-bounce' : 'animate-pulse'}`}>
                        <Upload className="w-24 h-24 drop-shadow-lg" />
                      </div>
                      <p className={`text-xl font-bold mb-3 ${darkMode ? 'text-white' : 'text-slate-700'} transition-colors duration-300`}>Drag & drop your file here</p>
                      <p className={`text-base ${darkMode ? 'text-slate-400' : 'text-slate-500'} mb-6 transition-colors duration-300`}>Supported formats: PDF, XLSX, CSV, DOCX</p>
                      <div className="flex justify-center gap-3 flex-wrap">
                        {['PDF', 'XLSX', 'CSV', 'DOCX'].map((format, index) => (
                          <span key={format} className={`px-4 py-2 text-sm rounded-full font-medium transition-all duration-300 animate-in slide-in-from-bottom-4 ${darkMode ? 'bg-slate-600 text-slate-300 hover:bg-slate-500' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'} hover:scale-105`} style={{ animationDelay: `${index * 100}ms` }}>
                            {format}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className={`flex items-center justify-between ${darkMode ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-200'} rounded-xl p-6 border shadow-sm`}>
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-sm">
                        {React.createElement(getFileIcon(uploadedFile.name), { className: 'w-6 h-6 text-white' })}
                      </div>
                      <div>
                        <p className={`text-sm font-semibold truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>{uploadedFile.name}</p>
                        <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{(uploadedFile.size / 1024).toFixed(2)} KB</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button onClick={resetAll} className={`p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-slate-600 text-slate-400' : 'hover:bg-slate-200 text-slate-500'}`}>
                        <X className="w-4 h-4" />
                      </button>
                      <button onClick={previewFile} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-lg text-sm font-medium hover:from-slate-700 hover:to-slate-800 transition-all duration-200 shadow-sm">
                        <Eye className="w-4 h-4" /> Preview
                      </button>
                      <button onClick={startComparison} className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg text-sm font-medium hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl">
                        <ArrowRight className="w-4 h-4" /> Reconcile
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Results Panel */}
            {currentStep === 'processing' && (
              <div className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} rounded-xl border shadow-lg p-8 flex flex-col items-center gap-6 backdrop-blur-sm`}>
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Calculator className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                <div className="text-center">
                  <p className={`text-lg font-semibold mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Processing your file...</p>
                  <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Analyzing data and performing reconciliation</p>
                </div>
                <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-600 to-blue-700 h-3 transition-all duration-300 rounded-full" style={{ width: `${progress}%` }} />
                </div>
                <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{progress}% complete</p>
              </div>
            )}

            {results && currentStep === 'complete' && (
              <div className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} rounded-xl border shadow-lg p-8 backdrop-blur-sm`}>
                <div className="flex items-center gap-4 mb-6">
                  <div className="p-3 bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-xl shadow-lg">
                    <Calculator className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Reconciliation Summary</h3>
                    <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Analysis completed in {results.comparisonTime}</p>
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
                      <p className={`text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>Balance Status</p>
                    </div>
                    <p className={`text-lg font-bold ${results.balanceStatus === 'In Balance' ? 'text-green-600' : 'text-red-600'}`}>
                      {results.balanceStatus}
                    </p>
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mt-4 flex-wrap">
                  {['all', 'critical', 'high', 'medium', 'low'].map(tab => (
                    <button key={tab} onClick={() => setSelectedTab(tab)} className={`px-4 py-1 text-sm rounded-lg border ${selectedTab === tab ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'}`}>
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  ))}
                  <div className="ml-auto flex gap-2 flex-wrap">
                    <select value={reportFormat} onChange={e => setReportFormat(e.target.value)} className="px-2 py-1 border border-slate-300 rounded-lg text-sm">
                      <option value="pdf">PDF</option>
                      <option value="xlsx">Excel</option>
                    </select>
                    <button onClick={handleDownloadReport} className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm flex items-center gap-1">{isDownloading ? 'Downloading...' : 'Download'} <Download className="w-4 h-4" /></button>
                    <select value={exportFormat} onChange={e => setExportFormat(e.target.value)} className="px-2 py-1 border border-slate-300 rounded-lg text-sm">
                      <option value="json">JSON</option>
                      <option value="csv">CSV</option>
                    </select>
                    <button onClick={exportData} className="px-3 py-1 bg-purple-600 text-white rounded-lg text-sm flex items-center gap-1">
                      <FileJson className="w-4 h-4" /> Export
                    </button>
                    <button onClick={handleEmailReport} className="px-3 py-1 bg-green-600 text-white rounded-lg text-sm flex items-center gap-1"><Mail className="w-4 h-4" /> Email</button>
                  </div>
                </div>

                {/* Discrepancies Table */}
                <div className="mt-6 overflow-x-auto">
                  <div className={`rounded-xl border ${darkMode ? 'border-slate-600' : 'border-slate-200'} overflow-hidden shadow-sm`}>
                    <table className="w-full border-collapse text-sm">
                      <thead className={`${darkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
                        <tr>
                          <th className={`border-b ${darkMode ? 'border-slate-600 text-slate-300' : 'border-slate-200 text-slate-700'} px-4 py-3 text-left font-semibold`}>ID</th>
                          <th className={`border-b ${darkMode ? 'border-slate-600 text-slate-300' : 'border-slate-200 text-slate-700'} px-4 py-3 text-left font-semibold`}>Account</th>
                          <th className={`border-b ${darkMode ? 'border-slate-600 text-slate-300' : 'border-slate-200 text-slate-700'} px-4 py-3 text-left font-semibold`}>Field</th>
                          <th className={`border-b ${darkMode ? 'border-slate-600 text-slate-300' : 'border-slate-200 text-slate-700'} px-4 py-3 text-left font-semibold`}>Document Value</th>
                          <th className={`border-b ${darkMode ? 'border-slate-600 text-slate-300' : 'border-slate-200 text-slate-700'} px-4 py-3 text-left font-semibold`}>Database Value</th>
                          <th className={`border-b ${darkMode ? 'border-slate-600 text-slate-300' : 'border-slate-200 text-slate-700'} px-4 py-3 text-left font-semibold`}>Difference</th>
                          <th className={`border-b ${darkMode ? 'border-slate-600 text-slate-300' : 'border-slate-200 text-slate-700'} px-4 py-3 text-left font-semibold`}>Severity</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredDiscrepancies.length === 0 && (
                          <tr>
                            <td colSpan={7} className={`text-center py-12 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                              <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                              <p className="text-lg font-medium">No discrepancies found</p>
                              <p className="text-sm">All records matched successfully!</p>
                            </td>
                          </tr>
                        )}
                        {filteredDiscrepancies.map(d => (
                          <tr key={d.id} className={`transition-colors ${darkMode ? 'hover:bg-slate-700/50' : 'hover:bg-slate-50'}`}>
                            <td className={`border-b ${darkMode ? 'border-slate-600 text-white' : 'border-slate-200 text-slate-900'} px-4 py-3 font-medium`}>{d.id}</td>
                            <td className={`border-b ${darkMode ? 'border-slate-600 text-white' : 'border-slate-200 text-slate-900'} px-4 py-3`}>{d.account}</td>
                            <td className={`border-b ${darkMode ? 'border-slate-600 text-white' : 'border-slate-200 text-slate-900'} px-4 py-3`}>{d.field}</td>
                            <td className={`border-b ${darkMode ? 'border-slate-600 text-white' : 'border-slate-200 text-slate-900'} px-4 py-3`}>{d.documentValue}</td>
                            <td className={`border-b ${darkMode ? 'border-slate-600 text-white' : 'border-slate-200 text-slate-900'} px-4 py-3`}>{d.databaseValue ?? '-'}</td>
                            <td className={`border-b ${darkMode ? 'border-slate-600 text-white' : 'border-slate-200 text-slate-900'} px-4 py-3`}>{d.difference}</td>
                            <td className={`border-b ${darkMode ? 'border-slate-600' : 'border-slate-200'} px-4 py-3`}>
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getSeverityColor(d.severity)}`}>
                                {d.severity}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* File Preview Modal */}
        {showPreview && uploadedFile && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="text-lg font-bold text-slate-900">File Preview</h3>
                <button onClick={() => setShowPreview(false)} className="p-1 hover:bg-slate-100 rounded">
                  <X className="w-5 h-5 text-slate-600" />
                </button>
              </div>
              <div className="p-4 overflow-auto max-h-[60vh]">
                <div className="flex items-center gap-3 mb-4">
                  {React.createElement(getFileIcon(uploadedFile.name), { className: 'w-8 h-8 text-blue-600' })}
                  <div>
                    <p className="font-medium text-slate-900">{uploadedFile.name}</p>
                    <p className="text-sm text-slate-600">{(uploadedFile.size / 1024).toFixed(2)} KB</p>
                  </div>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg">
                  <p className="text-sm text-slate-600">
                    File uploaded successfully. Click "Reconcile" to process this file against the database.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
   <div className={`mb-6 ${darkMode ? 'bg-red-900/20 border-red-700' : 'bg-red-50 border-red-300'} border rounded-xl p-6 flex items-start gap-4 shadow-lg backdrop-blur-sm`}>
     <div className="p-2 bg-red-600 rounded-lg flex-shrink-0">
       <AlertTriangle className="w-5 h-5 text-white" />
     </div>
     <div className="flex-1 min-w-0">
       <div className={`font-bold text-lg ${darkMode ? 'text-red-300' : 'text-red-900'}`}>Reconciliation Error</div>
       <div className={`text-sm mt-2 ${darkMode ? 'text-red-200' : 'text-red-700'}`}>{error}</div>
     </div>
     <div className="flex gap-3 flex-shrink-0">
       <button
         onClick={() => {
           setError(null);
           setCurrentStep('idle');
           setProgress(0);
         }}
         className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-all duration-200 shadow-sm"
       >
         <RotateCcw className="w-4 h-4" /> Retry
       </button>
       <button
         onClick={() => setError(null)}
         className={`p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-red-900/30 text-red-300' : 'hover:bg-red-100 text-red-600'}`}
         aria-label="Close error"
       >
         <X className="w-4 h-4" />
       </button>
     </div>
   </div>
 )}

      </div>
    </div>
  );
}
