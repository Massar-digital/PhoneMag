import React from 'react';

export const EmptyState = ({ icon, title = 'Aucune donnée', description, action, className = '' }) => (
  <div className={`flex flex-col items-center justify-center py-12 text-gray-500 ${className}`}>
    {icon && <div className="mb-4">{icon}</div>}
    <h3 className="text-lg font-semibold mb-2">{title}</h3>
    {description && <p className="mb-4">{description}</p>}
    {action}
  </div>
);
