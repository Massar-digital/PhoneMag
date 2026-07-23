import React from 'react';

import { Button } from '../common/Button';
import { useShopSettings } from '../../hooks/useShop';
import { 
  EyeIcon, 
  PencilSquareIcon, 
  ArrowPathIcon,
  ReceiptPercentIcon,
  UserCircleIcon,
  CubeIcon,
  CreditCardIcon,
  BanknotesIcon,
  CheckIcon,
  CurrencyDollarIcon,
  UserIcon,
  PhoneIcon,
  ShieldCheckIcon,
  ArrowUturnLeftIcon
} from '@heroicons/react/24/outline';
import { CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/solid';
import { getProductEmoji } from '../../utils/productIcons';

const paymentMethodIcons = {
  Cash: <BanknotesIcon className="w-4 h-4" />,
  Card: <CreditCardIcon className="w-4 h-4" />,
};

const paymentMethodLabels = {
  'Cash': 'Espèces',
  'Card': 'Carte',
  'Split': 'Split',
  'Check': 'Chèque',
  'Mobile Wallet': 'Paiement Mobile',
  'Other': 'Autre'
};

const paymentStatusLabels = {
  'PAID': 'Payé',
  'PARTIAL': 'Partiel',
  'UNPAID': 'Impayé'
};

const paymentStatusColors = {
  'PAID': 'bg-emerald-100 text-emerald-700',
  'PARTIAL': 'bg-amber-100 text-amber-700',
  'UNPAID': 'bg-red-100 text-red-700'
};

export const SalesTable = ({
  sales,
  selectedSales,
  onSelectSale,
  onSelectAll,
  onView,
  onEdit,
  onRefund,
}) => {
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
  const allSelected = sales.length > 0 && selectedSales.length === sales.length;
  const someSelected = selectedSales.length > 0 && selectedSales.length < sales.length;

  return (
    <div className="overflow-x-auto">
      {/* Desktop View */}
      <table className="hidden md:table w-full">
        <thead>
          <tr className="border-b border-slate-200/80 bg-slate-50/80">
            <th className="w-12 py-4 px-4">
              <button
                onClick={() => onSelectAll(!allSelected)}
                className={`
                  w-5 h-5 rounded-md border-2 transition-all duration-200
                  flex items-center justify-center
                  ${allSelected || someSelected
                    ? 'bg-primary-500 border-primary-500' 
                    : 'bg-white border-slate-300 hover:border-primary-400'
                  }
                `}
              >
                {allSelected && <CheckCircleIcon className="w-4 h-4 text-white" />}
                {someSelected && !allSelected && (
                  <div className="w-2 h-2 bg-white rounded-sm"></div>
                )}
              </button>
            </th>
            <th className="text-left py-4 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
              <div className="flex items-center gap-2">
                <ReceiptPercentIcon className="w-4 h-4" />
                Facture
              </div>
            </th>
            <th className="text-left py-4 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
              Date et Heure
            </th>
            <th className="text-left py-4 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
              <div className="flex items-center gap-2">
                <CubeIcon className="w-4 h-4" />
                Produit
              </div>
            </th>
            <th className="text-center py-4 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
              Qté
            </th>
            <th className="text-left py-4 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
              <div className="flex items-center gap-2">
                <UserCircleIcon className="w-4 h-4" />
                Client
              </div>
            </th>
            <th className="text-left py-4 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
              Paiement
            </th>
            <th className="text-left py-4 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
              <div className="flex items-center gap-2">
                <ShieldCheckIcon className="w-4 h-4" />
                Garantie
              </div>
            </th>
            <th className="text-right py-4 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
              Montant
            </th>
            <th className="text-left py-4 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
              Remboursement
            </th>
            <th className="text-right py-4 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {sales.map((sale, index) => {
            const isSelected = selectedSales.includes(sale.id);
            const isFullyReturned = sale.net_total === 0;
            const isPartiallyReturned = sale.net_total > 0 && sale.net_total < sale.total_price;
            const hasReturn = isFullyReturned || isPartiallyReturned;
            const latestReturn = sale.latest_return;
            
            return (
              <tr 
                key={sale.id} 
                className={`
                  group transition-all duration-200
                  ${isSelected 
                    ? 'bg-primary-50/80' 
                    : isFullyReturned
                    ? 'bg-red-50/50 hover:bg-red-50'
                    : isPartiallyReturned
                    ? 'bg-orange-50/30 hover:bg-orange-50/50'
                    : 'hover:bg-slate-50/80'
                  }
                `}
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <td className="py-4 px-4">
                  <button
                    onClick={() => onSelectSale(sale.id, !isSelected)}
                    className={`
                      w-5 h-5 rounded-md border-2 transition-all duration-200
                      flex items-center justify-center
                      ${isSelected 
                        ? 'bg-primary-500 border-primary-500' 
                        : 'bg-white border-slate-300 hover:border-primary-400'
                      }
                    `}
                  >
                    {isSelected && <CheckCircleIcon className="w-4 h-4 text-white" />}
                  </button>
                </td>
                
                <td className="py-4 px-4">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-sm font-mono font-medium ${
                    hasReturn ? 'bg-red-100 text-red-700' : 'bg-primary-50 text-primary-700'
                  }`}>
                    {sale.invoice_number || 'N/A'}
                    {hasReturn && <span className="ml-1 text-[10px] uppercase font-bold">(Retourné)</span>}
                  </span>
                </td>
                
                <td className="py-4 px-4 text-sm text-slate-600 whitespace-nowrap">
                  <div>
                    <p className="font-medium text-slate-900">
                      {new Date(sale.sale_date).toLocaleDateString('fr-FR')}
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(sale.sale_date).toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </td>
                
                <td className="py-4 px-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-lg">
                      {getProductEmoji(sale.phone_details?.product_type)}
                    </div>
                    <div>
                      <span className="text-sm text-slate-700 block leading-tight">
                        {sale.phone_details ? (
                          `${sale.phone_details.brand} ${sale.phone_details.model}${sale.items?.length > 1 ? ` (+${sale.items.length - 1} de plus)` : ''}`
                        ) : (
                          sale.product_name_at_sale || sale.items?.[0]?.product_name_at_sale || 'Inconnu'
                        )}
                      </span>
                      {sale.phone_details?.product_type && (
                        <span className="text-[10px] text-slate-400 font-medium">
                          {sale.phone_details.product_type === 'Phone' ? '📱 Téléphone' :
                           sale.phone_details.product_type === 'Laptop' ? '💻 Laptop' :
                           sale.phone_details.product_type === 'Case' ? '🛡️ Coque' :
                           sale.phone_details.product_type === 'Charger' ? '🔌 Chargeur' :
                           sale.phone_details.product_type === 'Cable' ? '🔗 Câble' :
                           sale.phone_details.product_type === 'Screen Protector' ? '🪟 Protection écran' :
                           sale.phone_details.product_type === 'Headphones' ? '🎧 Casque' :
                           sale.phone_details.product_type === 'Earphones' ? '🎧 Écouteurs' :
                           sale.phone_details.product_type === 'Power Bank' ? '🔋 Batterie externe' :
                           sale.phone_details.product_type === 'Memory Card' ? '💾 Carte mémoire' :
                           sale.phone_details.product_type === 'Adapter' ? '🔌 Adaptateur' :
                           sale.phone_details.product_type === 'Holder' ? '🚗 Support' : '📦 Accessoire'}
                        </span>
                      )}
                      {sale.items?.length > 1 && (
                        <span className="text-[10px] text-slate-400">Articles multiples</span>
                      )}
                    </div>
                  </div>
                </td>
                
                <td className="py-4 px-4 text-center">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 text-sm font-semibold text-slate-700">
                    {sale.quantity || (sale.items?.length > 0 ? sale.items.reduce((sum, item) => sum + item.quantity, 0) : 0)}
                  </span>
                </td>
                
                <td className="py-4 px-4">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-slate-800">
                      {sale.customer_name || 'Client occasionnel'}
                    </span>
                    {sale.customer_phone && (
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <PhoneIcon className="w-3 h-3" />
                        {sale.customer_phone}
                      </span>
                    )}
                  </div>
                </td>
                
                <td className="py-4 px-4">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1.5">
                      {paymentMethodIcons[sale.payment_method] || <CurrencyDollarIcon className="w-4 h-4 text-slate-400" />}
                      <span className="text-xs font-medium text-slate-600">
                        {paymentMethodLabels[sale.payment_method] || sale.payment_method}
                      </span>
                    </div>
                    <span className={`inline-flex items-center self-start px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${paymentStatusColors[sale.payment_status] || 'bg-slate-100 text-slate-600'}`}>
                      {paymentStatusLabels[sale.payment_status] || sale.payment_status}
                    </span>
                  </div>
                </td>
                
                <td className="py-4 px-4">
                  <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded whitespace-nowrap">
                    {sale.warranty_duration || '12 mois'}
                  </span>
                  {sale.user_name && (
                    <div className="mt-1 text-[10px] text-slate-400 flex items-center gap-1">
                      <UserIcon className="w-3 h-3" />
                      {sale.user_name}
                    </div>
                  )}
                </td>
                
                <td className="py-4 px-4 text-right">
                  <div className="flex flex-col items-end">
                    <span className={`text-sm font-bold ${hasReturn ? 'text-red-500 line-through decoration-red-400' : 'text-success-600'}`}>
                      {parseFloat(sale.total_price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DA
                    </span>
                    {isPartiallyReturned && (
                      <span className="text-sm font-bold text-success-600">
                        {parseFloat(sale.net_total).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DA
                      </span>
                    )}
                    {isFullyReturned && (
                      <span className="text-[10px] uppercase font-bold text-red-500 tracking-wider">
                        Remboursé
                      </span>
                    )}
                  </div>
                </td>
                
                <td className="py-4 px-4">
                  {hasReturn && latestReturn ? (
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-mono font-bold text-red-600">
                        {latestReturn.return_number}
                      </span>
                      <span className="text-[10px] text-red-500">
                        -{parseFloat(latestReturn.total_refunded).toLocaleString()} DA
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(latestReturn.return_date).toLocaleDateString('fr-FR')}
                      </span>
                      {latestReturn.reason && (
                        <span className="text-[10px] text-slate-500 italic truncate max-w-[120px]" title={latestReturn.reason}>
                          "{latestReturn.reason}"
                        </span>
                      )}
                      {latestReturn.processed_by_name && (
                        <span className="text-[10px] text-slate-400">
                          par {latestReturn.processed_by_name}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </td>
                
                <td className="py-4 px-4">
                  <div className="flex justify-end items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onView(sale.id)}
                      className="!p-2"
                      title="Voir détails"
                    >
                      <EyeIcon className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onEdit(sale.id)}
                      className="!p-2"
                      title="Modifier"
                    >
                      <PencilSquareIcon className="w-4 h-4" />
                    </Button>
                    {!isFullyReturned && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onRefund(sale.id)}
                        className="!p-2 text-danger-600 hover:bg-danger-50"
                        title="Rembourser"
                      >
                        <ArrowPathIcon className="w-4 h-4" />
                      </Button>
                    )}
                    {hasReturn && (
                      <span className="text-[10px] text-red-400 font-semibold px-1" title="Déjà remboursé">
                        <ArrowUturnLeftIcon className="w-4 h-4" />
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4 p-4">
        {sales.map((sale) => {
          const isFullyReturned = sale.net_total === 0;
          const isPartiallyReturned = sale.net_total > 0 && sale.net_total < sale.total_price;
          const hasReturn = isFullyReturned || isPartiallyReturned;
          const latestReturn = sale.latest_return;
          
          return (
            <div 
              key={sale.id}
              className={`p-4 rounded-2xl border transition-all duration-200 ${
                isFullyReturned ? 'bg-red-50 border-red-100' : 
                isPartiallyReturned ? 'bg-orange-50 border-orange-100' :
                'bg-white border-slate-200 shadow-sm'
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <div 
                  className="flex items-center gap-2 cursor-pointer"
                  onClick={() => onView(sale.id)}
                >
                  <span className={`font-mono text-xs font-bold px-2 py-1 rounded-lg ${
                    hasReturn ? 'bg-red-100 text-red-700' : 'bg-primary-50 text-primary-600'
                  }`}>
                    {sale.invoice_number}
                  </span>
                  {hasReturn && (
                    <span className="text-[10px] font-bold text-red-500 uppercase">Retourné</span>
                  )}
                </div>
                <div className="text-right">
                  <p className={`font-bold ${isFullyReturned ? 'text-red-500 line-through' : 'text-slate-900'}`}>
                    {parseFloat(sale.total_price).toLocaleString()} DA
                  </p>
                  {isPartiallyReturned && (
                    <p className="font-bold text-success-600 text-sm">
                      {parseFloat(sale.net_total).toLocaleString()} DA
                    </p>
                  )}
                  {isFullyReturned && (
                    <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest">Remboursé</span>
                  )}
                </div>
              </div>

              <div className="space-y-2 mb-3">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <span className="text-lg flex-shrink-0">{getProductEmoji(sale.phone_details?.product_type)}</span>
                  <span className="truncate">
                    {sale.phone_details ? `${sale.phone_details.brand} ${sale.phone_details.model}` : sale.product_name_at_sale || 'N/A'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <UserCircleIcon className="w-4 h-4 text-slate-400" />
                  <span>{sale.customer_name || 'Client occasionnel'}</span>
                  {sale.customer_phone && <span>· {sale.customer_phone}</span>}
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span>{new Date(sale.sale_date).toLocaleDateString('fr-FR')}</span>
                  <span>·</span>
                  <span>{new Date(sale.sale_date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                  <span>·</span>
                  <span>{paymentMethodLabels[sale.payment_method] || sale.payment_method}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${paymentStatusColors[sale.payment_status] || 'bg-slate-100 text-slate-600'}`}>
                    {paymentStatusLabels[sale.payment_status] || sale.payment_status}
                  </span>
                  {sale.user_name && (
                    <span className="text-slate-400">· {sale.user_name}</span>
                  )}
                </div>
                {hasReturn && latestReturn && (
                  <div className="mt-2 p-2 bg-red-50 rounded-lg border border-red-100">
                    <div className="flex items-center gap-1 text-xs font-semibold text-red-700 mb-1">
                      <ArrowUturnLeftIcon className="w-3 h-3" />
                      {latestReturn.return_number}
                      <span className="text-red-500">-{parseFloat(latestReturn.total_refunded).toLocaleString()} DA</span>
                    </div>
                    {latestReturn.reason && (
                      <p className="text-[10px] text-red-600 italic">"{latestReturn.reason}"</p>
                    )}
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {new Date(latestReturn.return_date).toLocaleDateString('fr-FR')}
                      {latestReturn.processed_by_name && ` par ${latestReturn.processed_by_name}`}
                    </p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 border-t pt-3">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onView(sale.id)}
                  fullWidth
                  className="!px-0"
                >
                  <EyeIcon className="w-4 h-4" />
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onEdit(sale.id)}
                  fullWidth
                  className="!px-0"
                >
                  <PencilSquareIcon className="w-4 h-4" />
                </Button>
                {!isFullyReturned ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRefund(sale.id)}
                    fullWidth
                    className="!px-0 text-red-600"
                  >
                    <ArrowPathIcon className="w-4 h-4" />
                  </Button>
                ) : (
                  <div className="flex items-center justify-center text-red-400">
                    <ArrowUturnLeftIcon className="w-4 h-4" />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};