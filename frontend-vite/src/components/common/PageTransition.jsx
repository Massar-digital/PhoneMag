import React from 'react';
// import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';

// interface PageTransitionProps {
//   children: React.ReactNode;
// }

export const PageTransition = ({ children }) => {
  const location = useLocation();

  return (
    <div key={location.pathname} className="w-full h-full">
      {children}
    </div>
  );
};
