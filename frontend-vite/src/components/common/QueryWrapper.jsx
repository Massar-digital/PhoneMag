import React from 'react';
import { Spinner } from './Spinner';
import { EmptyState } from './EmptyState';

export function QueryWrapper({
  query,
  children,
  loadingComponent,
  errorComponent,
  emptyComponent,
  isEmpty,
}) {
  const { data, isLoading, error, isError } = query;

  if (isLoading) {
    return loadingComponent || (
      <div className="flex justify-center items-center p-8">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError) {
    return errorComponent || (
      <div className="p-8 text-center">
        <div className="text-red-500 mb-4">
          <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error loading data</h3>
        <p className="text-gray-500 mb-4">
          {error.message || 'An error occurred while loading the data.'}
        </p>
        <button
          onClick={() => query.refetch()}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!data) {
    return emptyComponent || <EmptyState title="No data available" />;
  }

  if (isEmpty && isEmpty(data)) {
    return emptyComponent || <EmptyState title="No data available" />;
  }

  return <>{children(data)}</>;
}
