import React, { useState, useMemo } from 'react';
import { Search, Filter, ArrowUpDown, ChevronLeft, ChevronRight, Inbox, RefreshCw, Plus, Download } from 'lucide-react';

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  searchKey?: keyof T | string;
  searchPlaceholder?: string;
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string;
  onRetry?: () => void;
  onAddNew?: () => void;
  addNewLabel?: string;
  filterOptions?: { key: string; label: string; options: { value: string; label: string }[] }[];
  actions?: (item: T) => React.ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  searchKey,
  searchPlaceholder = 'Search records...',
  isLoading = false,
  isError = false,
  errorMessage = 'Failed to load data from REST backend',
  onRetry,
  onAddNew,
  addNewLabel = 'Add New',
  filterOptions = [],
  actions,
  emptyTitle = 'No Records Found',
  emptyDescription = 'There are no records matching your current filter criteria.',
}: DataTableProps<T>) {
  const [search, setSearch] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string>>({});
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Filter & Search Logic
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      // Search
      if (search) {
        const query = search.toLowerCase();
        let matches = false;
        if (searchKey && item[searchKey]) {
          matches = String(item[searchKey]).toLowerCase().includes(query);
        } else {
          matches = Object.values(item).some((val) =>
            val !== null && val !== undefined && String(val).toLowerCase().includes(query)
          );
        }
        if (!matches) return false;
      }

      // Filter Options
      for (const filter of filterOptions) {
        const filterVal = selectedFilters[filter.key];
        if (filterVal && filterVal !== 'ALL') {
          if (String(item[filter.key]) !== filterVal) {
            return false;
          }
        }
      }
      return true;
    });
  }, [data, search, searchKey, selectedFilters, filterOptions]);

  // Sorting
  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;
    return [...filteredData].sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];
      if (valA === valB) return 0;
      if (valA === undefined || valA === null) return 1;
      if (valB === undefined || valB === null) return -1;
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      }
      return sortOrder === 'asc'
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });
  }, [filteredData, sortKey, sortOrder]);

  // Pagination
  const totalItems = sortedData.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortOrder === 'asc') setSortOrder('desc');
      else {
        setSortKey(null);
        setSortOrder('asc');
      }
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setSelectedFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-md overflow-hidden">
      {/* Top Toolbar */}
      <div className="p-4 border-b border-slate-800/80 flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-950/40">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Search Box */}
          <div className="relative flex-1 md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={searchPlaceholder}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-800 bg-slate-950/80 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all"
            />
          </div>

          {/* Dynamic Filters */}
          {filterOptions.map((f) => (
            <div key={f.key} className="relative">
              <select
                value={selectedFilters[f.key] || 'ALL'}
                onChange={(e) => handleFilterChange(f.key, e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-800 bg-slate-950/80 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all cursor-pointer font-semibold"
              >
                <option value="ALL">All {f.label}s</option>
                {f.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          {onAddNew && (
            <button
              onClick={onAddNew}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-950/50 flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>{addNewLabel}</span>
            </button>
          )}
        </div>
      </div>

      {/* Table Body / State Views */}
      {isLoading ? (
        <div className="p-8 space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 bg-slate-800/40 animate-pulse rounded-xl w-full"></div>
          ))}
        </div>
      ) : isError ? (
        <div className="p-12 text-center">
          <div className="w-12 h-12 bg-rose-950/50 border border-rose-800/80 rounded-2xl flex items-center justify-center text-rose-400 mx-auto mb-3">
            <RefreshCw className="w-6 h-6 animate-spin" />
          </div>
          <h3 className="text-sm font-bold text-white">{errorMessage}</h3>
          <p className="text-xs text-slate-400 mt-1">Check your REST API backend connection.</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-xl text-xs font-bold border border-slate-700 transition-all"
            >
              Retry REST Query
            </button>
          )}
        </div>
      ) : paginatedData.length === 0 ? (
        <div className="p-12 text-center">
          <div className="w-12 h-12 bg-slate-800/50 border border-slate-700/80 rounded-2xl flex items-center justify-center text-slate-400 mx-auto mb-3">
            <Inbox className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-white">{emptyTitle}</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">{emptyDescription}</p>
          {onAddNew && (
            <button
              onClick={onAddNew}
              className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md transition-all"
            >
              {addNewLabel}
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 border-b border-slate-800/80 text-slate-400 uppercase text-[10px] tracking-wider font-bold">
              <tr>
                {columns.map((col) => (
                  <th key={col.key} className="py-3.5 px-4">
                    {col.sortable ? (
                      <button
                        onClick={() => handleSort(col.key)}
                        className="flex items-center gap-1.5 hover:text-white transition-colors"
                      >
                        <span>{col.header}</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-500" />
                      </button>
                    ) : (
                      <span>{col.header}</span>
                    )}
                  </th>
                ))}
                {actions && <th className="py-3.5 px-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {paginatedData.map((item, idx) => (
                <tr key={item.id || idx} className="hover:bg-slate-800/40 transition-colors">
                  {columns.map((col) => (
                    <td key={col.key} className="py-3.5 px-4 font-medium">
                      {col.render ? col.render(item) : item[col.key]}
                    </td>
                  ))}
                  {actions && <td className="py-3.5 px-4 text-right">{actions(item)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Footer */}
      {!isLoading && !isError && totalItems > 0 && (
        <div className="p-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-950/40 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span>Showing</span>
            <span className="font-bold text-white">
              {Math.min((currentPage - 1) * pageSize + 1, totalItems)}
            </span>
            <span>to</span>
            <span className="font-bold text-white">
              {Math.min(currentPage * pageSize, totalItems)}
            </span>
            <span>of</span>
            <span className="font-bold text-white">{totalItems}</span>
            <span>entries</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <span className="text-[11px]">Rows:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-slate-950 border border-slate-800 text-xs rounded-lg px-2 py-1 text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 font-bold text-white text-xs">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
