import React from 'react';
import { Calculator } from 'lucide-react';

interface ProcessingIndicatorProps {
  progress: number;
  darkMode: boolean;
}

export const ProcessingIndicator: React.FC<ProcessingIndicatorProps> = ({
  progress,
  darkMode,
}) => {
  return (
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
  );
};