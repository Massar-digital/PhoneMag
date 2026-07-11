import React, { useEffect, useRef } from 'react';

// interface ConfirmationDialogProps {
//   open;
//   title;
//   message;
//   confirmText;
//   cancelText;
//   onConfirm: () => void;
//   onCancel: () => void;
// }

export const ConfirmationDialog = ({
  open,
  title = 'Confirmer',
  message,
  confirmText = 'Oui',
  cancelText = 'Annuler',
  onConfirm,
  onCancel,
}) => {
  const dialogRef = useRef(null);
  const cancelButtonRef = useRef(null);

  useEffect(() => {
    if (open) {
      // Focus the cancel button by default (safer option)
      cancelButtonRef.current?.focus();

      // Prevent body scroll
      document.body.style.overflow = 'hidden';

      const handleEscape = (e) => {
        if (e.key === 'Escape') {
          onCancel();
        }
      };

      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('keydown', handleEscape);
        document.body.style.overflow = 'unset';
      };
    }
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40" aria-modal="true" role="dialog" aria-labelledby="confirmation-title" aria-describedby="confirmation-message">
      <div ref={dialogRef} className="bg-white dark:bg-gray-900 rounded-lg shadow-lg w-full max-w-sm p-6 focus:outline-none">
        <h3 id="confirmation-title" className="text-lg font-semibold mb-2">{title}</h3>
        {message && <p id="confirmation-message" className="mb-4">{message}</p>}
        <div className="flex justify-end space-x-2">
          <button
            ref={cancelButtonRef}
            className="px-4 py-2 rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
            onClick={onCancel}
            aria-label={cancelText}
          >
            {cancelText}
          </button>
          <button
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            onClick={onConfirm}
            aria-label={confirmText}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
