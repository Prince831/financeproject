import React from 'react';
import { Shield, Clock, Moon, Sun, User, Settings } from 'lucide-react';

interface NavigationProps {
  showHistory: boolean;
  setShowHistory: (show: boolean) => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
  reconciliationMode: 'by_period' | 'by_transaction_id';
  setReconciliationMode: (mode: 'by_period' | 'by_transaction_id') => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  showHistory,
  setShowHistory,
  darkMode,
  toggleDarkMode,
  reconciliationMode,
  setReconciliationMode,
}) => {
  return (
    <nav className={`${darkMode ? 'bg-slate-900/95 backdrop-blur-sm border-slate-700' : 'bg-white/95 backdrop-blur-sm border-slate-200'} border-b shadow-lg sticky top-0 z-40`}>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="p-2 sm:p-3 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl shadow-lg">
              <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">AuditSync Pro</h1>
              <p className={`${darkMode ? 'text-slate-400' : 'text-slate-600'} text-xs sm:text-sm`}>Financial Reconciliation Platform</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <div className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg border shadow-sm transition-all duration-200 text-sm ${darkMode ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'} hover:shadow-md`}>
              <Settings className="w-4 h-4 text-slate-500" />
              <select
                value={reconciliationMode}
                onChange={(e) => setReconciliationMode(e.target.value as 'by_period' | 'by_transaction_id')}
                className="bg-transparent border-none outline-none font-medium cursor-pointer"
              >
                <option value="by_transaction_id">By Transaction ID</option>
                <option value="by_period">By Period</option>
              </select>
            </div>
            <button onClick={() => setShowHistory(!showHistory)} className={`flex items-center gap-2 px-3 sm:px-4 py-2 text-sm rounded-lg border shadow-sm transition-all duration-200 ${darkMode ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'} hover:shadow-md`}>
              <Clock className="w-4 h-4 text-slate-500" /><span className="font-medium hidden sm:inline">History</span>
            </button>
            <button onClick={toggleDarkMode} className={`flex items-center gap-2 px-3 sm:px-4 py-2 text-sm rounded-lg border shadow-sm transition-all duration-200 ${darkMode ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'} hover:shadow-md`}>
              {darkMode ? <Sun className="w-4 h-4 text-slate-500" /> : <Moon className="w-4 h-4 text-slate-500" />}
              <span className="font-medium hidden sm:inline">{darkMode ? 'Light' : 'Dark'}</span>
            </button>
            <div className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg border shadow-sm transition-all duration-200 ${darkMode ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'} hover:shadow-md`}>
              <User className="w-4 h-4 text-slate-500" /><span className="text-sm font-medium hidden sm:inline">Anonymous</span>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};