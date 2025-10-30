import { Discrepancy } from './useReconciliation';

export const useUtils = () => {
  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical': return 'bg-red-100 border-red-600 text-red-700';
      case 'high': return 'bg-orange-100 border-orange-600 text-orange-700';
      case 'medium': return 'bg-yellow-100 border-yellow-600 text-yellow-700';
      case 'low': return 'bg-slate-100 border-slate-600 text-slate-700';
      default: return 'bg-slate-100 border-slate-600 text-slate-700';
    }
  };

  const formatCurrency = (value: number) => new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS' }).format(value || 0);

  const getFileIcon = (filename: string) => {
    if (filename.endsWith('.xlsx') || filename.endsWith('.xls')) return 'FileSpreadsheet';
    if (filename.endsWith('.csv')) return 'FileCode';
    return 'FileText';
  };

  const convertToCSV = (records: Discrepancy[]) => {
    if (records.length === 0) return '';

    const headers = Object.keys(records[0]).join(',');
    const rows = records.map(record =>
      Object.values(record).map(value =>
        typeof value === 'string' && value.includes(',') ? `"${value}"` : value
      ).join(',')
    );

    return [headers, ...rows].join('\n');
  };

  const exportData = (results: any, exportFormat: string) => {
    const dataToExport = exportFormat === 'json'
      ? JSON.stringify(results.records, null, 2)
      : convertToCSV(results.records);

    const blob = new Blob([dataToExport], {
      type: exportFormat === 'json' ? 'application/json' : 'text/csv'
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `reconciliation_data.${exportFormat}`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return {
    getSeverityColor,
    formatCurrency,
    getFileIcon,
    convertToCSV,
    exportData,
  };
};