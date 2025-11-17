import { Filter, Calendar, DollarSign } from "lucide-react";

interface ReconciliationFiltersProps {
  reconciliationMode: 'by_period' | 'by_transaction_id';
  setReconciliationMode: (mode: 'by_period' | 'by_transaction_id') => void;
  useEntireDocument: boolean;
  setUseEntireDocument: (use: boolean) => void;
  startDate: string;
  setStartDate: (date: string) => void;
  endDate: string;
  setEndDate: (date: string) => void;
  dateTolerance: string;
  setDateTolerance: (tolerance: string) => void;
  amountTolerance: string;
  setAmountTolerance: (tolerance: string) => void;
  variant?: 'card' | 'minimal';
}

export default function ReconciliationFilters({
  reconciliationMode,
  setReconciliationMode,
  useEntireDocument,
  setUseEntireDocument,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  dateTolerance,
  setDateTolerance,
  amountTolerance,
  setAmountTolerance,
  variant = 'card',
}: ReconciliationFiltersProps) {
  const renderContent = () => (
    <div className="space-y-6">
      {/* Reconciliation Mode Selection */}
      <div className="space-y-3">
        <label className="text-sm font-semibold text-gray-700">Reconciliation Mode</label>
        <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-2 sm:space-y-0">
          <label className="flex items-center">
            <input
              type="radio"
              name="reconciliationMode"
              value="by_period"
              checked={reconciliationMode === 'by_period'}
              onChange={(e) => setReconciliationMode(e.target.value as 'by_period')}
              className="mr-2"
            />
            <span className="text-sm">By Period</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="reconciliationMode"
              value="by_transaction_id"
              checked={reconciliationMode === 'by_transaction_id'}
              onChange={(e) => setReconciliationMode(e.target.value as 'by_transaction_id')}
              className="mr-2"
            />
            <span className="text-sm">By Transaction ID</span>
          </label>
        </div>
      </div>

      {/* Date Filters - Only show for period mode */}
      {reconciliationMode === 'by_period' && (
        <div className="space-y-3">
          <label className="flex items-center text-sm font-semibold text-gray-700">
            <input
              type="checkbox"
              checked={useEntireDocument}
              onChange={(e) => setUseEntireDocument(e.target.checked)}
              className="mr-2"
            />
            Use entire document (no date filtering)
          </label>

          {!useEntireDocument && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="flex items-center text-sm font-semibold text-gray-700">
                  <Calendar className="w-4 h-4 mr-2" />
                  Start Date
                </label>
                <input
                  type="date"
                  className="w-full px-4 py-3 border border-npontu-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-npontu-500 focus:border-transparent transition-all duration-300 bg-gradient-card shadow-inner-warm"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="flex items-center text-sm font-semibold text-gray-700">
                  <Calendar className="w-4 h-4 mr-2" />
                  End Date
                </label>
                <input
                  type="date"
                  className="w-full px-4 py-3 border border-npontu-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-npontu-500 focus:border-transparent transition-all duration-300 bg-gradient-card shadow-inner-warm"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="flex items-center text-sm font-semibold text-gray-700">
                  <Calendar className="w-4 h-4 mr-2" />
                  Date Tolerance (days)
                </label>
                <input
                  type="number"
                  className="w-full px-4 py-3 border border-npontu-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-npontu-500 focus:border-transparent transition-all duration-300 bg-gradient-card shadow-inner-warm"
                  value={dateTolerance}
                  onChange={(e) => setDateTolerance(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <label className="flex items-center text-sm font-semibold text-gray-700">
                  <DollarSign className="w-4 h-4 mr-2" />
                  Amount Tolerance
                </label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full px-4 py-3 border border-npontu-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-npontu-500 focus:border-transparent transition-all duration-300 bg-gradient-card shadow-inner-warm"
                  value={amountTolerance}
                  onChange={(e) => setAmountTolerance(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );

  if (variant === 'minimal') {
    return renderContent();
  }

  return (
    <div className="bg-white rounded-2xl shadow-floating border border-npontu-200 overflow-hidden transform hover:scale-[1.02] transition-all duration-300">
      <div className="bg-gradient-to-r from-npontu-500 to-npontu-600 p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
        <div className="relative flex items-center space-x-3">
          <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
            <Filter className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-white font-display">Statement Filters</h3>
        </div>
      </div>
      <div className="p-8">{renderContent()}</div>
    </div>
  );
}