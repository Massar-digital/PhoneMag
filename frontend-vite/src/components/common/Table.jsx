import React from 'react';

// interface TableColumn {
//   key: string;
//   label: string;
//   sortable: boolean;
//   render: (value, row) => React.ReactNode;
// }

// interface TableProps {
//   columns: TableColumn[];
//   data: object[];
//   loading: boolean;
//   emptyMessage: string;
//   onSort: (key) => void;
//   sortKey: string;
//   sortOrder: 'asc' | 'desc';
//   selectableRows: boolean;
//   selectedRows: (row) => boolean;
//   onRowSelect: (row) => void;
//   pagination: {
//     page: number;
//     pageSize: number;
//     total: number;
//     onPageChange: (page) => void;
//   };
//   caption: string;
//   ariaLabel: string;
// }

export function Table({
  columns,
  data,
  loading = false,
  emptyMessage = 'No data found.',
  onSort,
  sortKey,
  sortOrder,
  selectableRows = false,
  selectedRows,
  onRowSelect,
  onSelectAll,
  onRowClick,
  pagination,
  caption,
  ariaLabel,
}) {
  // Ensure data is always an array
  const safeData = Array.isArray(data) ? data : [];
  
  const getSortAriaLabel = (col) => {
    if (!col.sortable) return col.label;
    if (sortKey === col.key) {
      return `${col.label}, sorted ${sortOrder === 'asc' ? 'ascending' : 'descending'}`;
    }
    return `${col.label}, sortable`;
  };

  return (
    <div className="w-full container-responsive">
      {/* Scrollable Desktop view */}
      <div className="hidden md:block overflow-x-auto">
        <table
          className="min-w-full bg-white dark:bg-gray-900 border rounded-lg"
          aria-label={ariaLabel}
          role="table"
        >
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead>
            <tr>
              {selectableRows && (
                <th scope="col" className="px-[clamp(0.5rem,1.5vw,1rem)] py-[clamp(0.4rem,1vw,0.8rem)] w-12 text-center border-b">
                  <input
                    type="checkbox"
                    checked={safeData.length > 0 && safeData.every(row => selectedRows && selectedRows(row))}
                    onChange={() => {
                      if (safeData.every(row => selectedRows && selectedRows(row))) {
                        // If all are selected, deselect all (this depends on onRowSelect being able to clear)
                        // Actually better to have an explicit onSelectAll prop
                        onSelectAll && onSelectAll(!safeData.every(row => selectedRows && selectedRows(row)));
                      } else {
                        onSelectAll && onSelectAll(true);
                      }
                    }}
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <span className="sr-only">Select All</span>
                </th>
              )}
              {columns.map(col => (
                <th
                  key={String(col.key)}
                  scope="col"
                  className={`px-[clamp(0.5rem,1.5vw,1rem)] py-[clamp(0.4rem,1vw,0.8rem)] text-left font-semibold border-b ${
                    col.sortable ? 'cursor-pointer select-none hover:bg-gray-50 dark:hover:bg-gray-800' : ''
                  }`}
                  onClick={() => col.sortable && onSort && onSort(col.key)}
                  aria-sort={sortKey === col.key ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}
                  aria-label={getSortAriaLabel(col)}
                >
                  {col.label}
              {col.sortable && sortKey === col.key && (
                    <span className="ml-1" aria-hidden="true">
                      {sortOrder === 'asc' ? '▲' : '▼'}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={columns.length + (selectableRows ? 1 : 0)}
                  className="px-[clamp(0.5rem,1.5vw,1rem)] py-[clamp(1rem,3vw,2rem)] text-center"
                >
                  <div className="animate-pulse h-6 bg-gray-200 dark:bg-gray-800 rounded w-1/2 mx-auto" />
                  <span className="sr-only">Chargement des données...</span>
                </td>
              </tr>
            ) : safeData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (selectableRows ? 1 : 0)}
                  className="px-[clamp(0.5rem,1.5vw,1rem)] py-[clamp(1rem,3vw,2rem)] text-center text-gray-500"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              safeData.map((row, i) => (
                <tr
                  key={i}
                  className={`border-b hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
                  role="row"
                  onClick={() => onRowClick && onRowClick(row)}
                >
                  {selectableRows && (
                    <td className="px-[clamp(0.5rem,1.5vw,1rem)] py-[clamp(0.4rem,1vw,0.8rem)] text-center" role="gridcell">
                      <input
                        type="checkbox"
                        checked={selectedRows ? selectedRows(row) : false}
                        onChange={() => onRowSelect && onRowSelect(row)}
                        aria-label={`Sélectionner la ligne ${i + 1}`}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                    </td>
                  )}
                  {columns.map(col => (
                    <td key={String(col.key)} className="px-[clamp(0.5rem,1.5vw,1rem)] py-[clamp(0.4rem,1vw,0.8rem)]" role="gridcell">
                      {col.render ? col.render(row[col.key], row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile view as Cards */}
      <div className="md:hidden space-y-4">
        {selectableRows && safeData.length > 0 && (
          <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="text-sm font-medium text-slate-700">Sélectionner tout</span>
            <input
              type="checkbox"
              checked={safeData.every(row => selectedRows && selectedRows(row))}
              onChange={() => onSelectAll && onSelectAll(!safeData.every(row => selectedRows && selectedRows(row)))}
              className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
          </div>
        )}
        {loading ? (
          <div className="p-4 space-y-4">
            <div className="animate-pulse h-24 bg-gray-100 dark:bg-gray-800 rounded-lg"></div>
            <div className="animate-pulse h-24 bg-gray-100 dark:bg-gray-800 rounded-lg"></div>
          </div>
        ) : safeData.length === 0 ? (
          <div className="p-8 text-center text-gray-500 bg-white dark:bg-gray-900 border rounded-lg">
            {emptyMessage}
          </div>
        ) : (
          safeData.map((row, i) => (
            <div
              key={i}
              className={`bg-white dark:bg-gray-900 border rounded-xl overflow-hidden shadow-sm transition-all duration-200 ${
                selectedRows && selectedRows(row) ? 'border-primary-500 ring-1 ring-primary-500' : ''
              }`}
            >
              <div className="p-4 space-y-3">
                {columns.map((col, colIndex) => {
                  const isActions = col.key === 'id' || col.label.toLowerCase() === 'actions' || col.key === 'actions';
                  
                  if (colIndex === 0) {
                    return (
                      <div key={String(col.key)} className="flex justify-between items-start">
                        <div className="font-bold text-gray-900 dark:text-white">
                          {col.render ? col.render(row[col.key], row) : row[col.key]}
                        </div>
                        {selectableRows && (
                          <input
                            type="checkbox"
                            checked={selectedRows ? selectedRows(row) : false}
                            onChange={() => onRowSelect && onRowSelect(row)}
                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                        )}
                      </div>
                    );
                  }

                  if (isActions) {
                    return (
                      <div key={String(col.key)} className="flex pt-2 mt-2 border-t justify-end gap-2">
                        {col.render ? col.render(row[col.key], row) : row[col.key]}
                      </div>
                    );
                  }

                  return (
                    <div key={String(col.key)} className="flex items-center justify-between gap-4 text-sm">
                      <span className="text-gray-500 dark:text-gray-400 font-medium">{col.label}:</span>
                      <div className="text-gray-900 dark:text-gray-100 text-right">
                        {col.render ? col.render(row[col.key], row) : row[col.key]}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {pagination && (
        <nav aria-label="Table pagination" className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4 px-2">
          <span className="text-xs sm:text-sm text-gray-500 font-medium bg-gray-50 dark:bg-gray-800 px-3 py-1 rounded-full">
            Page {pagination.page} de {Math.max(1, Math.ceil(pagination.total / pagination.pageSize))}
          </span>
          <div className="flex items-center gap-2">
            <button
              className="px-3 py-1.5 rounded-lg border text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-gray-900 hover:bg-gray-50 transition-colors"
              disabled={pagination.page === 1}
              onClick={() => pagination.onPageChange(pagination.page - 1)}
            >
              Précédent
            </button>
            <button
              className="px-3 py-1.5 rounded-lg border text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-gray-900 hover:bg-gray-50 transition-colors"
              disabled={pagination.page === Math.ceil(pagination.total / pagination.pageSize)}
              onClick={() => pagination.onPageChange(pagination.page + 1)}
            >
              Suivant
            </button>
          </div>
        </nav>
      )}
    </div>
  );
}
