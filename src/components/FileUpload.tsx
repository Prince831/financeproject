import React from 'react';
import { Upload, Eye, ArrowRight, X, FileSpreadsheet, FileCode, FileText } from 'lucide-react';

interface FileUploadProps {
  uploadedFile: File | null;
  setUploadedFile: (file: File | null) => void;
  isDragging: boolean;
  setIsDragging: (dragging: boolean) => void;
  darkMode: boolean;
  reconciliationMode: 'by_period' | 'by_transaction_id';
  startDate: string;
  endDate: string;
  setStartDate: (date: string) => void;
  setEndDate: (date: string) => void;
  onPreview: () => void;
  onReconcile: () => void;
  resetAll: () => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  uploadedFile,
  setUploadedFile,
  isDragging,
  setIsDragging,
  darkMode,
  reconciliationMode,
  startDate,
  endDate,
  setStartDate,
  setEndDate,
  onPreview,
  onReconcile,
  resetAll,
}) => {
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setUploadedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadedFile(e.target.files[0]);
    }
  };

  const getFileIcon = (filename: string) => {
    if (!filename) return FileText;
    if (filename.endsWith('.xlsx') || filename.endsWith('.xls')) return FileSpreadsheet;
    if (filename.endsWith('.csv')) return FileCode;
    if (filename.endsWith('.txt')) return FileText;
    return FileText;
  };

  return (
    <div className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} rounded-2xl border shadow-2xl overflow-hidden backdrop-blur-sm animate-in zoom-in-95 duration-300 hover:shadow-3xl transition-all duration-200`}>
      <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 p-8 border-b border-blue-500/20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-pulse"></div>
        <div className="relative z-10">
          <h2 className="text-2xl font-bold text-white flex items-center gap-4">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm animate-bounce">
              <Upload className="w-6 h-6" />
            </div>
            Upload Financial Document
          </h2>
          <p className="text-blue-100 text-base mt-3 font-medium">
            {reconciliationMode === 'by_period'
              ? 'Select period and upload file for reconciliation'
              : 'Upload file with transaction IDs for reconciliation'
            }
          </p>
        </div>
      </div>
      <div className="p-8 sm:p-10 lg:p-12">
        {reconciliationMode === 'by_period' && (
          <div className={`mb-6 p-4 ${darkMode ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-200'} border rounded-xl`}>
            <h3 className={`text-lg font-semibold mb-3 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Select Reconciliation Period</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Start Date</label>
                <input
                  type="date"
                  id="start-date"
                  name="start-date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg ${darkMode ? 'bg-slate-600 border-slate-500 text-white' : 'bg-white border-slate-300 text-slate-900'} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>End Date</label>
                <input
                  type="date"
                  id="end-date"
                  name="end-date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg ${darkMode ? 'bg-slate-600 border-slate-500 text-white' : 'bg-white border-slate-300 text-slate-900'} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                />
              </div>
            </div>
          </div>
        )}

        {!uploadedFile ? (
          <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} className={`relative border-2 border-dashed rounded-2xl p-16 text-center transition-all duration-200 transform ${isDragging ? 'border-blue-500 bg-blue-50/50 scale-105 shadow-2xl rotate-1' : `${darkMode ? 'border-slate-600 bg-slate-700/30 hover:bg-slate-700/50 hover:border-blue-400 hover:scale-102' : 'border-slate-300 bg-slate-50/50 hover:bg-slate-100/50 hover:border-blue-400 hover:scale-102'} hover:shadow-xl`}`}>
            <input
              type="file"
              onChange={handleFileSelect}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              accept=".xlsx,.xls,.csv,.txt"
            />
            <div className="pointer-events-none">
              <div className={`w-24 h-24 mx-auto mb-8 ${darkMode ? 'text-blue-400' : 'text-blue-600'} transition-all duration-200 ${isDragging ? 'scale-125 animate-bounce' : 'animate-pulse'}`}>
                <Upload className="w-24 h-24 drop-shadow-lg" />
              </div>
              <p className={`text-xl font-bold mb-3 ${darkMode ? 'text-white' : 'text-slate-700'} transition-colors duration-300`}>Drag & drop your file here</p>
              <p className={`text-base ${darkMode ? 'text-slate-400' : 'text-slate-500'} mb-6 transition-colors duration-300`}>Supported formats: XLSX, XLS, CSV, TXT</p>
              <div className="flex justify-center gap-3 flex-wrap">
                {['XLSX', 'XLS', 'CSV', 'TXT'].map((format, index) => (
                  <span key={format} className={`px-4 py-2 text-sm rounded-full font-medium transition-all duration-200 animate-in slide-in-from-bottom-4 ${darkMode ? 'bg-slate-600 text-slate-300 hover:bg-slate-500' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'} hover:scale-105`} style={{ animationDelay: `${index * 100}ms` }}>
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
              <button onClick={onPreview} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-lg text-sm font-medium hover:from-slate-700 hover:to-slate-800 transition-all duration-200 shadow-sm">
                <Eye className="w-4 h-4" /> Preview
              </button>
              <button onClick={onReconcile} className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg text-sm font-medium hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl">
                <ArrowRight className="w-4 h-4" /> Reconcile
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};