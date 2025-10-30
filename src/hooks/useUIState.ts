import { useState, useEffect } from 'react';

export const useUIState = () => {
  // Load initial state from localStorage
  const getInitialState = (key: string, defaultValue: any) => {
    try {
      const item = localStorage.getItem(`auditSync_${key}`);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  };

  const [selectedTab, setSelectedTab] = useState(() => getInitialState('selectedTab', 'all'));
  const [reportFormat, setReportFormat] = useState(() => getInitialState('reportFormat', 'pdf'));
  const [showHistory, setShowHistory] = useState(() => getInitialState('showHistory', false));
  const [comparisonHistory, setComparisonHistory] = useState(() => getInitialState('comparisonHistory', []));
  const [showPreview, setShowPreview] = useState(() => getInitialState('showPreview', false));
  const [darkMode, setDarkMode] = useState(() => {
    // Check for system preference first, then localStorage
    const saved = getInitialState('darkMode', null);
    if (saved !== null) return saved;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [exportFormat, setExportFormat] = useState(() => getInitialState('exportFormat', 'json'));
  const [startDate, setStartDate] = useState(() => getInitialState('startDate', ''));
  const [endDate, setEndDate] = useState(() => getInitialState('endDate', ''));
  const [reconciliationMode, setReconciliationMode] = useState<'by_period' | 'by_transaction_id'>(() => getInitialState('reconciliationMode', 'by_transaction_id'));

  // Save state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('auditSync_selectedTab', JSON.stringify(selectedTab));
  }, [selectedTab]);

  useEffect(() => {
    localStorage.setItem('auditSync_reportFormat', JSON.stringify(reportFormat));
  }, [reportFormat]);

  useEffect(() => {
    localStorage.setItem('auditSync_showHistory', JSON.stringify(showHistory));
  }, [showHistory]);

  useEffect(() => {
    localStorage.setItem('auditSync_comparisonHistory', JSON.stringify(comparisonHistory));
  }, [comparisonHistory]);

  useEffect(() => {
    localStorage.setItem('auditSync_showPreview', JSON.stringify(showPreview));
  }, [showPreview]);

  useEffect(() => {
    localStorage.setItem('auditSync_darkMode', JSON.stringify(darkMode));
    // Apply dark mode to document
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      // Only auto-switch if user hasn't manually set a preference
      const saved = localStorage.getItem('auditSync_darkMode');
      if (saved === null) {
        setDarkMode(e.matches);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    localStorage.setItem('auditSync_exportFormat', JSON.stringify(exportFormat));
  }, [exportFormat]);

  useEffect(() => {
    localStorage.setItem('auditSync_startDate', JSON.stringify(startDate));
  }, [startDate]);

  useEffect(() => {
    localStorage.setItem('auditSync_endDate', JSON.stringify(endDate));
  }, [endDate]);

  useEffect(() => {
    localStorage.setItem('auditSync_reconciliationMode', JSON.stringify(reconciliationMode));
  }, [reconciliationMode]);

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    // The useEffect will handle the document class update
  };

  return {
    selectedTab,
    setSelectedTab,
    reportFormat,
    setReportFormat,
    showHistory,
    setShowHistory,
    comparisonHistory,
    setComparisonHistory,
    showPreview,
    setShowPreview,
    darkMode,
    setDarkMode,
    exportFormat,
    setExportFormat,
    reconciliationMode,
    setReconciliationMode,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    toggleDarkMode,
  };
};