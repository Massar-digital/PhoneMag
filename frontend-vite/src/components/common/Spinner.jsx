import React from 'react';

// type SpinnerSize = 'sm' | 'md' | 'lg' | number;

const sizeMap = {
  sm: 20,
  md: 28,
  lg: 40,
};

export const Spinner = ({
  size = 32,
  className = '',
  color = 'text-primary-600'
}) => {
  const actualSize = typeof size === 'string' ? sizeMap[size] || 32 : size;

  return (
    <div
      className={`inline-flex items-center justify-center ${className}`}
      role="status"
      aria-label="Loading"
    >
      <svg
        width={actualSize}
        height={actualSize}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`animate-spin ${color}`}
      >
        <circle
          className="opacity-20"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="3"
          fill="none"
        />
        <path
          className="opacity-90"
          d="M12 2a10 10 0 0 1 10 10"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    </div>
  );
};
