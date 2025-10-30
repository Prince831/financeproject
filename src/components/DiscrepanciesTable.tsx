import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Discrepancy } from '../hooks/useReconciliation';

interface DiscrepanciesTableProps {
  discrepancies: Discrepancy[];
  darkMode: boolean;
  getSeverityColor: (severity: string) => string;
}

export const DiscrepanciesTable: React.FC<DiscrepanciesTableProps> = ({
  discrepancies,
  darkMode,
  getSeverityColor,
}) => {
  return (
    <div className="mt-6 overflow-x-auto">
      <div className={`rounded-xl border ${darkMode ? 'border-slate-600' : 'border-slate-200'} overflow-hidden shadow-sm`}>
        <table className="w-full border-collapse text-sm">
          <thead className={`${darkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
            <tr>
              <th className={`border-b ${darkMode ? 'border-slate-600 text-slate-300' : 'border-slate-200 text-slate-700'} px-4 py-3 text-left font-semibold`}>ID</th>
              <th className={`border-b ${darkMode ? 'border-slate-600 text-slate-300' : 'border-slate-200 text-slate-700'} px-4 py-3 text-left font-semibold`}>Account</th>
              <th className={`border-b ${darkMode ? 'border-slate-600 text-slate-300' : 'border-slate-200 text-slate-700'} px-4 py-3 text-left font-semibold`}>Field</th>
              <th className={`border-b ${darkMode ? 'border-slate-600 text-slate-300' : 'border-slate-200 text-slate-700'} px-4 py-3 text-left font-semibold`}>Document Value</th>
              <th className={`border-b ${darkMode ? 'border-slate-600 text-slate-300' : 'border-slate-200 text-slate-700'} px-4 py-3 text-left font-semibold`}>Database Value</th>
              <th className={`border-b ${darkMode ? 'border-slate-600 text-slate-300' : 'border-slate-200 text-slate-700'} px-4 py-3 text-left font-semibold`}>Difference</th>
              <th className={`border-b ${darkMode ? 'border-slate-600 text-slate-300' : 'border-slate-200 text-slate-700'} px-4 py-3 text-left font-semibold`}>Debit</th>
              <th className={`border-b ${darkMode ? 'border-slate-600 text-slate-300' : 'border-slate-200 text-slate-700'} px-4 py-3 text-left font-semibold`}>Credit</th>
              <th className={`border-b ${darkMode ? 'border-slate-600 text-slate-300' : 'border-slate-200 text-slate-700'} px-4 py-3 text-left font-semibold`}>Severity</th>
            </tr>
          </thead>
          <tbody>
            {discrepancies.length === 0 && (
              <tr>
                <td colSpan={9} className={`text-center py-12 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-lg font-medium">No discrepancies found</p>
                  <p className="text-sm">All records matched successfully!</p>
                </td>
              </tr>
            )}
            {discrepancies.map((d, index) => (
              <tr key={`${d.id}-${index}`} className={`transition-colors ${darkMode ? 'hover:bg-slate-700/50' : 'hover:bg-slate-50'}`}>
                <td className={`border-b ${darkMode ? 'border-slate-600 text-white' : 'border-slate-200 text-slate-900'} px-4 py-3 font-medium`}>{d.id}</td>
                <td className={`border-b ${darkMode ? 'border-slate-600 text-white' : 'border-slate-200 text-slate-900'} px-4 py-3`}>{d.account}</td>
                <td className={`border-b ${darkMode ? 'border-slate-600 text-white' : 'border-slate-200 text-slate-900'} px-4 py-3`}>{d.field}</td>
                <td className={`border-b ${darkMode ? 'border-slate-600 text-white' : 'border-slate-200 text-slate-900'} px-4 py-3`}>{d.documentValue}</td>
                <td className={`border-b ${darkMode ? 'border-slate-600 text-white' : 'border-slate-200 text-slate-900'} px-4 py-3`}>{d.databaseValue ?? '-'}</td>
                <td className={`border-b ${darkMode ? 'border-slate-600 text-white' : 'border-slate-200 text-slate-900'} px-4 py-3`}>{d.difference}</td>
                <td className={`border-b ${darkMode ? 'border-slate-600 text-white' : 'border-slate-200 text-slate-900'} px-4 py-3`}>
                  {d.field === 'Debit Amount' ? (
                    <span className={`font-medium ${d.difference !== '0.00' ? 'text-red-600' : 'text-green-600'}`}>
                      {d.difference !== '0.00' ? d.difference : '✓'}
                    </span>
                  ) : '-'}
                </td>
                <td className={`border-b ${darkMode ? 'border-slate-600 text-white' : 'border-slate-200 text-slate-900'} px-4 py-3`}>
                  {d.field === 'Credit Amount' ? (
                    <span className={`font-medium ${d.difference !== '0.00' ? 'text-green-600' : 'text-green-600'}`}>
                      {d.difference !== '0.00' ? d.difference : '✓'}
                    </span>
                  ) : '-'}
                </td>
                <td className={`border-b ${darkMode ? 'border-slate-600' : 'border-slate-200'} px-4 py-3`}>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getSeverityColor(d.severity)}`}>
                    {d.severity}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};