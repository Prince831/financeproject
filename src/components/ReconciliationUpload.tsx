import React from 'react';
import { Upload, Loader2, RotateCcw } from "lucide-react";

interface ReconciliationUploadProps {
  uploading: boolean;
  uploadedFileName: string | null;
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onReset: () => void;
  onReconcile: () => void;
  reconciling: boolean;
  discrepancyCount?: number;
  variant?: 'card' | 'minimal';
}

export default function ReconciliationUpload({
  uploading,
  uploadedFileName,
  onFileUpload,
  onReset,
  onReconcile,
  reconciling,
  discrepancyCount = 0,
  variant = 'card',
}: ReconciliationUploadProps) {
  const body = (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
      <div className="flex-1">
        <p className="text-warm-grey-600 mb-2">
          Upload your Kowri file to compare with system transactions.
        </p>
        <p className="text-sm text-warm-grey-500">
          Supported formats: CSV, PDF, XLSX
        </p>
        {uploadedFileName && (
          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <p className="text-sm text-green-800 font-medium">
                File uploaded: <span className="font-semibold">{uploadedFileName}</span>
              </p>
            </div>
            <p className="text-xs text-green-600 mt-1">
              {discrepancyCount > 0
                ? `${discrepancyCount} unmatched transaction${discrepancyCount === 1 ? '' : 's'} detected in the last run`
                : 'No discrepancies detected in the last run'}
            </p>
          </div>
        )}
      </div>
      <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
        {uploadedFileName && (
          <button
            onClick={onReset}
            className="w-full sm:w-auto bg-gray-100 text-gray-700 py-3 px-4 rounded-xl hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-300 font-semibold font-display flex items-center justify-center hover:scale-[1.02]"
            disabled={uploading}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </button>
        )}
        <label className="w-full sm:w-auto bg-gradient-accent text-white py-3 px-6 rounded-xl hover:shadow-floating focus:outline-none focus:ring-2 focus:ring-professional-blue-500 focus:ring-offset-2 transition-all duration-300 font-semibold font-display flex items-center justify-center cursor-pointer hover:scale-[1.02]">
          {uploading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="w-5 h-5 mr-2" />
              Upload Kowri File
            </>
          )}
          <input
            type="file"
            className="hidden"
            accept=".csv,.xlsx,.xls,.txt"
            onChange={onFileUpload}
            disabled={uploading}
          />
        </label>
        <button
          onClick={onReconcile}
          disabled={reconciling || !uploadedFileName}
          className="w-full sm:w-auto bg-gradient-to-r from-accent to-purple-700 text-white py-3 px-6 rounded-xl hover:from-accent hover:to-purple-800 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 transition-all duration-300 font-semibold shadow-floating flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02]"
        >
          {reconciling ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Reconciling...
            </>
          ) : (
            'Reconcile'
          )}
        </button>
      </div>
    </div>
  );

  if (variant === 'minimal') {
    return (
      <div className="rounded-2xl border border-slate-100 bg-white p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Upload className="w-5 h-5 text-accent" />
            <div>
              <p className="text-sm font-semibold text-slate-800">Upload Document</p>
              <p className="text-xs text-slate-500">Compare uploaded entries against the database.</p>
            </div>
          </div>
        </div>
        <div className="mt-6">{body}</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-floating border border-npontu-200 overflow-hidden transform hover:scale-[1.02] transition-all duration-300">
      <div className="bg-gradient-to-r from-accent to-green-700 p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
        <div className="relative flex items-center space-x-3">
          <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
            <Upload className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-white font-display">System Entries</h3>
        </div>
      </div>
      <div className="p-8">{body}</div>
    </div>
  );
}