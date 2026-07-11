import React, { useEffect } from 'react';
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  ExclamationTriangleIcon, 
  InformationCircleIcon,
  XMarkIcon 
} from '@heroicons/react/24/outline';

const typeConfig = {
  success: {
    bgColor: 'bg-green-50',
    borderColor: 'border-green-500',
    textColor: 'text-green-800',
    iconColor: 'text-green-600',
    Icon: CheckCircleIcon,
  },
  error: {
    bgColor: 'bg-red-50',
    borderColor: 'border-red-500',
    textColor: 'text-red-800',
    iconColor: 'text-red-600',
    Icon: XCircleIcon,
  },
  warning: {
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-500',
    textColor: 'text-yellow-800',
    iconColor: 'text-yellow-600',
    Icon: ExclamationTriangleIcon,
  },
  info: {
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-500',
    textColor: 'text-blue-800',
    iconColor: 'text-blue-600',
    Icon: InformationCircleIcon,
  },
};

export const Toast = ({
  message,
  type = 'info',
  autoDismiss = true,
  duration = 3000,
  onClose,
}) => {
  useEffect(() => {
    if (autoDismiss && onClose) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [autoDismiss, duration, onClose]);

  const config = typeConfig[type] || typeConfig.info;
  const Icon = config.Icon;

  return (
    <div 
      className={`
        ${config.bgColor} ${config.borderColor} ${config.textColor}
        border-l-4 p-4 rounded-lg shadow-lg min-w-[300px] max-w-md
        animate-in slide-in-from-right-full fade-in duration-300
      `}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 ${config.iconColor} flex-shrink-0 mt-0.5`} />
        <div className="flex-1 text-sm font-medium">{message}</div>
        {onClose && (
          <button
            className={`${config.iconColor} hover:opacity-70 transition-opacity flex-shrink-0`}
            onClick={onClose}
            aria-label="Close notification"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
};

export const ToastStack = ({ toasts, onRemove }) => (
  <div className="fixed top-4 right-4 z-[9999] flex flex-col items-end space-y-3 pointer-events-none">
    <div className="pointer-events-auto space-y-3">
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          {...toast}
          onClose={() => onRemove(toast.id)}
        />
      ))}
    </div>
  </div>
);
