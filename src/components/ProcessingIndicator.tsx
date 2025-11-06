import React from 'react';
import { Calculator, Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';

interface ProgressStatus {
  step: string;
  progress: number;
  message: string;
  completed: boolean;
  error?: boolean;
  result?: any;
}

interface ProcessingIndicatorProps {
  progress: number;
  progressStatus: ProgressStatus | null;
  darkMode: boolean;
}

export const ProcessingIndicator: React.FC<ProcessingIndicatorProps> = ({
  progress,
  progressStatus,
  darkMode,
}) => {
  const getStepIcon = (step: string) => {
    switch (step) {
      case 'uploading':
      case 'upload_complete':
        return <Upload className="w-6 h-6 text-blue-600" />;
      case 'parsing_complete':
      case 'validation_complete':
        return <FileText className="w-6 h-6 text-green-600" />;
      case 'complete':
        return <CheckCircle className="w-6 h-6 text-green-600" />;
      case 'error':
        return <AlertCircle className="w-6 h-6 text-red-600" />;
      default:
        return <Calculator className="w-6 h-6 text-blue-600" />;
    }
  };

  const getStepColor = (step: string) => {
    if (progressStatus?.error) return 'border-red-200 border-t-red-600';
    switch (step) {
      case 'uploading':
      case 'upload_complete':
        return 'border-blue-200 border-t-blue-600';
      case 'parsing_complete':
      case 'validation_complete':
        return 'border-green-200 border-t-green-600';
      case 'complete':
        return 'border-green-200 border-t-green-600';
      default:
        return 'border-blue-200 border-t-blue-600';
    }
  };

  return (
    <div className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} rounded-xl border shadow-lg p-8 flex flex-col items-center gap-6 backdrop-blur-sm`}>
      <div className="relative">
        <div className={`w-16 h-16 border-4 rounded-full ${progressStatus?.completed ? '' : 'animate-spin'} ${getStepColor(progressStatus?.step || 'processing')}`} />
        <div className="absolute inset-0 flex items-center justify-center">
          {progressStatus ? getStepIcon(progressStatus.step) : <Calculator className="w-6 h-6 text-blue-600" />}
        </div>
      </div>
      <div className="text-center">
        <p className={`text-lg font-semibold mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
          {progressStatus?.message || 'Processing your file...'}
        </p>
        <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
          {progressStatus?.step === 'complete' ? 'Reconciliation completed successfully' :
           progressStatus?.error ? 'An error occurred during processing' :
           'Analyzing data and performing reconciliation'}
        </p>
      </div>

      {/* Progress Steps */}
      <div className="w-full space-y-3">
        {[
          { key: 'uploading', label: 'File Upload', threshold: 10 },
          { key: 'upload_complete', label: 'Upload Complete', threshold: 15 },
          { key: 'file_stored', label: 'File Storage', threshold: 25 },
          { key: 'parsing_complete', label: 'File Parsing', threshold: 45 },
          { key: 'validation_complete', label: 'Data Validation', threshold: 55 },
          { key: 'reconciliation_start', label: 'Reconciliation Start', threshold: 65 },
          { key: 'reconciliation_processing', label: 'Processing Data', threshold: 85 },
          { key: 'complete', label: 'Complete', threshold: 100 },
        ].map((step, index) => {
          const isActive = progressStatus?.step === step.key;
          const isCompleted = progress >= step.threshold || (progressStatus?.completed && step.threshold <= 100);
          const isError = progressStatus?.error && step.key === progressStatus.step;

          return (
            <div key={step.key} className="flex items-center space-x-3">
              <div className={`w-2 h-2 rounded-full ${
                isError ? 'bg-red-500' :
                isCompleted ? 'bg-green-500' :
                isActive ? 'bg-blue-500' :
                'bg-gray-300'
              }`} />
              <span className={`text-xs ${
                isError ? 'text-red-600' :
                isCompleted ? 'text-green-600' :
                isActive ? 'text-blue-600' :
                'text-gray-400'
              }`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden">
        <div className={`h-3 transition-all duration-300 rounded-full ${
          progressStatus?.error ? 'bg-gradient-to-r from-red-600 to-red-700' :
          progressStatus?.completed ? 'bg-gradient-to-r from-green-600 to-green-700' :
          'bg-gradient-to-r from-blue-600 to-blue-700'
        }`} style={{ width: `${progress}%` }} />
      </div>
      <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
        {progress}% complete
      </p>
    </div>
  );
};