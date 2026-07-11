import React from 'react';
import { StatsCard } from './StatsCard';
import { formatCurrencyNoSeparator } from '../../utils/pdfGenerator';

import { 
  CurrencyDollarIcon, 
  ShoppingBagIcon, 
  CubeIcon, 
  ExclamationTriangleIcon 
} from '@heroicons/react/24/outline';

// interface StatsGridProps {
//   stats: DashboardStats;
//   loading: boolean;
// }

export const StatsGrid = ({ stats, loading }) => {
  if (loading) {
    return (
      <div className="flex flex-col gap-[var(--spacing-md)]"> {/* Match structure to prevent layout shift */}
        <div 
          className="grid gap-4" 
          style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }} // Match 3-column layout
        >
          {[...Array(3)].map((_, i) => (
            <div 
              key={i} 
              className="bg-white rounded-2xl p-[var(--spacing-md)] shadow-soft-sm border border-slate-100 animate-pulse"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="h-4 bg-slate-200 rounded w-24 mb-3"></div>
                  <div className="h-8 bg-slate-200 rounded w-32 mb-2"></div>
                  <div className="h-3 bg-slate-100 rounded w-20"></div>
                </div>
                <div className="w-14 h-14 bg-slate-100 rounded-2xl"></div>
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1">
          <div className="bg-white rounded-2xl p-[var(--spacing-md)] shadow-soft-sm border border-slate-100 animate-pulse">
            <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="h-4 bg-slate-200 rounded w-24 mb-3"></div>
                  <div className="h-8 bg-slate-200 rounded w-32 mb-2"></div>
                  <div className="h-3 bg-slate-100 rounded w-20"></div>
                </div>
                <div className="w-14 h-14 bg-slate-100 rounded-2xl"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Handle case where stats might be null due to API error
  if (!stats || !stats.sales || !stats.inventory) {
    return (
      <div className="flex flex-col gap-[var(--spacing-md)]"> {/* Match structure for consistency */}
        <div 
          className="grid gap-4" 
          style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }} // Match 3-column layout
        >
          {[...Array(3)].map((_, i) => (
            <div 
              key={i} 
              className="bg-white rounded-2xl p-[var(--spacing-md)] shadow-soft-sm border border-slate-100"
            >
              <div className="h-20 flex items-center justify-center text-slate-400 text-sm">
                Données indisponibles
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1">
           <div className="bg-white rounded-2xl p-[var(--spacing-md)] shadow-soft-sm border border-slate-100">
              <div className="h-20 flex items-center justify-center text-slate-400 text-sm">
                Données indisponibles
              </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[var(--spacing-md)]"> {/* Outer container to separate rows */}
      {/* 3 primary cards in a strict horizontal row regardless of DPI */}
      <div 
        className="grid gap-4" 
        style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }} // Strictly force 3 columns that shrink instead of wrapping
      >
        <StatsCard
          title="Revenu Total"
          value={formatCurrencyNoSeparator(stats.sales.total_revenue)}
          subtitle={`${stats.period}`}
          variant="primary"
          icon={<CurrencyDollarIcon className="w-full h-full" />}
        />

        <StatsCard
          title="Ventes Totales"
          value={stats.sales.total_sales}
          subtitle={`${stats.period}`}
          variant="success"
          icon={<ShoppingBagIcon className="w-full h-full" />}
        />

        <StatsCard
          title="Produits en Stock"
          value={stats.inventory.total_stock_quantity}
          subtitle={`${stats.inventory.total_phones} produits uniques`}
          variant="info"
          icon={<CubeIcon className="w-full h-full" />}
        />
      </div>

      {/* 4th card on its own row as requested */}
      <div className="grid grid-cols-1">
        <StatsCard
          title="Alertes de Stock Faible"
          value={stats.inventory.low_stock_count}
          subtitle={`${stats.inventory.out_of_stock_count} en rupture de stock`}
          variant="warning"
          icon={<ExclamationTriangleIcon className="w-full h-full" />}
        />
      </div>
    </div>
  );
};
