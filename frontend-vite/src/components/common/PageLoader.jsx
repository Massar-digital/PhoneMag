import React from 'react';
// import { motion } from 'framer-motion';
import { Spinner } from './Spinner';

export const PageLoader = ({
  message = 'Loading...',
  fullScreen = false
}) => {
  const containerClasses = fullScreen
    ? 'fixed inset-0 bg-white dark:bg-gray-900 z-50 flex items-center justify-center'
    : 'flex items-center justify-center py-12';

  return (
    <div className={containerClasses}>
      <div className="text-center">
        <div>
          <Spinner size="lg" />
        </div>
        <p className="mt-4 text-gray-600 dark:text-gray-400">
          {message}
        </p>
      </div>
    </div>
  );
};
