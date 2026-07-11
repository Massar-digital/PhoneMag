import React from 'react';

import { useShopSettings } from '../../hooks/useShop';
import { 
  ReceiptPercentIcon, 
  UserCircleIcon,
  DevicePhoneMobileIcon,
  CalendarDaysIcon,
  BanknotesIcon,
  ShoppingBagIcon
} from '@heroicons/react/24/outline';

// interface RecentSalesTableProps {
//   sales: RecentSale[];
//   loading: boolean;
// }

export const RecentSalesTable = ({ sales, loading }) => {
  const { data: shopSettings } = useShopSettings();

  const asTrimmedString = (value) => {
    if (value === null || value === undefined) return '';
    return String(value).trim();
  };
  const getInitial = (value, fallback = 'N') => {
    const text = asTrimmedString(value);
    if (!text) return fallback;
    try {
      return text.charAt(0).toUpperCase();
    } catch (e) {
      return fallback;
    }
  };
  const formatDate = (value) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.valueOf())) return '—';
    return date.toLocaleDateString('fr-FR', {
      // month: 'short',
      // day: 'numeric',
      // year: 'numeric'
    });
  };
  const formatAmount = (value) => {
    const numberValue = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(numberValue)) return '0';
    return numberValue.toLocaleString();
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl animate-pulse">
              <div className="w-12 h-12 bg-slate-200 rounded-xl"></div>
              <div className="flex-1">
                <div className="h-4 bg-slate-200 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-slate-200 rounded w-1/3"></div>
              </div>
              <div className="h-6 bg-slate-200 rounded w-20"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if ((sales || []).length === 0) {
    return (
      <div className="p-6">
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
            <ShoppingBagIcon className="w-8 h-8 text-slate-400" />
          </div>
          <p className="font-medium text-slate-900 mb-1">Pas de ventes récentes</p>
          <p className="text-sm text-slate-500">Les ventes apparaîtront ici une fois enregistrées</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200/80">
              <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <ReceiptPercentIcon className="w-4 h-4" />
                  Facture
                </div>
              </th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <UserCircleIcon className="w-4 h-4" />
                  Client
                </div>
              </th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <DevicePhoneMobileIcon className="w-4 h-4" />
                  Produit
                </div>
              </th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <CalendarDaysIcon className="w-4 h-4" />
                  Date
                </div>
              </th>
              <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <div className="flex items-center gap-2 justify-end">
                  <BanknotesIcon className="w-4 h-4" />
                  Montant
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(sales || []).slice(0, 5).map((sale, index) => {
              const isFullyReturned = sale.net_total === 0;
              const isPartiallyReturned = sale.net_total > 0 && sale.net_total < sale.total_price;
              
              return (
                <tr 
                  key={sale.id} 
                  className={`group hover:bg-gradient-to-r hover:from-primary-50/50 hover:to-transparent transition-all duration-200 ${isFullyReturned ? 'bg-red-50/30' : ''}`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <td className="py-4 px-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-sm font-mono font-medium ${isFullyReturned ? 'bg-red-100 text-red-700' : 'bg-primary-50 text-primary-700'}`}>
                      {sale.invoice_number}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isFullyReturned ? 'bg-red-100' : 'bg-gradient-to-br from-slate-100 to-slate-200'}`}>
                        <span className={`text-sm font-semibold ${isFullyReturned ? 'text-red-600' : 'text-slate-600'}`}>
                          {getInitial(sale.customer_name)}
                        </span>
                      </div>
                      <span className={`text-sm font-medium ${isFullyReturned ? 'text-red-700 line-through decoration-red-400' : 'text-slate-900'}`}>
                        {asTrimmedString(sale.customer_name) || 'N/A'}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                        <DevicePhoneMobileIcon className="w-4 h-4 text-slate-500" />
                      </div>
                      <span className={`text-sm ${isFullyReturned ? 'text-red-600 line-through decoration-red-300' : 'text-slate-700'}`}>
                        {sale.phone_details ? `${sale.phone_details.brand} ${sale.phone_details.model}` : 'Inconnu'}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-sm text-slate-600">
                      {formatDate(sale.sale_date)}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <div className="flex flex-col items-end">
                      <span className={`text-sm font-bold ${(isFullyReturned || isPartiallyReturned) ? 'text-red-500 line-through decoration-red-400' : 'text-success-600'}`}>
                        {formatAmount(sale.total_price)} DA
                      </span>
                      {isPartiallyReturned && (
                        <span className="text-sm font-bold text-success-600">
                          {formatAmount(sale.net_total)} DA
                        </span>
                      )}
                      {isFullyReturned && (
                        <span className="text-[10px] uppercase font-bold text-red-500 tracking-wider">
                          Remboursé
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden space-y-3">
        {(sales || []).slice(0, 5).map((sale, index) => {
          const isFullyReturned = sale.net_total === 0;
          const isPartiallyReturned = sale.net_total > 0 && sale.net_total < sale.total_price;
          
          return (
            <div 
              key={sale.id}
              className={`p-4 rounded-xl border transition-all duration-200 ${isFullyReturned ? 'bg-red-50/50 border-red-100' : 'bg-white border-slate-200 hover:shadow-md'}`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-start justify-between mb-3">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-mono font-medium ${isFullyReturned ? 'bg-red-100 text-red-700' : 'bg-primary-50 text-primary-700'}`}>
                  {sale.invoice_number}
                </span>
                <div className="flex flex-col items-end">
                  <span className={`text-base font-bold ${(isFullyReturned || isPartiallyReturned) ? 'text-red-500 line-through decoration-red-400' : 'text-success-600'}`}>
                    {formatAmount(sale.total_price)} DA
                  </span>
                  {isPartiallyReturned && (
                    <span className="text-sm font-bold text-success-600">
                      {formatAmount(sale.net_total)} DA
                    </span>
                  )}
                  {isFullyReturned && (
                    <span className="text-[10px] uppercase font-bold text-red-500 tracking-wider">
                      Remboursé
                    </span>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <UserCircleIcon className={`w-4 h-4 ${isFullyReturned ? 'text-red-300' : 'text-slate-400'}`} />
                  <span className={`font-medium ${isFullyReturned ? 'text-red-700 line-through decoration-red-300' : 'text-slate-900'}`}>
                    {asTrimmedString(sale.customer_name) || 'N/A'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <DevicePhoneMobileIcon className={`w-4 h-4 ${isFullyReturned ? 'text-red-300' : 'text-slate-400'}`} />
                  <span className={`${isFullyReturned ? 'text-red-600' : 'text-slate-600'}`}>
                    {sale.phone_details ? `${sale.phone_details.brand} ${sale.phone_details.model}` : 'Inconnu'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CalendarDaysIcon className={`w-4 h-4 ${isFullyReturned ? 'text-red-300' : 'text-slate-400'}`} />
                  <span className="text-slate-500">
                    {formatDate(sale.sale_date)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
