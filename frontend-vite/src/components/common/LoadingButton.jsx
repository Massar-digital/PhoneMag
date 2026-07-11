import React from 'react';
import { Spinner } from './Spinner';

export const LoadingButton = ({
  loading = false,
  loadingText,
  spinnerSize = 'sm',
  children,
  disabled,
  className = '',
  ...props
}) => {
  const isDisabled = disabled || loading;

  return (
    <button
      {...props}
      disabled={isDisabled}
      className={`inline-flex items-center justify-center ${className}`}
    >
      {loading && (
        <Spinner size={spinnerSize} className="mr-2" />
      )}
      {loading ? (loadingText || 'Loading...') : children}
    </button>
  );
};
