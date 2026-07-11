import React from 'react';
import { useToast } from '../../context/ToastContext';

export function MutationWrapper({
  mutation,
  children,
  successMessage,
  errorMessage,
  onSuccess,
  onError,
}) {
  const { showToast } = useToast();
  const { mutate, isPending, data, error } = mutation;

  // Handle success
  React.useEffect(() => {
    if (data && !isPending && !error) {
      if (successMessage) {
        showToast(successMessage, 'success');
      }
      if (onSuccess) {
        onSuccess(data);
      }
    }
  }, [data, isPending, error, successMessage, showToast, onSuccess]);

  // Handle error
  React.useEffect(() => {
    if (error && !isPending) {
      const message = errorMessage || error.message || 'An error occurred';
      showToast(message, 'error');
      if (onError) {
        onError(error);
      }
    }
  }, [error, isPending, errorMessage, showToast, onError]);

  return <>{children(mutate, isPending)}</>;
}
