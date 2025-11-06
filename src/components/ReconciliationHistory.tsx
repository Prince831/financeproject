import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { History, FileText, Calendar, User, Database, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
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

                      <div className="text-xs text-gray-500">
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