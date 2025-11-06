import React from 'react';
import { AlertTriangle, RotateCcw, X, FileX, AlertCircle, Database } from 'lucide-react';

interface ErrorMessageProps {
  error: string | null;
  setError: (error: string | null) => void;
  darkMode: boolean;
  onRetry: () => void;
  errorType?: string;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  error,
  setError,
  darkMode,
  onRetry,
  errorType,
}) => {
  if (!error) return null;

  const getErrorIcon = () => {
    switch (errorType) {
      case 'validation_error':
        return <AlertCircle className="w-5 h-5 text-white" />;
      case 'file_upload_error':
        return <FileX className="w-5 h-5 text-white" />;
      case 'reconciliation_processing_error':
        return <Database className="w-5 h-5 text-white" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-white" />;
    }
  };

  const getErrorTitle = () => {
    switch (errorType) {
      case 'validation_error':
        return 'Validation Error';
      case 'file_upload_error':
        return 'File Upload Error';
      case 'reconciliation_processing_error':
        return 'Processing Error';
      default:
        return 'Reconciliation Error';
    }
  };

  const getErrorColor = () => {
    switch (errorType) {
      case 'validation_error':
        return {
          bg: darkMode ? 'bg-orange-900/20 border-orange-700' : 'bg-orange-50 border-orange-300',
          icon: 'bg-orange-600',
          title: darkMode ? 'text-orange-300' : 'text-orange-900',
          text: darkMode ? 'text-orange-200' : 'text-orange-700',
          button: 'bg-orange-600 hover:bg-orange-700',
          buttonHover: darkMode ? 'hover:bg-orange-900/30 text-orange-300' : 'hover:bg-orange-100 text-orange-600'
        };
      case 'file_upload_error':
        return {
          bg: darkMode ? 'bg-red-900/20 border-red-700' : 'bg-red-50 border-red-300',
          icon: 'bg-red-600',
          title: darkMode ? 'text-red-300' : 'text-red-900',
          text: darkMode ? 'text-red-200' : 'text-red-700',
          button: 'bg-red-600 hover:bg-red-700',
          buttonHover: darkMode ? 'hover:bg-red-900/30 text-red-300' : 'hover:bg-red-100 text-red-600'
        };
      case 'reconciliation_processing_error':
        return {
          bg: darkMode ? 'bg-blue-900/20 border-blue-700' : 'bg-blue-50 border-blue-300',
          icon: 'bg-blue-600',
          title: darkMode ? 'text-blue-300' : 'text-blue-900',
          text: darkMode ? 'text-blue-200' : 'text-blue-700',
          button: 'bg-blue-600 hover:bg-blue-700',
          buttonHover: darkMode ? 'hover:bg-blue-900/30 text-blue-300' : 'hover:bg-blue-100 text-blue-600'
        };
      default:
        return {
          bg: darkMode ? 'bg-red-900/20 border-red-700' : 'bg-red-50 border-red-300',
          icon: 'bg-red-600',
          title: darkMode ? 'text-red-300' : 'text-red-900',
          text: darkMode ? 'text-red-200' : 'text-red-700',
          button: 'bg-red-600 hover:bg-red-700',
          buttonHover: darkMode ? 'hover:bg-red-900/30 text-red-300' : 'hover:bg-red-100 text-red-600'
        };
    }
  };

  const colors = getErrorColor();

  return (
    <div className={`mb-6 ${colors.bg} border rounded-xl p-6 flex items-start gap-4 shadow-lg backdrop-blur-sm`}>
      <div className={`p-2 ${colors.icon} rounded-lg flex-shrink-0`}>
        {getErrorIcon()}
      </div>
      <div className="flex-1 min-w-0">
        <div className={`font-bold text-lg ${colors.title}`}>{getErrorTitle()}</div>
        <div className={`text-sm mt-2 ${colors.text}`}>{error}</div>
      </div>
      <div className="flex gap-3 flex-shrink-0">
        <button
          onClick={onRetry}
          className={`flex items-center gap-2 px-4 py-2 ${colors.button} text-white rounded-lg text-sm font-medium transition-all duration-200 shadow-sm`}
        >
          <RotateCcw className="w-4 h-4" /> Retry
        </button>
        <button
          onClick={() => setError(null)}
          className={`p-2 rounded-lg transition-colors ${colors.buttonHover}`}
          aria-label="Close error"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};