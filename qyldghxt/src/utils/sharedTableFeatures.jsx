import React, { useState, useRef, useEffect } from 'react';
import { Filter, Download, RefreshCcw, List } from 'lucide-react';
import { exportToExcel } from './export';

const SharedTableFeatures = ({ 
  filters, 
  setFilters, 
  initialFilters, 
  data, 
  columns, 
  exportFileName, 
  onFilterApply 
}) => {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [hiddenColumns, setHiddenColumns] = useState([]);
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  
  const filterBtnRef = useRef(null);
  const dropdownRef = useRef(null);
  const columnSelectorRef = useRef(null);

  // Close filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutsideFilter = (e) => {
      if (!isFilterOpen) return;
      const btnEl = filterBtnRef.current;
      const ddEl = dropdownRef.current;
      if (ddEl && !ddEl.contains(e.target) && btnEl && !btnEl.contains(e.target)) {
        setIsFilterOpen(false);
      }
    };

    const handleClickOutsideColumnSelector = (event) => {
      if (columnSelectorRef.current && !columnSelectorRef.current.contains(event.target)) {
        setShowColumnSelector(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutsideFilter);
    document.addEventListener('mousedown', handleClickOutsideColumnSelector);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutsideFilter);
      document.removeEventListener('mousedown', handleClickOutsideColumnSelector);
    };
  }, [isFilterOpen]);

  // Reset filters to initial state
  const resetFilters = () => {
    setFilters({ ...initialFilters });
    if (onFilterApply) {
      onFilterApply({ ...initialFilters });
    }
  };

  // Export data to Excel
  const handleExport = () => {
    if (!data || data.length === 0) {
      return;
    }
    
    const exportData = data.map(item => {
      const exportItem = {};
      columns.forEach(col => {
        if (!hiddenColumns.includes(col.key)) {
          const value = col.render ? col.render(item[col.key], item) : item[col.key];
          exportItem[col.label] = value;
        }
      });
      return exportItem;
    });
    
    exportToExcel(exportData, exportFileName);
  };

  // Toggle column visibility
  const toggleColumn = (columnKey) => {
    setHiddenColumns(prev => {
      if (prev.includes(columnKey)) {
        return prev.filter(key => key !== columnKey);
      } else {
        return [...prev, columnKey];
      }
    });
  };

  return {
    isFilterOpen,
    setIsFilterOpen,
    hiddenColumns,
    showColumnSelector,
    setShowColumnSelector,
    filterBtnRef,
    dropdownRef,
    columnSelectorRef,
    resetFilters,
    handleExport,
    toggleColumn,
    visibleColumns: columns.filter(col => !hiddenColumns.includes(col.key))
  };
};

export default SharedTableFeatures;