import React from 'react';

export const Breadcrumb = ({ items, className = '' }) => (
  <nav className={`flex items-center text-sm text-gray-500 ${className}`} aria-label="Breadcrumb">
    {items.map((item, idx) => (
      <span key={item.label} className="flex items-center">
        {item.href ? (
          <a href={item.href} className="hover:underline text-blue-600">{item.label}</a>
        ) : (
          <span>{item.label}</span>
        )}
        {idx < items.length - 1 && <span className="mx-2">/</span>}
      </span>
    ))}
  </nav>
);
