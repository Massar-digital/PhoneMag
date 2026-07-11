import React from 'react';

// interface PageHeaderProps {
//   title: string;
//   subtitle: string;
//   actions: React.ReactNode;
//   className: string;
// }

export const PageHeader = ({ title, subtitle, actions, className = '' }) => (
  <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-6 ${className}`}>
    <div>
      <h1 className="text-xl sm:text-2xl font-bold text-slate-900 font-display leading-tight">{title}</h1>
      {subtitle && (
        <p className="mt-0.5 text-xs sm:text-sm text-slate-500">{subtitle}</p>
      )}
    </div>
    {actions && <div className="flex items-center gap-3 flex-shrink-0">{actions}</div>}
  </div>
);
