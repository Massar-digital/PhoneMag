import React from 'react';
// import { motion } from 'framer-motion';

export const Skeleton = ({
  width = '100%',
  height = '1.5rem',
  className = '',
  variant = 'rectangular'
}) => {
  const baseClasses = 'bg-gray-200 dark:bg-gray-800 animate-pulse';

  const variantClasses = {
    // text: 'rounded',
    // rectangular: 'rounded',
    // circular: 'rounded-full'
  };

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={{ width, height }}
    />
  );
};
