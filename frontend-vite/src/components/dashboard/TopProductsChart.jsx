import React from 'react';

import { TrophyIcon, DevicePhoneMobileIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import { StarIcon } from '@heroicons/react/24/solid';

// interface TopProductsChartProps {
//   data: DashboardStats['top_products'];
//   loading: boolean;
// }

// Gradient colors for the ranking bars
const rankColors = [
  { bg: 'bg-gradient-to-r from-amber-400 to-amber-500', text: 'text-amber-700', light: 'bg-amber-100' },
  { bg: 'bg-gradient-to-r from-slate-400 to-slate-500', text: 'text-slate-700', light: 'bg-slate-100' },
  { bg: 'bg-gradient-to-r from-orange-400 to-orange-500', text: 'text-orange-700', light: 'bg-orange-100' },
  { bg: 'bg-gradient-to-r from-primary-400 to-primary-500', text: 'text-primary-700', light: 'bg-primary-100' },
  { bg: 'bg-gradient-to-r from-success-400 to-success-500', text: 'text-success-700', light: 'bg-success-100' },
];

export const TopProductsChart = ({ data, loading }) => {
  if (loading) {
    return (
      <div className="p-6">
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 animate-pulse">
              <div className="w-10 h-10 bg-slate-200 rounded-xl"></div>
              <div className="flex-1">
                <div className="h-4 bg-slate-200 rounded w-1/2 mb-2"></div>
                <div className="h-2 bg-slate-200 rounded w-full"></div>
              </div>
              <div className="h-6 bg-slate-200 rounded w-16"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="p-6">
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
            <ChartBarIcon className="w-8 h-8 text-slate-400" />
          </div>
          <p className="font-medium text-slate-900 mb-1">Aucune donnée de vente pour le moment</p>
          <p className="text-sm text-slate-500">Les produits les plus vendus apparaîtront ici une fois les ventes enregistrées</p>
        </div>
      </div>
    );
  }

  const maxQuantity = Math.max(...data.map(item => item.quantity_sold));

  return (
    <div className="p-4">
      <div className="space-y-4">
        {data.map((item, index) => {
          const percentage = (item.quantity_sold / maxQuantity) * 100;
          const colors = rankColors[index] || rankColors[4];
          const isTopThree = index < 3;
          
          return (
            <div 
              key={index} 
              className={`
                flex items-center gap-4 p-3 rounded-xl transition-all duration-200
                ${isTopThree ? 'bg-slate-50/80 hover:bg-slate-100/80' : 'hover:bg-slate-50'}
              `}
            >
              {/* Rank Badge */}
              <div className={`
                relative w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
                ${colors.light}
              `}>
                {index === 0 ? (
                  <TrophyIcon className="w-5 h-5 text-amber-500" />
                ) : (
                  <span className={`text-base font-bold ${colors.text}`}>
                    {index + 1}
                  </span>
                )}
                {isTopThree && (
                  <StarIcon className={`
                    absolute -top-1 -right-1 w-4 h-4
                    ${index === 0 ? 'text-amber-400' : index === 1 ? 'text-slate-400' : 'text-orange-400'}
                  `} />
                )}
              </div>

              {/* Product Info & Progress */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <DevicePhoneMobileIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <span className="text-sm font-semibold text-slate-900 truncate">
                      {item.phone__brand} {item.phone__model}
                    </span>
                  </div>
                  <span className={`
                    ml-2 px-2 py-0.5 rounded-full text-xs font-bold flex-shrink-0
                    ${colors.light} ${colors.text}
                  `}>
                    {item.quantity_sold} vendus
                  </span>
                </div>
                
                {/* Progress Bar */}
                <div className="relative w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`absolute inset-y-0 left-0 ${colors.bg} rounded-full transition-all duration-500 ease-out`}
                    style={{ width: `${percentage}%` }}
                  >
                    <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend / Summary */}
      <div className="mt-6 pt-4 border-t border-slate-100">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>Basé sur le total des unités vendues</span>
          <span className="flex items-center gap-1">
            <TrophyIcon className="w-3.5 h-3.5 text-amber-500" />
            Meilleure performance
          </span>
        </div>
      </div>
    </div>
  );
};
