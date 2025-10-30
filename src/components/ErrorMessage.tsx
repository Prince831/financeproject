import React from 'react';
import { AlertTriangle, RotateCcw, X } from 'lucide-react';

interface ErrorMessageProps {
  error: string | null;
  setError: (error: string | null) => void;
  darkMode: boolean;
  onRetry: () => void;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  error,
  setError,
  darkMode,
  onRetry,
}) => {
  if (!error) return null;

  return (
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
          onClick={onRetry}
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
  );
};