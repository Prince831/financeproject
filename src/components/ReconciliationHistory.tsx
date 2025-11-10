import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { History, FileText, Calendar, Database, AlertTriangle, ChevronLeft, ChevronRight, Eye, Download } from 'lucide-react';
import NpontuCard, { NpontuCardHeader, NpontuCardContent } from './NpontuCard';
import NpontuButton from './NpontuButton';
import NpontuBadge from './NpontuBadge';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8002/api';

interface ReconciliationReport {
  id: number;
  reference: string;
  reconciliation_date: string;
  total_records: number;
  matched_records: number;
  discrepancies: number;
  total_debit: number;
  total_credit: number;
  net_change: number;
  status: string;
  created_at: string;
  updated_at: string;
  discrepancy_details?: any[];
  detailed_records?: any[];
}

interface ReconciliationHistoryProps {
  onBack?: () => void;
}

export const ReconciliationHistory: React.FC<ReconciliationHistoryProps> = ({ onBack }) => {
  const [reports, setReports] = useState<ReconciliationReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [perPage] = useState(10);
  const [selectedReport, setSelectedReport] = useState<ReconciliationReport | null>(null);
  const [showReportDetails, setShowReportDetails] = useState(false);

  useEffect(() => {
    fetchReports();
  }, [currentPage]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`${API_BASE}/reports`, {
        params: {
          page: currentPage,
          per_page: perPage
        }
      });

      setReports(response.data.data || []);
      setTotalPages(response.data.last_page || 1);
    } catch (err: any) {
      console.error('Failed to fetch reports:', err);
      setError('Failed to load reconciliation history');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'success';
      case 'failed':
        return 'error';
      case 'processing':
        return 'warning';
      default:
        return 'primary';
    }
  };

  const handleViewReport = (report: ReconciliationReport) => {
    setSelectedReport(report);
    setShowReportDetails(true);
  };

  const handleDownloadReport = async (report: ReconciliationReport, format: 'pdf' | 'xlsx' = 'pdf') => {
    try {
      const response = await axios.post(`${API_BASE}/download-report`, {
        reference: report.reference,
        reportData: report,
        format
      }, { responseType: 'blob' });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `reconciliation_report_${report.reference}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err: any) {
      console.error('Failed to download report:', err);
      setError('Failed to download report');
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {onBack && (
            <NpontuButton
              variant="outline"
              size="sm"
              onClick={onBack}
              icon={<ChevronLeft className="w-4 h-4" />}
            >
              Back
            </NpontuButton>
          )}
          <div>
            <h1 className="text-3xl font-display font-bold bg-gradient-to-r from-npontu-600 to-npontu-800 bg-clip-text text-transparent">
              Reconciliation History
            </h1>
            <p className="text-warm-grey-600 mt-1">View past reconciliation reports and their details</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <History className="w-8 h-8 text-npontu-600" />
        </div>
      </div>

      {/* Report Details Modal */}
      {showReportDetails && selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="bg-gradient-to-r from-npontu-600 to-npontu-800 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white">Reconciliation Report Details</h2>
                  <p className="text-npontu-100 mt-1">{selectedReport.reference}</p>
                </div>
                <button
                  onClick={() => setShowReportDetails(false)}
                  className="text-white hover:text-npontu-200 text-2xl"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6 max-h-[calc(90vh-200px)] overflow-y-auto">
              {/* Summary */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-sm font-medium text-blue-900">Total Records</div>
                  <div className="text-2xl font-bold text-blue-600">{selectedReport.total_records.toLocaleString()}</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-sm font-medium text-green-900">Matched</div>
                  <div className="text-2xl font-bold text-green-600">{selectedReport.matched_records.toLocaleString()}</div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <div className="text-sm font-medium text-red-900">Discrepancies</div>
                  <div className="text-2xl font-bold text-red-600">{selectedReport.discrepancies.toLocaleString()}</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-sm font-medium text-purple-900">Net Change</div>
                  <div className={`text-2xl font-bold ${selectedReport.net_change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(Math.abs(selectedReport.net_change))}
                  </div>
                </div>
              </div>

              {/* Discrepancies Table */}
              {selectedReport.discrepancy_details && selectedReport.discrepancy_details.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-4">Discrepancies Found</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Field</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Document Value</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Database Value</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Difference</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Severity</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {selectedReport.discrepancy_details.slice(0, 50).map((discrepancy: any, index: number) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-sm text-gray-900">{discrepancy.id}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">{discrepancy.field}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">{discrepancy.documentValue}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">{discrepancy.databaseValue}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">{discrepancy.difference}</td>
                            <td className="px-4 py-2 text-sm">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                discrepancy.severity === 'critical' ? 'bg-red-100 text-red-800' :
                                discrepancy.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                                discrepancy.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {discrepancy.severity}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {selectedReport.discrepancy_details.length > 50 && (
                      <p className="text-sm text-gray-500 mt-2">
                        Showing first 50 discrepancies. Total: {selectedReport.discrepancy_details.length}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <NpontuButton
                  variant="outline"
                  onClick={() => handleDownloadReport(selectedReport, 'pdf')}
                  icon={<Download className="w-4 h-4" />}
                >
                  Download PDF
                </NpontuButton>
                <NpontuButton
                  variant="primary"
                  onClick={() => setShowReportDetails(false)}
                >
                  Close
                </NpontuButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <NpontuCard>
        <NpontuCardHeader
          icon={<FileText className="w-6 h-6" />}
          title="Reconciliation Reports"
        >
          <div className="text-sm text-white/80">
            Page {currentPage} of {totalPages} • {reports.length} reports shown
          </div>
        </NpontuCardHeader>

        <NpontuCardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-npontu-600"></div>
              <span className="ml-3 text-npontu-600 font-medium">Loading reports...</span>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-600 font-medium mb-4">{error}</p>
              <NpontuButton onClick={fetchReports} variant="primary">
                Try Again
              </NpontuButton>
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-12">
              <History className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 font-medium">No reconciliation reports found</p>
              <p className="text-gray-500 text-sm mt-1">Reports will appear here after running reconciliations</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className="border border-npontu-200 rounded-xl p-6 hover:shadow-lg transition-all duration-200 hover:border-npontu-300"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <h3 className="text-lg font-semibold text-npontu-900">
                          {report.reference}
                        </h3>
                        <NpontuBadge variant={getStatusBadgeVariant(report.status)}>
                          {report.status}
                        </NpontuBadge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4 text-npontu-600" />
                          <div>
                            <p className="text-sm font-medium text-npontu-900">Date</p>
                            <p className="text-sm text-gray-600">{formatDate(report.reconciliation_date)}</p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Database className="w-4 h-4 text-npontu-600" />
                          <div>
                            <p className="text-sm font-medium text-npontu-900">Total Records</p>
                            <p className="text-sm text-gray-600">{report.total_records.toLocaleString()}</p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <AlertTriangle className="w-4 h-4 text-npontu-600" />
                          <div>
                            <p className="text-sm font-medium text-npontu-900">Discrepancies</p>
                            <p className="text-sm text-gray-600">{report.discrepancies.toLocaleString()}</p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <div>
                            <p className="text-sm font-medium text-npontu-900">Net Change</p>
                            <p className={`text-sm font-semibold ${report.net_change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatCurrency(Math.abs(report.net_change))}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 mt-4">
                        <NpontuButton
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewReport(report)}
                          icon={<Eye className="w-4 h-4" />}
                        >
                          View Details
                        </NpontuButton>
                        <NpontuButton
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadReport(report, 'pdf')}
                          icon={<Download className="w-4 h-4" />}
                        >
                          Download PDF
                        </NpontuButton>
                      </div>

                      <div className="text-xs text-gray-500 mt-2">
                        Created: {formatDate(report.created_at)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center space-x-2 pt-6 border-t border-npontu-200">
                  <NpontuButton
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    icon={<ChevronLeft className="w-4 h-4" />}
                  >
                    Previous
                  </NpontuButton>

                  <div className="flex items-center space-x-2">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                      if (pageNum > totalPages) return null;

                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                            pageNum === currentPage
                              ? 'bg-npontu-600 text-white'
                              : 'text-npontu-600 hover:bg-npontu-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <NpontuButton
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    icon={<ChevronRight className="w-4 h-4" />}
                  >
                    Next
                  </NpontuButton>
                </div>
              )}
            </div>
          )}
        </NpontuCardContent>
      </NpontuCard>
    </div>
  );
};

export default ReconciliationHistory;