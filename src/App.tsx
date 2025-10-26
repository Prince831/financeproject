import React, { useState, useEffect } from 'react';
import { Upload, Database, FileText, CheckCircle2, Download, ArrowRight, X, FileSpreadsheet, FileCode, Calculator, Search, ChevronDown, Mail, User, Clock, TrendingUp, AlertTriangle, DollarSign, Sparkles, Zap, Activity, RefreshCw } from 'lucide-react';

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
  const [currentStep, setCurrentStep] = useState<'idle' | 'validating' | 'parsing' | 'classifying' | 'mapping' | 'connecting' | 'reconciling' | 'generating' | 'complete'>('idle');
  const [progress, setProgress] = useState(0);
  const [currentStepName, setCurrentStepName] = useState('');
  const [results, setResults] = useState<FileResult | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedTab, setSelectedTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [reportFormat, setReportFormat] = useState('pdf');
  const [showHistory, setShowHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const comparisonHistory: HistoryItem[] = [
    { id: 1, filename: 'Q3_General_Ledger.xlsx', date: '2025-10-22 14:30', user: 'John Doe', discrepancies: 23, amount: 15420.50, status: 'completed' },
    { id: 2, filename: 'October_Transactions.csv', date: '2025-10-21 09:15', user: 'Jane Smith', discrepancies: 8, amount: 3200.00, status: 'completed' },
    { id: 3, filename: 'Bank_Statement_Sept.pdf', date: '2025-10-20 16:45', user: 'John Doe', discrepancies: 156, amount: 87650.25, status: 'completed' },
  ];

  const detailedDiscrepancies: Discrepancy[] = [
    { id: 'TXN001', field: 'Debit Amount', documentValue: '$1,250.00', databaseValue: '$1,250.50', difference: '$0.50', type: 'mismatch', severity: 'high', account: 'Cash' },
    { id: 'TXN002', field: 'Credit Amount', documentValue: '$5,420.00', databaseValue: '$5,402.00', difference: '$18.00', type: 'mismatch', severity: 'critical', account: 'Accounts Payable' },
    { id: 'TXN003', field: 'Transaction Date', documentValue: '2025-10-15', databaseValue: '2025-10-16', difference: '1 day', type: 'mismatch', severity: 'medium', account: 'Revenue' },
    { id: 'TXN004', field: 'Debit Amount', documentValue: '$8,750.00', databaseValue: null, difference: '$8,750.00', type: 'missing', severity: 'critical', account: 'Inventory' },
    { id: 'TXN005', field: 'Account Number', documentValue: '1001-CR', databaseValue: '1001-DB', difference: 'Type Mismatch', type: 'mismatch', severity: 'critical', account: 'Cash' },
    { id: 'TXN006', field: 'Credit Amount', documentValue: '$150.00', databaseValue: '$15.00', difference: '$135.00', type: 'mismatch', severity: 'critical', account: 'Expenses' },
    { id: 'TXN007', field: 'Description', documentValue: 'Payment Received', databaseValue: 'Payment Recieved', difference: 'Spelling', type: 'mismatch', severity: 'low', account: 'Revenue' },
    { id: 'TXN008', field: 'Debit Amount', documentValue: '$2,100.00', databaseValue: null, difference: '$2,100.00', type: 'missing', severity: 'high', account: 'Assets' },
  ];

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleFileUpload = (file: File) => {
    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('File size exceeds 100MB limit. Please upload a smaller file.');
      return;
    }

    const allowedTypes = ['.pdf', '.xlsx', '.xls', '.csv', '.doc', '.docx'];
    const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowedTypes.includes(fileExt)) {
      setError('Unsupported file format. Please upload PDF, Excel, CSV, or Word documents.');
      return;
    }

    setError(null);
    setUploadedFile(file);
  };

  const removeFile = () => {
    setUploadedFile(null);
    setCurrentStep('idle');
    setResults(null);
    setError(null);
    setShowDetails(false);
  };

  const resetAll = () => {
    setUploadedFile(null);
    setCurrentStep('idle');
    setResults(null);
    setError(null);
    setShowDetails(false);
    setProgress(0);
    setCurrentStepName('');
    setSearchTerm('');
    setSelectedTab('all');
  };

  const startComparison = () => {
    setCurrentStep('validating');
    setProgress(0);
    
    const steps = [
      { name: 'Validating file format and size', duration: 500, step: 'validating' as const, progressEnd: 8 },
      { name: 'Parsing financial document and extracting transactions', duration: 1500, step: 'parsing' as const, progressEnd: 25 },
      { name: 'Identifying debits, credits, and account classifications', duration: 1200, step: 'classifying' as const, progressEnd: 40 },
      { name: 'Auto-mapping fields to general ledger schema', duration: 1000, step: 'mapping' as const, progressEnd: 55 },
      { name: 'Connecting to database and fetching transaction records', duration: 800, step: 'connecting' as const, progressEnd: 65 },
      { name: 'Reconciling amounts and detecting variances', duration: 2000, step: 'reconciling' as const, progressEnd: 85 },
      { name: 'Calculating totals and generating financial audit report', duration: 800, step: 'generating' as const, progressEnd: 100 },
    ];

    let currentStepIndex = 0;

    const runStep = () => {
      if (currentStepIndex >= steps.length) {
        setCurrentStep('complete');
        setResults({
          totalRecords: 1247,
          matched: 1198,
          discrepancies: 49,
          missing: 15,
          mismatched: 34,
          critical: 12,
          high: 18,
          medium: 14,
          low: 5,
          totalDebitVariance: 12420.50,
          totalCreditVariance: 8350.75,
          netVariance: 4069.75,
          balanceStatus: 'Out of Balance',
          comparisonTime: '3.8s',
          timestamp: new Date().toISOString(),
          user: 'Current User'
        });
        return;
      }

      const step = steps[currentStepIndex];
      setCurrentStepName(step.name);
      setCurrentStep(step.step);

      const startProgress = currentStepIndex === 0 ? 0 : steps[currentStepIndex - 1].progressEnd;
      const progressIncrement = (step.progressEnd - startProgress) / (step.duration / 50);

      const interval = setInterval(() => {
        setProgress((prev) => {
          const next = prev + progressIncrement;
          if (next >= step.progressEnd) {
            clearInterval(interval);
            currentStepIndex++;
            setTimeout(runStep, 100);
            return step.progressEnd;
          }
          return next;
        });
      }, 50);
    };

    runStep();
  };

  const handleDownloadReport = () => {
    setIsDownloading(true);
    
    // Simulate download process
    setTimeout(() => {
      // Create a mock report data
      const reportData = {
        reportType: reportFormat.toUpperCase(),
        generatedAt: new Date().toISOString(),
        summary: results,
        discrepancies: filteredDiscrepancies
      };
      
      // Create a blob and download
      const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit-report-${Date.now()}.${reportFormat === 'pdf' ? 'json' : reportFormat}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      setIsDownloading(false);
    }, 1500);
  };

  const handleEmailReport = () => {
    const subject = encodeURIComponent('Audit Report - AuditSync Pro');
    const body = encodeURIComponent(
      `Dear Team,\n\nPlease find the audit report summary:\n\n` +
      `Total Records: ${results?.totalRecords}\n` +
      `Matched: ${results?.matched}\n` +
      `Discrepancies: ${results?.discrepancies}\n` +
      `Missing: ${results?.missing}\n\n` +
      `Net Variance: ${formatCurrency(results?.netVariance || 0)}\n\n` +
      `Best regards,\nAuditSync Pro`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const getFileIcon = (filename: string) => {
    const ext = filename?.split('.').pop()?.toLowerCase();
    if (ext && ['xlsx', 'xls', 'csv'].includes(ext)) return FileSpreadsheet;
    if (ext && ['pdf'].includes(ext)) return FileText;
    return FileCode;
  };

  const getSeverityColor = (severity: string) => {
    switch(severity) {
      case 'critical': return 'text-red-700 bg-red-50 border-red-200';
      case 'high': return 'text-orange-700 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-slate-700 bg-slate-50 border-slate-200';
      default: return 'text-slate-700 bg-slate-50 border-slate-200';
    }
  };

  const filteredDiscrepancies = detailedDiscrepancies.filter(disc => {
    const matchesSearch = disc.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         disc.field.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         disc.account.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (disc.documentValue && disc.documentValue.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesTab = selectedTab === 'all' || disc.severity === selectedTab || disc.type === selectedTab;
    return matchesSearch && matchesTab;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 2 
    }).format(amount);
  };

  return (
    <div className="min-h-screen w-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 relative overflow-x-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute w-96 h-96 bg-gradient-to-br from-blue-400/30 to-purple-400/30 rounded-full blur-3xl transition-all duration-300 ease-out"
          style={{
            left: `${mousePosition.x / 20}px`,
            top: `${mousePosition.y / 20}px`
          }}
        />
        <div className="absolute w-[600px] h-[600px] bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full blur-3xl animate-pulse" style={{ top: '10%', right: '10%' }} />
        <div className="absolute w-[500px] h-[500px] bg-gradient-to-br from-cyan-400/20 to-blue-400/20 rounded-full blur-3xl animate-pulse" style={{ bottom: '5%', left: '5%', animationDelay: '1s' }} />
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-white/40 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `float ${5 + Math.random() * 10}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 5}s`
            }}
          />
        ))}
      </div>

      {/* Top Navigation */}
      <div className="relative z-10 bg-white/80 backdrop-blur-xl border-b border-white/20 shadow-lg">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl shadow-lg">
                <Calculator className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  AuditSync Pro
                </h1>
                <p className="text-slate-600 text-xs flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  AI-Powered Financial Reconciliation
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-white/60 rounded-xl transition-all hover:scale-105"
                aria-label="Toggle history"
              >
                <Clock className="w-4 h-4" />
                <span className="hidden sm:inline">History</span>
              </button>
              <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-xl">
                <User className="w-4 h-4 text-indigo-600" />
                <span className="text-sm font-medium text-slate-700 hidden sm:inline">John Doe</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* History Panel */}
        {showHistory && (
          <div className="mb-6 bg-white/80 backdrop-blur-xl rounded-2xl border border-white/20 shadow-xl p-4 sm:p-6 animate-slideDown">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <Activity className="w-5 h-5 text-indigo-600" />
                Reconciliation History
              </h3>
              <button
                onClick={() => setShowHistory(false)}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
                aria-label="Close history"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>
            <div className="space-y-2">
              {comparisonHistory.map((item, index) => (
                <div 
                  key={item.id} 
                  className="flex items-center justify-between p-3 sm:p-4 bg-gradient-to-r from-white/60 to-indigo-50/60 rounded-xl hover:shadow-md transition-all hover:scale-[1.02] cursor-pointer animate-fadeIn"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                    <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg flex-shrink-0">
                      <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-slate-900 text-sm sm:text-base truncate">{item.filename}</div>
                      <div className="text-xs sm:text-sm text-slate-600">{item.date} • By {item.user}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                    <div className="text-right">
                      <div className="text-xs sm:text-sm font-semibold text-slate-900">{formatCurrency(item.amount)}</div>
                      <div className="text-xs text-slate-600">{item.discrepancies} variances</div>
                    </div>
                    <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Upload Section */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/20 shadow-xl overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-semibold text-white flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Upload Financial Document
                </h2>
                <p className="text-indigo-100 text-xs sm:text-sm mt-1">Automatic reconciliation of debits, credits, and balances</p>
              </div>

              <div className="p-4 sm:p-8">
                {error && (
                  <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 animate-shake">
                    <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-red-900">Upload Error</div>
                      <div className="text-sm text-red-700 mt-1">{error}</div>
                    </div>
                    <button
                      onClick={() => setError(null)}
                      className="p-1 hover:bg-red-100 rounded-lg transition-colors flex-shrink-0"
                      aria-label="Close error"
                    >
                      <X className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                )}

                {!uploadedFile ? (
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all duration-300 ${
                      isDragging
                        ? 'border-indigo-500 bg-indigo-50/50 scale-105 shadow-xl'
                        : 'border-slate-300 bg-white/40 hover:bg-white/60 hover:border-indigo-400 hover:shadow-lg'
                    }`}
                  >
                    <input
                      type="file"
                      onChange={handleFileSelect}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      accept=".pdf,.xlsx,.xls,.csv,.doc,.docx"
                      aria-label="Upload file"
                    />
                    <div className="pointer-events-none">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg animate-bounce-slow">
                        <Upload className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                      </div>
                      <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-2">
                        Drop your financial document here
                      </h3>
                      <p className="text-sm sm:text-base text-slate-600 mb-4">or click to browse files</p>
                      <div className="text-xs text-slate-500 mb-4">Maximum file size: 100MB</div>
                      <div className="flex flex-wrap justify-center gap-2 text-xs text-slate-600">
                        <span className="px-3 py-1.5 bg-gradient-to-r from-indigo-100 to-purple-100 border border-indigo-200 rounded-full font-medium">Bank Statements</span>
                        <span className="px-3 py-1.5 bg-gradient-to-r from-indigo-100 to-purple-100 border border-indigo-200 rounded-full font-medium">General Ledger</span>
                        <span className="px-3 py-1.5 bg-gradient-to-r from-indigo-100 to-purple-100 border border-indigo-200 rounded-full font-medium">Trial Balance</span>
                        <span className="px-3 py-1.5 bg-gradient-to-r from-indigo-100 to-purple-100 border border-indigo-200 rounded-full font-medium">Transactions</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="bg-gradient-to-r from-emerald-50 to-cyan-50 border border-emerald-200 rounded-2xl p-4 sm:p-6 animate-slideDown">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
                          <div className="p-2 sm:p-3 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl shadow-lg flex-shrink-0">
                            {React.createElement(getFileIcon(uploadedFile.name), {
                              className: "w-6 h-6 sm:w-8 sm:h-8 text-white"
                            })}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm sm:text-base font-semibold text-slate-900 truncate">
                              {uploadedFile.name}
                            </h3>
                            <p className="text-xs sm:text-sm text-slate-600">
                              {(uploadedFile.size / 1024).toFixed(2)} KB
                            </p>
                          </div>
                        </div>
                        {currentStep === 'idle' && (
                          <button
                            onClick={removeFile}
                            className="p-2 hover:bg-red-100 rounded-lg transition-all hover:scale-110 flex-shrink-0"
                            aria-label="Remove file"
                          >
                            <X className="w-5 h-5 text-red-600" />
                          </button>
                        )}
                      </div>
                    </div>

                    {currentStep === 'idle' && (
                      <button
                        onClick={startComparison}
                        className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold py-3 sm:py-4 px-6 rounded-2xl transition-all hover:scale-105 hover:shadow-xl flex items-center justify-center gap-2 group"
                      >
                        <Zap className="w-5 h-5 group-hover:animate-pulse" />
                        <span className="text-sm sm:text-base">Start AI Reconciliation</span>
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </button>
                    )}

                    {currentStep !== 'idle' && currentStep !== 'complete' && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between text-xs sm:text-sm text-slate-700">
                          <span className="font-medium flex items-center gap-2 flex-1 min-w-0">
                            <Sparkles className="w-4 h-4 text-indigo-600 animate-pulse flex-shrink-0" />
                            <span className="truncate">{currentStepName}</span>
                          </span>
                          <span className="font-semibold text-indigo-600 ml-2 flex-shrink-0">{Math.round(progress)}%</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden shadow-inner">
                          <div
                            className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-300 rounded-full relative overflow-hidden"
                            style={{ width: `${progress}%` }}
                          >
                            <div className="absolute inset-0 animate-shimmer" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)', backgroundSize: '200% 100%' }} />
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-600">
                          <div className="flex gap-1">
                            <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                            <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                            <div className="w-2 h-2 bg-pink-600 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                          </div>
                          Processing with AI...
                        </div>
                      </div>
                    )}

                    {currentStep === 'complete' && results && (
                      <div className="space-y-4 animate-slideDown">
                        <div className="bg-gradient-to-r from-emerald-50 to-cyan-50 border border-emerald-200 rounded-2xl p-4 sm:p-6">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-xl shadow-lg">
                              <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                            </div>
                            <div>
                              <h3 className="text-base sm:text-lg font-semibold text-slate-900">Reconciliation Complete!</h3>
                              <p className="text-xs sm:text-sm text-slate-600">Completed in {results.comparisonTime}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 sm:gap-4 mt-6">
                            {[
                              { label: 'Total Transactions', value: results.totalRecords, gradient: 'from-blue-500 to-cyan-500' },
                              { label: 'Matched', value: results.matched, gradient: 'from-emerald-500 to-green-500' },
                              { label: 'Variances Found', value: results.discrepancies, gradient: 'from-orange-500 to-red-500' },
                              { label: 'Missing Entries', value: results.missing, gradient: 'from-purple-500 to-pink-500' }
                            ].map((stat, index) => (
                              <div 
                                key={stat.label} 
                                className="bg-white/60 backdrop-blur border border-white/40 rounded-xl p-3 sm:p-4 hover:scale-105 transition-transform cursor-pointer animate-fadeIn"
                                style={{ animationDelay: `${index * 100}ms` }}
                              >
                                <div className={`text-2xl sm:text-3xl font-bold bg-gradient-to-r ${stat.gradient} bg-clip-text text-transparent`}>
                                  {stat.value}
                                </div>
                                <div className="text-slate-600 text-xs sm:text-sm mt-1">{stat.label}</div>
                              </div>
                            ))}
                          </div>

                          <div className="mt-6 pt-4 border-t border-emerald-200 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs sm:text-sm text-slate-600">Total Debit Variance</span>
                              <span className="text-xs sm:text-sm font-semibold text-red-700">{formatCurrency(results.totalDebitVariance)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs sm:text-sm text-slate-600">Total Credit Variance</span>
                              <span className="text-xs sm:text-sm font-semibold text-orange-700">{formatCurrency(results.totalCreditVariance)}</span>
                            </div>
                            <div className="flex items-center justify-between pt-2 border-t border-emerald-200">
                              <span className="text-xs sm:text-sm font-semibold text-slate-900">Net Variance</span>
                              <span className="text-xs sm:text-sm font-bold text-red-700">{formatCurrency(results.netVariance)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs sm:text-sm text-slate-600">Balance Status</span>
                              <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full">{results.balanceStatus}</span>
                            </div>
                          </div>

                          <div className="mt-4 pt-4 border-t border-emerald-200">
                            <div className="text-xs sm:text-sm text-slate-600 mb-3">Severity Breakdown</div>
                            <div className="flex gap-2 flex-wrap">
                              {[
                                { label: 'Critical', value: results.critical, color: 'from-red-500 to-red-600' },
                                { label: 'High', value: results.high, color: 'from-orange-500 to-orange-600' },
                                { label: 'Medium', value: results.medium, color: 'from-yellow-500 to-yellow-600' },
                                { label: 'Low', value: results.low, color: 'from-slate-500 to-slate-600' }
                              ].map(item => (
                                <span key={item.label} className={`px-3 py-1.5 bg-gradient-to-r ${item.color} text-white text-xs font-semibold rounded-full shadow-md`}>
                                  {item.label}: {item.value}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="bg-white/60 backdrop-blur border border-white/40 rounded-xl p-4">
                          <label className="text-xs font-medium text-slate-700 mb-2 block">Report Format</label>
                          <select
                            value={reportFormat}
                            onChange={(e) => setReportFormat(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                          >
                            <option value="pdf">PDF Audit Report</option>
                            <option value="excel">Excel Reconciliation Workbook</option>
                            <option value="csv">CSV Transaction Data</option>
                          </select>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3">
                          <button 
                            onClick={handleDownloadReport}
                            disabled={isDownloading}
                            className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 sm:py-4 px-6 rounded-2xl transition-all hover:scale-105 hover:shadow-xl flex items-center justify-center gap-2 group"
                          >
                            {isDownloading ? (
                              <>
                                <RefreshCw className="w-5 h-5 animate-spin" />
                                <span className="text-sm sm:text-base">Downloading...</span>
                              </>
                            ) : (
                              <>
                                <Download className="w-5 h-5 group-hover:animate-bounce" />
                                <span className="text-sm sm:text-base">Download Report</span>
                              </>
                            )}
                          </button>
                          <button 
                            onClick={handleEmailReport}
                            className="sm:w-auto bg-white hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 border border-indigo-200 text-slate-700 font-semibold py-3 sm:py-4 px-6 rounded-2xl transition-all hover:scale-105 flex items-center justify-center gap-2"
                          >
                            <Mail className="w-5 h-5 text-indigo-600" />
                            <span className="text-sm sm:text-base">Email</span>
                          </button>
                        </div>

                        <button
                          onClick={() => setShowDetails(!showDetails)}
                          className="w-full text-indigo-700 hover:text-indigo-900 font-semibold py-3 text-sm flex items-center justify-center gap-2 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-all group"
                        >
                          {showDetails ? 'Hide' : 'View'} Transaction Variances
                          <ChevronDown className={`w-4 h-4 transition-transform group-hover:translate-y-0.5 ${showDetails ? 'rotate-180' : ''}`} />
                        </button>

                        <button
                          onClick={resetAll}
                          className="w-full text-slate-600 hover:text-slate-900 font-medium py-2 text-sm flex items-center justify-center gap-2 hover:bg-slate-100 rounded-xl transition-all"
                        >
                          <RefreshCw className="w-4 h-4" />
                          Upload Another File
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Detailed Discrepancies Table */}
            {showDetails && currentStep === 'complete' && (
              <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/20 shadow-xl overflow-hidden animate-slideDown">
                <div className="p-4 sm:p-6 border-b border-slate-200 bg-gradient-to-r from-indigo-50 to-purple-50">
                  <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-indigo-600" />
                    Transaction Variances
                  </h3>
                  
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 relative">
                      <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search by transaction ID, account..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                      />
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
                      {[
                        { key: 'all', label: 'All' },
                        { key: 'critical', label: 'Critical' },
                        { key: 'missing', label: 'Missing' }
                      ].map(tab => (
                        <button
                          key={tab.key}
                          onClick={() => setSelectedTab(tab.key)}
                          className={`px-4 py-2 text-sm font-medium rounded-xl transition-all whitespace-nowrap ${
                            selectedTab === tab.key 
                              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg scale-105' 
                              : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-slate-50 to-indigo-50 border-b border-slate-200">
                      <tr>
                        <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Txn ID</th>
                        <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Account</th>
                        <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Field</th>
                        <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Document</th>
                        <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Database</th>
                        <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Difference</th>
                        <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Severity</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {filteredDiscrepancies.length > 0 ? (
                        filteredDiscrepancies.map((disc, index) => (
                          <tr 
                            key={disc.id} 
                            className="hover:bg-indigo-50/50 transition-all animate-fadeIn"
                            style={{ animationDelay: `${index * 50}ms` }}
                          >
                            <td className="px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-semibold text-slate-900">{disc.id}</td>
                            <td className="px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-slate-700 font-medium">{disc.account}</td>
                            <td className="px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-slate-700">{disc.field}</td>
                            <td className="px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-slate-900 font-mono">{disc.documentValue || '—'}</td>
                            <td className="px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-slate-900 font-mono">{disc.databaseValue || <span className="text-slate-400 italic">Missing</span>}</td>
                            <td className="px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-bold text-red-700">{disc.difference}</td>
                            <td className="px-4 sm:px-6 py-3 sm:py-4">
                              <span className={`inline-flex items-center px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-bold border shadow-sm ${getSeverityColor(disc.severity)}`}>
                                {disc.severity.toUpperCase()}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                            No discrepancies found matching your search criteria
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/20 shadow-xl p-4 sm:p-6 hover:shadow-2xl transition-all">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-lg">
                  <Database className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-sm sm:text-base font-semibold text-slate-900">Database Status</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-emerald-50 to-cyan-50 rounded-xl">
                  <span className="text-slate-600 text-xs sm:text-sm font-medium">Connection</span>
                  <span className="flex items-center gap-2 text-slate-900 text-xs sm:text-sm font-semibold">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-lg shadow-emerald-500/50" />
                    Active
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-600 text-xs sm:text-sm font-medium">Transactions</span>
                  <span className="text-slate-900 text-xs sm:text-sm font-bold">1,247</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-600 text-xs sm:text-sm font-medium">Last Sync</span>
                  <span className="text-slate-900 text-xs sm:text-sm font-semibold">2 min ago</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl">
                  <span className="text-slate-600 text-xs sm:text-sm font-medium">Schema</span>
                  <span className="text-indigo-700 text-xs sm:text-sm font-bold">Auto-detected</span>
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/20 shadow-xl p-4 sm:p-6 hover:shadow-2xl transition-all">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg">
                  <DollarSign className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-sm sm:text-base font-semibold text-slate-900">Quick Stats</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl">
                  <span className="text-slate-600 text-xs sm:text-sm font-medium">Total Debits</span>
                  <span className="text-emerald-700 text-xs sm:text-sm font-bold">$2,456,780.50</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl">
                  <span className="text-slate-600 text-xs sm:text-sm font-medium">Total Credits</span>
                  <span className="text-blue-700 text-xs sm:text-sm font-bold">$2,452,710.75</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-red-50 to-orange-50 rounded-xl border-2 border-red-200">
                  <span className="text-slate-700 text-xs sm:text-sm font-bold">Net Difference</span>
                  <span className="text-red-700 text-xs sm:text-sm font-bold">$4,069.75</span>
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/20 shadow-xl p-4 sm:p-6 hover:shadow-2xl transition-all">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-sm sm:text-base font-semibold text-slate-900">Accuracy Rate</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs sm:text-sm mb-2">
                    <span className="text-slate-600 font-medium">Match Rate</span>
                    <span className="font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">96.1%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden shadow-inner">
                    <div className="bg-gradient-to-r from-indigo-500 to-purple-500 h-3 rounded-full shadow-lg relative overflow-hidden" style={{ width: '96.1%' }}>
                      <div className="absolute inset-0 animate-shimmer" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)', backgroundSize: '200% 100%' }} />
                    </div>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-600 mb-3 font-medium">Last 7 Reconciliations</div>
                  <div className="flex items-end gap-1.5 h-16 sm:h-20">
                    {[45, 38, 52, 41, 49, 43, 49].map((val, i) => (
                      <div 
                        key={i} 
                        className="flex-1 bg-gradient-to-t from-indigo-500 to-purple-500 rounded-t-lg hover:scale-110 transition-transform cursor-pointer shadow-lg" 
                        style={{ height: `${(val/52)*100}%` }}
                        title={`${val} variances`}
                      />
                    ))}
                  </div>
                  <div className="text-xs text-slate-600 mt-2 text-center font-medium">Variances detected per check</div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-xl p-4 sm:p-6 text-white">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-5 h-5" />
                <h3 className="text-sm sm:text-base font-bold">AI-Powered Features</h3>
              </div>
              <ul className="space-y-2 sm:space-y-2.5 text-xs sm:text-sm">
                {[
                  'Auto debit/credit classification',
                  'Smart account code mapping',
                  'Real-time balance verification',
                  'Intelligent variance detection',
                  'Predictive anomaly detection',
                  'Automated audit trail'
                ].map((feature, index) => (
                  <li key={index} className="flex items-start gap-2 animate-fadeIn" style={{ animationDelay: `${index * 100}ms` }}>
                    <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-300 flex-shrink-0 mt-0.5" />
                    <span className="text-indigo-50">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateX(-10px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-slideDown { animation: slideDown 0.5s ease-out; }
        .animate-shake { animation: shake 0.5s ease-in-out; }
        .animate-fadeIn { animation: fadeIn 0.5s ease-out forwards; }
        .animate-bounce-slow { animation: bounce-slow 2s ease-in-out infinite; }
        .animate-shimmer { animation: shimmer 2s infinite; }
      `}</style>
    </div>
  );
}