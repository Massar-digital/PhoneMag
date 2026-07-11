import React from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { clsx } from 'clsx';

export function Form({
  children,
  onSubmit,
  schema,
  className,
  onSuccess,
  onError,
  ...formConfig
}) {
  const methods = useForm({
    ...formConfig,
    resolver: schema ? yupResolver(schema) : undefined,
  });

  const handleSubmit = async (data) => {
    try {
      await onSubmit(data, methods);
      if (onSuccess) {
        onSuccess(data, methods);
      }
    } catch (error) {
      if (onError) {
        onError(error);
      }
    }
  };

  return (
    <form
      onSubmit={methods.handleSubmit(handleSubmit)}
      className={className}
      noValidate
    >
      {children(methods)}
    </form>
  );
}

export const FormWrapper = ({
  children,
  title,
  description,
  className,
  isLoading = false,
  error,
  success,
  onClose,
}) => {
  return (
    <div className={clsx('space-y-6', className)}>
      {(title || description) && (
        <div>
          {title && (
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {title}
            </h2>
          )}
          {description && (
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {description}
            </p>
          )}
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-md dark:bg-green-900/20 dark:border-green-800">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800 dark:text-green-200">
                {success}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md dark:bg-red-900/20 dark:border-red-800">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800 dark:text-red-200">
                {error}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10 dark:bg-gray-900 dark:bg-opacity-75">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">Loading...</span>
          </div>
        </div>
      )}

      {/* Form Content */}
      <div className={clsx('relative', isLoading && 'pointer-events-none opacity-50')}>
        {children}
      </div>
    </div>
  );
};

export const FormSection = ({
  title,
  description,
  children,
  className,
}) => {
  return (
    <div className={clsx('space-y-4', className)}>
      {(title || description) && (
        <div>
          {title && (
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {title}
            </h3>
          )}
          {description && (
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {description}
            </p>
          )}
        </div>
      )}
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
};
