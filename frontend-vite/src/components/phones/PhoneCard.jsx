import React from 'react';
import { Button } from '../common/Button';

import { 
  EyeIcon,
  PencilSquareIcon,
  TrashIcon,
  CpuChipIcon,
  CircleStackIcon,
  CheckBadgeIcon,
  PrinterIcon,
  SwatchIcon,
  Battery100Icon
} from '@heroicons/react/24/outline';
import { CheckCircleIcon } from '@heroicons/react/24/solid';

import { getProductEmoji } from '../../utils/productIcons';
import { getPublicUrl } from '../../services/api';

// interface PhoneCardProps {
//   phone: PhoneWithInventory;
//   selected: boolean;
//   onSelect: (phoneId, selected) => void;
//   onEdit: (phoneId) => void;
//   onView: (phoneId) => void;
//   onDelete: (phoneId) => void;
//   currencySymbol: string;
// }

const getColorHex = (colorName) => {
  if (!colorName) return null;
  const colors = {
    'Noir': '#1a1a1a',
    'Blanc': '#ffffff',
    'Argent': '#c0c0c0',
    'Or': '#d4af37',
    'Gris Sidéral': '#53565a',
    'Bleu': '#2563eb',
    'Rouge': '#dc2626',
    'Vert': '#16a34a',
    'Rose': '#db2777',
    'Violet': '#7c3aed',
    'Jaune': '#ca8a04',
    'Minuit': '#1e293b',
    'Lumière Stellaire': '#f8fafc',
    'Titane Naturel': '#a8a29e',
    'Titane Noir': '#1c1917',
    'Titane Blanc': '#fafaf9',
  };
  return colors[colorName] || null;
};

export const PhoneCard = ({
  phone,
  selected,
  onSelect,
  onEdit,
  onView,
  onDelete,
  onPrint,
  currencySymbol = '$',
}) => {
  const stockQuantity = phone.inventory?.stock_quantity || 0;
  const reorderLevel = phone.inventory?.reorder_level || 0;
  const isLowStock = stockQuantity <= reorderLevel;
  const productEmoji = getProductEmoji(phone.product_type);

  return (
    <div className={`
      group relative bg-white/80 backdrop-blur-md rounded-2xl border transition-all duration-300 overflow-hidden
      cursor-pointer container-responsive
      ${selected 
        ? 'border-primary-500 ring-4 ring-primary-500/20 shadow-2xl shadow-primary-500/20' 
        : 'border-slate-200/60 hover:border-primary-400 hover:shadow-xl hover:shadow-primary-500/10'
      }
    `}
    onClick={() => onView(phone.id)}
    >
      {/* Interactive Background Blur Effect on Hover */}
      <div className="absolute inset-0 bg-gradient-to-tr from-primary-500/5 via-transparent to-secondary-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* Selection indicator */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onSelect(phone.id, !selected);
        }}
        className={`
          absolute top-3 left-3 z-20 w-7 h-7 rounded-lg border-2 transition-all duration-300
          flex items-center justify-center transform
          ${selected 
            ? 'bg-primary-500 border-primary-500 scale-110 shadow-lg shadow-primary-500/40' 
            : 'bg-white/40 backdrop-blur-md border-white/60 hover:border-primary-400 group-hover:scale-105 opacity-0 group-hover:opacity-100'
          }
        `}
      >
        {selected ? (
          <CheckCircleIcon className="w-4 h-4 text-white" />
        ) : (
          <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
        )}
      </button>

      {/* Stock status badge */}
      <div className={`
        absolute top-3 right-3 z-10 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-tight
        backdrop-blur-xl shadow-lg border transition-all duration-300 group-hover:scale-105
        ${stockQuantity === 0
          ? 'bg-red-500 text-white border-red-400/50'
          : isLowStock
          ? 'bg-amber-500 text-white border-amber-400/50'
          : 'bg-emerald-500 text-white border-emerald-400/50'
        }
      `}>
        {stockQuantity === 0 ? 'Rupture' : isLowStock ? 'Stock Faible' : 'En Stock'}
      </div>

      {/* Phone image area */}
      <div className="aspect-ratio-box aspect-ratio-1-1 bg-gradient-to-br from-slate-100/50 to-white flex items-center justify-center">
        {phone.image_url ? (
          <img
            src={getPublicUrl(phone.image_url)}
            alt={`${phone.brand} ${phone.model}`}
            className="transition-transform duration-500 ease-out group-hover:scale-105 !object-contain p-2 sm:p-3"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        ) : phone.image ? (
          <img
            src={getPublicUrl(phone.image)}
            alt={`${phone.brand} ${phone.model}`}
            className="transition-transform duration-500 ease-out group-hover:scale-105 !object-contain p-2 sm:p-3"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        ) : (
          <div className="flex flex-col items-center gap-1.5 transition-transform duration-300 group-hover:scale-105">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-100/80 to-primary-50/50 flex items-center justify-center shadow-inner">
              <span className="text-2xl drop-shadow-lg">{productEmoji}</span>
            </div>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100/50 px-2 py-0.5 rounded-full backdrop-blur-sm">Aucune image</span>
          </div>
        )}
        
        {/* Modern Gradient overlay */}
        <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-white via-white/40 to-transparent"></div>
      </div>

      {/* Phone details */}
      <div className="p-2.5 sm:p-3 relative">
        <div className="mb-2">
          <div className="flex flex-wrap items-center gap-1.5 mb-1">
             <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-[9px] font-bold text-slate-500 uppercase tracking-wider">{phone.brand}</span>
             {(phone.supplier_name || phone.inventory?.supplier) && (
               <span className="px-1.5 py-0.5 rounded-md bg-indigo-50 text-[9px] font-bold text-indigo-600 uppercase tracking-wider">{phone.supplier_name || phone.inventory.supplier}</span>
             )}
             <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider ${
                phone.condition === 'New' ? 'bg-emerald-100 text-emerald-700' : 
                phone.condition === 'Refurbished' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
             }`}>
                {phone.condition === 'New' ? 'Neuf' : phone.condition === 'Refurbished' ? 'Remis à neuf' : 'Occasion'}
             </span>
             {phone.barcode && (
               <span className="px-2 py-0.5 rounded-md bg-primary-50 text-[10px] font-mono font-bold text-primary-600 border border-primary-100 flex items-center gap-1 shadow-sm">
                 <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                 </svg>
                 {phone.barcode}
               </span>
             )}
          </div>
          <h3 className="font-black text-slate-900 text-xs sm:text-sm md:text-base tracking-tight truncate group-hover:text-primary-600 transition-colors duration-300">
            {phone.model}
          </h3>
          
          <div className="flex flex-wrap items-center gap-1.5 mt-1">
            {phone.product_type === 'Phone' || phone.product_type === 'Laptop' ? (
              <div className="flex flex-wrap items-center gap-1.5 text-[9px] font-bold text-slate-400">
                {!!phone.storage && (
                  <span className="flex items-center gap-1 px-1 py-0.5 rounded-md bg-slate-50 border border-slate-100 text-[9px]" title="Stockage">
                    <CircleStackIcon className="w-2.5 h-2.5" />
                    {phone.storage}
                  </span>
                )}
                {!!phone.ram && (phone.product_type !== 'Phone' || phone.brand?.toLowerCase() !== 'apple') && (
                  <span className="flex items-center gap-1 px-1 py-0.5 rounded-md bg-slate-50 border border-slate-100 text-[9px]" title="RAM">
                    <CpuChipIcon className="w-2.5 h-2.5" />
                    {phone.ram}
                  </span>
                )}
                {!!phone.color && (
                  <span className="flex items-center gap-1 px-1 py-0.5 rounded-md bg-slate-50 border border-slate-100 text-[9px] truncate max-w-[80px]" title={`Couleur: ${phone.color}`}>
                    {getColorHex(phone.color) ? (
                      <div 
                        className="w-1.5 rounded-full border border-slate-200 shadow-sm flex-shrink-0 aspect-square"
                        style={{ backgroundColor: getColorHex(phone.color) }}
                      />
                    ) : (
                      <SwatchIcon className="w-2.5 h-2.5 flex-shrink-0" />
                    )}
                    <span className="truncate">{phone.color}</span>
                  </span>
                )}
                {!!phone.battery_percentage && (
                  <span className="flex items-center gap-1 px-1 py-0.5 rounded-md bg-slate-50 border border-slate-100 text-[9px]" title="Santé batterie">
                    <Battery100Icon className="w-2.5 h-2.5" />
                    {phone.battery_percentage}%
                  </span>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                  {phone.product_type}
                </span>
                {!!phone.color && (
                  <span className="flex items-center gap-1 px-1 py-0.5 rounded-md bg-slate-50 border border-slate-100 text-[9px] font-bold text-slate-400 truncate max-w-[80px]" title={`Couleur: ${phone.color}`}>
                    {getColorHex(phone.color) ? (
                      <div 
                        className="w-1.5 rounded-full border border-slate-200 shadow-sm flex-shrink-0 aspect-square"
                        style={{ backgroundColor: getColorHex(phone.color) }}
                      />
                    ) : (
                      <SwatchIcon className="w-2.5 h-2.5 flex-shrink-0" />
                    )}
                    <span className="truncate">{phone.color}</span>
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-1.5 mb-2.5">
          <div className="flex flex-col min-w-0">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Prix de vente</span>
            <div className="flex items-baseline gap-1 min-w-0">
              <span className="text-sm sm:text-base font-black text-slate-900 truncate" title={phone.price.toLocaleString()}>
                {Number(phone.price).toLocaleString()}
              </span>
              <span className="text-xs sm:text-sm font-bold text-primary-500 flex-shrink-0">{currencySymbol}</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between pt-1.5 border-t border-slate-50">
             <div className="flex flex-col">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Inventaire</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-xs sm:text-sm font-black ${
                    stockQuantity === 0 ? 'text-red-600' : isLowStock ? 'text-amber-600' : 'text-emerald-600'
                  }`}>
                    {stockQuantity === 1 && ['Phone', 'Laptop'].includes(phone.product_type) ? 'Dernier' : stockQuantity}
                  </span>
                  <div className="w-10 sm:w-12 h-0.5 sm:h-1 bg-slate-100 rounded-full overflow-hidden hidden xs:block">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ${
                        stockQuantity === 0 ? 'bg-red-500' : isLowStock ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min((stockQuantity / (reorderLevel * 2 || 10)) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
             </div>
          </div>
        </div>

        {/* Action buttons (Appear on hover) */}
        <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-slate-100">
          <Button
            size="sm"
            variant="ghost"
            className="flex-shrink-0 !p-1.5 bg-slate-50 hover:bg-primary-50 hover:text-primary-600 rounded-xl transition-all"
            onClick={(e) => { e.stopPropagation(); onView(phone.id); }}
            title="Détails"
          >
            <EyeIcon className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="flex-shrink-0 !p-1.5 bg-slate-50 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-all"
            onClick={(e) => { e.stopPropagation(); onEdit(phone.id); }}
            title="Modifier"
          >
            <PencilSquareIcon className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
          {onPrint && (
            <Button
              size="sm"
              variant="ghost"
              className="flex-shrink-0 !p-1.5 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-600 rounded-xl transition-all"
              onClick={(e) => { e.stopPropagation(); onPrint(phone); }}
              title="Étiquettes"
            >
              <PrinterIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="flex-shrink-0 !p-1.5 bg-slate-50 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all"
            onClick={(e) => { e.stopPropagation(); onDelete(phone.id); }}
            title="Supprimer"
          >
            <TrashIcon className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};
