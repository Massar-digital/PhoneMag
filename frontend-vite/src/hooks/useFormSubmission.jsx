import { useState } from 'react';
import { useToast } from '../context/ToastContext';

export function useFormSubmission(options = {}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const { showToast } = useToast();

  const {
    successMessage = 'Operation completed successfully',
    errorMessage = 'An error occurred',
    onSuccess,
    onError,
  } = options;

  const submit = async (
    operation,
    customSuccessMessage,
    customErrorMessage
  ) => {
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await operation();
      const message = customSuccessMessage || successMessage;
      setSuccess(message);
      showToast(message, 'success');
      onSuccess?.(result);
      return result;
    } catch (err) {
      const message = customErrorMessage || errorMessage;
      // Handle DRF error responses which can be objects with field errors
      let errorMsg = message;
      if (err.response?.data) {
        const data = err.response.data;
        if (typeof data === 'string') {
          errorMsg = data;
        } else if (data.message) {
          errorMsg = data.message;
        } else if (data.detail) {
          errorMsg = data.detail;
        } else if (data.non_field_errors) {
          errorMsg = Array.isArray(data.non_field_errors) 
            ? data.non_field_errors.join(', ') 
            : data.non_field_errors;
        } else if (typeof data === 'object') {
          // DRF validation errors are often { field: [errors] }
          const fieldErrors = Object.entries(data)
            .map(([field, errors]) => {
              const errorList = Array.isArray(errors) ? errors.join(', ') : errors;
              return `${field}: ${errorList}`;
            })
            .join('; ');
          if (fieldErrors) {
            errorMsg = fieldErrors;
          }
        }
      } else if (err.message) {
        errorMsg = err.message;
      }
      setError(errorMsg);
      showToast(errorMsg, 'error');
      onError?.(err);
      return null;
    } finally {
      setIsSubmitting(false);
    }
  };

  const reset = () => {
    setError(null);
    setSuccess(null);
    setIsSubmitting(false);
  };

  return {
    isSubmitting,
    error,
    success,
    submit,
    reset,
  };
}

// Specialized hooks for common operations
export function useCreateForm(options = {}) {
  return useFormSubmission({
    successMessage: 'Item created successfully',
    ...options,
  });
}

export function useUpdateForm(options = {}) {
  return useFormSubmission({
    successMessage: 'Item updated successfully',
    ...options,
  });
}

export function useDeleteForm(options = {}) {
  return useFormSubmission({
    successMessage: 'Item deleted successfully',
    ...options,
  });
}
