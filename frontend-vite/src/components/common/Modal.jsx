import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useFocusTrap } from '../accessibility/AccessibilityUtils';

// type ModalSize = 'sm' | 'md' | 'lg' | 'full';

// interface ModalProps {
//   open;
//   onClose: () => void;
//   size: ModalSize;
//   header: React.ReactNode;
//   body: React.ReactNode;
//   footer: React.ReactNode;
//   className;
//   closeOnBackdrop;
//   closeOnEsc;
//   title;
//   description;
// }

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
  '6xl': 'max-w-6xl',
  full: 'w-full h-full',
};

export const Modal = ({
  open,
  onClose,
  size = 'md',
  header,
  body,
  footer,
  children,
  className = '',
  closeOnBackdrop = true,
  closeOnEsc = true,
  title,
  description,
}) => {
  const modalRef = useRef(null);
  const { trapFocus, releaseFocus } = useFocusTrap();

  useEffect(() => {
    if (!open || !closeOnEsc) return;
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [open, closeOnEsc, onClose]);

  useEffect(() => {
    if (open && modalRef.current) {
      // Focus the modal when it opens
      modalRef.current.focus();
      // Trap focus within the modal
      trapFocus(modalRef.current);
    } else {
      // Release focus trap when modal closes
      releaseFocus();
    }
  }, [open, trapFocus, releaseFocus]);

  if (!open) return null;

  const modalId = `modal-${Math.random().toString(36).substr(2, 9)}`;
  const titleId = title ? `${modalId}-title` : undefined;
  const descriptionId = description ? `${modalId}-description` : undefined;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm shadow-2xl p-4 md:p-6"
      onClick={closeOnBackdrop ? onClose : undefined}
      aria-hidden="true"
    >
      <div
        ref={modalRef}
        className={`bg-white dark:bg-gray-900 rounded-2xl shadow-2xl relative ${sizeClasses[size]} w-full max-h-[95vh] flex flex-col overflow-hidden ${className}`}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
      >
        {header && (
          <div className="px-[var(--container-padding)] py-[clamp(0.8rem,1.5vw,1.2rem)] border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-white dark:bg-gray-900 sticky top-0 z-10 shrink-0">
            <div id={titleId}>
              {typeof header === 'string' ? (
                <h2 className="text-[clamp(1.1rem,2vw,1.4rem)] font-bold text-gray-900 dark:text-white">{header}</h2>
              ) : (
                header
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-all focus:outline-none"
              aria-label="Close modal"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-[var(--container-padding)] py-[clamp(1rem,2vw,2rem)]" id={descriptionId}>
          {body ?? children}
        </div>

        {footer && (
          <div className="px-[var(--container-padding)] py-[clamp(0.8rem,1.5vw,1.2rem)] border-t border-gray-100 dark:border-gray-800 flex justify-end items-center bg-gray-50/50 dark:bg-gray-800/50 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
