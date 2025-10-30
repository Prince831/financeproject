import React from 'react';
import { X, FileSpreadsheet, FileCode, FileText } from 'lucide-react';

interface FilePreviewModalProps {
  showPreview: boolean;
  setShowPreview: (show: boolean) => void;
  uploadedFile: File | null;
  darkMode: boolean;
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  showPreview,
  setShowPreview,
  uploadedFile,
  darkMode,
}) => {
  if (!showPreview || !uploadedFile) return null;

  const getFileIcon = (filename: string) => {
    if (filename.endsWith('.xlsx') || filename.endsWith('.xls')) return FileSpreadsheet;
    if (filename.endsWith('.csv')) return FileCode;
    return FileText;
  };

  return (
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
  );
};