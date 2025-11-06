import React from 'react';
import { Upload, Loader2, RotateCcw } from "lucide-react";

interface ReconciliationUploadProps {
  uploading: boolean;
  uploadedFileName: string | null;
  reconciliationResults: any;
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onReset: () => void;
}

export default function ReconciliationUpload({
  uploading,
  uploadedFileName,
  reconciliationResults,
  onFileUpload,
  onReset,
}: ReconciliationUploadProps) {
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
      <div className="p-8">
        <div className="flex items-center justify-between">
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
                {reconciliationResults && (
                  <p className="text-xs text-green-600 mt-1">
                    Reconciliation completed with {reconciliationResults.discrepancies || 0} discrepancies found
                  </p>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center space-x-3">
            {uploadedFileName && (
              <button
                onClick={onReset}
                className="bg-gray-100 text-gray-700 py-3 px-4 rounded-xl hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-300 font-semibold font-display flex items-center hover:scale-[1.02]"
                disabled={uploading}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset
              </button>
            )}
            <label className="bg-gradient-accent text-white py-3 px-6 rounded-xl hover:shadow-floating focus:outline-none focus:ring-2 focus:ring-professional-blue-500 focus:ring-offset-2 transition-all duration-300 font-semibold font-display flex items-center cursor-pointer hover:scale-[1.02]">
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
          </div>
        </div>
      </div>
    </div>
  );
}